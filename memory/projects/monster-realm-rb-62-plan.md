# rb-62 plan — retarget overlayA11yWiring.test.ts's drifted M12d citation + correct the meta-citation

Slice: rb-62 · residual R-rb-36-R-rb36-WIRINGCITE · branch `feat/rb-62-wiring-citation`
Declared `touches:` — `client/src/ui/overlayA11yWiring.test.ts`
Companions in scope — `ARCHITECTURE.md` (boyscout, 1 line), harness-side ledger/oracle.

## Discovery — the brief's premise is HALF ALREADY CLOSED

The brief (and the seeded ledger Scope) say the site carries a bare `main.ts:1574`
citation plus a meta-citation claiming the other two sites are "flagged, not touched".
**Neither is true of `origin/master` today.** `git blame` shows rb-37 (69d6f5d, PR#415,
2026-09-02 — a concurrency-safety slice) already boy-scouted this comment: it replaced
the bare `:1574` with the listener landmark + a dated `:1627-1641` hint, and rewrote the
meta-citation to say rb-36 "has since retargeted all of them".

So the residual is NOT closed but its two halves are in a different state than declared:

| Brief's claim | Actual state on master | Action |
|---|---|---|
| bare `main.ts:1574` cited as the live site | already retargeted by rb-37 to the listener landmark, but its `:1627-1641` hint has since drifted (rb-52 #435 inserted ~200 lines into main.ts) | **RETARGET** the hint to `:1837-1887` today |
| meta-citation says the other two sites are "flagged, not touched" | rb-37 already corrected this to "rb-36 has since retargeted all of them" — TRUE | **not a falsehood any more**; restate precisely + record the residual as CLOSED, and disclose the drift those two files now carry |
| `main.ts:1574` literal still present at :296 | present, but as a *historical* attribution ("rb-18 cited …") | KEEP, but mark unmistakably as `now-drifted` so a reader/auditor cannot read it as live |

Measured landmark (worktree @ 0064f19, `client/src/main.ts`):
- `// --- M12d: dialogue / quest log / heal views (ADR-0071)` banner at `:1835`
- `store.onBatchApplied(() => {` (indent 0) at `:1837`; first indent-0 `});` at `:1887`
- `const dialogueVm = buildDialogueViewModel(conv, npcsMap, DIALOGUE_TREES);` at `:1850`
- `dialogueView?.render(dialogueVm);` at `:1851`

This is byte-consistent with merged sibling rb-60 (#445), which cites `:1837-1887` today
for the same landmark. Convention inherited from rb-36: **the named landmark is
authoritative, the number is only an explicitly dated hint.**

Fact re-measured, not assumed: the listener builds a FRESH view model every batch
(`buildDialogueViewModel(...)` is called inside the listener body, per batch) — the claim
the citation supports is still TRUE, so this is a citation repair, not a retraction.

## Drift scope beyond this slice (declared, NOT fixed)

The same `:1627-1641` hint is stale in 5 further places. Only two are in scope:

- `client/src/ui/overlayA11yWiring.test.ts:291` — **IN touches: → fixed here**
- `ARCHITECTURE.md:1997` — **always-in-scope companion → boyscout, 1 line**
- `client/src/ui/dialogueView.ts:17` — outside `touches:` → **follow-up flag**
- `client/src/ui/dialogueView.test.ts:243,290,374` — outside `touches:` → **follow-up flag**

Those four are a hidden-dependency STOP if the task required them; it does not (they are
a different residual's surface). They are disclosed in the PR body + handoff so the
supervisor can queue them, per the lp-gates "records are not queues" rule.

## The edit (prose only, CI-neutral, zero assertions touched)

`client/src/ui/overlayA11yWiring.test.ts:287-299`:
1. Name the landmark in full (`main.ts`'s M12d `store.onBatchApplied` dialogue listener),
   hint `:1837-1887` today plus the `buildDialogueViewModel(...)` call at `:1850` today —
   the line that actually carries the "fresh view model per batch" fact.
2. Rewrite the parenthetical as an explicitly dated *citation history* that closes the
   residual: rb-18 cited the **now-drifted** `main.ts:1574`; rb-36 (PR#414) retargeted every
   copy onto this landmark; rb-62 closes R-rb36-WIRINGCITE and flags (does not touch) the
   hints in `dialogueView.ts` / `dialogueView.test.ts` that have since drifted the same way.
   Phrased in **dated/past tense scoped to this slice**, so a later slice fixing those files
   cannot falsify it (the exact trap that produced this residual — see the harness memory
   note "Comment fixes strand present-tense quoters").
3. Boy Scout: re-wrap the block to the file's ~100-col width. rb-37's edit left `:293`
   ragged ("But that half is / DEFENSIVE, not currently / load-bearing"). Word-level diff
   must show nothing but the citations + the parenthetical changed.

**No anchor literal is planted.** Per rb-36's measured trap (a doc paragraph *about* a
pinned marker breaks that marker's gate), the citation paraphrases its anchor. Verified:
`evals/ci-gate-wiring.eval.mjs` pins this file's *filename* (justfile recipe body), never
its comment text, so a comment edit is CI-neutral by construction.

## Acceptance — ADR-0224 compliant

No new eval, no new shipped test (ADR-0224 bans both, and bans extra clauses in existing
evals). The ledger seeded 0 criteria (the spec's EARS line is not a SHALL). Following the
merged rb-60 precedent, acceptance is a **harness-side ledger oracle**
(`memory/projects/gates/rb-62.oracle.cjs`) in the **inverted direction**: it holds no copy
of the fact, parses the citation out of the prose, and uses the cited sources as the
oracle — so it cannot red on an unrelated `main.ts` edit and cannot drift itself.

- **X1** — the citation resolves: exact-extent listener range, banner-pinned to the M12d
  DIALOGUE listener specifically (main.ts has 11+ `store.onBatchApplied` calls), the cited
  build line is the `buildDialogueViewModel(` call inside it, per-citation `today` hedges,
  the `:1574` literal is qualified as historical AND genuinely stale, and the meta-citation's
  two claims about `dialogueView.ts`/`dialogueView.test.ts` are true of the tree.
- **X2** — full `just ci` green from this worktree.

Exact-extent (not containment) is deliberate: rb-60's artifact red-team measured three
CI-clean bypasses against a containment-only range check.

## Anti-patterns named

- Re-pointing a bare line number (reproduces the defect on a delay — rb-36's ruling).
- An oracle that stores its own copy of the fact (drifts; reds on unrelated edits).
- Containment-only range checks; paragraph-scoped hedge checks (both measured-bypassed on rb-60).
- Quoting a uniqueness-pinned marker in prose (measured to red `just ci` on rb-36).
- Present-tense meta-claims about other files (this residual's own root cause).
- Touching `dialogueView.ts` / `dialogueView.test.ts` (outside `touches:`).
