# Residuals — open follow-ups only

Open residuals only — a closed item's section is deleted; git history is the record;
categories/severity per standards/testing-tdd.md protected categories. When this file and the
append-only registry (mr-residuals.jsonl) disagree on category/severity, THIS file is the triage
record and wins.

New sections are written by `mr-gates residuals promote` from a DEFER that carried a
`[category/SEVERITY]` tag, and removed by `mr-gates residuals close` (or `residuals sweep
--apply`). Sections whose status says "carried by triage" descend from rb-* slices, so `promote`
refuses them by design (no follow-up chains): schedule them by HAND — fold into a milestone spec
or add a roadmap slice — and delete the section in that same doc-only PR. Every section carries
`EARS:` and `touches:` lines so a scheduled slice seeds a real acceptance ledger. Findings about
the checking apparatus are never tracked here.

<!-- PROMOTED SECTIONS APPEND BELOW THIS LINE -->

### rb-92 — R-rb-52-GRACEANNOUNCE
category: ux-a11y · severity: MED · status: promoted
EARS: WHEN an account moves from active to deletion-grace (including via another session's sync) THE CLIENT SHALL announce the grace deadline exactly once through the live region.
touches: client/src/main.ts, client/src/ui/liveRegion.ts, client/src/ui/announcements.ts, client/src/ui/announcements.test.ts

When an account moves from active to deletion-grace (including via another session's sync), screen-reader users hear nothing. The countdown banner (client/src/main.ts:2901) is silent by design, and no one-shot announcement fires through client/src/ui/liveRegion.ts. Add a one-shot, edge-triggered announcement of the grace deadline.

### rb-94 — R-rb-53-E1
category: ux-a11y · severity: LOW · status: promoted
EARS: WHEN a data export transitions from incomplete to complete THE CLIENT SHALL announce it once through the live region.
touches: client/src/ui/privacyBanner.ts, client/src/ui/liveRegion.ts, client/src/ui/privacyBanner.test.ts

When a data export finishes assembling (incomplete to complete), screen-reader users get no announcement. The status label in client/src/ui/privacyBanner.ts just updates in place. Add a one-shot announcement on that edge through the single live region in client/src/ui/liveRegion.ts.

### rb-98 — R-rb-56-FOLLOWUP-ACC
category: ux-a11y · severity: MED · status: promoted · **absorbed by M-postgate-console-controls (battle skill grid shows accuracy) — do not build separately**
EARS: WHEN a battle skill button renders THE CLIENT SHALL include accuracy in the visible and accessible label, appended after the existing text.
touches: client/src/ui/battleView.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts, client/src/ui/battleModel.test.ts

Battle skill buttons show accuracy only in the hover title (client/src/ui/battleView.ts:484), so touch, keyboard-without-hover and screen-reader users never get it. Add accuracy to the visible label, after the existing text so the ^Submit: start-anchored matchers keep working (constraint noted at :470-473), by extending battle.skill.pvpSubmit/pveLabel in client/src/ui/i18n/catalog.en.ts.

### rb-99 — R-rb-57-X4
category: ux-a11y · severity: LOW · status: promoted
EARS: WHEN a character's action state changes THE CLIENT SHALL expose Idle/Walking/Jumping to assistive technology.
touches: client/src/render/characterView.ts, client/src/render/characterView.test.ts

A sprite's action (Idle/Walking/Jumping) exists only as a visual glyph (client/src/render/placeholderAssets.ts). CharacterView.update() (client/src/render/characterView.ts:47) sends nothing to the accessibility tree, so screen-reader users can't tell what a character is doing. Expose it through PixiJS AccessibilitySystem properties or a DOM/live-region mirror. LOW because actions are cosmetic movement states.

### rb-100 — R-rb-59-X6
category: ux-a11y · severity: LOW · status: promoted
EARS: WHEN the PvP opponent card renders THE CLIENT SHALL convey the Opponent role to assistive technology.
touches: client/src/ui/battleView.ts, client/src/ui/battleModel.test.ts

In PvP the opponent card header is just the rival's player name (client/src/ui/battleView.ts:304-306). The "Opponent" role only comes through layout, so screen readers hear a name with no role. Name the role in the header text (for example "Opponent: <name>") or set an accessible label on #opponentCardEl.

### rb-101 — R-rb-65-RUNBOOK-LOGCAVEAT
category: security-privacy · severity: LOW · status: promoted
EARS: WHEN observability-dr.md §8 lists where an erased identity survives THE RUNBOOK SHALL include the account_deletion_cascade log line and its 30-day Loki retention.
touches: docs/runbooks/observability-dr.md

docs/runbooks/observability-dr.md §8 lists where an erased account's Identity survives (shared historical rows, backups) but leaves out the operational log. The deletion cascade logs one account_deletion_cascade line containing the subject's Identity (server-module/src/accounts.rs:787-788,1054), and Loki keeps it 30 days. Add that caveat to §8.

### rb-102 — R-rb-73-ABORT-PHANTOM
category: data-integrity · severity: MED · status: promoted
EARS: IF a client_disconnected transaction aborts THEN THE SERVER SHALL still converge session state (drain stale player_session rows at init/sync_content or reconcile against the host's live client set).
touches: server-module/src/lib.rs, server-module/src/native_host_tests.rs

If a client_disconnected transaction aborts (host or datastore failure; no reachable panic today), the host still drops the st_client row but the rolled-back delete leaves a phantom player_session row. Nothing drains it (server-module/src/lib.rs:143-194,260-268), so has_live_session (:277) stays true for that identity and every later disconnect skips resolving trades, PvP, wild battles and challenges and deleting presence rows. Fix: drain stale sessions at init/sync_content, or reconcile against the host's live client set.

### rb-103 — R-rb-73-TOKEN-WEDGE
category: security-privacy · severity: LOW · status: promoted
EARS: WHILE any live socket holds an identity THE SERVER SHALL still bound that identity's wild-battle and presence cleanup (tracked with the rb-104 reaper).
touches: server-module/src/lib.rs, server-module/src/battle.rs

Last-connection-out gating (server-module/src/lib.rs:300-322) means anyone holding a live WebSocket as an identity stops that identity's other disconnects from running cleanup. Wild battles and presence rows have no independent reaper while that socket stays open. LOW: holding the token already means holding the account. Track together with the wild-battle reaper gap (R-rb-73-WILD-HOLD).

### rb-104 — R-rb-73-WILD-HOLD
category: gameplay · severity: LOW · status: promoted
EARS: WHEN a wild battle stays Ongoing past an idle bound THE SERVER SHALL reap it on a schedule.
touches: server-module/src/battle.rs, server-module/src/battle_tests.rs

No scheduled reaper covers Ongoing wild battles (server-module/src/battle.rs:1420-1428). The disconnect resolver is the only exit, so if a disconnect is skipped (a second live socket, a phantom session, or a token holder) the wild battle stays Ongoing and is_in_ongoing_battle blocks new encounters. The player can still flee once reconnected, so this is self-inflicted and not a hard lock. Add an idle reaper for wild battles.

### rb-105 — R-rb-76-CHALLENGERGRACE
category: security-privacy · severity: LOW · status: promoted
EARS: WHEN account deletion is requested THE SERVER SHALL consume or disarm the requester's outbound Pending challenges without leaking the deletion state to third parties.
touches: server-module/src/accounts.rs, server-module/src/pvp.rs, server-module/src/pvp_tests.rs

Requesting deletion (server-module/src/accounts.rs:850) leaves the requester's outbound Pending battle_challenge rows alive, and accept_challenge (server-module/src/pvp.rs:964-1025) checks only the accepting target. So a third party can open a new Ongoing battle naming an account that is in its deletion grace period. Fix without leaking A's state to B: consume or disarm A's outbound Pending challenges at request time.

### rb-106 — R-rb-83-CHALLENGELAUNDER
category: security-privacy · severity: LOW · status: promoted
EARS: WHEN cancel_account_deletion runs THE SERVER SHALL sweep challenges opened during grace (or gate accept_challenge by a commitment-predates-deletion stamp).
touches: server-module/src/accounts.rs, server-module/src/pvp.rs, server-module/src/guards.rs

cancel_account_deletion sweeps post-request trade offers (server-module/src/accounts.rs:907-910) but not battle_challenge rows. A deletion-gated target can cancel, accept a challenge opened during grace, and request deletion again. That is the trade-launder shape, with the trade fix never applied to PvP. Add a matching challenge sweep at cancel time, or a stamp-aware accept gate using require_commitment_predates_deletion (server-module/src/guards.rs:123).

### rb-112 — R-rb-86-TICKBOUND
category: data-integrity · severity: LOW · status: promoted
EARS: WHEN an export-reaper tick would exceed the transaction budget THE SERVER SHALL still make monotonic purge progress (per-tick row cap or resumable partial-stamp).
touches: server-module/src/privacy.rs, server-module/src/privacy_tests.rs

export_bundle_reaper limits deletes to 16 stamps (bundles) per tick (server-module/src/privacy.rs:1710,2023-2025) with no cap on rows per bundle. Enough large bundles could exceed the transaction budget, and then the tick aborts and retries the same head-of-range work every hour, so expired export copies (personal data) are never purged. LOW because it needs very large exports. Fix: cap deleted rows per tick, or allow partial-stamp progress with a resume point.

### rb-126 — R-20r-d-B1-ack
category: ux-a11y · severity: LOW · status: promoted
EARS: WHEN evolution notices are acknowledged THE SERVER SHALL ack by identity (monster_id + evolved_at_ms or a sequence number), never by positional count. Bindings regen required.
touches: server-module/src/evolution.rs, server-module/src/evolution_tests.rs, client/src/module_bindings/

With two sessions on one identity, `ack_evolution_notices` in server-module/src/evolution.rs:347 drains the first `count` entries by position. A tab acking a stale head can silently remove an evolution reveal banner that no session displayed. The evolution itself persists; only the notice is lost. Fix: key the ack by (monster_id, evolved_at_ms) or a sequence number. That adds a reducer parameter, which means a bindings regen.

### rb-127 — R-20r-d-B1-cap
category: data-integrity · severity: LOW · status: promoted
EARS: WHEN pending_evolution_notice grows THE SERVER SHALL cap entries, dropping the newest, never the oldest.
touches: server-module/src/evolution.rs, server-module/src/evolution_tests.rs

`pending_evolution_notice.entries` in server-module/src/evolution.rs:202-217 grows by one entry per evolution and has no cap, for a player who never acks. Growth is self-inflicted only, bounded by owned monsters x evolution tiers, and removed by the deletion cascade. Any cap must drop the newest entry, never the oldest.

### rb-133 — R-rb-107-REJECTWALK
category: security-privacy · severity: LOW · status: promoted
EARS: WHEN request_data_export will reject in the near-cap band THE SERVER SHALL reject before the full export walk, or engage the cooldown on reject.
touches: server-module/src/privacy.rs, server-module/src/privacy_tests.rs

In `request_data_export` (server-module/src/privacy.rs:1540), a caller whose bundle is larger than the minimum and lands in the near-cap band is rejected by the second admission gate (:1604) only after the full export walk, including two full-table scans. Because the reject writes no rows, the 60s cooldown never engages. That caller can repeat the expensive walk on every call while the store is near cap: a bounded CPU/availability amplification.

### R-rb-107-BYTEBOUND — R-rb-107-BYTEBOUND
category: security-privacy · severity: LOW · status: carried by triage — schedule by hand (promote is closed to follow-up chains)
EARS: WHEN export admission is evaluated THE SERVER SHALL bound the export store by bytes (or an explicit rows-times-widest-chunk equivalent), not row count alone.
touches: server-module/src/privacy.rs, server-module/src/privacy_tests.rs

The global `export_bundle` admission cap (server-module/src/privacy.rs:1733) counts chunk rows, not bytes. Each chunk can carry up to `game_core::EXPORT_CHUNK_ROWS` (500) serialized rows, so nothing measures or limits the store's byte size. It is only indirectly limited by row cap x widest chunk. This is a storage-exhaustion ceiling gap.

### R-rb-111-CONTENTION — R-rb-111-CONTENTION
category: security-privacy · severity: LOW · status: carried by triage — schedule by hand (promote is closed to follow-up chains)
EARS: WHEN the 16 ms stamp-probe window is saturated THE SERVER SHALL still admit legitimate callers fairly (owner-scoped or caller-tiered probing).
touches: server-module/src/privacy.rs

`request_data_export` (server-module/src/privacy.rs:1587) refuses a legitimate caller with `export_reject_stamp_contention` whenever every millisecond in the 16ms creation-stamp probe window is already taken. Needs a burst of at least 1 bundle/ms across many identities. The refusal is retryable and short, and the window is not tiered by caller type, so sybils can briefly crowd out account holders.

### R-rb-111-STAMPORACLE — R-rb-111-STAMPORACLE
category: security-privacy · severity: LOW · status: carried by triage — schedule by hand (promote is closed to follow-up chains)
EARS: WHEN minting an export stamp THE SERVER SHALL NOT leak third-party export timing through the owner-readable stamp (owner-scoped probe, or a documented accepted risk).
touches: server-module/src/privacy.rs

The export stamp is now+k where k counts consecutive milliseconds already holding some other owner's live bundle (privacy.rs:1216). The stamp is readable by its owner, so it leaks up to 4 bits of anonymous third-party export timing. Negligible on its own; fix by scoping the probe to the owner, or accept and document it.

### R-rb-121-DEFER-FOCUS-RECHECK — R-rb-121-DEFER-FOCUS-RECHECK
category: ux-a11y · severity: LOW · status: carried by triage — **absorbed by M-postgate-console-controls (main-menu/frame focus slice) — do not build separately**
EARS: WHEN the deferred overlay focus callback fires THE CLIENT SHALL skip the move when document.activeElement is a connected element inside the overlay root.
touches: client/src/ui/overlayA11y.ts, client/src/ui/overlayA11y.test.ts

In client/src/ui/overlayA11y.ts:134, the setTimeout(0) focus callback does not check document.activeElement when it fires. After a lock-settle re-open (evolutionView/battleView #reanchorStrandedFocus), a click that lands inside the overlay in the same macrotask gets its focus pulled to the initial anchor. Fix: skip the move when activeElement is a connected element inside root.

### R-rb-125-X7 — R-rb-125-X7
category: ux-a11y · severity: LOW · status: carried by triage — schedule by hand (promote is closed to follow-up chains)
EARS: WHEN an evolution reveal shows THE CLIENT SHALL play a reduced-motion-aware transformation sequence before the reveal sentence (the minimal banner stays the accepted default until scheduled).
touches: client/src/ui/evolutionNotice.ts, client/src/ui/i18n/catalog.en.ts, client/src/ui/i18n/catalog.fr.ts

When an evolution reveal is shown (client/src/ui/evolutionNotice.ts banner), the client should play a reduced-motion-aware transformation sequence before the reveal sentence, with new catalog.en/fr copy. Spec'd feature polish (M-evolution-essence-graph.spec.md:148); the minimal banner is the accepted default for now.

### R-rb-128-E1 — R-rb-128-E1
category: gameplay · severity: MED · status: carried by triage — schedule by hand (promote is closed to follow-up chains)
EARS: WHEN my_account returns to Active after cancel_account_deletion THE CLIENT SHALL re-issue joinGame, and the claim-flow join SHALL surface failures instead of swallowing them.
touches: client/src/net/connection.ts, client/src/main.ts, client/src/net/connection.test.ts

A player who reloads or drops during the deletion grace period loses their avatar: on_disconnect deletes the player row (lib.rs:319) and join_game refuses during PendingDeletion (movement.rs:48). After cancel_account_deletion the client never re-issues joinGame when my_account goes back to Active (connection.ts:660), so the avatar only comes back on reload. The claim-flow join (main.ts:498) also has no .catch.

### R-rb-128-X1 — R-rb-128-X1
category: netcode-determinism · severity: LOW · status: carried by triage — schedule by hand (promote is closed to follow-up chains)
EARS: WHILE deletion is pending THE CLIENT SHALL block movement input through a predicate exposed from game-core/client-wasm, never a TypeScript copy of the rule.
touches: client-wasm/src/lib.rs, client/src/main.ts, game-core/src/

A connected player whose deletion is pending and who holds a movement key gets one predicted step plus a snap-back per round trip, and one log_reject line per refused enqueue_move (movement.rs:129). There is no desync. Fix by blocking movement input on the client through a predicate exposed from game-core/client-wasm, not a TypeScript copy of the rule.

### R-rb-128-X2 — R-rb-128-X2
category: ux-a11y · severity: LOW · status: carried by triage — schedule by hand (promote is closed to follow-up chains)
EARS: WHEN require_not_deleting rejects THE SERVER SHALL return a generic, accurate reason covering every gated action class.
touches: server-module/src/guards.rs, server-module/src/guards_tests.rs

The deletion-gated reject reason (guards.rs:75-76) names only trades, battles and challenges, yet it now fires on join, move, raise, evolve, rename, party edits, recruit and dismiss. Players see a misleading message. Reword it generically and update the tests that pin the exact string.

### R-rb-132-NEWCOMERSHED — R-rb-132-NEWCOMERSHED
category: security-privacy · severity: LOW · status: carried by triage — schedule by hand (promote is closed to follow-up chains)
EARS: WHEN organic load fills the newcomer export quarter THE SYSTEM SHALL reserve a newcomer floor or expose refusals-by-tier telemetry.
touches: server-module/src/privacy.rs, ops/observability/

Guests with neither an account nor a wallet row are refused data export once live export_bundle rows reach the newcomer quarter of the cap (privacy.rs:1741, 1753), even under purely organic load. Mitigation needs either a reserved newcomer floor (new state) or telemetry showing refusals by tier.

### R-rb-132-WALLETSYBIL — R-rb-132-WALLETSYBIL
category: security-privacy · severity: MED · status: carried by triage — schedule by hand (promote is closed to follow-up chains)
EARS: WHEN wallet-row existence gates the anonymous export tier THE SYSTEM SHALL resist cheap permanent tier acquisition (authenticated tier or persistent per-identity state; schema change).
touches: server-module/src/privacy.rs, server-module/src/economy.rs, server-module/src/schema.rs

Any identity can buy the anonymous export tier cheaply and permanently: one quest_001 Talk, or a single currency unit passed along a trade chain, creates a wallet row that is zeroed but never deleted (economy.rs:279). So a sybil fleet can fill the anonymous half of the export cap (privacy.rs:1736, 1753) and lock guests out of data export. A real fix needs authentication (guest claim) or persistent per-identity state (a schema change). [Triage note: downgraded from the row's HIGH — availability-only, guest export path only, ~1,264 identities sustained 7 days, no disclosure.]

### R-21r-a-FAINTPENALTY — R-21r-a-FAINTPENALTY
category: gameplay · severity: LOW · status: unpromoted (promote via mr-gates when scheduling)
EARS: WHEN a recruit succeeds with fainted party members THE SERVER SHALL apply the same wild-battle faint trust penalty as any other battle end.
touches: server-module/src/taming.rs, server-module/src/battle.rs, server-module/src/taming_tests.rs

Recruit success skips the wild-battle faint trust penalty. taming.rs attempt_recruit success arm calls battle::write_back_party_hp directly (HP only, no XP by design), so fainted party members on a successful recruit never receive the trust_unfavorable_count increment that write_back_battle_results applies on loss, flee and disconnect (battle.rs faint-penalty pass). Found by the reducer-security-auditor on 21r-a; pre-existing, outside the slice's EARS. Co

### R-21r-a-TERMINALSWEEP — R-21r-a-TERMINALSWEEP
category: data-integrity · severity: LOW · status: unpromoted (promote via mr-gates when scheduling)
EARS: WHEN a recruit succeeds THE SERVER SHALL sweep the player's prior terminal battle rows exactly as write_back_battle_results does.
touches: server-module/src/taming.rs, server-module/src/battle.rs, server-module/src/taming_tests.rs

Recruit success never sweeps the player's prior terminal battle rows. The prior-terminal GC sweep lives only in battle::write_back_battle_results; the recruit success arm uses write_back_party_hp, so a player who ends battles by recruiting accumulates terminal battle rows until a loss/flee/attack-win next sweeps them. The comment at battle.rs ~1170 ('exactly one terminal battle remains per player', listing taming::attempt_recruit as a caller) is false for the succes

### R-21r-a-CONTENTLOAD — R-21r-a-CONTENTLOAD
category: gameplay · severity: LOW · status: unpromoted (promote via mr-gates when scheduling)
EARS: WHEN attempt_recruit runs THE SERVER SHALL load content before consuming bait and rolling, so a content error never costs a consumed bait.
touches: server-module/src/taming.rs, server-module/src/taming_tests.rs

attempt_recruit loads content after consuming bait and rolling. On the failed-roll path taming.rs calls cached_skills()?, cached_type_chart(ctx)?, cached_abilities()? AFTER consume_one(bait) and after the roll. Under a content fault those ? abort and roll back failures (bait refunded, battle Ongoing) while successes commit: a server-side-fault-only free-reroll primitive. Found by the reducer-security-auditor on 21r-a; pre-existing. Fix: hoist the three content

### R-21r-a-WBALERT — R-21r-a-WBALERT
category: loop-ops · severity: LOW · status: unpromoted (promote via mr-gates when scheduling)
EARS: WHEN *_writeback_err events are emitted THE OPS STACK SHALL surface them (a dashboard panel or alert consuming all seven sites).
touches: ops/observability/

No alert or dashboard consumes *_writeback_err events. Six log-and-commit sites now emit submit_attack_/swap_active_/flee_/recruit_success_/recruit_fail_writeback_err (plus wild_disconnect_writeback_err via bare log::error!, not mr_log). ops/observability has no Prometheus rule or Grafana panel on them; Alloy labels evt generically, so a persistent invariant fault (partial HP write-backs, orphaned battle_wild on a coupling Err) is visible only by sear
