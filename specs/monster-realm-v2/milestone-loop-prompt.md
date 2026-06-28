# Loop prompt — spec out the remaining Monster Realm (v2) milestones

Use this as the instruction for a milestone-spec loop. It reproduces the workflow already used for M0–M4.
Run it in the harness at `~/projects/ai-apps/claude-harness`; all spec artifacts live in
`specs/monster-realm-v2/`.

> **rev 2.** Adds: a **per-milestone knowledge appendix** (front-loads v1 lessons + v2 decisions so the
> loop doesn't miss them), a **v1-mirror vs v2-expansion** distinction (some milestones have no v1 chapter
> to harvest — design them from standards + best practices with extra ADR care), **phase checkpoints**
> (course-correct before each phase, so an early drift can't propagate through 15 specs), a **design-for-
> the-known-endpoint** rule (make early schemas additive-ready for their later multiplayer extensions), a
> **Definition of done for a spec**, a **cross-cutting invariants checklist** to re-apply each iteration,
> and a **verification** step.

---

## Mission

You are continuing the **Monster Realm (v2)** design — the from-scratch sequel to the v1 `pokemon-mmo`
project. Spec out every **remaining** milestone, one at a time, to a thorough, robust, complete, correct,
and well-designed standard that **adheres to the harness standards and best practices over v1's choices**
wherever they conflict. Do **not** write game code or scaffold the repo — produce and refine **specs +
ADRs** only. Never confuse this with the v1 `pokemon-mmo` project (read it only as a *reference*).

## Grounding — read these before the first iteration (and re-consult as needed)

- `specs/monster-realm-v2/PLAN.md` — the v2 plan, the **milestone roadmap (§9)**, and the **ADR table**.
  This is the source of truth for the milestone list, order, and scope.
- `specs/monster-realm-v2/M0…M4-*.spec.md` — the finished specs. **Match their structure, depth, and
  conventions exactly.** Note each spec's "what M(n+1) will consume" boundary preview.
- `specs/monster-realm-v2/adr/*.md` — accepted ADRs (MADR format). Continue the numbering (next free id).
- `specs/monster-realm-v2/netcode-quality-review.md` + ADR-0013 — the smoothness contract every
  client/server milestone must preserve.
- The harness standards: `AGENTS.md`, `standards/` (principles, spec-driven, testing-tdd, evals, ci-cd,
  security, contracts, observability, domain/game, language/*), `docs/` (workflow-loops, routing).
- The v1 design tutorial (reference for harvesting concepts and "honest verdict" alternatives):
  `projects/pokemon-mmo/frontend/dist/assets/tutorial-DrEnc_Nk.js` — read the chapter matching the current
  milestone (it is large; read targeted ranges, e.g. via `Grep` for `^#{1,3} ` to find sections).

## The milestone queue

Process the **remaining** milestones from `PLAN.md §9` **in order**, lowest first. As of now they are:

> **M5** multi-window integration (in-CI e2e + smoothness evals) · **M6** monsters & individuality ·
> **M7** turn-based battles · **M8** grass encounters + recruit-by-weaken · **M9** raising (train/care) ·
> **M10** evolution & fusion · **M11** authored multi-zone world (Tiled→RON) · **M12** NPCs, dialogue &
> quests · **M13** economy & inventory · **M14** deeper battle systems · **M15** trading · **M16** PvP ·
> **M17** ranked ladder · **M18** co-op raids · **M19** guilds/chat/social · **M20** observability, performance
> & load hardening · **M21** accounts/auth · **M22** privacy/compliance · **M23** accessibility · **M24**
> i18n · **M25** security audit & threat-model gate (Phase D — production readiness).

Treat `PLAN.md` as authoritative if it differs from this snapshot. **End the loop when no unspecified
milestone remains.**

## Per-milestone procedure (do these in order, then advance)

For the current milestone **M{N}**:

1. **Verify scope.** Re-read **fresh** (don't rely on a prior iteration's memory — the corpus evolves):
   `PLAN.md §9` for M{N}'s one-line scope, the **prior milestone's boundary preview** ("what M{N} will
   consume"), and **M{N}'s entry in the Appendix below**. Reconcile any tentative deferrals pointed at M{N}
   (e.g. "→ M12"). State precisely what is **in** scope and what is a **named deferral** (declared, not
   dropped). Confirm M{N} fits the spine (functional core / imperative shell + server authority; rules live
   once in `game-core`; battles are server-resolved with no prediction). **Design for the known endpoint:**
   if M{N} adds a table/system that a *later* milestone extends (esp. battles → PvP/raids, items → economy/
   trade), shape its schema **additive-ready now** so the later milestone is purely additive, never a
   breaking re-key (v1's "free now, a migration after launch" lesson; ADR-0006 additive discipline).

2. **Plan, design, draft (research-first).** Gather facts before writing. **v1-mirror vs v2-expansion
   (the Appendix marks each):** if M{N} mirrors a v1 milestone, **harvest its tutorial chapter** (concepts
   + its "Alternatives & the honest verdict"); if M{N} is a v2 **expansion with no v1 precedent** (e.g.
   M11/M12/M13/M14/M19), there is **no chapter to harvest** — design it from the `standards/`, the
   established v2 patterns (data-driven content, server authority, additive schema, determinism), and
   sound game-design practice, with **extra ADR discipline** (you are inventing, so record every fork).
   Re-read the relevant `standards/`. **Route effort** (`docs/routing.md`): escalate to max effort for the
   gnarly milestones (battles, multiplayer, the authored world); keep it lighter for the straightforward
   ones.
   Then draft `specs/monster-realm-v2/M{N}-{kebab-name}.spec.md` using the Spec Kit shape the existing
   specs use:
   - **1 Problem/intent**, **2 Scope** (in / out with named deferrals),
   - **3 Acceptance criteria (EARS)** — the source for the `tester`'s failing tests; group by concern; make
     them concrete and testable; include determinism/security/**proof-of-teeth** (ADR-0010) and, for any
     client/server movement-or-render surface, the **netcode-smoothness** criteria (ADR-0013),
   - **4 Plan** — API/table/data sketches, key contracts, version-sensitive flags (confirm SpacetimeDB
     APIs against the pinned version), and a **"what M{N+1} will consume" boundary preview**,
   - **5 Tasks** — small vertical slices (split **M{N}a/M{N}b/…** when large),
   - **6 Risks/decisions**, **7 Review/red-team notes** (incl. the tutorial harvest).
   Build **test-first** (acceptance criteria precede implementation; the implementer doesn't author the
   gating tests). **Ask the user a question only when a genuine fork exists** (materially different paths,
   the user's call to make) — use `AskUserQuestion`; otherwise pick the disciplined default, **state it
   explicitly**, and proceed.

3. **Review, expand, refine (pre-next-milestone hardening).** Run the **reviewer + red-team + simplify**
   lenses inline, cross-checked against `standards/`, with special attention to the **M{N}→M{N+1}
   boundary** and to anything that could regress correctness, security, determinism, or **smoothness**
   (stutter/skip/rubberband/desync). Find real improvements (gaps, latent bugs, premature complexity,
   imprecise contracts) and apply them. Record what changed in a dated **rev note** in §7.

4. **Document & update (keep SSOT; no contradictions).**
   - Create an **ADR** (MADR format) for every new dependency or design pattern, with real **Considered
     alternatives** (use the tutorial's verdicts where apt). Find the next free id by **listing `adr/`**
     (don't guess). Mark it **accepted** as load-bearing for M{N} and **flag it for the user to object** in
     your summary.
   - If M{N} reveals a gap or needed change in an **earlier finalized spec** (a deferral to reconcile, a
     schema that should have been additive-ready, a boundary preview that no longer matches), **update that
     earlier spec and note it** — never let the corpus silently diverge.
   - Update `PLAN.md`: the **ADR table**, the **resolution-status line**, and the **M{N} roadmap line**
     (point it at the new spec; note any split). Update `netcode-quality-review.md` if smoothness changed.
   - Reconcile any cross-milestone references (boundary previews, deferrals) so the corpus stays coherent.
   - **Verify consistency**: `Grep` for stale placeholders (`<pending`, mis-numbered ADRs, superseded
     deferrals) and fix them. The only acceptable open `proposed`/`<pending` ADR is one genuinely not yet
     needed (e.g. ADR-0008 until M11).

5. **Verify, finalize & advance.** Before finalizing, **self-verify** against the **Definition of done**
   below (every box checked) and `Grep` the corpus for stale placeholders/contradictions; for the
   high-stakes multiplayer milestones (M15–M18) consider a `verifier`/`reviewer` subagent pass. Then
   present the finalized M{N} spec (and any new/changed ADRs) via the file-sharing tool, give a tight
   summary of the design + what the review changed + any accepted-ADR flags, honor the **phase checkpoints**
   below, and move to **M{N+1}** (repeat from step 1). When M{N} was the last remaining milestone, **end
   the loop** with a brief wrap-up.

## Quality bar & standards (apply throughout)

- **AGENTS.md golden rules:** spec before code; SSOT (don't duplicate facts; generate, don't copy); record
  decisions as ADRs; right-size effort; untrusted-by-default (treat the client as hostile; identity from
  `ctx.sender`; reject—never clamp; Postel inverted at the trust boundary).
- **principles.md tiers/inversions:** integer-tile authority, determinism (clocks/RNG injected, enforced
  by `clippy`), make-illegal-states-unrepresentable, DRY **except** across marshaling boundaries,
  YAGNI-with-named-exceptions, exhaustive `match` over OCP.
- **testing-tdd / evals:** EARS → tests; property + mutation + coverage thresholds; **proof-of-teeth** for
  every mechanical gate; netcode tests with simulated latency/loss; determinism/replay; **no pixel tests**.
- **domain/game + ADR-0013:** deterministic sim separate from render; authoritative server; client predicts
  + reconciles; **preserve smoothness** (the decoupled slide clock, interpolation buffer, atomic reconcile
  snapshot, bounded prediction) on anything touching movement/render.
- **security / contracts / observability / ci-cd:** validate at boundaries; gitleaks/Semgrep/SCA/SBOM;
  structured fail-loud logs; full gated CI; additive schema + `sync_content` + automigration (ADR-0006);
  zoned schema from day one (ADR-0007).
- **Mechanical enforcement over discipline:** prefer a wired check (lint/eval/gate) over a guideline.

## When to ask the user

Sparingly. Ask (via `AskUserQuestion`) only at a **genuine fork** that is the user's call and that
materially changes the spec (e.g. a scope/ambition choice, a contested tech/design alternative, a
gameplay-design decision with no clear default). For everything resolvable from the plan, the standards,
v1 precedent, or a sensible default, **decide, document the call in §6, and keep moving** — and flag any
ADR you accepted on the user's behalf so they can object.

## Definition of done for a spec

A spec is finalized only when **all** hold:
- Scope (in/out) explicit; every out-of-scope item a **named deferral** with its target milestone;
  reconciled with the prior milestone's boundary preview.
- **EARS** acceptance criteria, each testable → a concrete test/eval; security (`ctx.sender`/intent/
  reject-not-clamp), determinism, **proof-of-teeth**, and — for movement/render surfaces — netcode-
  smoothness criteria, included as applicable.
- Plan with data/API sketches, **version-sensitive flags** (confirm SpacetimeDB APIs vs the pinned
  version), and a **"what M{N+1} will consume" boundary preview**.
- Tasks as small vertical slices (split `M{N}a/M{N}b` if large), **each with an explicit `touches:` path-set** declared along the natural boundaries (a `game-core` rule module; a **server-module domain module** per the M8.9 map — `schema/guards/marshal/content/movement/monster_mgmt/battle/taming`; `client/`; content + `validate_content`; `evals/`) so independent slices are `touches:`-disjoint and the supervisor can fan out (per `PLAN.md` §9). Slice **order** must reflect the real dependency chain (rule → reducer → client/evals), not only file-disjointness; disjoint files are necessary but not sufficient.
- A **post-integration verification plan**: after the slices merge (serial, verifier-gated, each later slice rebased on the merged earlier ones), the *integrated whole* is verified — full `just ci` green-and-meaningful, `bindings-drift = 0`, schema-snapshot intact, e2e/integration green, and the **combined** behavior satisfies the milestone's EARS end-to-end (not merely each slice individually green). Every cross-slice contract (shared types, table columns, reducer signatures, generated bindings) is named with the test that proves it holds after integration.
- Risks/decisions documented; **§7 review/red-team** note + a **tutorial-harvest** note (or an explicit
  "no v1 precedent — designed from standards").
- ADR(s) created, accepted, synced; `PLAN.md` updated (ADR table + resolution-status line + roadmap line
  pointing at the spec); `netcode-quality-review.md` updated if smoothness changed.
- The **cross-cutting invariants** (below) applied to every new table/reducer/content/gate.
- `Grep` consistency clean; any earlier spec a gap was found in is updated.

## Cross-cutting invariants — re-apply every iteration (where the milestone adds the thing)

- **New world table** → indexed `zone_id` (ADR-0007); **additive only** + schema-snapshot eval; stable ids
  append-only; `sync_content` + re-derive if content-derived (ADR-0006); migration smoke-test.
- **New reducer** → identity only from `ctx.sender`; **intent-only** (never accept a client outcome);
  re-validate ownership + legality vs authoritative state; **reject, never clamp**; reducer-security-auditor
  eval + proof-of-teeth; structured fail-loud log on `Err`; safe under re-execution (errors-as-values, no
  mutable globals, time/RNG from `ctx`).
- **New content** → RON in `game-core`, pure loader, `validate_content` integrity, seeded read-only.
- **Owner-private data** → RLS is **defense-in-depth, not a hardened boundary** (experimental in the pinned
  STDB version — **verify it actually filters**). Classify by **stakes** (ADR-0015): *scout-level* (a rival
  could scout your team) → RLS + a privacy eval is an acceptable documented trade-off; *must-never-leak*
  (a true secret, or competitively-decisive data like ranked PvP picks/spawn weights) → a **private
  (non-`public`) table** or server-curated projection, never RLS alone. The client never receives hidden state.
- **Shared `game-core` change** → rebuild wasm + republish + regenerate bindings (bindings-drift gate);
  impact analysis across the marshaling boundary; parity eval if the rule is predicted.
- **Movement/render touch** → preserve ADR-0013 smoothness (decoupled slide clock, interpolation buffer,
  atomic reconcile snapshot, bounded prediction); add/extend smoothness evals.
- **New mechanical gate** → a proof-of-teeth fixture (ADR-0010).
- **Observability & performance** (ADR-0029) → a new `game-core` hot rule gets a **criterion benchmark +
  perf budget** (gated in `just ci`); a new reducer gets **RED metrics + structured logs** (OTel seam); a new
  hot path / fan-out gets a **domain metric + budget**; a new **concurrency/multiplayer surface** (tick, PvP,
  raids, chat) gets a **sim-harness load test** within budget. See `observability-performance-plan.md`; the
  heavy production stack is the M20 capstone.
- **Every task's DoD** → a `/simplify` + `/review` pass; CI green-and-meaningful (lint/typecheck/test/eval/
  mutation/coverage/security).

## Phase checkpoints (guard against long-run drift)

At each phase boundary, present a short **phase summary** (specs + ADRs produced, open questions, cross-
cutting decisions) and **pause for the user to course-correct** before the next phase:
- after **M10** — end of **Phase A** (the re-engineered spine);
- after **M14** — end of **Phase B** (the expanded world);
- after **M19** — end of **Phase C** (social/multiplayer depth) → final wrap-up.
If the user is unavailable, proceed but keep the checkpoint summary prominent.

## Appendix — per-milestone known considerations (M5–M19)

Front-loaded from v1's `ARCHITECTURE.md` (incl. its "M11 entry-conditions"), the v1 tutorial, and the v2
ADRs. A head-start, **not** a limit — verify against current state each iteration. `[mirror]` = harvest the
v1 tutorial chapter; `[expansion]` = no v1 precedent, design from standards + best practice with extra ADR
care.

- **M5 — multi-window integration / e2e + smoothness in CI** `[mirror]`. Build on M4's dev `window.__game()`
  hook; assert on **state, never pixels**. Golden flows: both windows see each other; movement syncs both
  directions; jump; **bump ⇒ predicted == authoritative** (the desync net); convergence; disconnect-despawn;
  **plus the ADR-0013 smoothness evals end-to-end** (no backward jump under jitter). v1 ran e2e *local-only*
  — v2 runs it **in CI against a containerized `spacetime`** (ADR-0009). `--delete-data` global-setup for
  known preconditions; read `STEP_MS`/spawn from the hook. New ADR unlikely; fork unlikely.
- **M6 — monsters & individuality** `[mirror]`. Content-as-data (RON species/skills/type-chart/items →
  read-only tables via `sync_content`). Hidden genes/temperament/bond; stats **derived server-side** and
  stored. **Owner-scoped RLS privacy** (the "third visibility mode") — RLS was *experimental* in STDB 2.6,
  so **confirm syntax/maturity vs the pinned version** (likely an ADR + a privacy eval). Append-only species
  ids. *Fork (ask):* how deep the individuality/gene model goes.
- **M7 — turn-based battles** `[mirror]`. **Server-resolved, NO prediction** (animation hides the round-
  trip; ADR-0013 smoothness mostly N/A). **Integer (float-free) damage** (determinism). Battle state as one
  column on a `battle` table. **Design the table PvP-ready NOW** — synthetic `battle_id` pk + an indexed
  `opponent_identity` (equal to `player_identity` for PvE) — so M16 PvP is **additive, not a re-key**
  (v1: free now, a migration later). RLS to participant(s). *Likely ADR:* battle data model. *Fork:* battle
  depth → default **defer to M14**.
- **M8 — grass encounters + recruit-by-weaken** `[mirror]`. **Private `encounter` table** (spawn weights
  hidden — cheat surface). Triggered from the movement tick on a grass step (map grows a grass layer;
  `TileKind::TallGrass` — the exhaustive `match` flags every site). Recruit odds rise as HP drops (+bait);
  rebuild the exact wild from individuality on the battle row.
- **M9 — raising (train/care)** `[mirror]`. Focus-training (food adjusts derived stats) + care (bond). Item
  helpers: one stack/player, `saturating_add(..).min(CAP)`, delete-at-zero. `heal_party` stays a placeholder
  until towns (M12).
- **M10 — evolution & fusion** `[mirror]`. Conditional branch evolution + fuse-with-inheritance (keep/combine
  individuality). Content integrity in `validate_content` (no duplicate fusion pair; evolution/fusion-only
  forms not wild-catchable). Server-computed eligibility on the row. **→ Phase A checkpoint.**
- **M11 — authored multi-zone world (Tiled→RON)** `[expansion]`. **ADR-0008 moves proposed→accepted here.**
  Pure, tested Tiled→RON importer; multi-zone + warps/doors + data-driven collision/encounter-zones;
  `zone_0()` const → data-loaded `map_for(zone_id)`. **Per-zone subscriptions + per-zone tick become
  user-visible** (schema ready since M2). The **schema-migration story now bites** (real content; you can't
  `--delete-data` once users exist) — exercise automigration + `sync_content` + re-derive. Add the **follow-
  camera** deferred from M4. *Forks (ask):* authoring workflow; zone/warp data model.
- **M12 — NPCs, dialogue & quests** `[expansion]` (NPCs partial in v1). NPC entity + **`npc_decide`** (the
  pure seeded rule deferred from M1/M2). Data-driven dialogue trees + a quest/flag system in `game-core`
  (`quest/`). Towns + **healing locations** (resolve `heal_party` with cost/cooldown). *Fork (ask):* quest-
  system depth.
- **M13 — economy & inventory** `[expansion]`. Shops, currency, item economy on the **cross-player
  transaction backbone** (shared with M15 trade — note the sequencing; build the primitive once). Saturating
  grants; no unchecked `+=`. *Fork (ask):* economy scope/sinks.
- **M14 — deeper battle systems** `[expansion]`. v1 explicitly deferred this. Status effects, abilities/auras,
  multi-active, weather — **additive** `game-core` rules + content behind exhaustive enums; must not break
  M7's tested `resolve_turn`. *Likely ADRs:* status-effect model, multi-active model. *Fork (ask):* **which
  systems + how deep** (large design space). **→ Phase B checkpoint.**
- **M15 — trading** `[mirror]` (v1 M11.1). Escrowed dual-consent monster trade (`trade_offer` RLS to both
  parties; display-only `MonsterCard` snapshot; escrow via `reject_if_in_trade` wired into **all** monster-
  mutating reducers; atomic `confirm_trade` re-reads + swaps owner). The cross-player transaction backbone
  the economy reuses. `client_disconnected` releases offers. *Likely ADR:* escrow/transaction primitive.
- **M16 — PvP** `[mirror]` (v1 M11.2). Shared battle row (M7's PvP-ready keying pays off — additive).
  **Private per-chooser `battle_action` table** (simultaneous *secret* picks; RLS hides each side). Resolve
  when both submit via the same `resolve_turn`. **Turn-deadline scheduled reducer + forfeit-on-disconnect**
  (the rage-quit-voids-loss exploit). Documented tie-break. Still server-resolved (no prediction).
- **M17 — ranked ladder** `[mirror]` (v1 M11.3). **Persistent `profile`** (Elo `rating`, W/L) keyed by
  identity, **never deleted** (unlike the ephemeral `player` presence row) so rating survives disconnects;
  world-readable leaderboard; rating applied once per decisive outcome.
- **M18 — co-op raids** `[mirror]` (v1 M11.4). Two allies vs an AI boss via an **additive** `resolve_coop_turn`;
  both-submit; shared XP; `is_raid` on the battle (additive); degrade gracefully to one ally.
- **M19 — guilds / chat / social** `[expansion]`. No v1 precedent — extra ADR care. Chat (channels, RLS
  scoping, **moderation hooks**, untrusted-content discipline), guilds (membership/roles), a social graph;
  observability + abuse considerations. *Likely ADRs:* chat model, guild model, moderation. *Fork (ask):*
  scope (large, open). **→ Phase C wrap-up.**
- **M20 — Observability, performance & load hardening** `[expansion]` (Phase D capstone; ADR-0029). Consolidate
  the production stack: enable OTel→Datadog dashboards/alerts; full-system **load testing** (scaled
  sim-harness); **profile** the named hot paths; the **measured** performance-tuning pass (execute the
  "scaling path" only where data shows a problem); SLO baselines. *Consolidation, not new instrumentation* —
  the M0 substrate + per-milestone instrumentation/benchmark/load invariant already produce the signals.
- **M21 — Accounts & authentication** `[expansion]` (ADR-0030). OIDC-backed stable identity (cross-device +
  recovery) replacing anonymous identities; owner-private `account` record; one-time guest→account claim. No
  game-data schema churn (the identity keying pays off). Never roll your own auth.
- **M22 — Privacy, data deletion & compliance** `[expansion]` (ADR-0031). Registry-driven deletion cascade
  (erase/anonymize) + data export + retention reaper; a **deletion-completeness eval** (a new owner-keyed
  table not covered fails the build). Builds on M21.
- **M23 — Accessibility** `[expansion]` (ADR-0032). WCAG-AA; keyboard/screen-reader (accessible DOM menus +
  `pixijs-accessibility`); colorblind-safe info; **reduced-motion** = a visual switch on ADR-0013 (netcode
  untouched). Retrofits across M4/M7/M19.
- **M24 — Internationalization** `[expansion]` (ADR-0033). Externalized message catalogs + locale-keyed RON;
  a new language is a data drop; default-complete + fallback + RTL; chat untranslated.
- **M25 — Security audit & threat-model gate** `[expansion]` (ADR-0034; `security-threat-model.md`). The
  final pre-launch gate: maintained threat model + tooled/manual audit (RLS-leak verification on the pinned
  version is the headline check) + a **blocking security sign-off** + re-audit cadence. **→ end of loop.**

## End condition

Stop when `PLAN.md §9` lists no remaining milestone without a finalized `M{N}-*.spec.md`. Then summarize
the full set of specs + ADRs produced and note any open `proposed` ADRs and any flags awaiting the user.
