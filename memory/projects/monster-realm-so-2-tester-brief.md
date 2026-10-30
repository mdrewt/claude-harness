# so-2 tester brief (RED phase)

Worktree: /home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/so-2
(write ONLY there — never the main checkout). Spec: /home/mdrewt/projects/ai-apps/claude-harness/specs/monster-realm-v2/M-stack-ownership.spec.md §so-2
(EARS SO2.1–SO2.8). Plan (the API you code against): /home/mdrewt/projects/ai-apps/claude-harness/memory/projects/monster-realm-so-2-plan.md — read both first.
Doctrine: ~/.claude/harness/standards/testing-tdd.md. You write tests only; you do not implement.
Your Bash is static-only: the orchestrator runs every test and proves each red.

## Files you may edit (nothing else)
client/src/ui/contextStack.test.ts, client/src/main.menu.test.ts, client/src/main.social.test.ts,
client/src/main.accel.test.ts, client/src/main.input.test.ts, client/src/main.controls.test.ts,
client/src/main.dispatch.test.ts, client/src/main.a11yFocus.test.ts,
client/src/main.reconnectStack.test.ts (ONLY the two precondition lines named below),
client/src/ui/overlayRegistry.test.ts, client/src/input/router.test.ts.
Boot tests reuse the existing harness in those files (`../test-util/mainBootHarness`, the
`__game().stack` read-only hook, real views, DOM visibility reads). Copy helpers from the file
you add to; do not invent new harness modules.

## Test ids — every new `it(` title starts with its id (the gate CHECKs filter `-t "SO2-<n>-"`)

### Pure (ui/contextStack.test.ts) — API from the plan
- `MIRRORED_IDS` (exported const, literal `['battleView','dialogueView']`), `type MirroredId`.
- `frameOf(id: OverlayId): FrameId` now exported.
- `openEdge(stack: Stack, id: FrameId): Edge` — `{kind:'push', frame:{kind:'screen', id}}`, plus
  `overBattle: <battleId>` iff `stack[0]` is a battle base.
- `hiddenPops(stack: Stack, shown: readonly FrameId[]): readonly Edge[]` — one `{kind:'pop', id}`
  per upper frame (stack order) whose id is NOT mirrored and NOT in `shown`; never a push; never a
  mirrored id (battleView / dialogueView frames are the mirror's).
- `mirrorEdges` keeps its signature but ignores every non-mirrored id (no push for a visible
  player id, no pop for a player frame on the stack).

SO2-1-…: openEdge shape (world: unstamped; battle base: stamped with that battle); contextStep of
  that edge twice holds ONE frame (dedup is contextStep's); a Social panel's open maps through
  frameOf to `social`.
SO2-2-…: frameOf for all three panels → `social`; pushing `social` then each panel's frameOf push
  leaves exactly one social frame.
SO2-3-…: mirrorEdges with every player id visible over a world stack → no edges; with a player
  frame on the stack and nothing visible → no pop; battleView/dialogueView keep EVERY existing
  mirror behavior (world outcome frame pushed, battleView never a frame over a battle base,
  overBattle stamp rule for a dialogue first mirrored on an already-current battle, pops when
  hidden). hiddenPops: pops exactly the hidden player frames in stack order, social included,
  never battleView/dialogueView, no pop for a textEntry/prompt whose owner is shown.
SO2-7-…: the roster rewrites (edit the EXISTING tests in place, rename nothing they already
  carry): CTL2-1-POLICY additionally pins that the rows with owner 'server' are exactly a
  hand-spelled `['battleView','dialogueView']` and that `MIRRORED_IDS` equals that literal (count
  2); CTL3-2-DROP-EXACT's 16-id manifest is documented as the openFrame-owned set and pinned equal
  to OVERLAY_IDS minus a hand-spelled mirrored pair. Name the change in the comment in the
  established style (`so-2 (named intentional change): …`). Keep every literal hand-spelled —
  never derived from the table under test. Add ONE new `SO2-7-ROSTER` it() that pins
  MIRRORED_IDS ∪ PLAYER_IDS = OVERLAY_IDS, disjoint, counts 2 and 16. router EXPECTED_PATHS: the
  accelerator paths do not change shape — do NOT edit router.test.ts.

### Boot (main.*.test.ts) — behavior a player can see, plus `__game().stack`
SO2-1-BOOT-…: for each player open path, the frame is on the stack AT THE MOMENT the view's
  show runs (push FIRST): spy the view prototype's `show` (or `render` for questLog / heal /
  claim lifecycle) with a pass-through `mockImplementation` that records
  `__game().stack` at call time, and assert the frame is already listed. Cover at least: menu
  (launcher click), a menu-row click open (Profile → Name, the rename form: the click path no sync
  follows), the bag/box via accelerator, help, controls, privacy, the deferred greet-then-shop
  open, heal at a healer, the trade wizard (face-to-face Trade). Dedup: open the same frame twice
  (e.g. the menu launcher twice, an accelerator twice) → exactly one frame of that id.
SO2-2-BOOT-…: open Social (each of the three tabs' accelerators/rows), switch through all three
  panels via the frame's own panel switch (the existing main.social.test.ts mechanism), and assert
  after EVERY step the stack holds exactly one `social` frame and the stack array is unchanged
  (no push, no pop: same length, same frame object shape). A naive per-call-site push would hold
  two.
SO2-3-BOOT-…: a player view made visible OFF every open path (force its overlay DOM
  `style.display='block'` without show()) is NOT pushed by the next frame/key/batch sync (the
  mirror no longer sees player views) — while a server dialogue row and a battle row still push
  their frames through the mirror and their views still self-show (existing fixtures).
SO2-4-BOOT-…: the invariant sweep: drive every open path (each menu entry by click AND by key,
  each accelerator, heal, the deferred shop, the face-to-face trade wizard, Social tab opens, the
  claim lifecycle shows: `onSignInFailed`, `onClaimPending`), and after each step — read AT ONCE,
  before any frame()/key/batch — assert every visible overlay's frame is on the stack (a shown
  Social panel ⇒ the `social` frame). Also after a server batch (battle start, outcome, dialogue)
  and after a reconnect.
SO2-5-…: (pure, contextStack.test.ts) movementEnabled false under any upper frame, on a battle base
  with no upper frame (B17), with the session gate set; (boot) the world sheet case already pinned
  by ctl-10a tests — cite, don't duplicate. Plus ONE source-shape pin `SO2-5-GATE-PURE` in
  main.dispatch.test.ts: strip comments from client/src/main.ts, extract the bodies of
  `function movementGate(` and `function worldBaseLive(` (bounded: up to the function's closing
  brace at column 0), and assert neither body contains `syncStack`, `contextStack =`, `contextStep`,
  `runStackCommands`, `hideFrame`, `openFrame`, `.show(` or `.hide(` — honest scope in the comment:
  a gate read's side-effect-freedom is unobservable behaviorally because every production gate read
  is preceded by a sync; this pin is the structural guard.
SO2-6-SHAPE (main.dispatch.test.ts): comment-stripped main.ts: the object literals
  `const overlayProbes`, `const overlayHandles`, `const screenViews` each have EXACTLY the keys
  battleView and dialogueView (parse the key names from the literal), `overlayHandles.dialogueView`
  is `undefined`, and the three remain three separate `const` declarations (no merged registry).

### The two reconnectStack preconditions (named intentional change, SO2.1/SO2.4)
In client/src/main.reconnectStack.test.ts change ONLY:
- SO1-1-BOOT-CLICK-OPENED-RENAME: `expect(stackNames(), 'precondition: no sync has mirrored the
  form yet').not.toContain('renameView')` → it IS on the stack at once (`toContain`), message
  updated; add a one-line comment `so-2 (named intentional change): push-then-show lists the
  click-opened form at once (SO2.1/SO2.4); was: not yet mirrored`.
- SO1-1-BOOT-SURVIVE-CLAIM-PENDING: `expect(stackNames(), 'precondition: no sync has mirrored it
  yet').toEqual(['world'])` → `toEqual(['world','claimView'])`, same comment style.
Every assertion after `reconnect()` stays byte-identical. Touch nothing else in that file.

## Red discipline
Each new test must FAIL on the current code (master 0660aada) for the right reason (an assertion,
not an import/type crash — a missing export may red the whole pure file; that is acceptable ONLY
for the pure file, say so). For each test write a one-line `// WRONG IMPL KILLED:` comment.
When done, list every test id you added/changed per file, and the two precondition edits, in your
final message. Then create the file /tmp/so-2-tester.done.
