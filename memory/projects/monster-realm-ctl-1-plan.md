# ctl-1 plan — input foundation (virtual buttons, one binding table, router owns D-pad + Space)

Spec: specs/monster-realm-v2/M-postgate-console-controls.spec.md §ctl-1 (CTL1.1–CTL1.5); design §2, §3, §12.
Worktree: projects/monster-realm/.claude/worktrees/ctl-1 (branch ctl-1, base 34a8fb65).

## Functional core (new, pure, no DOM/SDK/module state/clock)

### client/src/input/buttons.ts
```ts
export const VBUTTONS = ['Up','Down','Left','Right','A','B','X','Y','LB','RB','Start','Select'] as const;
export type VButton = (typeof VBUTTONS)[number];
export const ACCELS = ['B','I','V','J','U','P','L','N','C','F9','F8'] as const; // design §3 accelerator table
export type Accel = (typeof ACCELS)[number];
export interface ButtonEdge { readonly button: VButton; readonly down: boolean }
export function dpadDir(b: VButton): WasmDirection | undefined; // Up→North, Down→South, Left→West, Right→East
```

### client/src/input/bindings.ts
```ts
export type KeyCode = string; // KeyboardEvent.code (positional)
export interface Bindings {
  readonly buttons: Readonly<Record<VButton, readonly KeyCode[]>>;
  readonly accels: Readonly<Record<Accel, readonly KeyCode[]>>;
}
export const DEFAULT_BINDINGS: Bindings; // design §3, primary first then aliases:
//  Up KeyW,ArrowUp · Down KeyS,ArrowDown · Left KeyA,ArrowLeft · Right KeyD,ArrowRight
//  A Enter,NumpadEnter · B Backspace · X Space · Y KeyF · LB KeyQ,PageUp · RB KeyE,PageDown
//  Start Escape,KeyM · Select KeyR,Slash
//  accels: B KeyB · I KeyI · V KeyV · J KeyJ · U KeyU · P KeyP · L KeyL · N KeyN · C KeyC · F9 F9 · F8 F8
export const RESERVED_CODES: readonly KeyCode[]; // Tab F5 F11 F12 + Shift/Control/Alt/Meta Left/Right
export function buttonForCode(b: Bindings, code: KeyCode): VButton | undefined;
```
Invariants (fast-check where combinatorial): every code bound at most once across buttons∪accels; no reserved code bound; every VButton has ≥1 code; frozen (Object.isFrozen deep).
`e.code` is positional, so Shift/case are ignored by construction (resolution never reads `e.key`/`shiftKey`).

### client/src/input/router.ts
```ts
export type Owner = 'target' | 'router';
export function ownership(target: unknown, e: { code: string; isComposing?: boolean; keyCode?: number }): Owner;
//  isComposing || keyCode===229            → 'target' (every key)
//  tagName INPUT/TEXTAREA/SELECT or isContentEditable → 'target' except Escape/Enter/NumpadEnter → 'router'
//  tagName BUTTON/A                        → 'target' for Space/Enter/NumpadEnter, else 'router'
//  anything else (window, body, canvas, non-object) → 'router'
//  Structural read (tagName / isContentEditable) — no instanceof, so it is DOM-free.
export function routerConsumes(b: VButton): boolean; // ctl-1: D-pad + X only
export type RouterEffect =
  | { readonly kind: 'dirDown'; readonly dir: WasmDirection } // shell: if (!held.isHeld(dir)) step(dir); held.press(dir, now)
  | { readonly kind: 'dirUp'; readonly dir: WasmDirection }   // shell: held.release(dir)
  | { readonly kind: 'jump' };                                 // shell: jump()
export interface RouteContext { readonly worldActive: boolean } // = !anyOverlayVisible()
export interface RouteResult { readonly consumed: boolean; readonly effects: readonly RouterEffect[] }
export class InputRouter {
  route(edge: ButtonEdge, ctx: RouteContext): RouteResult;
  releaseAll(): readonly RouterEffect[]; // dirUp per held direction, counts reset
}
```
Semantics:
- D-pad down: refcount[button]++ always; consumed=true; effects = worldActive ? [dirDown] : [].
- D-pad up: if refcount>0, decrement; on reaching 0 → [dirUp] (any ctx). consumed=true. Up with count 0 → [] (no underflow).
- X down: consumed; worldActive ? [jump] : []. X up: consumed, [].
- Every other button: consumed=false, effects [].
Refcount lives in the router (counts down-edges across ALL sources), so keyboard W + a pad Up also refcount.

### client/src/input/keyboardSource.ts
```ts
export interface KeyEventLike { code; repeat?; ctrlKey?; altKey?; metaKey?; isComposing?; keyCode?; target? }
export const isChord: (e: KeyEventLike) => boolean; // ctrl || alt || meta
export class KeyboardSource {
  constructor(bindings: Bindings = DEFAULT_BINDINGS);
  buttonFor(code: string): VButton | undefined;            // resolves through THIS source's bindings
  keydown(e: KeyEventLike): readonly ButtonEdge[];
  //  [] if chord, repeat, ownership(e.target,e)==='target', or unbound.
  //  [down] for an unrecorded code (records it).
  //  [up, down] for a NON-repeat keydown on an already-recorded code: its keyup was lost
  //  (e.g. macOS drops keyups while Cmd is held) — the synthetic up resets the refcount so
  //  the key is never dead and no direction stays phantom-held.
  keyup(e: KeyEventLike): readonly ButtonEdge[];             // [up] iff the code is recorded (NO chord/ownership filter → no stuck keys); else []
  releaseAll(): void;                                         // forget every recorded code
}
```
One recorded down per physical key; one up per recorded down. That is what makes the router's per-button refcount equal "number of physical keys holding it".

## Imperative shell (main.ts)
- Delete `KEY_DIR` and `targetOwnsKey`. Module-level `keyboard = new KeyboardSource()`, `inputRouter = new InputRouter()`.
- `suppressNativeMovementDefault(e)` keeps its name/callers; body → `!isChord(e) && b=keyboard.buttonFor(e.code) && routerConsumes(b) && ownership(e.target,e)==='router'` ⇒ preventDefault. (A repeat / gated / overlay-swallowed press of a router-consumed button counts as consumed — the page-scroll fix is preserved; a chord or target-owned key is never prevented.)
- keydown: the session gate stays the FIRST statement (its suppressor is now chord-aware, so a chord is untouched there too). NEW second statement `if (isChord(e)) return;` (CTL1.3 — before e.repeat, F9/F8, menu intercept and every hotkey, so Ctrl+P opens nothing). Then e.repeat, heal, F9/F8, menu intercept, letter hotkeys, Escape stack — unchanged. The block `anyOverlayVisible()→suppress; KEY_DIR→step; Space→jump` is replaced AT THE SAME POSITION by:
  `let consumed = false; for (const edge of keyboard.keydown(e)) consumed = routeEdge(edge) || consumed; if (consumed) e.preventDefault();`
- `routeEdge(edge): boolean` — `inputRouter.route(edge, { worldActive: !anyOverlayVisible() })`, applies effects (dirDown/dirUp/jump as above), returns consumed.
- keyup: `for (const edge of keyboard.keyup(e)) routeEdge(edge);` (no preventDefault on keyup, as today).
- `releaseAllInput()` = keyboard.releaseAll(); inputRouter.releaseAll(); held.clear(). Wired to `blur` and NEW `visibilitychange` (when document.visibilityState === 'hidden').
- Task: fix stale `main.wiring.test.ts` citations (≈199 F-3 module-scope, ≈1320 session-gate biome-ignore) — that file was deleted; cite the real survivor or drop the guard claim.

Behaviour deltas (intended): Ctrl/Alt/Meta chords untouched (Ctrl+P no longer opens PvP); releasing one of two keys of a direction keeps it held; W typed into an INPUT with no overlay no longer moves; Enter on a focused button not prevented (it never was).
Preserved: BOOT-MOVE, 14R-E (second code of a held dir sends nothing — now both router refcount and held.isHeld dedupe), MVI, S5T-SPACE-BUTTON, page-scroll suppression on repeat / overlay-open / session-gate paths.

## Tests (tester-owned)
- bindings.test.ts, keyboardSource.test.ts, router.test.ts — pure, node env, fast-check for binding uniqueness and router refcount sequences.
- main.input.test.ts — booted (main.boot.test.ts harness pattern, vi.resetModules + fresh import per test): Ctrl+P (control: bare KeyP opens pvp), W/ArrowUp refcount, Space→one Jump, blur + visibilitychange release, consumed D-pad defaultPrevented / unbound key not, W in INPUT ignored, W down → N (rename opens) → W up leaves nothing held and a re-press steps, lost keyup (W down, W down non-repeat, W up) releases North.
- movement-input.spec.ts — add W/ArrowUp refcount e2e + Ctrl+P not-prevented e2e (existing tests unmodified).

Test-name tags (each exactly once): CTL1-1-BINDINGS-TABLE, CTL1-1-BINDINGS-UNIQUE, CTL1-1-SOURCE-RESOLVE, CTL1-1-ROUTER-DPAD, CTL1-1-ROUTER-JUMP, CTL1-1-BOOT-JUMP, CTL1-1-BOOT-RELEASE, CTL1-2-ROUTER-REFCOUNT, CTL1-2-SOURCE-DEDUPE, CTL1-2-BOOT-REFCOUNT, CTL1-3-SOURCE-CHORD, CTL1-3-BOOT-CTRL-P, CTL1-3-BOOT-PREVENT, CTL1-4-OWNERSHIP, CTL1-4-BOOT-INPUT, CTL1-5-FAKE-SOURCE.

## Anti-patterns avoided
No source-text scans; no `instanceof HTMLElement` in the pure core; no change to heldKeys/predictor/HOLD_COMMIT_MS; no accelerator consumption (ladder keeps letters until ctl-11a); LB/RB not consumed (ctl-6b).

## Plan-review deltas (reviewer, 2026-10-01)
- MAJOR fixed: "code already down → []" dead-keyed a key after a lost keyup and phantom-held its direction → now [up, down].
- Chord check moved after the session gate (keeps "session gate first"); suppressor made chord-aware.
- AltGr reports ctrl+alt on Windows/Linux → AltGr+letter is a chord and fires no hotkey (accepted; design §3 says chords pass to the browser).
- suppress resolves via keyboard.buttonFor (one bindings source, ready for ctl-12 remap).
