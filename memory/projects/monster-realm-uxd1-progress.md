# uxd1 — progress memo (2026-07-30T21:50Z) — **DELIVERED, PR open, awaiting supervisor merge**

Supersedes the 2026-07-31T00:01Z resume memo. That memo's instructions were followed and are
now complete — do NOT re-run the review fanout.

## DONE

- **PR #262 open:** https://github.com/mdrewt/monster-realm/pull/262
  Branch `feat/uxd1-responsive-viewport`, worktree `.claude/worktrees/uxd1`, 6 commits, pushed,
  working tree clean.
- **Local `just ci` GREEN** (the real one, in the project worktree): exit 0 — lint, typecheck,
  1486 Rust tests, 74/74 evals, security, wasm, client-typecheck, 1595 client tests.
- **Full review fanout completed** (the step the 1st attempt crashed on): `reviewer`, `red-team`,
  `desync-guard`, `reducer-security-auditor`, `/simplify`, `tester`, `verifier`. No spend-limit
  error recurred.
- **Two real findings fixed:**
  1. `just ci` was RED — ADR-0160 `**Decision:**` 281 chars > ADR-0104's 240 limit, so
     `adr-digest --check` failed and `DIGEST.md` was stale. Shortened + regenerated.
  2. `WorldRenderer.init()` never applied `stageScale` (red-team fake-Pixi PoC); latent because
     `main.ts` resizes synchronously right after `init()`. `init()` now derives `#vs` from a
     single window read and applies the stage scale itself.
  Plus comment/ADR accuracy fixes (a false operand-order-overflow claim; the CSS normalization
  band; D9's nearest-magnification identity, which holds only at texture-generation time).
- **`verifier` PASS** with 4 mutations proven to bite, and confirmed no gating test was weakened:
  `git diff 4efdf85 HEAD -- '*.test.ts'` is empty, no deletions, no `.only`/`.skip`/`xit`.
- **Docs:** ADR-0160 final; `docs/adr/DIGEST.md` regenerated; `ARCHITECTURE.md` uxd1 paragraph +
  supersession pointer on the stale M11c "no stage scale" line.

## REMAINING (supervisor-owned — NOT for a resume pass)

1. **Merge PR #262.** Remote CI was running at hand-off; delegate to `mr-ci-watch 262 uxd1`.
   `gh pr merge` is forbidden to the slice run.
2. **Bump `docs/adr/README.md`** `Next free number: 0160` → `0161`. Deliberately untouched by the
   slice (supervisor owns the ADR index).
3. Expect a **`docs/adr/DIGEST.md` collision** if a concurrent sibling also adds an ADR — resolve
   by re-running `just adr-digest`, never by hand-merging.

## BLOCKERS

None. No stop-flag fired; no rate-limit event.

## Follow-up flags (non-blocking, deliberately NOT done — outside this slice's `touches:`)

- `screenToWorld` ships unwired (spec-directed: `M-postgate-ux-design.spec.md:34,53,55,178`).
  `/simplify` + `reviewer` both wanted it deleted; overruled on spec authority. Its "delete if
  unused" note has no forcing function — if uxd2 lands without consuming it, delete it then.
- Spec criterion **A8 NOT satisfied** (premise already false on master — most overlays are in-flow
  divs, not `position:fixed`); owned by uxd3. **A10** has no executable tooth.
- Placeholder texture cache is not invalidated on resize → baked texture resolution drifts from
  `stageScale` after a mid-session monitor change (cosmetic; deferred until authored art lands).

## Environment gotchas (cost this run real time — encode in the brief/wrapper)

- Default PATH has **node v18** (`/usr/bin/node` precedes the asdf shims) and **no cargo**. A bare
  `just ci` dies with `cargo: not found`. Always:
  `export PATH="/home/mdrewt/.asdf/shims:/home/mdrewt/.cargo/bin:$PATH"`.
- The worktree's committed `.tool-versions` pins only `just`, not `nodejs`.
- A `cd` into the harness root **persists across Bash calls**; a subsequent bare `just ci` ran the
  **harness's own** self-test suite and returned a bogus green. Always `cd` explicitly per command,
  and sanity-check the log. (The harness repo was not dirtied — its modified files predate this run.)
- `just ci` ≠ vitest+tsc+biome. The 1st attempt reported "1595 tests, tsc+biome clean" and still had
  a RED gate, because the **eval** stage catches ADR-digest drift.
