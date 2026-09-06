# rb-56 plan — persistent visible skill-affinity cue (residual R-m23-s8-postmerge-title)

Branch `feat/rb-56-skill-affinity-badge`, worktree `.claude/worktrees/rb-56` off `origin/master@b08ed51`.

## Criterion
"skill affinity exposed only via btn.title (battleView.ts:308), not a persistent visible cue"

## Decision (after planner + reviewer + red-team + /simplify)
**One-line label interpolation, NOT a badge element.** In `#renderSkills`
(`client/src/ui/battleView.ts:307`) append the affinity to the button's own label text:
- PvE: `` `${skill.name} (${skill.power}) · ${skill.affinity}` ``
- PvP: `` `Submit: ${skill.name} · ${skill.affinity}` ``
and narrow `:308` to `` btn.title = `Acc ${skill.accuracy}%` ``.

**Why not the `<span data-testid="skill-affinity">` badge the planner proposed:** `battleView.ts:283`
already renders the *monster's* affinity as plain interpolated text (`HP x/y · Affinity`) — the span
would be inconsistent with the file's own precedent 25 lines above the edit site. Independently
recommended against by BOTH the reviewer and `/simplify`. It also dissolves the red-team's HIGH
finding: an inline-styled badge needs a style-suppression assertion, and under happy-dom (no layout,
no cascade) that assertion is an unclosable blacklist — `opacity:0`, `color:#2a2a3e` (== the button's
own background, battleView.ts:294), `max-width:0`, `text-indent:-9999px` and `transform:scale(0)` all
ship an invisible cue past a 4-item blocklist. No element ⇒ no suppression surface ⇒ the whole
bypass class is unreachable rather than merely guarded.

**Affinity rendered VERBATIM, no client-side short-token map.** `game-core/src/content.rs:1687-1691`
already records this, attributed to ADR-0233: the eight `A11Y_TOKENS` affinity rows are
*deliberately* unconsumed *because* the client renders the affinity NAME as text. A client-side
`FIR/WTR/...` map would be the rb-55 defect with no parity oracle AND would falsify that comment,
forcing a `game-core` edit — a hidden-dependency STOP.

**No new ADR.** Reviewer and `/simplify` both say ceremony: the decision is already recorded at
`content.rs:1687-1691` under ADR-0233; this slice APPLIES it to a sibling render site rather than
introducing it. The supervisor-reserved number 240 was in any case **already taken by rb-55**
(`docs/adr/0240-rb55-client-badge-parity-with-a11y-token-ssot.md`, merged in b08ed51) — a live
instance of the ADR-number reservation race. 241 is left unclaimed. Rationale ships as a code
comment citing ADR-0233 + `content.rs:1687-1691`.

## Blast radius (all VERIFIED, none needs an out-of-touches edit)
Every consumer of the skill-button label is prefix- or substring-anchored, so an appended suffix is safe:
- `client/src/ui/battleView.test.ts:1013,1099,1106,1113` — `b.textContent?.startsWith('Submit:')`
- `client/e2e/pvp-side-b.spec.ts:349,376,385,416`, `monster-privacy.spec.ts:398,401` — `/^Submit: /` (start-anchored only)
- `client/e2e/my-battle-privacy.spec.ts:486`, `recruit.spec.ts:722` — `button:has-text("(")` (PvE `(power)` survives)
- `client/src/main.wiring.test.ts:6388` — `src.includes('Submit: ')`
**Ordering is load-bearing: the affinity must be APPENDED, never prepended or infixed.**
Eval tripwires confirmed but not tripped: `evals/reduced-motion-hp-bar.eval.mjs:755` bans
`transition:`/`animation:` anywhere in battleView.ts and scans battleView.test.ts for suspension
spellings; `evals/keyboard-operable-rows.eval.mjs:3322` freezes tabindex writes to -1. The plain-text
change adds no style, no tabindex, no aria. `RM3_ROOT_CHILDREN` (test:2715) is untouched — no new
`#root` child. No eval censuses `data-testid`. `battleModel.ts` needs NO change (`battleVMsEqual`
already compares `sa.affinity`, :474).

## Test (ordinary vitest, ADR-0224 — no new/extended eval)
One `rb56` describe in `client/src/ui/battleView.test.ts`. Fixture: `makeUx4VM({ skills:
UX4_TWO_SKILLS, canFlee: false })` — two skills with DISTINCT affinities (Grass/Normal) and distinct
powers, `canFlee:false` so the ONLY buttons in the view are the two skill buttons (no positional
walk needed). Oracle: per-button EXACT equality on the full button `textContent`, asserted in BOTH
PvE and PvP modes, plus the button-count precondition and a `btn.title` assertion.
Explicitly forbidden: `outerHTML`/`innerHTML` reads (the serialized `title` contains the affinity —
that assertion passes on the UNFIXED code), presence-only `toContain`, single-affinity fixtures.

## Ledger
X1 criterion (vitest `-t rb56`, passed-count pinned), X2 proof-of-teeth (MANUAL mutant register),
X3 full `just ci` (with a `WRONG-REPO` guard — rb-55's X4 wrote a FALSE GREEN by running the
harness self-test from the wrong cwd).

## Flagged, deliberately NOT touched (follow-ups, not this slice)
- `docs/adr/0233-*.md:184-186` still lists residual R-m23-s8-TITLE (this slice's criterion) as open.
  Out of my reserved-ADR-number scope and plausibly owned by a concurrent rb-57 (colour/tint, also
  ADR-0233 territory) — flag, do not touch.
- Skill ACCURACY remains hover-only in `btn.title` — same defect class as rb-56, not closed here.
- `client/e2e/my-battle-privacy.spec.ts:482` and `recruit.spec.ts:719` cite a stale `battleView.ts:149`
  for the label shape (already stale pre-slice; out of touches).
- `battleView.test.ts:1621` fixture uses `affinity: 'Grass'`, not a real Rust `Affinity` variant
  (`Plant`). Pre-existing; perturbing it would disturb the documented ux4 H-fixture asymmetry.
