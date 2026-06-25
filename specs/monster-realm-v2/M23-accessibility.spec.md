# Sketch: M23 — Accessibility

**Status:** design sketch (provisional) · **Phase D** · **Decision:** ADR-0032 (builds on 0013/0014).

> Provisional sketch — EARS criteria + tasks deferred to build time. A cross-cutting pass retrofitting a11y
> into M4/M7/M19.

## Problem / intent
Make the game playable + legible for keyboard, screen-reader, colorblind, and motion-sensitive players — a
gated property, leveraging the architecture's affordances.

## Scope (condensed)
- **Keyboard:** full operation of all menus/overlays; visible focus + logical order/trapping; remappable keys.
- **Screen readers:** the **DOM-overlay menus** (ADR-0014) carry roles/labels/ARIA; battle events via live
  regions; canvas interactives via the **`pixijs-accessibility`** mirror.
- **Color independence:** affinity/status by **icon/text + color**, never color alone; a colorblind palette.
- **Reduced motion:** a `prefers-reduced-motion`-default option that **snaps** instead of interpolating — a
  switch on the **ADR-0013 visual layer only** (netcode correctness untouched).
- WCAG-AA contrast + text scaling; an automated a11y check + manual checklist gate.
- **Out of scope:** controller/switch access; audio captions (no audio yet).

## Key design + boundary
The DOM-overlay-menus decision (ADR-0014) and the visual/netcode split (ADR-0013) make a11y *cheap* — menus
are real HTML, reduced-motion is a clean visual switch. A11y copy **composes with i18n (M24)**.

## Risks / decisions
Color-only info → icon/text + color. Reduced-motion breaking netcode → visual-only switch. Inaccessible canvas
→ DOM overlays + `pixijs-accessibility` (don't make the WebGL scene a screen-reader target).
