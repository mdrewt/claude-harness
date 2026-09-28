# Residuals — open follow-ups only

Open residuals only — a closed item's section is deleted; git history is the record;
categories/severity per standards/testing-tdd.md protected categories.

Each section is written by `mr-gates residuals promote` from a DEFER that carried a
`[category/SEVERITY]` tag, and removed by `mr-gates residuals close` (or `residuals sweep
--apply`). Findings about the checking apparatus are never tracked here, and a slice promoted
from a residual may not spawn another one.

<!-- PROMOTED SECTIONS APPEND BELOW THIS LINE -->

### rb-92 — R-rb-52-GRACEANNOUNCE
category: ux-a11y · severity: MED · status: promoted

When an account moves from active to deletion-grace (including via another session's sync), screen-reader users hear nothing. The countdown banner (client/src/main.ts:2899) is silent by design, and no one-shot announcement fires through client/src/ui/liveRegion.ts. Add a one-shot, edge-triggered announcement of the grace deadline.

### rb-94 — R-rb-53-E1
category: ux-a11y · severity: LOW · status: promoted

When a data export finishes assembling (incomplete to complete), screen-reader users get no announcement. The status label in client/src/ui/privacyBanner.ts just updates in place. Add a one-shot announcement on that edge through the single live region in client/src/ui/liveRegion.ts.

### rb-98 — R-rb-56-FOLLOWUP-ACC
category: ux-a11y · severity: MED · status: promoted

Battle skill buttons show accuracy only in the hover title (client/src/ui/battleView.ts:484), so touch, keyboard-without-hover and screen-reader users never get it. Add accuracy to the visible label, after the existing text so the ^Submit: start-anchored matchers keep working (constraint noted at :470-473), by extending battle.skill.pvpSubmit/pveLabel in client/src/ui/i18n/catalog.en.ts.

### rb-99 — R-rb-57-X4
category: ux-a11y · severity: LOW · status: promoted

A sprite's action (Idle/Walking/Jumping) exists only as a visual glyph (client/src/render/placeholderAssets.ts). CharacterView.update() (client/src/render/characterView.ts:47) sends nothing to the accessibility tree, so screen-reader users can't tell what a character is doing. Expose it through PixiJS AccessibilitySystem properties or a DOM/live-region mirror. LOW because actions are cosmetic movement states.

### rb-100 — R-rb-59-X6
category: ux-a11y · severity: LOW · status: promoted

In PvP the opponent card header is just the rival's player name (client/src/ui/battleView.ts:304-306). The "Opponent" role only comes through layout, so screen readers hear a name with no role. Name the role in the header text (for example "Opponent: <name>") or set an accessible label on #opponentCardEl.

### rb-101 — R-rb-65-RUNBOOK-LOGCAVEAT
category: security-privacy · severity: LOW · status: promoted

docs/runbooks/observability-dr.md §8 lists where an erased account's Identity survives (shared historical rows, backups) but leaves out the operational log. The deletion cascade logs one account_deletion_cascade line containing the subject's Identity (server-module/src/accounts.rs:787-788,1054), and Loki keeps it 30 days. Add that caveat to §8.

### rb-102 — R-rb-73-ABORT-PHANTOM
category: data-integrity · severity: MED · status: promoted

If a client_disconnected transaction aborts (host or datastore failure; no reachable panic today), the host still drops the st_client row but the rolled-back delete leaves a phantom player_session row. Nothing drains it (server-module/src/lib.rs:143-194,260-268), so has_live_session (:277) stays true for that identity and every later disconnect skips resolving trades, PvP, wild battles and challenges and deleting presence rows. Fix: drain stale sessions at init/sync_content, or reconcile against the host's live client set.

### rb-103 — R-rb-73-TOKEN-WEDGE
category: security-privacy · severity: LOW · status: promoted

Last-connection-out gating (server-module/src/lib.rs:300-322) means anyone holding a live WebSocket as an identity stops that identity's other disconnects from running cleanup. Wild battles and presence rows have no independent reaper while that socket stays open. LOW: holding the token already means holding the account. Track together with the wild-battle reaper gap (R-rb-73-WILD-HOLD).

### rb-104 — R-rb-73-WILD-HOLD
category: gameplay · severity: LOW · status: promoted

No scheduled reaper covers Ongoing wild battles (server-module/src/battle.rs:1420-1428). The disconnect resolver is the only exit, so if a disconnect is skipped (a second live socket, a phantom session, or a token holder) the wild battle stays Ongoing and is_in_ongoing_battle blocks new encounters. The player can still flee once reconnected, so this is self-inflicted and not a hard lock. Add an idle reaper for wild battles.

### rb-105 — R-rb-76-CHALLENGERGRACE
category: security-privacy · severity: LOW · status: promoted

Requesting deletion (server-module/src/accounts.rs:850) leaves the requester's outbound Pending battle_challenge rows alive, and accept_challenge (server-module/src/pvp.rs:964-1025) checks only the accepting target. So a third party can open a new Ongoing battle naming an account that is in its deletion grace period. Fix without leaking A's state to B: consume or disarm A's outbound Pending challenges at request time.

### rb-106 — R-rb-83-CHALLENGELAUNDER
category: security-privacy · severity: LOW · status: promoted

cancel_account_deletion sweeps post-request trade offers (server-module/src/accounts.rs:907-910) but not battle_challenge rows. A deletion-gated target can cancel, accept a challenge opened during grace, and request deletion again. That is the trade-launder shape, with the trade fix never applied to PvP. Add a matching challenge sweep at cancel time, or a stamp-aware accept gate using require_commitment_predates_deletion (server-module/src/guards.rs:123).

### rb-112 — R-rb-86-TICKBOUND
category: data-integrity · severity: LOW · status: promoted

export_bundle_reaper limits deletes to 16 stamps (bundles) per tick (server-module/src/privacy.rs:1710,2023-2025) with no cap on rows per bundle. Enough large bundles could exceed the transaction budget, and then the tick aborts and retries the same head-of-range work every hour, so expired export copies (personal data) are never purged. LOW because it needs very large exports. Fix: cap deleted rows per tick, or allow partial-stamp progress with a resume point.

### rb-126 — R-20r-d-B1-ack
category: ux-a11y · severity: LOW · status: promoted

With two sessions on one identity, `ack_evolution_notices` in server-module/src/evolution.rs:347 drains the first `count` entries by position. A tab acking a stale head can silently remove an evolution reveal banner that no session displayed. The evolution itself persists; only the notice is lost. Fix: key the ack by (monster_id, evolved_at_ms) or a sequence number. That adds a reducer parameter, which means a bindings regen.

### rb-127 — R-20r-d-B1-cap
category: data-integrity · severity: LOW · status: promoted

`pending_evolution_notice.entries` in server-module/src/evolution.rs:202-217 grows by one entry per evolution and has no cap, for a player who never acks. Growth is self-inflicted only, bounded by owned monsters x evolution tiers, and removed by the deletion cascade. Any cap must drop the newest entry, never the oldest.

### rb-133 — R-rb-107-REJECTWALK
category: security-privacy · severity: LOW · status: promoted

In `request_data_export` (server-module/src/privacy.rs:1540), a caller whose bundle is larger than the minimum and lands in the near-cap band is rejected by the second admission gate (:1604) only after the full export walk, including two full-table scans. Because the reject writes no rows, the 60s cooldown never engages. That caller can repeat the expensive walk on every call while the store is near cap: a bounded CPU/availability amplification.

### R-rb-107-BYTEBOUND — R-rb-107-BYTEBOUND
category: security-privacy · severity: LOW · status: unpromoted (promote via mr-gates before launching)

The global `export_bundle` admission cap (server-module/src/privacy.rs:1733) counts chunk rows, not bytes. Each chunk can carry up to `game_core::EXPORT_CHUNK_ROWS` (500) serialized rows, so nothing measures or limits the store's byte size. It is only indirectly limited by row cap x widest chunk. This is a storage-exhaustion ceiling gap.

### R-rb-111-CONTENTION — R-rb-111-CONTENTION
category: security-privacy · severity: LOW · status: unpromoted (promote via mr-gates before launching)

`request_data_export` (server-module/src/privacy.rs:1587) refuses a legitimate caller with `export_reject_stamp_contention` whenever every millisecond in the 16ms creation-stamp probe window is already taken. Needs a burst of at least 1 bundle/ms across many identities. The refusal is retryable and short, and the window is not tiered by caller type, so sybils can briefly crowd out account holders.

### R-rb-111-STAMPORACLE — R-rb-111-STAMPORACLE
category: security-privacy · severity: LOW · status: unpromoted (promote via mr-gates before launching)

The export stamp is now+k where k counts consecutive milliseconds already holding some other owner's live bundle (privacy.rs:1216). The stamp is readable by its owner, so it leaks up to 4 bits of anonymous third-party export timing. Negligible on its own; fix by scoping the probe to the owner, or accept and document it.

### R-rb-121-DEFER-FOCUS-RECHECK — R-rb-121-DEFER-FOCUS-RECHECK
category: ux-a11y · severity: LOW · status: unpromoted (promote via mr-gates before launching)

In client/src/ui/overlayA11y.ts:134, the setTimeout(0) focus callback does not check document.activeElement when it fires. After a lock-settle re-open (evolutionView/battleView #reanchorStrandedFocus), a click that lands inside the overlay in the same macrotask gets its focus pulled to the initial anchor. Fix: skip the move when activeElement is a connected element inside root.

### R-rb-125-X7 — R-rb-125-X7
category: ux-a11y · severity: LOW · status: unpromoted (promote via mr-gates before launching)

When an evolution reveal is shown (client/src/ui/evolutionNotice.ts banner), the client should play a reduced-motion-aware transformation sequence before the reveal sentence, with new catalog.en/fr copy. Spec'd feature polish (M-evolution-essence-graph.spec.md:148); the minimal banner is the accepted default for now.

### R-rb-128-E1 — R-rb-128-E1
category: gameplay · severity: MED · status: unpromoted (promote via mr-gates before launching)

A player who reloads or drops during the deletion grace period loses their avatar: on_disconnect deletes the player row (lib.rs:319) and join_game refuses during PendingDeletion (movement.rs:48). After cancel_account_deletion the client never re-issues joinGame when my_account goes back to Active (connection.ts:660), so the avatar only comes back on reload. The claim-flow join (main.ts:498) also has no .catch.

### R-rb-128-X1 — R-rb-128-X1
category: netcode-determinism · severity: LOW · status: unpromoted (promote via mr-gates before launching)

A connected player whose deletion is pending and who holds a movement key gets one predicted step plus a snap-back per round trip, and one log_reject line per refused enqueue_move (movement.rs:129). There is no desync. Fix by blocking movement input on the client through a predicate exposed from game-core/client-wasm, not a TypeScript copy of the rule.

### R-rb-128-X2 — R-rb-128-X2
category: ux-a11y · severity: LOW · status: unpromoted (promote via mr-gates before launching)

The deletion-gated reject reason (guards.rs:75-76) names only trades, battles and challenges, yet it now fires on join, move, raise, evolve, rename, party edits, recruit and dismiss. Players see a misleading message. Reword it generically and update the tests that pin the exact string.

### R-rb-132-NEWCOMERSHED — R-rb-132-NEWCOMERSHED
category: security-privacy · severity: LOW · status: unpromoted (promote via mr-gates before launching)

Guests with neither an account nor a wallet row are refused data export once live export_bundle rows reach the newcomer quarter of the cap (privacy.rs:1741, 1753), even under purely organic load. Mitigation needs either a reserved newcomer floor (new state) or telemetry showing refusals by tier.

### R-rb-132-WALLETSYBIL — R-rb-132-WALLETSYBIL
category: security-privacy · severity: MED · status: unpromoted (promote via mr-gates before launching)

Any identity can buy the anonymous export tier cheaply and permanently: one quest_001 Talk, or a single currency unit passed along a trade chain, creates a wallet row that is zeroed but never deleted (economy.rs:279). So a sybil fleet can fill the anonymous half of the export cap (privacy.rs:1736, 1753) and lock guests out of data export. A real fix needs authentication (guest claim) or persistent per-identity state (a schema change). [Triage note: downgraded from the row's HIGH — availability-only, guest export path only, ~1,264 identities sustained 7 days, no disclosure.]

