---
title: Online-game security & anti-cheat — server authority, input validation, data scoping, rate-limiting, and threat modeling
slug: online-game-security-anticheat
domain: security
tags: [server-authority, anti-cheat, input-validation, data-scoping, rls, rate-limiting, idempotency, threat-modeling, bot-detection, economy-exploits, escrow]
status: active
updated: 2026-06-27
confidence: high
sources: 18
supersedes:
abstract: "Durable reference on multiplayer-game security: server authority as the anti-cheat boundary, data scoping (RLS), input validation, rate-limiting/idempotency, bot defense, threat modeling, and economy/trade integrity."
---

## Scope

A **project-agnostic** deep reference on securing online multiplayer games at the architecture
and systems level. Covers the core paradigm (server as sole source of truth), all major exploit
classes and their structural defenses, data-access scoping as defense-in-depth, rate-limiting
and idempotency for economy integrity, bot/automation detection, formal threat modeling
processes, and the specific risks of in-game economies and player trading. Written to inform
design, review, and pre-launch sign-off on *any* online game without assuming a specific
project's stack or roadmap. Pairs naturally with [[netcode-authoritative-multiplayer]] and
[[authentication-and-identity]].

---

## Key findings

### 1. Server authority is the primary anti-cheat boundary

The foundational principle is **"never trust the client."** The authoritative server is the sole
arbiter of game state; clients send *intent* (inputs, requests) and receive *results*. The
server re-simulates or validates all consequential state changes before committing them.

**Why this matters structurally:**
- A compromised client can fabricate any message it can send. If the server accepts fabricated
  state ("I am now at position X", "I just killed enemy Y", "I now have 1000 coins"), the
  cheat succeeds without any memory-patching or DLL injection.
- Server authority kills entire exploit classes outright: **speedhacks, teleport, hit injection,
  item duplication, instant-kill** — because the cheat never gets to assert state that the server
  does not independently verify.
- Post-match and economy logic (reward claims, loot rolls, XP credits, shop purchases) carry
  the **same attack surface** as real-time movement. Both must be server-authoritative.

**Client-side prediction is compatible with server authority.** The standard pattern: the client
predicts and renders movement immediately; the server independently validates the displacement
(speed check, collision check) and reconciles the client if it diverges. The server sends the
ground truth; the client may only *show* a prediction, never *assert* it as fact.

**What the client is allowed to own:** rendering, local UI state, audio, animation — outputs
that have no effect on game state other players can see or that the economy can be affected by.

### 2. Exploit taxonomy (cheat classes and their structural defenses)

Online cheats fall into four levels:
- **Game-level:** bug exploitation (logic errors, race conditions, economy dupes).
- **Application-level:** memory-patching hacks (aimbot, speedhack, wallhack, godmode via edited
  client binary or injected DLL).
- **Protocol-level:** packet forgery, replay, timing manipulation, traffic sniffing.
- **Infrastructure-level:** server database scraping, account takeover, DDoS.

Key cheat types and their structural mitigations:

| Cheat class | Root cause | Primary mitigation |
|---|---|---|
| Speedhack / teleport | Client controls position | Server validates max displacement per tick |
| Wallhack / ESP | Server sends all positions to all clients | Server-side visibility culling (occlusion / AoI filter) |
| Aimbot | Client-only aim logic | Server validates hit geometry (plausibility of angle/range) |
| Packet forgery | No server re-validation | Server treats all packets as untrusted; re-validates every claim |
| Economy dupe | Non-atomic transaction | Atomic DB transactions + idempotency keys |
| Item spawn / priv-item grant | Index not owner-scoped | Server checks ownership before acting on any item reference |
| Lag switch | Network timing abuse | Server enforces tick-window and heartbeat timeouts |
| Botting / automation | Inhuman reaction timing | Behavioral analysis; rate-limiting; anomaly flagging |

**Reject, do not clamp.** A subtlety in server input validation: clamping a value to its allowed
range silently accepts malformed input and may mask an attack. The correct posture is to
**reject and log** any input outside its allowed envelope — the attacker learns nothing, and
the log flags the account for review.

### 3. Visibility culling / data scoping as defense-in-depth

**Wallhacks exist because the server ships private data to clients that do not need it.**
If a client never receives enemy positions outside its area-of-interest (AoI) or behind
opaque geometry, no cheat can reveal that data — the bits were never on the machine.

This is a specific instance of the broader principle: **never ship secret state to clients.**

**Data-scoping taxonomy by sensitivity:**

| Data tier | Who may see it | Defense |
|---|---|---|
| Public game state (world geometry, public scores) | All clients | Fine; no scoping needed |
| Positional data of distant / occluded entities | Observing client only if in AoI and line-of-sight | Server-side AoI filter + occlusion culling per connection |
| Own-player private state (inventory, stats, DMs) | Owning session only | Owner-scoped queries / RLS policies on private tables |
| True secrets (RNG seeds, loot tables, anti-cheat signals) | Server only | Never serialised to any client payload; server-private tables/queries |

**Row-level security (RLS)** enforces these constraints at the data layer rather than relying
solely on application-layer filtering. Application-layer filtering is opt-in: every query starts
with access to all rows and must explicitly narrow; a single missing `.where()` clause leaks
data across all sessions. RLS policies invert this: queries are restricted by default, and the
policy grants access only to rows the session owns. This makes the failure mode safe-closed
rather than safe-open.

**A critical footgun:** RLS grants row access but does not restrict columns within a visible row.
If a row contains a secret column (e.g., internal variance seed, fraud-flag, un-revealed loot
outcome), that column must be excluded from any query shape the client can trigger, even if the
row itself passes the RLS policy. True secrets belong in server-private tables or views that
are never reachable from a client-authenticated session.

**Timing side channels:** even RLS-filtered queries can leak *existence* of a row if query
latency differs between "row found, denied" and "row not found." Constant-time response patterns
or randomised delay should be applied to sensitive existence checks (e.g., "does this username
exist?").

### 4. Input validation

Every client-sent value is untrusted until the server validates it. The OWASP whitelist
principle applies: define exactly what is valid; reject everything else. Specific checks for
game servers:

- **Range and type:** position coordinates within world bounds; action identifiers within the
  defined enum; indices within array bounds. Out-of-bounds array indices are a common crash/
  exploit vector — always validate before use.
- **Temporal plausibility:** a player cannot move 100 units in one 50 ms tick if the server's
  move speed cap is 10 units/tick. Reject the packet; do not clamp.
- **Spatial plausibility:** a hit report for an enemy 400 m away from the shooter's verified
  server-side position is implausible. Reject.
- **Ownership and capability checks:** a "cast spell X" command must verify the player owns
  spell X, has enough mana, and the spell is not on cooldown — all on the server, never trusting
  client-reported cooldown state.
- **Rate / flood limit per command type:** every endpoint has a maximum legitimate request rate.
  Exceeding it flags automation or a crash exploit attempt (see Section 6).
- **CWE-20 (Improper Input Validation)** is the MITRE classification for this class of failure;
  it underlies a wide range of downstream injection, overflow, and logic-bypass vulnerabilities.

### 5. Economy integrity: idempotency and atomic transactions

In-game economies (currencies, items, crafting, shop purchases) are acutely vulnerable to
**duplication exploits ("dupes")**: a player triggers a transaction twice before the first commit
completes, netting two outputs for one input. This is structurally identical to double-charge
bugs in fintech.

**Two-layer defense:**

1. **Atomic transactions:** the debit, credit, and state change execute in a single DB
   transaction. If any step fails, the whole operation rolls back. No partial states persist
   across a crash or race.

2. **Idempotency keys:** each client-initiated economy action includes a client-generated
   idempotency key (UUID). The server records the key atomically with the result. If the same
   key arrives again (network retry, client bug, deliberate replay), the server returns the
   *previously recorded result* without re-executing the action. This makes economy endpoints
   safe to retry without fear of duplication.

**Re-verify before every commit.** For shop purchases: read the current price from the authoritative
price table at transaction time; do not accept the price the client reported. The client
reporting a price is an advisory; the server always uses the canonical value.

**Loot / reward rolls** must execute on the server and be logged with the seed, outcome, and
player state at the time. Client-requested rerolls are a sign of a broken architecture —
randomness is a secret the client must never control.

### 6. Rate-limiting and anti-automation

Rate-limiting is a first-line defense against several attack classes simultaneously:
- **DDoS / flood:** limits resource exhaustion from packet storms.
- **Brute-force auth:** limits credential-guessing attempts.
- **Economy spam:** limits repeated purchase/sell/craft attempts that could exploit timing
  windows.
- **Bot detection signal:** legitimate human players do not send 500 inputs/second; any account
  sustaining inhuman request rates is a bot candidate.

**Implementation layering:**
- Per-IP rate limits at the network edge (CDN / load balancer).
- Per-account / per-session limits per action type on the game server.
- Per-command cooldowns enforced server-side (not trusting client-reported cooldown state).

**Bot and automation detection** goes beyond rate-limiting:
- **Behavioral analysis:** bots exhibit inhuman action timing consistency (near-zero jitter),
  repetitive spatial patterns (farming loops), and unnatural reaction latencies (sub-20 ms).
  Human players show variance; bots do not.
- **Session-level fingerprinting:** movement entropy, click distribution, session length,
  event-type ratios all produce a behavioral profile. Anomaly vs. baseline triggers a review
  flag, not an immediate ban (to avoid false positives).
- **CAPTCHA gating** at sensitive endpoints (account creation, large trades, bulk purchase)
  with progressive challenge difficulty for accounts with suspicious scores.
- Research on MMORPG bot detection (Kang et al., ACM 2008; NCIRL 2020) achieved >96% detection
  accuracy on banned account datasets using action-frequency and location-based features, with
  newer multimodal methods combining spatial, temporal, and social-graph signals.

### 7. Threat modeling process

Threat modeling should be performed **during design**, not after launch. The OWASP / Threat
Modeling Manifesto four-question framework:

1. **What are we building?** — data flow diagram (DFD) of the system: game client, authoritative
   server, matchmaking, backend services, databases, external auth. Mark trust boundaries.
2. **What can go wrong?** — apply STRIDE per trust boundary:
   - **S**poofing: session token theft, identity impersonation.
   - **T**ampering: packet forgery, memory edits, DB manipulation.
   - **R**epudiation: action log forgery, trade dispute fraud.
   - **I**nformation Disclosure: private state leakage, wallhacks from over-sharing.
   - **D**enial of Service: server flood, economy spam, targeted harassment.
   - **E**levation of Privilege: client claiming admin ability, exploiting missing ownership check.
3. **What will we do about it?** — for each threat: mitigate (add control), eliminate (remove
   feature), transfer (player ToS + moderation), or accept (with documented rationale).
4. **Did we do a good enough job?** — validate the model with stakeholders; check mitigations
   are testable; schedule re-audit cadence.

**Game-specific asset classification:**
- **High-value assets:** currency/item tables, loot seed RNG, matchmaking rank records, ban/
  suspension state, payment records.
- **Attackers:** cheaters (competitive advantage), gold-farmers (RMT economy disruption),
  griefers (DoS / harassment), account thieves, insiders.
- **Attack surfaces:** game client binary, game protocol, HTTP backend APIs, authentication
  endpoints, admin tooling, UGC/chat pipeline.

**Threat model is a living document.** It must be re-audited when new features are added (new
economy action, new UGC surface, new API endpoint). A maintained threat model + security
sign-off should be a **launch gate requirement**, not a post-launch backfill.

### 8. Trading, escrow, and economy-specific exploits

Player-to-player trading introduces a new trust surface: two players must exchange items/
currency without either party being able to cheat the other or the system.

**Structural risks:**
- **Scams:** player offers item A, gets payment, then disputes or reclaims item.
- **Duplication via trade window race:** if trade is not atomic, a dupe may be achievable by
  racing two concurrent trades on the same item.
- **Wash trading / market manipulation:** automated accounts cycling currency to inflate/deflate
  prices.

**Dual-consent escrow pattern:**
1. Player A and Player B each **commit** their offered items/currency into an escrow hold (items
   removed from inventory, not yet granted to recipient).
2. Both parties **confirm** the offer (dual-consent). Neither can modify after confirmation.
3. Server executes the swap **atomically** — both sides transfer or neither does.
4. A **review window** (Steam's 15-day escrow model) adds time for fraud detection before
   finalization, at the cost of UX friction.

**At trade execution**, the server re-reads the current item state from authoritative tables
and re-verifies ownership — never trusting the state snapshotted at offer-creation, which could
have been invalidated by a concurrent trade or exploit in the interim.

**Economy exploit postmortem patterns** (blockchain and traditional games alike): duplication
bugs most commonly arise from non-atomic operations, missing re-verification of ownership before
commit, and missing idempotency on the trade-completion endpoint.

### 9. UGC and chat moderation as a security surface

User-generated content (custom item names, level designs, chat messages, avatar skins) is an
abuse vector independent of game-logic cheating:

- **Chat:** harassment, doxxing, phishing links, scam solicitation. Defense: real-time NLP
  moderation (profanity, hate speech, link detection) + human review escalation + mute/report
  tools with low friction.
- **Named items / avatar customisation:** slur injection, NSFW imagery. Defense: server-side
  regex + ML classifiers before persistence; image moderation APIs for uploaded textures.
- **Custom map / script content:** code injection risks if UGC scripts are executed server-side.
  Defense: sandboxed execution environments; whitelist of allowed API calls; no server-side eval
  of arbitrary strings.
- **Phishing UGC:** fake in-game UI elements designed to harvest credentials. Defense: never
  render HTML from user strings; treat all UGC as untrusted text, not markup.

---

## Concrete examples & references

**Darkfall Unholy Wars (MMO, ~2012):** lacked server-side range validation on spell-cast
commands. Players used packet manipulation to cast spells from arbitrary distances, effectively
attacking players from outside render range. Fix: validate attacker-to-target distance on the
server at cast time. (Documented in Fasteraune, Game Developer, 2018.)

**Steam Trade Escrow (2015):** Valve introduced a 15-day hold on trades from accounts without
mobile authenticators to combat account-theft-driven item fraud. The escrow hold reduced
immediate scam payoff; however, it drove impatient users to fake third-party trading sites
serving malware — illustrating the UX/security tradeoff of friction-heavy escrow.

**MOBA / RTS server authority:** DOTA 2 and StarCraft II run all movement and combat resolution
on dedicated servers. Clients send only commands; the server simulates the result. This is why
speedhacks and teleport hacks that plagued older peer-to-peer RTS games are structurally
impossible in these titles.

**Wallhack defense via server occlusion culling:** published ray-tracing-based anti-wallhack
systems (US Patent 11,771,997; open-source projects including CornerCulling on GitHub) show
that per-connection occlusion queries at server tick rate are feasible at competitive game
scales, eliminating the need to send hidden-entity positions at all.

**MMORPG bot detection research:** Kang et al. (ACM 2008) demonstrated that MMORPG bots can be
identified with high accuracy from action-frequency and location-entropy features alone.
Subsequent multimodal approaches (Stanton 2020, NCIRL; 2025 IEEE research) combine spatial,
temporal, and social-graph signals for >96% accuracy on labeled datasets, with human-AI
collaborative review pipelines reducing false-positive bans.

**Economy exploit pattern (game industry postmortem):** ChainScore Labs (2025) surveys game
economy exploits and identifies oracle attacks, non-atomic multi-step transactions, and missing
ownership re-verification as the three most common root causes. The fix pattern is consistent:
atomic DB transactions + idempotency keys + re-read-before-commit.

**STRIDE applied to a game backend:** the OWASP Threat Modeling Cheat Sheet (2024) formalises
the four-question process and STRIDE categorisation. Applying STRIDE to a game's trust
boundaries surfaces the most common game-specific threats directly: T (tampering) → packet
forgery; I (information disclosure) → wallhack over-delivery; E (elevation of privilege) →
missing ownership check; D (denial of service) → command flood.

**CWE-20 (Improper Input Validation)** is the MITRE classification most directly applicable
to the reject-not-clamp principle. The OWASP Input Validation Cheat Sheet (2024) reinforces
whitelist validation as the correct posture: define allowed, reject everything else.

---

## Design implications & transferable principles

**Server authority is the single most impactful anti-cheat investment.** Every dollar spent
on client-side obfuscation or kernel-level anti-cheat is eventually defeated by sufficiently
motivated attackers; server authority is structurally unbypassable if implemented correctly.

**Validate intent, never state.** The client sends *what it wants to do*; the server computes
*what actually happens*. The client never reports outcomes (damage dealt, items received, position
achieved); those are computed server-side and returned.

**Reject-not-clamp as policy.** Out-of-range inputs are an attack signal. Clamping silently
accommodates malicious input and hides the signal. Reject with a log entry; the attacker sees
only an error, the ops team sees a fraud signal.

**Never ship secret state to clients.** Apply a strict data classification:
true secrets (RNG seeds, loot outcomes before reveal, anti-cheat signals) stay in server-private
tables/queries — not in any result set reachable by a client session, even indirectly. Use RLS
policies as a data-layer safety net, not as the sole access control layer.

**RLS is defense-in-depth, not a replacement for query scoping.** RLS prevents a missing
`.where()` from leaking rows, but it does not restrict columns within visible rows. Sensitive
columns must be excluded at the query layer independently of RLS policy.

**Two-layer economy defense:** atomic transactions prevent partial-state dupes; idempotency
keys prevent replay dupes. Both are required. Either alone leaves the other attack surface open.

**Re-verify ownership at commit time.** Offers and trade windows can be stale by the time
they are executed. Always re-read the authoritative state from the database at the moment of
execution, not at the moment of offer creation.

**Threat model as a living gate.** Build the threat model at design time, re-audit it at each
significant feature addition, and require it as a pre-launch sign-off gate. A threat model that
is not maintained is a false assurance.

**Bot detection is probabilistic, not binary.** Behavioral anomaly scores should feed a review
queue, not an automated ban. False positives on legitimate players are reputationally costly.
Automate the flagging; require human or high-confidence-ML sign-off on the ban.

**Escrow UX tradeoff is real.** Longer hold windows reduce fraud but increase friction and
drive users to bypass mechanisms. Calibrate hold duration to the fraud rate for the account
trust tier; authenticated, long-standing accounts may warrant shorter holds than newly created
ones.

**UGC is a security surface, not just a content surface.** Every field a user can write to is
a potential injection vector (SQL, script, XSS, phishing). Treat UGC as untrusted input; apply
the same whitelist-validation posture used for game commands.

**Layer the defenses.** No single control defeats all attacks. The intended layering is:
server authority (structural) → input validation (protocol) → data scoping/RLS (data layer) →
rate-limiting (resource) → behavioral anomaly detection (analytics) → threat model + re-audit
(process). Each layer catches what the previous layer misses or is blind to.

---

## Open questions to resolve per project

- **Client prediction scope:** how much latency compensation is acceptable before server
  reconciliation becomes too jarring? What is the per-genre tolerance (FPS vs. turn-based vs.
  MMORPG)?
- **Visibility culling fidelity vs. server CPU cost:** ray-cast-per-entity-per-tick is accurate
  but expensive at high player counts. What approximation is acceptable for the target genre
  and server budget?
- **RLS engine choice:** which database supports the RLS policy language needed, and does the
  ORM in use support RLS-aware connection pooling (important — connection pools can bypass
  session-level RLS if not configured correctly)?
- **Idempotency key TTL:** how long should a key be retained? Longer retention is safer against
  delayed retries; shorter reduces storage overhead. Typical fintech practice is 24–72 hours.
- **Escrow hold duration:** what is the fraud rate among different account trust tiers, and
  what hold window calibration minimises fraud loss while retaining acceptable UX?
- **Bot detection threshold:** what false-positive rate is acceptable? Human review capacity
  constrains how many flags can be acted on per day; tune the anomaly threshold accordingly.
- **Threat model cadence:** how frequently does the project's feature velocity require a
  re-audit? What constitutes a trigger (new economy action? new API endpoint? new UGC surface?)?
- **Client binary hardening:** at what competitive sensitivity level does kernel-level anti-cheat
  or code obfuscation become cost-justified, given its technical cost and player privacy concerns?

---

## Sources

- https://www.gamedeveloper.com/business/never-trust-the-client-simple-techniques-against-cheating-in-multiplayer-and-spatialos
- https://accelbyte.io/blog/server-authoritative-logic-to-prevent-cheating
- https://arxiv.org/html/2512.21377v1
- https://arxiv.org/pdf/2512.21377
- https://en.wikipedia.org/wiki/Cheating_in_online_games
- https://mirror-networking.gitbook.io/docs/security/cheating
- https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
- https://owasp.org/www-community/Threat_Modeling_Process
- https://en.wikipedia.org/wiki/STRIDE_model
- https://cwe.mitre.org/data/definitions/20.html
- https://chainscorelabs.com/blog/security-post-mortems-hacks-and-exploits/nft-and-gaming-exploits/why-economic-exploits-will-sink-more-games-than-code-bugs
- https://blog.algomaster.io/p/idempotency-in-distributed-systems
- https://dzone.com/articles/art-of-idempotency-preventing-double-charges-and-duplicate
- https://dl.acm.org/doi/10.1145/1501750.1501770
- https://www.bytebase.com/blog/postgres-row-level-security-footguns/
- https://castler.com/learning-hub/from-virtual-goods-to-real-security-why-gaming-needs-escrow
- https://cleanspeak.com/blog-archive/2022/06/07/best-practices-ugc-moderation-video-games
