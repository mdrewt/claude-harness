# rb-59 — battle card role cue is not hue-only (plan)

Source residual: `R-m23-s8-postmerge-border` (ADR-0233 spells it `R-m23-s8-BORDER`; harness-side id
is the `postmerge-border` one — do NOT "correct" either).
touches: `client/src/ui/battleView.ts`, `client/src/ui/battleView.test.ts`. No ADR number assigned
(rb-56 precedent: same file, same defect class, shipped with NO ADR).

## Defect
`battleView.ts:109` `border:1px solid #844` (opponent) vs `:116` `border:1px solid #484` (player):
the two card ROLES are separated by hue alone (red/green — the worst dichromacy pair), and the two
hexes are near-identical in relative luminance so greyscale does not separate them either. Same
WCAG 1.4.1 class m23-s8 fixed for the HP-severity palette (ADR-0233 / A11Y-29).
ADR-0233:189 claims of this border family "All carry text labels, so none is an A11Y-29 violation" —
FALSE in exactly one state: `battleView.ts:207` renders the PvP opponent header as a bare rival
player name with no role word, so in PvP hue+position are the only role channels.

## PLAN REVISION (post plan-review: `reviewer` + `red-team`, both measured)

**CUT — the PvP header change (old E2/T2/M9/BS1/BS3). CONFIRMED HIDDEN-DEPENDENCY STOP.**
`Opponent (${name})` reds the REQUIRED per-PR `e2e` CI job (`.github/workflows/ci.yml:109` +`:182`
-> `just e2e` -> all of `client/e2e/**`). Two specs parse that header as a `${name}: ` PREFIX:
`client/e2e/monster-privacy.spec.ts:430-435` (`getByText(\`${opponentName}: \`).first()` then
`startsWith`) and `client/e2e/pvp-side-b.spec.ts:361`. ANY prefix before the player name breaks
`startsWith`; a sibling span is also unsafe because `.first()` may resolve to the header div and
`innerText` then carries the role word on its own line. Both files are OUTSIDE `touches:`.
-> registered as a residual and DEFERred (ledger X6). The consequence is stated honestly, not
buried: with the header cut this slice ships NO screen-reader improvement — PvE already has the
`Opponent:`/`You:` text cue and PvP still has none.

**ADDED — the delivered cue must actually be VISIBLE.** MEASURED: the opponent border `#844`
reaches only **2.34:1** against its own card background `#2a1a1a` (WCAG 1.4.11 non-text minimum is
3:1); the player border `#484` on `#1a2a1a` is 3.49:1. Dashing a sub-threshold border removes ~half
its remaining ink, so shipping `dashed #844` would ship a cue nobody can see. The opponent border
therefore moves `#844` -> `#b66` (**4.13:1**), same red family, same two lines. Falsifies
`docs/adr/0233:187` (present-tense `#844`) -> doc-truth DEFER, same class as rb-58's X4.
Verified in-tree: NOTHING outside `battleView.ts` pins `#844`/`#484`.

**ADDED — four measured CI-clean bypass classes the original teeth missed** (red-team ran a
faithful reconstruction of T1/T2/T3 and scored each mutant against the real 56-test suite):
- **S1/S4/S6 — the colour channel is unread.** `border:2px dashed transparent` (also
  `rgba(...,0)`, `#8440`, `border:2px dashed #2a1a1a`, and a colourless `border:2px dashed;`) all
  score **59/59 CI-clean** while Chromium renders dashed and solid as BYTE-IDENTICAL screenshots
  (same SHA-1). The style channel is not weakened, it is DELETED. Closed by reading
  `borderTopColor` through the existing `s8Rgb` (which already refuses transparent / alpha /
  `#rgba` / `initial` / empty) and asserting a contrast ratio against the card's own background.
- **S2 — state-gated no-op.** `if (vm.isPvp) this.#opponentCardEl.style.borderStyle='solid'`
  scores **59/59**: the original T1/T3 build only PvE VMs, so the fix is a no-op in exactly the
  state the residual is about. Same for `if (card.status)`, terminal outcome, and weather.
  Closed by asserting the border pair under PvP, statused, and terminal+weather VMs.
- **S3 — AT-invisible / screen-invisible cues.** `header.setAttribute('aria-hidden','true')`,
  `header.style.display='none'`, `nameSpan.style.fontSize='0'` are all CI-clean and gut the TEXT
  cue this slice's rationale leans on. Closed by sweeping `card.querySelectorAll('*')` for
  `title`/`aria-*` and pinning the header's own cssText.
- **S5/S8 — cascade and width.** `el.className='sr-only'` (a REAL shipped class,
  `styles.css:57-67`, clips to 1px) and `el.style.visibility='hidden'` are CI-clean; so is
  `2px dashed` vs `8px solid` despite the plan claiming equal widths are load-bearing.
  Closed by `className === ''`, `visibility !== 'hidden'`, and a width-equality assertion.

**AUTHORING HAZARD (measured):** write the width refusal as `if (!(w > 0)) throw`, never
`if (w <= 0)`. `border:thin dashed #844` yields `borderTopWidth === 'thin'` -> `parseFloat` is
`NaN` -> `NaN <= 0` is `false` and the refusal FAILS OPEN.

**ORACLE DISCHARGED (measured by me and independently by the red-team):** happy-dom 20.10.6 DOES
expand the `border` shorthand into all four `border*Style` longhands + `borderTopWidth`;
`border:0 dashed` reads `0px`; `hidden` reads `hidden`; an invalid style token drops the WHOLE
declaration to `''`. The plan's Risk-1 is closed. CORRECTION to the original plan: a DETACHED
element still reads `dashed` from INLINE style in happy-dom, so "a detached node reads '' and is
refused" (old M4 rationale) is FALSE for inline styles — the refusal still catches
empty/none/hidden/zero-width, but not detachment.

**CORRECTION (factual, original plan line 10-11):** `#844` vs `#484` are NOT "near-identical in
relative luminance" — measured L=0.098 vs L=0.193, a 1.64:1 ratio, which CLEARS this file's own
1.5:1 band-pair standard (`battleView.test.ts:3241`). Deleted. The real argument is that hue is
the only channel, not that the luminances collide.

**ARGUED DISMISSAL — the card BACKGROUNDS** (`#2a1a1a` vs `#1a2a1a`, measured **1.10:1**, flatter
in greyscale than the borders they sit inside). Left alone deliberately: once the border style is
hue-free the WCAG 1.4.1 criterion is met, the backgrounds are decoration over a channel that now
carries the information, and retuning them is a visual redesign with no measurable a11y delta.
Recorded here so "why not the backgrounds?" has an answer.

**HONEST FRAMING (reviewer M2, accepted).** `dashed` vs `solid` DISTINGUISHES the two cards
without hue; it does not by itself IDENTIFY which is which. What identifies them is the header
text (`Opponent:` / `You:`, `battleView.ts:246`), which already ships in PvE. The border style is
a redundant secondary cue layered on a text label — that is what satisfies WCAG 1.4.1, and the
in-file comment says so rather than overclaiming.

## Chosen treatment (~20 production lines) — SUPERSEDED IN PART, see PLAN REVISION above
1. Border STYLE becomes the discriminator: opponent `border:2px dashed #844`, player
   `border:2px solid #484`. Hexes UNCHANGED (ADR-0233:186-190 asserts those two literals in the
   present tense and is outside touches:; retuning them would falsify a doc we cannot edit).
   Widths equal so *style* is the sole discriminator.
2. PvP opponent header names the role: `Opponent (${vm.pvpOpponentName})`. PvE arm untouched.
3. Dense in-file rationale comment (house convention). No new ADR, no new eval (ADR-0224).

### Rejected
- `aria-label`/ARIA literal on the card — `battleView.ts:8-11` declares this view ships no ARIA
  literal of its own, and an `aria-label` on a role-less `<div>` is not reliably exposed by AT.
  It is a MUTANT (M5), not a fix.
- `data-battle-role` — machine-only; would make the gating test tautological.
- Luminance separation of the two border hexes — distinguishes but does not identify, nothing for
  AT, and falsifies ADR-0233:186-190.
- border-WIDTH as the channel — weaker at small scale, reads as emphasis not category.
- Hoisting both cssText strings into a shared constant — couples the two cards and hides the one
  property that must differ.

### :343 (`#844`, Flee button) — surveyed and DISMISSED
`:343/:390/:412/:430/:451/:471` are `<button>`s carrying `Flee`/`Recruit`/`Use Item`/`Swap:`/
`Submit:` as accessible names. Hue encodes no information there. ADR-0233:188-190 concedes the same.
Out of scope by argument, not by omission.

## EARS acceptance criteria (ledger E1-E4)
- E1 The BattleView SHALL render the opponent card and the player card with DIFFERENT CSS border
  styles, each perceptible (never none/hidden/empty/zero-width) and equal on all four sides.
- E2 WHEN the battle is PvP AND an opponent player name is available, the BattleView SHALL render
  the opponent card header name as the role word `Opponent` followed by that player name.
- E3 The BattleView SHALL continue to render the PvE opponent header as `Opponent: <species>` and
  the player header as `You: <species>`, and SHALL NOT add or remove a child of either card.
- E4 The BattleView SHALL carry each card's role cue in the persistently rendered DOM (border style
  + header text) and SHALL NOT carry it in a `title` attribute or an ARIA literal on the cards,
  WHILE the view is re-rendered across successive batches.

## Gating tests (append to battleView.test.ts after :3477)
Helpers, mirroring the m23s8 "refuse, never default" doctrine at `:2998-3016`:
- `rb59Cards(parent)` — root = `parent.firstElementChild`, assert `root.children.length ===
  RM3_ROOT_CHILDREN` (`:2715`), take `RM3_OPPONENT_INDEX`/`RM3_PLAYER_INDEX` (`:2716-2717`),
  assert `isConnected` AND textContent-label agreement (index checked against content, `:2756`).
- `rb59BorderStyle(el, where)` — reads all four `border*Style` + `borderTopWidth`; THROWS
  `rb59 BORDER REFUSED` on empty/`none`/`hidden`/`initial`, non-positive width, or side disagreement.

T1 different, perceptible border styles (PvE VM, status null) + a labelled regression pin on the
   shipped `dashed`/`solid` pair.
T2 PvP header names the role. FRESH PvP VM with `pvpOpponentName: 'Rival'` — do NOT reuse
   `makePvpPendingVM()` (`:942-986`), whose name is literally `'Opponent'`, making a name-dropping
   impl render identically (measured vacuity class). Exact equality on `nameSpan.textContent`
   (`'Opponent (Rival): TheirMon'`, `'You: MyMon'`) + PvE regression pin `'Opponent: WildMon'`.
T3 cue is in the persistent DOM: distinct BEFORE any `refresh()`, still distinct after two refreshes
   with CHANGED VMs (`:2698-2704` second-render doctrine); `title`/`aria-label`/`aria-hidden` null
   on both cards and both nameSpans.

### Mutants (all CI-clean today)
M1 hue-only swap, both solid -> T1 pair relation.
M2 BOTH cards dashed -> T1 pair relation (why it is a relation, not two literals).
M3 `border:0 dashed` -> positive-width refusal.
M4 delete a border decl / `hidden` -> empty/none/hidden refusal.
M5 cue as `card.title` or `aria-label` on a role-less div -> T3 null clauses + T2 exact text.
M6 role word into the `Lv` span / HP line / a new hidden span -> T2 positional+exact; new child
   also reds `:3262` (4 children) and `:2762` (3 children).
M7 oracle-by-source-text -> structural: every oracle is `el.style.*`/`textContent` on an
   `isConnected` node from a live `new BattleView(...)`.
M8 correct at construction, rewritten by a later `refresh` -> T3 pre-refresh + post-two-render.
M9 both arms `Opponent (...)`, breaking the PvE anchor -> T2 PvE pin + existing `:2344`.
M10 `borderTopStyle` only -> four-sides-equal clause.

## Risks
- happy-dom shorthand expansion must be confirmed at RUNTIME before pinning the oracle (static
  evidence: happy-dom expands `border` into per-side longhands and collapses `borderStyle`).
- No new string literal in `battleView.ts` may contain `transition`/`animation`/`.animate(`/
  `KeyframeEffect` — `evals/reduced-motion-hp-bar.eval.mjs` scans strings-intact and is outside
  touches:.
- No new/removed DOM nodes anywhere (root pinned at 10, cards at 3/4).
- vitest `-t` with zero matches EXITS 0 -> every ledger CHECK pins a passed COUNT, not exit status.
- Comment insert above `:107` drifts `docs/adr/0233:187-188`'s `:109`/`:116` pointers (rb-56 already
  drifted the same paragraph with nothing red; digest gate is header-only). Flag, do not widen.

## Boy Scout (cap ~40 lines / <=3 hunks)
BS1 `battleView.ts:207` template literal wrapping a bare string — removed as a side effect of E2.
BS2 `battleView.ts:106`/`:113` fold the two bare positional comments into the rationale block.
BS3 `battleView.test.ts:2735` `rm3ResolveFill` doc says the header label is `Opponent: …`/`You: …`;
    after E2 that is PvE-only — one clause so the file is not a present-tense quoter of changed
    behaviour.
