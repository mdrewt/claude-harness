# Loop prompt — author or elaborate a Monster Realm (v2) milestone spec

Run in the harness root; spec artifacts live in `specs/monster-realm-v2/`. This loop AUTHORS
SPECS — it writes no game code. As of the 2026-09 revision, M0–M25(S0) are built; this loop's
remaining work is elaborating the post-gate sketches (M18, M19), authoring
M-postgate-client-coverage when reached, and any future milestone the operator adds to PLAN §9.

## Grounding — read before each milestone, fresh

- `PLAN.md` — the roadmap (§9) and live constraints. Authoritative for order and scope.
- **The game repo itself** (`projects/monster-realm/`): `ARCHITECTURE.md` and `docs/DECISIONS.md`
  are the current-state truth. **Never design against an archived spec** — the code moved on.
- `standards/` (principles, spec-driven, **testing-tdd — the verification SSOT**, decisions,
  security, contracts, observability, domain/game) and `docs/routing.md` for effort.
- `game-design.md` (design intent; fusion → catalyst evolution, Bond retired),
  `netcode-quality-review.md` (the smoothness contract), `security-threat-model.md`.
- Archived specs and design ADRs (`archive/`, `archive/adr/`) are historical reference only.

## Per-milestone procedure

1. **Verify scope.** Re-read PLAN §9's line and the milestone's sketch. State what is IN, what
   is a **named deferral** (declared, not dropped), and confirm it fits the spine (functional
   core / imperative shell; rules live once in `game-core`; server authority; battles
   server-resolved). **Design for the known endpoint**: shape any new table/system so later
   extensions are additive, never a re-key (additive-schema discipline).
2. **Research, then draft** `M{N}-{kebab-name}.spec.md` per `standards/spec-driven.md`:
   Problem/intent · Scope (in/out + named deferrals) · **Acceptance criteria (EARS)** — concrete,
   testable, security (`ctx.sender()`, reject-never-clamp) and determinism criteria where they
   apply, netcode-smoothness criteria for any movement/render surface · Plan (API/table/data
   sketches, version-sensitive SpacetimeDB flags, a "what the next milestone consumes" boundary
   preview) · Tasks as small vertical slices (`M{N}a/b/…`), **each with an explicit `touches:`
   path-set** along natural module boundaries so disjoint slices can fan out; slice order follows
   the real dependency chain (rule → reducer → client), not just file-disjointness · Risks/decisions.
3. **Review lenses**: reviewer + red-team + `/simplify` on the draft, against `standards/` and
   the M{N}→M{N+1} boundary. Apply real findings; note what changed.
4. **Document.** A `docs/DECISIONS.md` entry in the game repo is the BUILD slice's job, not the
   spec's; the spec just names the fork it resolved. Update PLAN §9's one line. Reconcile any
   earlier live spec the design touched. Never mint numbered records.
5. **Verify & advance.** Check the Definition of done below, then present the spec with a tight
   summary and any flags for the operator.

## Definition of done for a spec

- Scope explicit; every out-of-scope item a named deferral with a target.
- EARS criteria each testable as an **ordinary colocated test** (`standards/testing-tdd.md`:
  no eval scripts, no source-text scans, no checks-of-checks, no coverage/mutation thresholds;
  user-facing criteria verified through the real UI, one e2e per flow).
- Tasks sliced with `touches:`; a **post-integration verification plan** (full `just ci` green,
  `bindings-drift` clean, the combined behavior satisfies the EARS end-to-end — not merely each
  slice green alone).
- Risks/decisions recorded; PLAN §9 line updated; no contradictions left in live files.

## Cross-cutting invariants (apply where the milestone adds the thing)

- **New world table** → indexed `zone_id`; **additive only**; stable ids append-only;
  `sync_content` + re-derive if content-derived; migration proven by publish-over-data.
- **New reducer** → identity only from `ctx.sender()`; intent-only; re-validate ownership and
  legality against authoritative state; **reject, never clamp**; structured fail-loud log on
  `Err`; a native-host or integration test that calls it wrong and asserts refusal.
- **New content** → RON in `game-core`, pure loader, `validate_content` integrity.
- **Owner-private data** → the private-table + owner-scoped-view pattern (DECISIONS.md "Table
  privacy"); RLS is unenforced at the pinned SpacetimeDB and is never the boundary. The client
  never receives hidden state; the `client-surface-privacy` machine-contract eval pins the
  visible surface (rely on it; never extend it).
- **Shared `game-core` change** → rebuild wasm + regenerate bindings; impact analysis across the
  marshaling boundary; a parity test if the rule is client-predicted.
- **Movement/render touch** → preserve the smoothness contract (decoupled slide clock,
  interpolation buffer, atomic reconcile snapshot, bounded prediction).
- **Concurrency/multiplayer surface** → a sim-harness load check within budget; RED metrics and
  structured logs on new reducers (observability seam, never in-module timing).

## When to ask the operator

Only at a genuine fork that is theirs (scope/ambition, contested design, gameplay feel with no
disciplined default). Otherwise pick the disciplined default, state it in Risks/decisions, and
keep moving — flagged, so they can object.

## Milestone notes

- **M18 co-op raids** (sketch; design ADR-0027 in `archive/adr/`): two allies vs an AI boss via
  an additive `resolve_coop_turn`; both-submit; shared XP; `is_raid` additive on the battle row;
  degrade gracefully to one ally. v1 precedent exists (the v1 tutorial's raid chapter is fair
  reference); post-gate provisional — spec only after the playtest-3 read.
- **M19 guilds/chat/social** (sketch; design ADR-0028): no precedent — extra care on the forks
  (chat model, moderation hooks, untrusted-content discipline, guild membership/roles; M23's
  social a11y retrofit un-defers with it). Post-gate provisional.
- **M-postgate-client-coverage**: extract inline decision logic from `main.ts` /
  `battleView.ts` / `boxView.ts` into pure, tested `*Model.ts` cores. The measure of done is
  reviewable testable cores, not a coverage number.

End condition: PLAN §9 lists no unspecced milestone the operator has greenlit. Summarize what
was produced and every flag awaiting the operator.
