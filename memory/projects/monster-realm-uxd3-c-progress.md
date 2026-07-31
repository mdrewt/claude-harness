# uxd3-c — progress memo

**STATUS: TERMINAL — PR#268 open, local `just ci` + `just e2e` both green, remote CI running.
NOT merged (supervisor-owned).**

https://github.com/mdrewt/monster-realm/pull/268 · branch `feat/uxd3-c-overlay-write-substrate`
· worktree `.claude/worktrees/uxd3-c` · ADR-0164 · forked master@9e897a3.

## DONE — the full loop
planner → reviewer + red-team + /simplify on the plan → **adjudication** (`/tmp/uxd3c-adjudication.md`,
binding) → tester (T1a re-anchors green on unmodified source, then T1b; RED receipt 12/141
orchestrator-verified) → separate implementer (red→green) → orchestrator-owned retirement of 4 teeth +
clause 2b, each with a captured RED receipt → reviewer + red-team on the shipped code → 2 survivors closed
and each re-measured RED → doc-keeper (ADR-0164 + ARCHITECTURE + adr-digest) → verifier **PASS** → PR.

`just ci` exit 0 (65 files / 1742 client tests, 1504 Rust tests, all evals PASS).
`just e2e` exit 0 (44 passed / 1 skipped). `overlayRegistry.ts` coverage 100%.

**Closes `M-postgate-overlay-registry`** (uxd3-a + uxd3-b + uxd3-c).

## REMAINING
Nothing for this slice. The supervisor merges on remote CI.

## BLOCKERS
None.

## Decisions the merge audit will want (all argued in the PR body + ADR-0164)
1. **Shipped less than the brief, deliberately** — no `open` thunks, no `hideAllExcept` (zero consumers;
   ADR-0162 A7/A15 precedent). `visibleIds` REVERSES A7's deletion — the rule working, not churn.
2. **`dialogueView` shape deviates from ADR-0163 D7's sketch**: a bare optional thunk
   (`dialogueView: undefined`), not an optional `hide` member — D1 had already rejected the wrapper.
3. **`onReconnect` collapse DECLINED, not deferred** — needs the `RECONNECT_HIDE` constant A15 deleted,
   costs 4 teeth for 6 lines. D7's *mandatory* half (re-author `W-TP-RECONNECT` on two endpoints) WAS done,
   and landed first.
4. **Front doors UNIFIED** (closes ADR-0163 D6), on a measured reachability argument: `#menu-overlay`
   `inset:0;z-index:100` (`client/index.html:97`) over `#help-hint` `z-index:50` (`:123`).
5. **Escape boy-scout deferred a THIRD time**, explicitly: ~73 lines / 4 hunks vs a ~40-line / ≤3-hunk cap,
   atomic, not hunk-split to dodge the cap. → **uxd3-d**.
6. **All four retired teeth went genuinely RED** on migrated source (cleaner than uxd3-b, which deleted two
   would-have-stayed-green floors). Clause 2b was GREEN — a deliberate removal of a live-but-obsolete
   assertion. One admitted loss: the guard-form-vs-`.hide()` distinction for modals is no longer stated in
   `main.ts` and now lives only in the tier table.

## Carry-forward hazards (measured this slice)
- **A whole-file substring ban on `x?.hide` is defeated by one line of aliasing.** `const h = dialogueView;
  h?.hide();` passed the entire 1742-test suite with `tsc` clean. Any future "this identifier must never be
  called" tooth needs an enumerated ceiling on the IDENTIFIER, not a needle on the call.
- **A `Partial<>` loosening of a `Record<K, V>` type alias is invisible to runtime tests AND to `tsc`.**
  Pin the declaration line's exact shape if the totality is load-bearing.
- **Subagents may write to the MAIN CHECKOUT rather than the worktree** even when told the worktree path.
  The doc-keeper did. Recovering without mutating git on the main checkout: `git -C <main> diff <file> >
  patch`, `git -C <main> show HEAD:<file> > <file>` (plain redirect), `git -C <worktree> apply patch`.
- Fighting Biome to satisfy a needle's token ORDER is the wrong trade. The implementer added
  `biome-ignore-all assist/source/organizeImports` to `main.ts`; reverted — the needle was changed to match
  the formatter's canonical output instead, since the load-bearing content is WHICH values are imported.

## Follow-ups for the supervisor
- `docs/adr/README.md:13` next-free stale at `0162` (now by three) — usual chore PR. `adr_next_free` → **0165**.
- **uxd3-d**: the Escape re-anchoring boy-scout; optionally deleting the now-orphaned
  `client/src/inputGuards.ts` (`shouldToggleBox` has zero production callers — outside this slice's
  `touches:`, so deliberately untouched).
- Harness `specs/monster-realm-v2/PLAN.md` §9: mark `M-postgate-overlay-registry` **CLOSED**.
