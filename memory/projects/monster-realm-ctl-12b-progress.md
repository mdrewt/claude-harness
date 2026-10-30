# ctl-12b — PR open, local gate green (2026-10-04)

Acceptance: 2/2 met, 0 deferred, 0 unmet — ctl-12b seed:dd13bf186fa2adec. No deferrals.

- PR: https://github.com/mdrewt/monster-realm/pull/571 (head `ctl-12b` @ add7f1ad, base master 6d7d0a8c).
  The park placeholder #570 is closed (superseded).
- Local gate: `just ci` green (179 test files, 4041 tests). Playwright run locally: `remap.spec.ts`
  (the CTL12B.2 CHECK), `controls.spec.ts`, `menu-flow`, `rename`, `battle-dpad`, `encounter-battle`.
- Merge is supervisor-owned. Nothing is in flight; no server left running.

## For the supervisor
- CTL12B.2's CHECK is a Playwright run: it needs a live SpacetimeDB on 127.0.0.1:3000
  (`spacetime start --data-dir $(mktemp -d)/data --in-memory --listen-addr 127.0.0.1:3000`), and it
  finished well inside the 120 s CHECK timeout here.
- Residuals added: R-ctl-12b-PROSEHINTS (backlog, ux-a11y/LOW), R-ctl-12b-ROWCLICK (-> ctl-15).
- The spec's ctl-12b section has an uncommitted build note in the harness tree
  (`specs/monster-realm-v2/M-postgate-console-controls.spec.md`).
- Options lists How to play, then Controls (design §5 lists Controls first): two e2e specs outside
  `touches:` expect the cursor on `help`. ctl-14 owns the Options list next.
- Scratch left behind (recursive deletes are blocked): /tmp/tmp.yINdT4Yat4, /tmp/tmp.GfAkwtkJAg
  (spacetime data dirs), /tmp/ctl-12b-*.{log,diff,md,json}, /tmp/ctl12b-*.
