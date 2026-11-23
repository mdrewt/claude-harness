# gp-4 plan — pad glyphs, chosen by the last-used source

Spec: specs/monster-realm-v2/M-gamepad.spec.md §gp-4 · tier: routine · worktree `.claude/worktrees/gp-4` from `1f0a5b87`.

## Functional core / imperative shell

- **Core (pure), `client/src/input/padGlyphs.ts`** (new):
  - `export type InputSource = 'keys' | 'pad';`
  - `export function padGlyph(i: PadIndex): string` — 0 `A`, 1 `B`, 2 `X`, 3 `Y`, 4 `LB`, 5 `RB`,
    6 `LT`, 7 `RT`, 10 `LS`, 11 `RS` literal; 8 `t('pad.view')`, 9 `t('pad.menu')`, 12..15
    `t('pad.dpadUp|Down|Left|Right')`; any other index `tf('pad.button', { n: i })`. Locale read per
    call (a switch shows at the next render). Never empty.
  - `export function keycapFor(source: InputSource, keys: Bindings, pad: PadBindings): (button: VButton) => string`
    — `'keys'`: `glyph(keys.buttons[b][0])`, `''` when unbound; `'pad'`: `padGlyph(pad.buttons[b][0])`,
    `''` when unbound (gp-4.4). This is the one place a keycap is chosen.
- **Shell, `client/src/shell/inputState.ts`**: `export let lastSource: InputSource = 'keys'`;
  `export function noteInputSource(source: InputSource): void`; `export const keycap = (button) =>
  keycapFor(lastSource, bindings, PAD_TABLE)(button)` — the live function (reads the live keyboard
  table and source at each call). `PAD_TABLE` is the one pad table const the pad source is built
  over too (no drift; gp-5 makes it live).
- **`client/src/ui/hintBarModel.ts`**: `hintBar(stack, keycap: (button: VButton) => string, notices, …)`
  — the `bindings` parameter is replaced; `chip()` reads `keycap(button)`. Drops its `glyphs` and
  `Bindings` imports.
- **`client/src/main.ts`** (wiring only): `hintChips` and the boot paint pass `keycap`;
  `interactKeycap()` returns `keycap('A')`; `handleKeyDown` calls `noteInputSource('keys')` first;
  `pollPad` calls `noteInputSource('pad')` when the poll holds a press (a down edge or an
  accelerator), before the focus / capture guards. A pointer press calls neither.
  The interact prompt's change-detection signature already contains `interactChipText(chip)`
  (which embeds the key), so a source flip repaints the chip; the picker's aria-label reads
  `interactKeycap()` at its paint.
- **i18n**: 7 ids in `messageIds.ts` (+`MessageParams['pad.button'] = { readonly n: number }`),
  `catalog.en.ts` / `catalog.fr.ts` with `@desc` comments; en `View`, `Menu`, `D-pad ↑/↓/←/→`,
  `Button {n}`; fr `Affichage`, `Menu`, `Croix ↑/↓/←/→`, `Bouton {n}`. `catalog.test.ts` roster +
  byte pins; `catalogParity.test.ts` resolver-importer roster gains `input/padGlyphs.ts` (widened,
  named pin PARITY-02).
- **e2e** `pad-menu-flow.spec.ts`: before the first pad press the Start chip's `.mr-chip-key` is the
  keyboard glyph; after `pressButton(page, 'Start')` (the pad) it is `t('pad.menu')` `[gp-4.6]`.

## Boundary contracts / data model

Additive: one new module, two new exports in inputState, one parameter type change in a pure
function whose only production caller is main.ts (tactics/* import its types only). No storage,
schema or server change.

## plan-delta

- `lastSource` flips to `'pad'` on a pad **press** (a down edge or accelerator), not on a release
  edge: a keydown (not a keyup) sets `'keys'`, and a pad button released after a key press would
  otherwise flip the bar back to pad glyphs with no new pad input.
- `keycapFor` (pure) added beside `padGlyph` so gp-4.4 (an unbound pad index) is testable before
  gp-5 can unbind one; the spec's `keycap` is `inputState.keycap`.
- No planner subagent: the spec states the full contract (routine tier, wiring-only main.ts change).

## Risks

- gp-3's `pad-battle.spec.ts` (parallel) — if it reads a keycap after pad presses, it sees pad
  glyphs. Note filed for the supervisor.
- main.input.test.ts gp-2 pad cases may read hint keycaps after a pad press (outside touches): the
  full run decides; widen with the red test as proof if so.
