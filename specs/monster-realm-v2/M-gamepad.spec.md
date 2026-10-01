# Spec: M-gamepad — controller support on the virtual-button layer (SKETCH)

**Status:** sketch, 2026-10-01. Elaborate with `milestone-loop-prompt.md` when PLAN §9 reaches it,
against the CURRENT game repo · **Project:** monster-realm (client) · **Depends on:**
`M-postgate-console-controls` (all slices merged) · **Target:** before launch (operator,
2026-10-01: "a milestone to add that support will be planned … before the game releases").

## Problem / intent

Players who prefer controllers should be able to play the whole game with one. The operator asked
that the console-controls redesign make this "an easy to add feature"
(`operator-feedback-2026-10-01-controls.md`). That milestone routes every input through ONE binding
table into twelve virtual buttons, and its router consumes only source-agnostic `{button, down}`
edges (`console-controls-design.md` §2, §12; `M-postgate-console-controls.spec.md` CTL1.5). So
controller support is an additional input source, not a redesign. This spec is the single home of
the pad design (the controls spec points here).

## Scope (sketch)

- A `gamepadSource` that polls `navigator.getGamepads()` each frame, maps pad buttons to virtual
  buttons through the binding table, emits `{button, down}` edges to the existing router, and calls
  `releaseAll` on disconnect or blur.
- A pure `stickToDpad` with a deadzone and hysteresis, so the left stick drives the virtual D-pad.
  Held-stick movement goes through the existing held-keys seam ("Held keys" decision).
- `pad` default bindings on the W3C standard mapping: 0 A, 1 B, 2 X, 3 Y, 4/5 LB/RB, 8 Select,
  9 Start, 12–15 D-pad. Triggers (6/7) and stick clicks (10/11) carry optional accelerators, as the
  operator suggested.
- Remapping covers the pad device. Storage adds a `pad` entry to the `mr.controls` record
  (`{v:1, buttons, accels}` today) additively, or as v2 with a v1 migration — decide at elaboration.
- A pad glyph family (Xbox-style letters by default) shown by the hint bar and help, chosen by the
  last-used source.
- One e2e per flow on a mocked Gamepad API: the operator's required menu flow and one battle turn,
  pad-only.

## Named deferrals / open questions

- Per-vendor glyphs (PlayStation/Switch layouts): decide at elaboration.
- Rumble and haptics: wontfix for this milestone (not requested; revisit only on operator request).
- Steam Input: M21b-3.
- Touch walking: residual R-ctl-TOUCHWALK (`console-controls-design.md` §17).

## Notes

- **Consumes:** `input/router.ts` (`{button, down}` edges), `input/bindings.ts` (`DEFAULT_BINDINGS`,
  `parseBindings`), `input/bindingStore.ts` (`loadBindings`/`saveBindings`), `input/glyphs.ts`, and
  the `releaseAll` contract — all delivered by M-postgate-console-controls.
- **Must not change:** contexts, nav, screen adapters or their tests. If an elaboration finds it
  needs to, that is a defect in the controls milestone's abstraction and goes back there.
