# Residual-triage worklist — 2026-10-15 (corrective wave C4.6)

Rows verified STALE (cited file/behavior gone, or finding demonstrably shipped), read-only
against GAME master `2721cd3e` and the gates ledgers. Format: `id | proposed disposition |
evidence`. **No disposition below has been executed** — the six polish-1 rows were pre-approved
separately and are already `fixed` (GAME #579). Excluded by judge ruling: the LOW ux-a11y ctl
rows (they stay open). Rows that could not be verified stale are left out.

- R-ci-fix-20261002T0901Z-RAISINGVIEWREBUILD | fixed (HIGH — **operator-only**; decision issue monster-realm#580 raised with full evidence) | raisingView.ts renders through `#renderIfChanged` per-container keys (the `#rendered` comment cites this id), shipped in ctl-7b GAME #550 (in master lineage); regression test CTL7B-RV-NO-REBUILD (raisingView.test.ts:2816); no evolution.spec Care-detach flake in any handoff since the 2026-10-02 merge (27 PRs).
- R-rb-56-FOLLOWUP-ACC | fixed (promoted row — also remove its `### rb-98` section in residuals.spec.md) | ctl-8i GAME #562 (merged 2026-10-03) moved accuracy from the hover-only title into the visible skill cell; battleView.test.ts:3285 says "closes R-rb-56-FOLLOWUP-ACC", battleView.ts:760 same.
- R-rb-121-DEFER-FOCUS-RECHECK | fixed | overlayA11y.ts deferred-focus timer now does exactly the proposed fix — `if (connectedInside(root, document.activeElement)) return;` with a comment citing R-rb-121 (CTL5.7) — shipped in ctl-5 GAME #541 (merged 2026-10-01).
- R-ctl-12-CTL12.1 | fixed | re-serialized into ctl-12b as CTL12B.1 "(Moved from CTL12.1.)" and met `[x]` in gates/ctl-12b.gates.md; controlsView.ts shipped in ctl-12b GAME #571 (merged 2026-10-04).
- R-ctl-12-CTL12.6 | fixed | re-serialized into ctl-12b as CTL12B.2 "(Moved from CTL12.6.)" and met `[x]` (remap applies without reload, persists across reload, remap.spec.ts e2e); same PR GAME #571.
- R-ci-fix-20261002T0901Z-HELPHINTCOVERSACCEPT | fixed | the covering element no longer exists: ctl-7a GAME #549 retired `#help-hint` (indexShell.smoke.test.ts:781 pins "#help-hint is retired") and anchored the overlay shells under `#game-screen` instead of in-flow below the canvas, so the measured elementFromPoint occlusion cannot recur.

Checked and found STILL LIVE (deliberately not listed as stale; recorded so the next triage
does not redo the reads): R-21r-e-E2 (M12c comments still at movement.rs:543 / schema.rs:586),
R-ctl-10a-HEALTARGET (healTargetLocationId still exported+tested), R-ctl-10a-TALKRANGE
(talk_range still exported, still stubbed in test mocks), R-pgcc-c-RESEEDDOCBLOCK
(main.battle-reseed.test.ts still quotes removed battleReseedPending code 6×),
R-pgcc-d-monstersScreen-sentinel (`toParty ? -1 :` literal still at monstersScreen.ts:537),
R-ctl-13-CTL13.5 and R-ctl-14-CTL14.2 (re-deferred unmet in their own gates ledgers),
R-ctl-8h-CTL8H.1 ("Account & sign-in" relabel nowhere in the client),
R-21r-b2-E1 (privacyView.ts:156 still paints the raw English disclosure),
R-weekly-review-2026-10-02-F4 (a11yCopy overlay titles are an English-only frozen catalog),
R-rb-65-RUNBOOK-LOGCAVEAT (successor runbook docs/runbooks/observability-dr.md §8 retention
notes still omit the deletion-cascade INFO log line), R-ctl-7a-CTL7A.4 (other stale #help-hint
comments remain, e.g. client/index.html:127, evolutionNotice.test.ts:578),
R-ctl-7a-MOVEFLAKE (movement-input.spec still flaked in the latest handoff's verifier e2e run).
