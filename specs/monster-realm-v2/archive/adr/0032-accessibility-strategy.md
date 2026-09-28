# 0032. Accessibility strategy
- Status: accepted
- Date: 2026-06-24
- Surfaced by: the holistic review (launch-readiness gap). Load-bearing for M23; builds on ADR-0013/0014.

## Context and problem statement
Accessibility was scattered/deferred. A quality launch should be playable for keyboard, screen-reader,
colorblind, and motion-sensitive players. The architecture already helps (DOM-overlay menus are real HTML;
the visual/netcode split isolates animation), so a11y can be a gated property rather than a retrofit.

## Considered alternatives
- **WCAG-aligned a11y leveraging DOM-overlay menus + `pixijs-accessibility` for canvas + a reduced-motion
  switch on the visual layer (chosen).** Menus (real DOM) get roles/labels/ARIA + focus management; canvas
  interactives get an accessible DOM mirror; game info is color-independent (icon/text + color); reduced-
  motion snaps instead of interpolating (ADR-0013 visual layer only, netcode untouched); WCAG-AA contrast +
  text scaling; gated by an automated check + manual checklist.
- **Defer a11y to post-launch.** Excludes players; expensive to retrofit. Rejected.
- **Make the WebGL canvas itself a screen-reader target.** Impractical; the DOM overlays + a canvas mirror
  are the pragmatic path. Rejected.
- **Color-only type/status indicators.** Excludes colorblind players. Rejected.

## Decision outcome
- Chosen: **WCAG-aligned a11y as a gated property** — accessible DOM menus, `pixijs-accessibility` canvas
  mirror, color-independent info, a `prefers-reduced-motion`-default reduced-motion switch on the visual
  layer, contrast/scaling, and an a11y check gate.
- Consequences: reduced-motion is a clean switch on ADR-0013 (feel optional, correctness independent); a11y
  copy composes with i18n (M24); the DOM-overlay decision (ADR-0014) pays an a11y dividend; controller/switch
  access and audio captions are additive later.
