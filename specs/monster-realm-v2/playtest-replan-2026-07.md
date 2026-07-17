# Playtest-first replan — post-M17 milestone reorder (2026-07-17)

**Status:** accepted (Drew, 2026-07-17) · **Author:** supervisor session under Drew's direction
**Governs:** PLAN.md §9 ordering after M17 · **Companion specs:** `M17.5-tenth-review-residuals.spec.md`,
`M-playtest-{a,b,c,d}-*.spec.md`

## 1. Decision

Execute the **playtest gate the corpus already mandates** (game-design.md §4/§9: "stop at Phase A,
playtest, then decide") — overdue now that Phases A–B and M15–M17 are built. All remaining milestones
after M17 are re-ordered **playtest-enabling work first**; everything below the gate is demoted to
*post-gate provisional* (unchanged relative order). New order:

1. **M17.5** tenth-review residuals (Drew's 2026-07-17 draft, hereby scheduled) — the HIGH findings
   (17.5a side-B guard laundering exploit, 17.5b trade conservation) are **playtest-blocking**: testing
   on a build with a known HP-laundering exploit and silent item destruction corrupts the very feedback
   the playtest exists to gather.
2. **M-playtest-a** — local playtest build & ops (**rescoped 2026-07-17 per Drew: local-only, solo
   tester — no hosted deployment**): one-command honest playtest build (release module, `dev_reducers`
   absent, DEV hooks gated, version stamp, wipe/reset runbook). Hosting is an explicit DEFERRED
   YAGNI exception (re-book as M-playtest-a2 when external testers join).
3. **M-playtest-b** — playtest observability & feedback loop (the M20 pull-forward: error surfacing,
   event capture for the §4 fun-hypothesis proxies H1/H2/H3, in-client bug-report bundle).
4. **M-playtest-c** — playtest UX completion (trade propose-UI — M15's headline feature is currently
   human-unreachable; profile rename; in-client help; tester onboarding doc).
5. **M-playtest-d** — playtest content pack (roster 6→~16 forms + distinct sprites, encounter/recruit
   tuning; pure content/data → fan-out friendly against b/c).
6. **⛩ PLAYTEST GATE** — run the closed playtest (§4 validation plan); H1/H2/H3 proxy report from
   M-playtest-b instrumentation + qualitative survey. **Output = a gate decision doc**; Phases below
   revise on its learnings.
7. Post-gate provisional: **M18 → M19 → M20 (slimmed) → M21 → M22 → M23 → M24 → M25** (M25 remains the
   launch gate).

## 2. Rationale (why this order)

- **M17.5 before the playtest build exists:** the side-B exploit is production-reachable; the honest
  playtest build must not ship it. 17.5's own §5 sequencing note permits opportunistic disjoint slices.
- **Playtest build (a) before observability (b):** b's error/event/bundle layer is proven against the
  honest build it will run on (release module, no dev reducers/hooks) — instrumenting the dev build
  would measure a build the playtest never uses.
- **Observability pulled forward (Drew's explicit call):** playtesters need track/trace/debug — error
  overlay + reducer-rejection surfacing + a bug-report bundle turns every tester into a usable bug
  reporter, and the H1/H2/H3 proxy events make the gate *measurable* instead of vibes.
  **M20 is not moved** — it slims to the production capstone (Datadog export, load, SLOs); the
  boundary note is added to `M20-observability-performance.spec.md`.
- **UX completion (c) before the gate:** H3 (individuals valuable → trade/compete) is untestable while
  `propose_trade` has no human entry point; H2 attachment is weakened while renames silently never
  propagate (17.5d fixes the mirror; c adds the write path).
- **Content (d) before the gate:** 6 forms vs the GDD §5 MVP target ~16 undercuts H2 (re-catch variety)
  and team-building; one real spritesheet (emberkit) of 6 species undercuts attachment. Distinct-
  silhouette placeholder-quality art is sufficient; polish is post-gate.
- **M18/M19 demoted:** GDD §9 — "social depth follows demand"; building raids/guilds before the fun
  gate is exactly what the gate exists to prevent. M21 accounts stay post-gate: anonymous device-bound
  identity is acceptable for a closed test (communicated in the tester doc). M23 accessibility stays
  post-gate for a small closed test; revisit if gate feedback flags legibility.

## 3. Resolutions of M17.5 §3 decisions (per Drew's replan mandate; veto welcome)

- **D-17.5-A (BattleKind column): ADOPT in 17.5.** Additive, cheap now; playtest adds battle volume and
  any post-gate battle source (raids/friendlies/NPC trainers) would silently rate under the sentinel.
- **D-17.5-B (transport RLS): RE-BOOK to M22** (privacy milestone, its natural home) with a fresh
  accepted-risk note in the 17.5 ADR covering the closed-playtest period (invited testers, low stakes).
  17.5g-3 fixes the stale pointer to say "→ M22".
- **D-17.5-C (`set_profile_name`): SCHEDULE** → M-playtest-c (server reducer + validate_name + UI + RL-7
  tooth amendment; subsumes the parked m17b-2).
- **D-17.5-D (`propose_trade` UI): SCHEDULE** → M-playtest-c (thin propose form → `reducers.proposeTrade`
  + e2e).
- **D-17.5-E (DEV-gate `__game`/`__mrTrade`/`__mrPvp`): SCHEDULE** → M-playtest-a (release-build hygiene
  slice, alongside the `dev_reducers`-absent release verification); reconciles the ADR-0115 contradiction
  in the direction the in-code comment asks for.

## 4. Research note (2026-07-17)

SpacetimeDB **Maincloud** verified current (managed serverless, scales-to-zero, free tier 2,500 TeV/mo +
Pro $25/mo; SpacetimeDB 2.0 Feb 2026 matches the ADR-0002 2.x pin). **Superseded for this gate
(2026-07-17): Drew is the sole tester → M-playtest-a is local-only**; the Maincloud finding is banked for
the deferred **M-playtest-a2 (hosted)** when external testers join.

## 5. Supervisor mechanics

Slice ids for the new milestones: `pt-a1`-style (see each spec's candidate-slice table). Each
M-playtest-* spec gets the standard **build-time slicing pass** (EARS + final `touches:`) like M17's
(commit a356558) before its first launch. ADR numbering: project ADRs continue ≥ 0122 under the
supervisor's allocator (0121 reserved by m17c). `docs/adr/README.md` stays supervisor-owned. The gate
itself is **not a runner slice**: the runner stops at "all pre-gate milestones CLOSED" and surfaces a
BLOCKER-style handoff entry telling Drew the playtest is ready; the gate decision doc re-opens the
post-gate queue.
