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

## Fan-out & integration note (for the slicing agent)

When finalizing this milestone's slices and `touches:` sets — drafted at build time per `PLAN.md` §9 for the M15–M25 sketches; refined from the existing task breakdown for the fuller M11–M14 specs — design for **`touches:`-disjoint parallel fan-out** and plan for **post-integration correctness**:

- **Size and organize files so independent work declares narrow, disjoint `touches:` sets** and can run concurrently (bounded N≤2, `docs/routing.md`). Slice along the natural boundaries: a `game-core` rule module; a **server-module domain module** (the M8.9 map — `schema/guards/marshal/content/movement/monster_mgmt/battle/taming` plus any new domain file this milestone adds); `client/`; content data (`game-core/content/` + `validate_content`); and `evals/`. Two slices are parallelizable only when their `touches:` sets do not overlap (e.g. a server-reducer slice ‖ a client slice, or two different server-domain modules).
- **Don't grow a new monolith.** If this milestone would push a file toward the size that made `server-module/src/lib.rs` a serialization bottleneck (the reason for M8.9), introduce the module split **as part of this milestone** — add a new domain module and extend the M8.9 `touches:` vocabulary — rather than appending to one large file. Keep new tables additive in `schema.rs`; keep module/file names stable so downstream `touches:` declarations remain valid.
- **Disjoint files are necessary but not sufficient — respect the dependency chain.** A pure `game-core` rule gates its reducer, which gates the client/evals; the client needs regenerated bindings. The realistic shape is usually a **serial rule→reducer spine with a parallel client ‖ evals tail**; declare slice *order* accordingly, not just `touches:`.
- **Include an explicit post-integration verification plan in the definition-of-done.** Parallel slices passing in isolation does **not** prove they work together. After the slices merge (serial, verifier-gated, each later slice rebased on the merged earlier ones), the milestone MUST verify the *integrated whole*: full `just ci` green-and-meaningful, `bindings-drift = 0`, schema-snapshot intact, the e2e/integration gate green, and a check that the **combined** behavior satisfies this milestone's EARS acceptance criteria end-to-end (not merely that each slice was individually green). Name every cross-slice contract (shared types, table columns, reducer signatures, generated bindings) and the test that proves it holds after integration.
