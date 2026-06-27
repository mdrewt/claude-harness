---
title: Social systems & moderation for online games and apps — chat architecture, content moderation, anti-abuse, guilds, and trust & safety
slug: social-systems-and-moderation
domain: social
tags: [chat-architecture, pub-sub, fan-out, content-moderation, anti-toxicity, reporting-blocking, guild-roles, presence, trust-safety, rate-limiting, age-gating]
status: active
updated: 2026-06-27
confidence: high
sources: 14
supersedes:
abstract: "Canonical reference for real-time chat (pub/sub fan-out, server-authoritative send, RLS scoping), layered moderation (filter + ML + human queue), anti-abuse, guilds, presence, and trust & safety law."
---

## Scope

A **project-agnostic** deep reference on the social and moderation infrastructure required for any online game or community app with player-to-player communication: real-time chat channel architecture using pub/sub fan-out; server-authoritative message dispatch (validate, sanitize, rate-limit before fan-out); message persistence and channel-scoped privacy using row-level security (RLS); layered content moderation (proactive filter pipeline → ML toxicity classification → reactive reporting → human review queue); blocking, muting, and reporting UX and data models; guild/clan/role/permission hierarchies; online presence with heartbeat/TTL; trust and safety process and penalty escalation; and legal/privacy obligations (GDPR, COPPA/COPPA 2.0, data retention). Written to brief any design, architecture, or review session on these topics regardless of stack. Pairs with [[online-game-security-anticheat]] for the anti-cheat layer that operates alongside social trust systems.

---

## Key findings

### 1. Chat as channels with pub/sub fan-out

Chat in online games is best modeled as **channels** (guild channel, match lobby, direct-message thread, global zone) rather than raw point-to-point sockets. Each channel is an independently subscribable topic; clients subscribe to the channels they are currently viewing. This is the foundational interest/subscription scoping mechanism: a player in a guild channel does not receive zone-chat packets, and vice versa.

**Transport layer.** WebSocket is the standard transport: full-duplex, persistent, low-latency (~sub-10 ms overhead once established), and universally supported. Server-Sent Events (SSE) are a viable read-only downlink alternative where bidirectional send is not needed (e.g., a broadcast announcement feed). Long-polling is a fallback of last resort: it adds per-message HTTP overhead and is architecturally equivalent to polling.

**Broker layer.** A single WebSocket server cannot hold every subscriber, so messages are routed through a message broker:
- **Redis Pub/Sub** delivers sub-millisecond in-memory fan-out; ephemeral only — no durability, no replay. Suited for ephemeral presence events, typing indicators, and short-lived lobby chat.
- **Redis Streams / Kafka** add durable, replayable, ordered event logs with per-partition ordering and consumer group replay on reconnect. Kafka handles throughput exceeding 100K messages/s and is the correct choice when message history must survive a server restart.

**Fan-out model.** The two canonical patterns are:
- *Fan-out on write*: when a message is sent, the server immediately pushes it to every online subscriber's connection buffer. Favored for small channels (guilds, lobbies). Disadvantage: a message sent to a 1 000-member guild hits 1 000 delivery paths simultaneously.
- *Fan-out on read*: the message is written once to persistent storage; subscribers pull (or are pushed lazily by the broker) when they next open the channel. Favored for high-membership channels (global, zone). Discord's architecture (channel + time-bucket partitioning on ScyllaDB) is the canonical production example of this at trillion-message scale: messages are stored by `(channel_id, bucket)` and served on demand rather than pushed to every subscriber immediately.

**Interest/subscription scoping.** Clients must only be subscribed to channels they have access to. The WebSocket server enforces subscriptions: on connect, it validates the player's session, fetches their channel memberships, and subscribes them only to those topics. A client may not subscribe itself to an arbitrary channel topic string. This is the network-layer enforcement of channel privacy.

### 2. Server-authoritative message send

**Never trust client-rendered messages.** The client submits a *send intent* (raw text, channel ID, optional attachments). The server owns the canonical send pipeline:

```
receive raw text
  → authenticate sender (session / JWT)
  → authorize: is sender a member of the channel? not muted? not globally banned?
  → rate-limit check (per-sender, per-channel, global)
  → sanitize / escape content
  → proactive content filter (profanity filter + ML score)
  → write to persistent store with server-assigned timestamp & message ID
  → fan-out to subscribers via broker
```

No message that the client "sent" is delivered to other players unless it passes every gate above. The client receives either a delivery confirmation or an error code. This prevents XSS injection (the client cannot inject `<script>` tags into another player's renderer), message spoofing (the client cannot claim to be another sender), and replay abuse (every message carries a server-assigned monotonic ID).

**Content escaping.** All user-generated text must be stored and transmitted as plaintext or as strictly sanitized markup. Output encoding must be context-aware: HTML entity-encode for web renderers, escape for JSON strings, and never eval or innerHTML untrusted content. Use a maintained sanitization library (DOMPurify in browser contexts) configured to an allowlist of safe tags only (bold, italic, at most). Strip all event handlers and script elements unconditionally. A Content Security Policy (CSP) header provides defense-in-depth but is not a substitute for output encoding.

**Rate limiting.** Rate limits operate at two granularities:
- *Per-sender rate*: token bucket or sliding window (e.g., 5 messages per 3 seconds). Bursts are tolerated up to the bucket capacity; sustained overrun triggers a temporary send-block, not a ban.
- *Per-channel global rate*: total inbound messages per second to a channel. Protects against coordinated spam floods by multiple low-rate accounts.
Rate-limit state is stored in Redis (atomic increment with TTL, or a Lua-script token bucket). Violation signals feed the trust score (§8) rather than immediately triggering account action.

### 3. Message persistence and channel privacy (RLS)

Chat messages should be stored in a relational or wide-column store partitioned by channel. For relational storage (PostgreSQL), **Row-Level Security (RLS)** enforces channel-scoped privacy at the database layer — independent of application logic:

```sql
-- Policy: a message row is visible only to users who are members of the channel
CREATE POLICY chat_channel_visibility ON messages
  USING (
    channel_id IN (
      SELECT channel_id FROM channel_members
      WHERE user_id = current_setting('app.current_user_id')::uuid
    )
  );
```

Critical caveats:
- The table owner bypasses RLS by default; the application must connect as a non-owner role for RLS to apply.
- Policy columns (`channel_id`, `user_id`) must be indexed or every row check becomes a sequential scan.
- Direct-message threads are modeled as a two-member channel; RLS then naturally restricts visibility to those two participants.

For wide-column storage (ScyllaDB, Cassandra), channel scoping is enforced by the partition key: `PRIMARY KEY ((channel_id, bucket), message_id)`. Querying a channel the caller is not authorized for requires a separate authZ guard in the application layer before the query is issued.

**Message retention and deletion.** Retaining chat messages indefinitely creates legal and operational risk (GDPR right-to-erasure, COPPA data minimization). Set explicit retention windows per channel type (e.g., 90 days for lobby chat, 1 year for guild logs, indefinite only where legally justified). Implement soft-delete: mark rows as `deleted_at` server-side so the content is gone from reads but the moderation audit log retains the `message_id` and `report_id` association for a legally required period.

### 4. Layered content moderation

Effective moderation is a **pipeline**, not a single filter. Each layer has different throughput, latency, and accuracy trade-offs.

**Layer 1 — Proactive filter (inline, synchronous, < 1 ms).**
A trie-based word/phrase matcher applied to every message before storage. A trie allows O(L) lookup (where L = message length) rather than the O(N²) substring enumeration of naïve string matching. The filter must handle leet-speak normalization (`d0g` → `dog`), homoglyph substitution (Cyrillic lookalikes), and repetition collapse (`aaaaa` → `a`) before matching. The Scunthorpe problem (false positives on innocent substrings) is mitigated by combining trie matches with a phrase allowlist and contextual position checks. The filter result is: **allow**, **flag for ML**, or **block outright** (zero-tolerance terms).

**Layer 2 — ML toxicity classification (near-synchronous, 20–200 ms).**
Flagged messages are scored by an ML model. For years the de-facto external baseline was **Google Perspective API** (Jigsaw), which scored text on toxicity, severe toxicity, insult, threat, and identity attack dimensions and at peak processed ~500 million requests/day. Google announced Perspective API's shutdown effective December 31, 2026 (no new sign-ups since mid-2026; existing keys work until the sunset). Replacements include:
- **Google Cloud Natural Language `moderateText`** — continues post-sunset but lower accuracy.
- **OpenAI Moderation API** — free, covers hate/harassment/self-harm categories.
- **Azure AI Content Safety / AWS Comprehend** — enterprise-tier managed classifiers.
- **Game-domain fine-tuned BERT variants** (ToxBuster, 2023; arXiv 2305.12542) — research shows game-specific trained models outperform generic classifiers on precision, recall, and F1 for gaming jargon, because game communities develop euphemisms and slang that generic models trained on social media miss.

**Riot Games** is the best-documented production example: upgraded their text evaluation ML models in November 2022 (GA), with a May 2023 capability expansion. The system uses Apache Spark + TensorFlow, tuned for "super high precision" to minimize false positives. Expected throughput was 20× more automated penalty decisions than the previous system. Automated muting (pre-emptive send suppression) was added alongside automated ban escalation. The pipeline is server-side; the client never learns whether its message was routed or suppressed.

**Layer 3 — Reactive reporting (asynchronous, player-initiated).**
Players file reports against specific messages or players (not just "I was harassed" but "this message [id] was abusive"). Reports are stored with: reporter `user_id`, reported `user_id`, reported `message_id`, report category (hate speech / harassment / spam / cheating / CSAM), and timestamp. Reports are *signals*, not verdicts: a single report should never trigger a penalty alone. Systems aggregate: N reports from M distinct reporters within a T-day window raise the priority of a human review ticket.

**Layer 4 — Human review queue.**
High-severity and high-ambiguity cases land in a human review interface. Tooling requirements: the reviewer sees the original message in full context (preceding 10–20 messages), the reporter's and reported player's history, prior penalty count, and ML confidence score. Severely distressing content (CSAM, graphic violence) should be blurred by default and require an explicit unlock. Moderator well-being (rotation cadence, workload capping, mental health resource access) is a design requirement, not an afterthought — burnout and secondary trauma are well-documented in this role.

**Voice chat.** Text moderation pipelines do not cover voice. Modulate's **ToxMod** (voice intelligence for gaming) monitors live voice conversations for harassment, hate, threats, and grooming, transcribing and classifying in real time. Voice moderation is harder than text: no persistent record by default, higher false-positive risk from tone mis-reads, and more complex consent/recording legal frameworks.

### 5. Blocking, muting, and reporting UX & data

**Player empowerment is the first line of defense.** Research shows 96% of users who experience disruptive behavior respond by blocking, reporting, or leaving. Making these actions discoverable (in-match HUD, post-match screen, profile view) directly reduces harm.

**Operational distinctions:**
- **Mute**: local-client suppression of audio/text from a specific player for the session. No server record. Zero server cost. Immediate. Does not prevent the muted player from interacting with others.
- **Block**: persistent server-side relationship record. Both players are hidden from each other's social surfaces: they are not matched together in game modes that respect the block list (design decision: enforce at matchmaking, or only at display?). Messages from a blocked user are dropped server-side (the sender still "sees" the send succeed — a form of soft shadow behavior without the adversarial deception of a full shadow ban).
- **Report**: files the report record described in §4 Layer 3. In a well-designed system, the reporting player sees a confirmation ("your report was received") but never learns the outcome of the review. This prevents report-as-harassment (filing reports to monitor whether a player gets banned).

**Data model.** Block relationships are stored as a symmetric pair or a directed `(blocker_id, blocked_id)` row with an indexed `blocked_id` for the "who has me blocked?" lookup the matchmaker needs. At scale, a separate Redis set per user (`blocked_by:<user_id>`) provides O(1) lookup during matchmaking without hitting the relational DB on every match attempt.

**Shadow banning.** A graduated pre-ban state where the sender's messages are silently dropped (or only visible to the sender). Used when automated signals are high-confidence but below the threshold for an outright ban, preventing bad actors from immediately noticing they are flagged and adapting. Shadow bans must have a short automatic expiry or escalation path to human review — keeping players in a shadow state indefinitely without review is both ethically questionable and legally risky (EU DSA imposes transparency requirements on content moderation decisions affecting users).

### 6. Guild/clan/role/permission models

A guild (also: clan, corporation, faction, alliance) is a **named, persistent player group** with:
- A **roster** of members with assigned roles.
- A **shared social space** (dedicated chat channel, news board).
- **Shared resources** (bank, treasury, property).
- Access to **group-restricted content** (raids, wars, territories).

**Canonical role hierarchy (minimal viable):**
```
Owner (1 seat)
  └── Officer / Administrator (N seats, Owner-assigned)
       └── Member (default on join)
            └── Recruit / Initiate (probationary)
```
Each role carries a **permission bitmask** or **permission set**: `INVITE_MEMBERS`, `KICK_MEMBERS`, `MANAGE_BANK`, `MANAGE_CHAT`, `VIEW_AUDIT_LOG`, `MODIFY_GUILD_SETTINGS`, `DECLARE_WAR`, etc. Officers have a subset of Owner permissions; the Owner alone can promote to Officer and dissolve the guild.

**Advanced model (EVE Online corporations as the extreme case).** EVE features CEO (absolute authority), 30+ granular role flags, seven divisional hangars and wallet divisions independently permissioned, "Grantable Roles" (the ability to grant a role without holding it yourself — a form of delegated administration), and a shares mechanic that enables hostile corporate takeovers. The role-vs-title distinction is worth noting: *roles* grant functional permissions; *titles* are vanity labels (collection of roles + display name) that can be assigned to multiple members without the CEO needing to configure individual roles each time.

**Recruitment gate.** Two canonical modes:
- *Open/algorithmic*: join if you meet a trophy/level/power-score threshold. The gate is automated; no human approval step.
- *Invite-only*: an Officer or Owner reviews a join request or sends an explicit invitation. Required for guilds where trust (shared resources, strategic communication) demands human vetting.

**Guild chat scoping.** Guild chat is a channel whose subscription list equals the guild roster. When a player leaves or is kicked, the server removes them from the channel subscription atomically with the membership record update. Failure to do this (a kicked member who retains a WebSocket subscription) is a data-access bug: they continue to receive private guild communications. Enforce the invariant: channel subscription = set of members holding active, non-banned membership rows.

**Moderation within guilds.** Guild officers have moderation power within their guild channel (kick from channel, mute within channel). They do not have platform-level moderation power: they cannot permanently ban a player from the game, access the platform report queue, or see report outcomes. Separating guild-scoped moderation from platform trust-and-safety is a critical permission-scope boundary.

### 7. Presence and online status

**Architecture.** Presence is a **heartbeat + TTL** contract:
1. While a client is connected, it sends a heartbeat every N seconds (typically 15–30 s) to a **presence service**.
2. The presence service stores `user_id → {status, last_seen, session_id}` in Redis with a TTL of 2×N.
3. If the heartbeat stops (clean disconnect, crash, or network loss), the TTL expires and the user is marked offline automatically — no explicit disconnect message is required.
4. On clean disconnect, the client sends an explicit offline signal to expire the key immediately rather than waiting for TTL.

**Status types.** Common values: `online`, `in-game` (sub-status with game context), `away` (idle timer on client), `do-not-disturb`, `invisible` (appears offline to others; presence is technically live). `invisible` requires that the stored status is `invisible` and the fan-out policy filters the event: subscribers must not receive presence updates for invisible users unless they are in a privileged relationship (e.g., own party or the invisible player's explicit exceptions list).

**Fan-out scaling.** The hard problem is not writing heartbeats (Redis cluster handles millions of writes/s) but **fanning out status changes** to all subscribers. A player with 500 guild contacts who comes online triggers 500 presence-update deliveries. Naive fan-out is O(contacts) per status change. Mitigations:
- *Selective subscription*: clients only subscribe to presence for users currently visible in the UI (active conversation list, current screen). The server tracks active subscriptions and only pushes to those, not to every contact.
- *Batched delivery*: coalesce multiple presence events into a single push per 1–5 s window, trading immediacy for throughput.
- *Pull on demand*: for the full friend list, presence is fetched on-open rather than pushed continuously. Only the contacts in the current chat view receive live push.

**Consistency tradeoff.** Presence is **eventually consistent** by design. A player who closes the game without a clean disconnect remains "online" for up to 2×N seconds. This is expected and users tolerate it; real-time exact presence at the millisecond level is neither achievable nor necessary.

### 8. Trust & safety frameworks and penalty escalation

Trust and safety is a **discipline**, not a feature. It encompasses product design, operations, legal compliance, and incident response. Key components:

**Behavior classification.** Define the full taxonomy of violations before building enforcement: harassment / hate speech / slurs, spam/flooding, sexual content, solicitation/grooming, CSAM (mandatory report to NCMEC in the US), cheating, account compromise, real-money trading (RMT). Different violation types have different penalty tracks, evidence requirements, and escalation paths.

**Trust score / behavior score.** Many large games maintain a hidden or semi-hidden score per account that aggregates: reports received (weighted by report validity), automated flags, honor/commendation received, account age, spend history (as a rough ban-cost signal). This score gates matchmaking pool, selects features (e.g., voice chat disabled below a threshold), and determines how quickly reports convert to review tickets. Riot League of Legends' Honor system is the publicly visible complement: Honor level rises from positive behavior signals and unlocks cosmetic rewards, creating a positive incentive structure alongside the punitive report system.

**Penalty ladder.** A common structure:
```
1st offense (low severity): automated warning / chat restriction
2nd offense (moderate): 1–3 day suspension
3rd offense (moderate): 7–14 day suspension
Severe offense (slurs, threats, CSAM): permanent ban, no ladder
Repeated evasion (ban bypass accounts): device/IP-level action
```
Permanent bans for severe offenses should be applied without the ladder — stepping through a warning → suspension ladder for explicit hate speech is a design failure that signals tolerance. See Riot's automated penalty system: expected 20× throughput improvement specifically because the old human-gated ladder was too slow to deter first-offense behavior.

**Shadow banning as a pre-ban state** (elaborated from §5): position it explicitly as a temporary quarantine (< 72 hours without human review escalation) rather than an indefinite enforcement action. Document it as such in internal policy, both for legal defensibility and for operator clarity.

**Appeals.** Players banned by automated systems must have an appeal path to human review. EU Digital Services Act (DSA, fully applicable from February 2024) requires platforms to provide effective redress mechanisms and explain content moderation decisions. Appeals tooling: the reviewer sees the same context as in §4 Layer 4, plus the automated signal that triggered the ban. The SLA on appeals should be publicly stated (e.g., "we aim to respond within 7 days").

**NCMEC reporting.** Any detection of CSAM (any channel: text description, image, link) is a **mandatory legal report** to the National Center for Missing and Exploited Children (US) under 18 U.S.C. §2258A, and equivalent bodies in other jurisdictions. This must be treated as a legal obligation with a documented SOP, not a moderation queue ticket. Preserve all evidence before deletion; do not re-display the content; file within 24 hours of confirmed detection.

### 9. Anti-abuse beyond spam: coordinated behavior and ban evasion

**Coordinated inauthentic behavior.** Guilds can be weaponized for coordinated harassment (a group targets one player with simultaneous reports — "report bombing"). Mitigate by weighting reports from players who share a guild or recent-match history with the reported player at lower signal strength than reports from strangers.

**Ban evasion.** A permanently banned player creates a new account. Detection signals: device fingerprint correlation, IP/ASN clustering, behavior fingerprint (playstyle, keybinds, timing patterns, chat vocabulary), and early-account acceleration (a new account that immediately joins the same guild as the banned account). Ban evasion detection pairs tightly with [[online-game-security-anticheat]] anti-cheat infrastructure; the device fingerprinting layer is often shared.

**Flooding and coordinated spam.** Per-sender rate limits (§2) are necessary but not sufficient: 100 accounts each sending at 4 msg/3 s saturate a channel without any individual exceeding the rate limit. Channel-level rate limits and anomaly detection (sudden spike in message volume from new accounts within a channel) handle this tier.

**Sockpuppet guilds.** Guilds created to serve as harassment bases or RMT coordination points. Signals: guild created by a <7-day-old account, all members have similar account creation dates, no organic social graph connections, high report rate against non-members. Automated guild suspension with human review escalation is the appropriate response.

### 10. Legal and privacy obligations

**GDPR (EU).** User-generated chat content is personal data. Key obligations:
- *Lawful basis*: performance of contract (chat is a core service feature) typically covers in-game chat. Marketing analysis or AI training on chat requires separate consent.
- *Data minimization*: retain only what is necessary for the service + a legally required evidence-preservation window (for moderation audit logs, typically 6–12 months after account deletion).
- *Right to erasure*: on account deletion request, delete message content. Preserve the `message_id` + `report_id` association in a separate audit table if there is a pending legal matter; otherwise delete fully.
- *Cross-border transfer*: if EU players' chat data is processed on US servers, appropriate transfer mechanisms (SCCs, adequacy decision) are required.

**COPPA / COPPA 2.0 (US).** The FTC updated COPPA rules effective 2025. For players under 13 (or under the relevant age in jurisdiction):
- Verifiable parental consent is required before any social feature (chat, voice, user profiles visible to others) is enabled.
- A "Cabined Account" pattern (Epic's implementation) is the emerging best practice: accounts for unverified-age users start with all social features disabled. A parent verification step unlocks them selectively. UGC, chat, and in-game purchases are each individually gated.
- Data retention for minors must be minimized: delete on parent request with no retention window.
- COPPA 2.0 separates "integral" from "non-integral" processing: behavioral advertising and AI training require separate parental consent even if basic chat is covered by the original consent.

**GDPR-K (EU Children).** EU Member States set age-of-consent thresholds for online services between 13 and 16. Geo-targeted age flows are required. Blanket "enter your birth year" gates without real verification are not considered adequate; age assurance (not full age verification in most contexts) is the evolving standard.

**Data-scoping by purpose.** Chat message content used for moderation (ML classifier input, human review) should be handled under a separate privacy notice section and may not be repurposed for personalization or ad targeting without explicit consent. Store moderation-purpose copies in a separate data store with stricter access controls than the main chat store.

---

## Concrete examples & references

- **Discord's message storage architecture** (ScyllaDB migration post, 2023): Messages partitioned by `(channel_id, time_bucket)`. Write-optimized: appends are cheap; reads query a compact range. Migrated from Cassandra (p99 read latency 40–125 ms) to ScyllaDB (p99 15 ms). Rust-based data service uses request coalescing: concurrent reads for the same key subscribe to a single in-flight query rather than all hitting the DB. Fan-out on read for large channels; the broker is not responsible for delivering history. (https://discord.com/blog/how-discord-stores-trillions-of-messages)

- **Riot Games automatic text evaluation and penalties** (support article + iTnews): Apache Spark + TensorFlow classifier tuned for high precision. System live November 2022, expanded May 2023. Automated muting (pre-send suppression) added alongside automated penalties. Expected 20× throughput over the previous rule-based system. Reports that match automated verdicts reinforce the signal; reports that contradict are routed to human review. (https://support-leagueoflegends.riotgames.com/hc/en-us/articles/11081887699219-Riot-Automatic-Text-Evaluation-and-Penalties; https://www.itnews.com.au/news/riot-games-turns-to-spark-to-weed-out-toxic-players-464582)

- **Perspective API shutdown** (Lasso Moderation, Tisane Labs, 2026): Google Jigsaw's Perspective API, which scored text on toxicity, severe toxicity, insult, threat, and identity attack for nearly a decade and handled ~500 million daily requests, is shutting down December 31, 2026. No new sign-ups since mid-2026. Replacement options: OpenAI Moderation (free), Google Cloud NL moderateText (lower accuracy), Azure AI Content Safety, AWS Comprehend, or game-domain fine-tuned BERT models. (https://www.lassomoderation.com/blog/perspective-api/; https://medium.com/tisanelabs/goodbye-perspective-api-79da0f237b3f)

- **ToxBuster: In-game Chat Toxicity with BERT** (arXiv 2305.12542, 2023): Fine-tuned BERT model for gaming chat. Demonstrates that game-specific training data significantly improves precision and recall over generic models, particularly for gaming slang, intentional misspellings, and community-specific euphemisms. Outperforms Perspective API on gaming corpora. (https://arxiv.org/pdf/2305.12542)

- **Challenges for Real-Time Toxicity Detection in Online Games** (arXiv 2407.04383, 2024): Survey of the gap between academic NLP benchmarks and production gaming environments. Key challenges: low-latency requirement (< 200 ms per message to stay in the send pipeline), code-switching, multilingual text, evolving slang, and obfuscation (homoglyphs, leet-speak, zero-width characters). Argues for a hybrid trie + ML pipeline rather than pure ML for latency reasons. (https://arxiv.org/pdf/2407.04383)

- **Doogal.dev: Profanity Filters — Tries, Normalization, and ML Scoring** (2026): Practical implementation reference for the trie-based first-pass filter. Covers O(L) trie lookup vs. O(N²) naïve substring search, normalization pipeline (leet-speak, homoglyphs, repetition), Scunthorpe problem and allowlist mitigation, and the handoff to ML for ambiguous matches. (https://doogal.dev/how-to-build-a-profanity-filter-that-actually-works)

- **EVE Online Roles Listing** (support documentation): The most complex published guild-permission model in production: 30+ discrete role flags, separate "Grantable Role" delegation mechanism, seven divisional hangars and wallet divisions, shares mechanic for ownership transfer. Demonstrates the upper bound of role/permission system complexity and the tradeoffs in UI legibility. (https://support.eveonline.com/hc/en-us/articles/203217712-Roles-Listing)

- **Real-Time Presence Platform System Design** (systemdesign.one): Canonical writeup on the heartbeat + TTL architecture. Defines the fan-out problem quantitatively: fanning out a single heartbeat to 50+ contacts creates hundreds of millions of events/s at scale. Selective subscription (subscribe only to contacts visible in the current UI view) is the recommended mitigation. (https://systemdesign.one/real-time-presence-platform-system-design/)

- **Ably: Scaling Pub/Sub with WebSockets and Redis**: Cross-server fan-out pattern: every WebSocket server subscribes to the Redis Pub/Sub channel; when any server receives a message from a client, it publishes to Redis, and all servers forward to their local subscribers. Discusses Redis Pub/Sub vs. Kafka tradeoffs for gaming workloads. (https://ably.com/blog/scaling-pub-sub-with-websockets-and-redis)

- **OWASP XSS Prevention Cheat Sheet**: Definitive allowlist of output encoding rules by context (HTML body, HTML attribute, JavaScript, CSS, URL). Core principle: XSS prevention is about output encoding, not input filtering. Input filtering removes data; output encoding makes it safe to render. (https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)

- **Supabase / PostgreSQL RLS documentation**: Practical RLS example for channel-scoped chat: policy on the messages table that restricts row visibility to `channel_id IN (SELECT channel_id FROM channel_members WHERE user_id = current_user)`. Notes that the table owner bypasses RLS and that policy columns must be indexed. (https://supabase.com/docs/guides/database/postgres/row-level-security; https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

- **COPPA 2.0 / GDPR-K obligations** (ESRB Privacy Certified, pandectes.io, AIR Media-Tech, 2025–2026): Summary of FTC's 2025 COPPA update: separate verifiable consent for non-integral purposes (AI training, behavioral ads); data minimization on deletion; prohibition on retaining data after parental deletion request. Epic's Cabined Account pattern cited as best practice. GDPR-K age thresholds vary 13–16 by EU Member State; geo-targeted consent flows required. (https://www.esrb.org/privacy-certified-blog/the-abcs-of-the-2025-privacy-playground-age-assurance-bots-and-coppa/; https://pandectes.io/blog/childrens-online-privacy-rules-around-coppa-gdpr-k-and-age-verification/)

- **5CA / Keywords Studios: Trust & Safety in Gaming**: Industry overview of the T&S function: automation handles volume (spam, obvious slurs), humans handle nuance (context, culture, gray-area severity). Covers outsourced vs. in-house moderation tradeoffs, moderator well-being requirements, and the operational model for a human review queue at scale. (https://5ca.com/blog/trust-safety-in-gaming/; https://www.keywordsstudios.com/en/about-us/news-events/news/how-to-convince-gaming-executives-to-invest-in-player-safety/)

- **Modulate ToxMod** (voice intelligence for gaming): Real-time voice moderation product for gaming: transcribes and classifies live voice for harassment, hate, threats, and grooming. Distinct from text moderation; raises separate consent and recording-law considerations. (https://www.modulate.ai/solutions/gaming)

---

## Design implications & transferable principles

**1. Model chat as channels, not connections.**
The channel abstraction (named, subscribable, membership-gated) is load-bearing for both delivery correctness and privacy. Every downstream system — fan-out, RLS policies, guild membership sync, blocking enforcement — operates on the channel membership set. Designing around raw WebSocket connections instead of channels makes all of these correctness properties ad-hoc and error-prone.

**2. Server-authoritative send is the foundation; client "send" is a request, not a delivery.**
The client submits intent; the server validates, escapes, rate-limits, filters, stores, and fans out. This is architecturally equivalent to the authoritative-server model in [[online-game-security-anticheat]]: the server owns the canonical state; the client's local view is a rendering of what the server has confirmed. Never let a client-supplied payload reach another client's renderer without passing through the full pipeline.

**3. The moderation pipeline is a series of funnels, not a switch.**
Every layer (trie filter, ML classifier, reactive reports, human review) handles a different volume×accuracy trade-off. The trie handles 100% of messages at < 1 ms; ML handles the ~5% that are flagged at 50–200 ms; human review handles the < 0.1% that are ambiguous or high-severity. Designing any single layer to handle all cases either destroys latency (putting all messages through human review) or destroys accuracy (trusting only the trie).

**4. Blocking is a server-side invariant, not a client display filter.**
A block relationship must be enforced in the send pipeline (dropped server-side), the matchmaking system (players in a blocked pair should not be assigned to the same match, where game-design allows), and the social graph surfaces (they do not appear in each other's friend/guild suggestions). Client-only filtering — where the blocked player's messages are hidden on the blocking player's screen but still delivered to the server — is not a block; it is a mute.

**5. Channel subscription = membership set. Sync them atomically.**
Kicked, banned, or departed guild members must be removed from the channel subscription at the same time their membership record is invalidated. Subscription and membership are two representations of the same fact; a split-brain between them is a security bug, not a cosmetic one.

**6. Presence fan-out is the dominant scaling cost, not heartbeat writes.**
Write the heartbeat to Redis (cheap); solve the fan-out problem with selective subscription (only push to clients that are actively viewing the relevant contact in their UI). Evaluate presence at pull-time for contact lists; use push only for the active conversation view. This shifts the cost from O(contacts × active_users) to O(active_conversations).

**7. Build the moderation data model before the game ships, not after.**
A report without a `message_id` foreign key cannot be used to action specific content. A ban without a penalty audit log cannot be appealed. RLS that is bolted on after launch requires a schema migration on a live database. These are not features to add later; they are schema and architecture decisions that become progressively more expensive to retrofit.

**8. Age-gating and feature scoping must be designed together.**
The Cabined Account pattern (all social features off by default for unverified-age users, unlocked by parental consent per feature) is the correct architecture for COPPA/GDPR-K compliance. This requires that every social feature (chat, voice, friend lists, guilds, UGC) have a feature flag gated on the account's consent status — not a single "is adult" boolean but per-feature consent bitmask. Build this into the account model from day one.

**9. Document every penalty as a policy decision, not an implementation accident.**
What constitutes a shadow ban vs. a chat restriction vs. a suspension vs. a permanent ban? What is the minimum evidence required for each tier? What is the appeals SLA? The EU DSA, GDPR, and COPPA each impose transparency and redress obligations that require these to be answerable questions. They cannot be answered if the answers are buried in ML threshold values that no one has written down.

**10. Moderation is an operational function with human costs.**
Content moderators reviewing graphic violence, CSAM, and sustained harassment face documented secondary trauma. This is not a nice-to-have; it is a legal employer-of-record obligation in many jurisdictions. Design the human review tool to blur/mask the most distressing content by default, enforce rotation out of high-severity queues, cap reviewer volume per shift, and integrate referrals to mental health resources into the workflow tool itself.

---

## Open questions to resolve per project

- What is the channel taxonomy? (Direct messages, party/lobby, guild, zone/global, support.) Does each channel type have different retention, moderation sensitivity, and access control requirements?
- Is voice chat in scope? If yes, does ToxMod or equivalent cover the required jurisdictions, and what are the applicable recording-consent laws (EU: GDPR; US: wiretap law varies by state)?
- What is the age distribution of the player base, and in which jurisdictions? This determines whether COPPA 2.0 (US), GDPR-K (EU), or both apply, and at what age thresholds.
- What is the guild permission model depth needed? Minimal (Owner / Officer / Member) vs. EVE-style granular roles? Deeper models improve organizational expressiveness but exponentially increase UX complexity for role management.
- What is the retention period for chat messages, and what is the evidence-preservation window for moderation audit records? These need a legal opinion per jurisdiction.
- Which ML moderation provider is selected post-Perspective API sunset? (Google Cloud NL moderateText, OpenAI Moderation, Azure AI Content Safety, fine-tuned open-source model.) What is the latency budget and accuracy requirement for the game's chat volume?
- Is the moderation function in-house or outsourced (Keywords Studios, 5CA, ModSquad)? Outsourced saves on headcount but requires contractual SLAs for review latency and moderator well-being standards.
- How does the block list interact with matchmaking? Enforcing "never match two players who have each other blocked" is a matchmaker constraint that may extend queue times at small player-pool sizes.
- Is cross-regional chat in scope? If so, language detection + per-language model selection, and potentially legal data localization requirements (China PIPL, Russia data localization) are additional scope.

---

## Sources

1. https://discord.com/blog/how-discord-stores-trillions-of-messages — Discord Engineering, "How Discord Stores Trillions of Messages" (ScyllaDB migration, channel-bucket partitioning, Rust data service, request coalescing)
2. https://support-leagueoflegends.riotgames.com/hc/en-us/articles/11081887699219-Riot-Automatic-Text-Evaluation-and-Penalties — Riot Games / League of Legends Support, "Riot Automatic Text Evaluation and Penalties" (ML-based automated penalty system)
3. https://www.itnews.com.au/news/riot-games-turns-to-spark-to-weed-out-toxic-players-464582 — iTnews, "Riot Games turns to Spark to weed out 'toxic' players" (Apache Spark + TensorFlow implementation details)
4. https://arxiv.org/pdf/2305.12542 — Taskirananda et al., "ToxBuster: In-game Chat Toxicity Buster with BERT", arXiv 2023
5. https://arxiv.org/pdf/2407.04383 — "Challenges for Real-Time Toxicity Detection in Online Games", arXiv 2024
6. https://www.lassomoderation.com/blog/perspective-api/ — Lasso Moderation, "Perspective API: complete guide to finding an alternative" (sunset details, replacement options)
7. https://medium.com/tisanelabs/goodbye-perspective-api-79da0f237b3f — Tisane Labs, "Goodbye, Perspective API" (shutdown December 31, 2026)
8. https://doogal.dev/how-to-build-a-profanity-filter-that-actually-works — Doogal, "Profanity Filters: Tries, Normalization, and ML Scoring"
9. https://systemdesign.one/real-time-presence-platform-system-design/ — systemdesign.one, "Real-Time Presence Platform System Design" (heartbeat + TTL, selective subscription, fan-out quantification)
10. https://ably.com/blog/scaling-pub-sub-with-websockets-and-redis — Ably, "Scaling Pub/Sub with WebSockets and Redis" (cross-server fan-out, Redis vs. Kafka tradeoffs)
11. https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html — OWASP, "Cross Site Scripting Prevention Cheat Sheet"
12. https://supabase.com/docs/guides/database/postgres/row-level-security — Supabase, "Row Level Security" (channel-scoped policy examples)
13. https://support.eveonline.com/hc/en-us/articles/203217712-Roles-Listing — EVE Online Support, "Roles Listing" (granular corporation permission model reference)
14. https://www.esrb.org/privacy-certified-blog/the-abcs-of-the-2025-privacy-playground-age-assurance-bots-and-coppa/ — ESRB Privacy, "The ABCs of the 2025 Privacy Playground: Age Assurance, Bots, and COPPA" (COPPA 2.0 obligations)
