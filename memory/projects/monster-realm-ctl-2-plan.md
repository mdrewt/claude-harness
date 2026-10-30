# ctl-2 plan — context stack behind the existing show/hide; one movement gate; push clears held keys

Spec: specs/monster-realm-v2/M-postgate-console-controls.spec.md#ctl-2 · base 768c271c · worktree .claude/worktrees/ctl-2
touches: client/src/ui/contextStack.ts (NEW), client/src/ui/contextStack.test.ts (NEW), client/src/main.ts, client/src/main.input.test.ts, client/e2e/movement-input.spec.ts

## Functional core — `client/src/ui/contextStack.ts` (pure: no DOM, SDK, module state, clock)

```ts
import type { OverlayId } from './overlayRegistry';
export type FrameId = OverlayId;                       // legacy overlays are the frame ids this slice
export type BaseFrame = { readonly kind: 'world' } | { readonly kind: 'battle'; readonly battleId: string };
export type Frame = BaseFrame
  | { readonly kind: 'screen'; readonly id: FrameId }
  | { readonly kind: 'prompt'; readonly id: FrameId }
  | { readonly kind: 'textEntry'; readonly owner: FrameId };
export type Stack = readonly [BaseFrame, ...Frame[]];  // base-first; length >= 1 by type
export const WORLD_STACK: Stack;
export type Edge = { kind: 'base'; base: BaseFrame } | { kind: 'push'; frame: Frame } | { kind: 'pop'; id: FrameId };
export type Command = { kind: 'clearHeld' };
export function contextStep(stack: Stack, edge: Edge): { stack: Stack; commands: readonly Command[] };
export const SCREEN_POLICY: Readonly<Record<FrameId, { owner: 'player'|'server'; onBattle: 'drop'|'suspend'; battleSafe: boolean }>>;
export function baseFor(battle: { battleId: bigint|string; outcome: string } | undefined): BaseFrame;
export function mirrorEdges(stack: Stack, visible: readonly FrameId[]): readonly Edge[];
export function movementEnabled(stack: Stack, sessionGate: boolean): boolean;
```

Semantics:
- `contextStep` base edge: replaces stack[0], keeps the frames above; no command. A base edge is never a "push".
- push: a non-base frame whose id is not already on the stack is appended and emits exactly one `clearHeld` (CTL2.4); pushing an id already present is a no-op (same stack, no command); pushing a BaseFrame via `push` is a no-op (bases arrive only through `base`).
- pop(id): removes that frame wherever it sits (legacy overlays close out of order); an absent id is a no-op. Never emits a command. Never removes the base.
- `baseFor`: `battle(String(id))` iff outcome === 'Ongoing', else `world`.
- `mirrorEdges(stack, visible)`: pops (in stack order) every frame whose id is not visible, then pushes `screen(id)` for every visible id not on the stack, in `visible` order. `battleView` is excluded from `visible` mirroring when the base is `battle` (it is the base's presentation); when the base is `world`, a visible `battleView` (terminal outcome) is a `screen` frame. Folding the edges via contextStep yields a stack whose frame-id set equals the mirrored visible set (idempotent: mirroring a mirrored stack yields []).
- `movementEnabled(stack, sessionGate)` = `!sessionGate && stack.length === 1 && stack[0].kind === 'world'` (false on a battle base even with battleView hidden — B17).
- `SCREEN_POLICY` (provisional values, consumed from ctl-3): every OverlayId; dialogueView {server, suspend, false}; battleView {server, drop, true}; helpView/menuView/questLogView/leaderboardView battleSafe true; every other id {player, drop, false}. Total `Record` so an omitted id fails client-typecheck.
- `nav` on screen/prompt: NOT added this slice (ctl-4 owns `ui/nav.ts`; ctl-5 adds the slot). Spec build note records it.

## Imperative shell — `client/src/main.ts`

- Module state: `let contextStack: Stack = WORLD_STACK; let stackBase: BaseFrame = { kind: 'world' };`
- `syncStack()`: edges = [base edge if stackBase changed] + `mirrorEdges(stack-after-base, visibleIds(overlayProbes))`; fold through `contextStep`; run commands (`clearHeld` → `held.clear()`). Total, cheap (17 probe reads).
- `movementGate(): boolean { syncStack(); return movementEnabled(contextStack, sessionGateBlocks()); }`
- Replace: ≈1127 snap `!anyOverlayVisible()` → `movementGate()`; ≈1251 router `worldActive: !anyOverlayVisible()` → `movementGate()`; ≈3177 frame re-issue → `movementGate()`; ≈3236 `overlayUp = anyOverlayVisible()` → `!movementGate()`. `anyOverlayVisible` stays for its non-movement consumers (KeyT interact ≈1533, shop-open ≈1882).
- Base derivation on the batch hook: `store.onBatchApplied(() => { stackBase = baseFor(ownPerspective(store.latestPlayerBattle(identity), identity)?.battle...); syncStack(); })` registered AFTER refreshBattle's listener (so battleView show/hide of that batch is already applied). Exact accessor shape per refreshBattle (≈1773).
- Sync points so the mirror is timely even with no gate read: keydown listener tail (wrap in try/finally), frame-loop top (after the session-gate early return), the base batch listener, and `__game()` reads it.
- `__game()` gains additive `stack: Frame[]` (syncStack() first; frames are plain JSON — battleId is a string).
- Existing inline `held.clear()` calls at N/O/?/M/C stay (redundant but harmless; removing is out of scope).
- Comment at ≈3170-3175 ("a held key resumes after an overlay closes") rewritten: held keys are cleared on push, so a hold does NOT resume (Held-keys amendment, deliberate reversal of the old ≈3204 contract).

## Tests (tester; orchestrator proves red)

- `contextStack.test.ts` (NEW, table + one fast-check property for mirror idempotence/set-equality): tags CTL2-1-STEP, CTL2-1-MIRROR, CTL2-1-BASE, CTL2-1-POLICY, CTL2-3-GATE, CTL2-4-CLEAR-CMD.
- `main.input.test.ts` booted cases: CTL2-2-BOOT-STACK (B opens box → `__game().stack` = [world, screen boxView]; close → [world]; base-first), CTL2-3-BOOT-B17 (seed an Ongoing own battle → battleView shown; Escape hides it; W sends no Step, frames send nothing; `stack[0].kind==='battle'`), CTL2-3-BOOT-NO-HELD (press W while box open → no Step; close; frames past HOLD_COMMIT_MS → no Step), CTL2-4-BOOT-CLEAR (hold W, walking committed, press B → frames send no further Step; close B → still no Step), CTL2-5-BOOT-HOLD-THROUGH (hold W, open menu M, close, frames → no Step; anti-vacuity: keyup W + keydown W → exactly one immediate Step).
- `movement-input.spec.ts`: delete test C by name; add "C (ctl-2): a direction held through a menu does not walk when it closes" — corridor setup as C; hold ArrowRight past HOLD_COMMIT_MS, press KeyB (box: the overlay whose open path does NOT clear held today, so this is red on master), assert frozen while open, close, wait 600ms → tile unchanged; anti-vacuity: `keyboard.up('ArrowRight')` then `down` (Playwright re-down without up is repeat:true and ignored) → x grows. Spec Tasks say "menu (M)"; M already clears held on master so an M-only test cannot fail on the defect — spec build note records the box choice.

## Gates (CHECK = ctl-1 json-report shape: exact tag passed exactly once, 0 failed/pending/todo, no `.fails(`)
CTL2.1 → contextStack.test.ts CTL2-1-*; CTL2.2 → main.input CTL2-2-BOOT-STACK; CTL2.3 → CTL2-3-GATE + CTL2-3-BOOT-B17 + CTL2-3-BOOT-NO-HELD + main.boot BOOT-MOVE unmodified; CTL2.4 → CTL2-4-CLEAR-CMD + CTL2-4-BOOT-CLEAR; CTL2.5 → CTL2-5-BOOT-HOLD-THROUGH (+ e2e evidence in PR body; e2e needs a live server so it is not a CHECK).

## Anti-patterns avoided
No source-text scans; no new evals; no change to heldKeys/predictor/HOLD_COMMIT_MS/router; no key routing change; overlay show/hide untouched (mirror only); no schema/bindings.

## Risks
- Mirror latency: a show path with no subsequent gate read/sync is caught at the next frame (≤1 frame); every movement decision syncs first, so no step can slip.
- Battle base blocks movement while an Ongoing battle row exists with battleView hidden (intended, B17); a stale Ongoing row the server never finishes would freeze walking — same as server truth (server rejects steps in battle).

## Plan review revisions (reviewer + red-team, 2026-10-01) — these OVERRIDE the sections above
1. Base is derived INSIDE syncStack from the store on every call: `baseFor(store.ongoingBattle(identity))` (identity '' → world). No module `stackBase`, no listener-order dependence; the reconcile snap (≈1127, registered before refreshBattle) therefore sees the battle base in the same batch the battle row arrives. Uses `ongoingBattle` (any Ongoing row, either role — agrees with the server guard and `__game().ongoingBattle`); spec says "latest own battle row is Ongoing" — build note. Reconnect: store.reset empties battles → world.
2. `__game().stack` is READ-ONLY (no sync) — the observer must never perform the push/clear.
3. Sync points: keydown TOP and TAIL (try/finally), frame-loop top (after the session early-return), a batch listener registered LAST (tail of every batch), and every movementGate() read.
4. `contextStep` base edge emits `clearHeld` when the base KIND changes (world↔battle); same-kind/same-id base edge emits nothing.
5. Types: push payload and stack tail are `UpperFrame = Exclude<Frame, BaseFrame>`; `Stack = readonly [BaseFrame, ...UpperFrame[]]`.
6. KeyT interact (≈1533) and the prompt `overlayUp` (≈3236) BOTH move to the one gate (`movementGate()`), keeping "the prompt never advertises a target KeyT refuses".
7. Residual (documented, not fixed): a server-opened overlay shown by a listener registered after reconcileFromStore can let that same batch's reconcile re-issue send ≤1 step before the tail sync clears held — identical to master.
8. Same-sync pushes land in registry (visible) order; tested.
9. Stale citation `main.a11yFocus.test.ts:526` → `movement-input.spec.ts:493` (outside touches) recorded in the build note, not edited.
