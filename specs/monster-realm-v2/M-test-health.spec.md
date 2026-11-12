# Spec: M-test-health — flakes, slow tests and unmeasured hardware (SKETCH)

**Status:** sketch, 2026-11-12. Elaborate with `milestone-loop-prompt.md` when PLAN §9 reaches it,
against the CURRENT game repo · **Project:** monster-realm (client e2e, server dev reducers, CI) ·
**Target:** before the Playtest-4 gate.

## Problem / intent

The test pipeline is fast (PR ~6–7 min, nightly ~40 min) and its coverage is intact. What remains is
the part of its cost that comes from the tests themselves: tests that fail without a code change,
tests that wait on real time, and a suite shape that forces one database per parallel process. One
product question sits beside them: every frame-time number so far comes from a fast desktop.

## Scope (sketch)

- **TH1 UIF4B.2 at 640×240.** `client/e2e/ui-feedback.spec.ts` UIF4B.2 failed once with
  `#controls-tabs` at y −18.6 instead of 13.4 and passed on rerun. Decide whether the tab strip can
  leave the viewport at that size (a layout defect) or the read races a layout pass (a test defect),
  and fix whichever it is.
- **TH2 Recruit R1.** `client/e2e/recruit.spec.ts` R1 failed once and passed on rerun; root-cause it.
- **TH3 Flake count.** The e2e union job (`scripts/e2e-shard-union.mjs`) reads every shard's
  Playwright JSON; have it list tests that passed only on retry or rerun in the job summary, so the
  most frequent flake is known without reading logs. All 9 red `master` CI runs in the 300 before
  2026-11-12 were same-tree flakes.
- **TH4 Server clock skew for deadline tests.** `tactics-pvp` BT15-4-SECRECY-AFK takes ~133 s
  because it waits out real 30 s PvP windows. A `dev_reducers`-only reducer that advances the
  deadline (or fires `tactical_deadline_fire` for a battle) proves the same behaviour in seconds.
  The real-time path keeps one test.
- **TH5 Population-agnostic specs.** Specs assert the exact live population of a shared database,
  which is why Playwright runs one worker per process and each shard needs its own database and
  Vite server. Specs that assert on their own entities only could share one database across
  workers. Large; do it only if shard count or local memory becomes the limit.
- **TH6 Low-end frame budget.** Measure the client on an integrated GPU and under CPU throttling,
  and record the numbers beside the existing frame budget. Guard the post stack off for
  SwiftShader/llvmpipe renderers before it is ever enabled in a production build (57 ms per frame
  at 720p on software GL).

## Notes

- TH1–TH3 are small and independent. TH4 adds server code behind `dev_reducers` and must keep the
  production wasm byte-identical.
- The nightly `e2e-serial` job runs the whole suite in one process against one database; it is the
  guard that sharding hides no cross-spec dependency, and TH5 must keep it green.
