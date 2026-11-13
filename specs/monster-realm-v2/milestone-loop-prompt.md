# Loop prompt — author or elaborate a Monster Realm (v2) milestone spec

Run in the harness root; spec artifacts live in `specs/monster-realm-v2/`. This loop AUTHORS
SPECS — it writes no game code. As of the 2026-09 revision, M0–M25(S0) are built; this loop's
remaining work is elaborating the sketches (M-gamepad, M18, M19) and any future milestone the
operator adds to PLAN §9. M-postgate-console-controls and M-postgate-client-coverage are specced.

## Grounding — read before each milestone, fresh

- `PLAN.md` — the roadmap (§9) and live constraints. Authoritative for order and scope.
- **The game repo itself** (`projects/monster-realm/`): `ARCHITECTURE.md` and `docs/DECISIONS.md`
  are the current-state truth. Closed milestones have no spec: design against the code.
- `standards/` (principles, spec-driven, **testing-tdd — the verification SSOT**, decisions,
  security, contracts, observability, domain/game) and `docs/routing.md` for effort.
- `game-design.md` (design intent; fusion → catalyst evolution, Bond retired),
  `netcode-quality-review.md` (the smoothness contract), `security-threat-model.md`.

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
   preview; the contract of every interface a slice adds; numbers as absolute budgets or a
   first-slice baseline, per `standards/spec-driven.md` §Rules) · Tasks as small vertical slices (`M{N}a/b/…`), **each with an explicit `touches:`
   path-set** along natural module boundaries so disjoint slices can fan out; slice order follows
   the real dependency chain (rule → reducer → client), not just file-disjointness · Risks/decisions.
   A feature slice's `touches:` lists the files its design names and every file a sibling slice
   also edits, because fan-out reads it. The pins and callers that only a build-time measurement
   (a probe, a red test, a compile error) reveals are added by the build itself
   (`memory/projects/mr-touches widen`), so the list carries no guesses. CI, hook, `justfile` and
   test-runner config files are never added that way: a slice that changes one declares it.
   **Structure pass** — do it before slicing; you and step 3's lenses judge it, never a script:
   - Read in full every production file two or more slices would touch.
   - New logic and state go in a named module. A file that already holds several
     responsibilities (`client/src/main.ts` is the standing case) receives wiring only: an import
     and a registration call.
   - When two or more slices would add to one production file, slice 1 is a `type: refactor`
     slice (`standards/spec-driven.md` §Refactor slices) that moves the existing code they extend
     into the module they land in and names the slices that depend on it; those slices list the
     new module in `touches:`. Where nothing existing moves, the first feature slice creates the
     module. It
     relocates no shared mutable state whose owner is unrecorded.
   - A slice that depends on an internal-design choice nobody has recorded (state ownership, a
     large file's seams, an extracted module's interface, dependency direction, which duplicate
     survives) waits on a `type: design` slice (`standards/spec-driven.md` §Refactor slices): add
     one to `structure.spec.md` and list it in `after:`. That is the loop's decision to make,
     never an operator question; a choice that affects one small move is one line in that
     slice's section instead.
   - A slice either moves code or changes an interface, never both. Mark each
     `type: refactor · tier: routine` (a move) or `type: refactor · tier: hard` (an interface or
     ownership change, or a move of code that writes state its old file keeps) beside `touches:`.
   - For every slice that moves code, grep for the pins: tests that read the moved source as
     text and assert on the moved lines (`readFileSync`, `include_str!`), `.cargo/mutants.toml`
     entries naming a moved function, and e2e helpers. List each in `touches:` and name it in the
     spec with its disposition per `standards/testing-tdd.md` §Behavior-preserving changes:
     replace, re-point, or delete with its named survivor. A mutants entry is re-keyed in that
     slice without the file name (`:\\d+:<col>: replace … in <function>`).
   - A refactor slice's `touches:` names its source and destination files literally and test
     families as globs with a literal directory prefix (`client/src/main.*.test.ts`), never a
     bare directory, which hides what the slice needs.
   - Before a slice adds a test or e2e helper, grep for its name; if two definitions exist, the
     slice imports or extends the shared util (`client/test-util/`, `client/e2e/controls.ts`).
   - Structural work the read finds outside this milestone's scope goes to `structure.spec.md`:
     at most three `type: refactor` sections in this same PR, each anchored on exported symbols
     and naming the tests that already cover the moved behaviour. Never a residual row. When a plan
     file under the game's `docs/refactors/` lists extractions not yet sectioned there, those
     come first.
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
- Every slice adding to a production file that two or more slices touch names its destination
  module, or gives one line on why no seam exists yet; every slice that moves code is
  `type: refactor` with its tier, pins and measured `touches:`.
- Risks/decisions recorded; PLAN §9 line updated; no contradictions left in live files.
- Every `blocked:` names its lifting event, who lifts it and a fallback; every follow-up is a
  tracked row.

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

Only at a genuine fork that is theirs (scope/ambition, contested game design, gameplay feel with no
disciplined default). Otherwise pick the disciplined default, state it in Risks/decisions, and
keep moving — flagged, so they can object. Internal code design is never theirs (step 2, structure
pass).

## Milestone notes

- **M18 co-op raids** (sketch): two allies vs an AI boss via
  an additive `resolve_coop_turn`; both-submit; shared XP; `is_raid` additive on the battle row;
  degrade gracefully to one ally. v1 precedent exists (the v1 tutorial's raid chapter is fair
  reference); post-gate provisional — spec only after the playtest-3 read.
- **M19 guilds/chat/social** (sketch): no precedent — extra care on the forks
  (chat model, moderation hooks, untrusted-content discipline, guild membership/roles; M23's
  social a11y retrofit un-defers with it). Post-gate provisional.
- **Controls model (all client milestones):** the client's primary interface is the virtual
  D-pad + A/B/X/Y/LB/RB/Start/Select defined by `console-controls-design.md` (operator directive
  `operator-feedback-2026-10-01-controls.md`). Any new screen is a frame on the context stack,
  navigable by D-pad + buttons; never add a mandatory single-purpose hotkey (accelerators are
  optional and remappable).
- **M-gamepad** (sketch): controller support as one more input source on the virtual-button
  layer; must land before early access. Elaborate after M-postgate-console-controls merges.
- **M-postgate-client-coverage**: specced and re-scoped 2026-10-01 (pgcc-b superseded by the
  controls milestone).

End condition: PLAN §9 lists no unspecced milestone the operator has greenlit. Summarize what
was produced and every flag awaiting the operator.
