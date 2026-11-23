# Tester brief — slice ts-6b-13 (Monster Realm v2), red phase

Worktree (write ONLY here): /home/mdrewt/projects/ai-apps/claude-harness/projects/monster-realm/.claude/worktrees/ts-6b-13
Spec: /home/mdrewt/projects/ai-apps/claude-harness/specs/monster-realm-v2/M-trade-sessions.spec.md, section "### ts-6b-13 — unread view members and the heal fallback" (read it, and the triage rows for R-ctl-10a-HEALTARGET, R-ctl-10a-BOXCB, R-ctl-10b-PVPCB, R-ctl-10b-PVPPLAYERS, R-qf-9-RAISINGVESTIGES in the same file).
Testing SSOT: ~/.claude/harness/standards/testing-tdd.md. Project rules: the worktree's AGENTS.md.

This is a DELETIONS-ONLY slice. The implementer (not you) will delete production members; you
update the TEST side so that (a) every test that exercises a deleted path is removed or re-pointed,
and (b) new gating teeth FAIL on today's code and PASS once the deletions land. You have no shell;
the orchestrator runs `npm --prefix client run typecheck` and vitest to prove red. Client test files
ARE typechecked (tsconfig includes *.test.ts), so a `// @ts-expect-error` tooth is a legal red:
today it is an "Unused '@ts-expect-error' directive" error; after the deletion it is satisfied.
Do NOT edit any production (non-test) file.

## What the implementer will delete (the end state your tests encode)

1. `client/src/ui/healModel.ts`: `healTargetLocationId` is gone (no export by that name).
2. `client/src/ui/screens/types.ts`: the `healParty` command is `{ readonly kind: 'healParty'; readonly locationId: number }` (REQUIRED).
3. `client/src/main.ts` dispatch `case 'healParty'`: the `locationId === undefined` branch (reportError('heal-unavailable', …)) is gone; it always sends `healParty({ locationId })`.
4. `client/src/ui/feedbackPolicy.ts`: the `'heal-unavailable'` MessageKind and its policy row are gone (59 -> 58 rows: 16 hint + 31 toast + 10 modal + 1 blocking).
5. i18n: the key `chrome.status.healUnavailable` is gone from catalog.en.ts, catalog.fr.ts and messageIds.ts.
6. `client/src/ui/boxView.ts`: `BoxViewCallbacks.onHealParty` is gone. (`onSetNickname`, `onSetPartySlot`, `partySlotNone` STAY — main.dispatch.test.ts reaches dispatch arms through them.)
7. `client/src/ui/pvpView.ts`: `PvpViewCallbacks.onChallenge` is gone. (`onAccept`, `onDecline`, `onCancel` STAY.)
8. `client/src/ui/pvpModel.ts`: `PvpChallengeablePlayer`, `PvpChallengeViewModel.challengeablePlayers` and the busy-identity loop are gone; `buildPvpChallengeViewModel` returns exactly `{ incoming, outgoing }` (signature unchanged — `players` still feeds the name map).
9. `client/src/ui/raisingView.ts`: the constructor is `constructor(parent: HTMLElement)` (the `_retired?: unknown` parameter is gone, so `RaisingView.length === 1`; today it is 2).

## Contracts (names/signatures the tests call)

- `import * as healModel from './healModel'` — `'healTargetLocationId' in healModel` is false after.
- `ScreenCommand` / `Command` from `client/src/ui/screens/types.ts`: `{ kind: 'healParty'; locationId: number }`.
- `FEEDBACK_POLICY`, `MESSAGE_KINDS`, `MessageKind` from `client/src/ui/feedbackPolicy.ts` (no `'heal-unavailable'`).
- `BoxView(parent: HTMLElement, callbacks: BoxViewCallbacks)`; `BoxViewCallbacks = { onSetNickname, onSetPartySlot, partySlotNone }`.
- `PvpView(callbacks: PvpViewCallbacks)`; `PvpViewCallbacks = { onAccept, onDecline, onCancel }`.
- `buildPvpChallengeViewModel(challenges: readonly StoreBattleChallenge[], identity: string, players: readonly StorePlayer[]): { incoming: PvpIncomingChallenge | null; outgoing: PvpOutgoingChallenge | null }` (exact key set).
- `PvpChallengeViewModel = { readonly incoming; readonly outgoing }` — pvpView.test.ts fixtures (`pvpVm(...)` etc.) must stop passing `challengeablePlayers`.
- `new RaisingView(parent: HTMLElement)`.
- `interactModel.pendingChallengeIdentities` (client/src/ui/interactModel.ts) is the one place challenge-busy players are computed — read it; do not change it.

## Files you may edit (tests only)

client/src/ui/healModel.test.ts, client/src/main.dispatch.test.ts, client/src/ui/feedbackPolicy.test.ts,
client/src/ui/i18n/catalog.test.ts, client/src/ui/i18n/catalogParity.test.ts, client/src/ui/i18n/resolver.test.ts,
client/src/ui/boxView.test.ts, client/src/ui/overlayA11yWiring.test.ts, client/src/ui/pvpView.test.ts,
client/src/ui/pvpModel.test.ts, client/src/ui/raisingView.test.ts, client/src/main.controls.test.ts,
client/src/ui/reachability.test.ts, client/src/ui/contextStack.test.ts.
No other file. Keep edits minimal and local; do not reformat unrelated code (biome formats on save:
2-space, single quotes, 100 cols, trailing commas).

## Required edits

A. healModel.test.ts — delete the `healTargetLocationId` describe block and its import/doc lines; any
   other prose in the file that cites it as live must stop doing so. Add one tooth: the module
   namespace has no `healTargetLocationId` (runtime `in` check on `import * as`), with a WRONG-IMPL
   comment.
B. main.dispatch.test.ts —
   - delete the absent-locationId arms: test 'CTL7C-3-ABSENT' entirely; in 'CTL7C-3-PRESENT' drop
     the absent-arm controls (the "no pad loaded" control and the "same state" control and the
     `{ kind: 'healParty' }` row of the battle-base loop) while keeping every present-id assertion
     (9 with no pad, 9 over first pad 7, 0 as 0, battle-base refusal for 9 and 0). The present-id
     "nothing reported" checks still hold.
   - 'CTL10A-4-NO-BOX-HEAL-HANDLER': drop the `Object.hasOwn(box, 'onHealParty')` probe and the
     absent-id half; keep (or fold into CTL7C-3-PRESENT) the present-id-is-sent control.
   - the UIF4.2 toast-expiry test(s) (~line 1960) raise a toast with `{ kind: 'healParty' }`; re-point
     them to another command that still raises a TOAST at the world and under a battle base WITHOUT
     sending (read main.ts dispatch + feedbackPolicy.ts to pick one honestly; e.g. a command the
     battle policy refuses shows a toast — but at the world base it must also toast). If no single
     command toasts in both states, use two. The test's intent (a toast raised in each state expires
     at TOAST_MS) must survive.
   - fix the stale comments at ~672-676 and anywhere else that narrates the absent arm or
     healUnavailable as current behaviour (comments state current behaviour, never history).
   - add a typecheck tooth: `// @ts-expect-error locationId is required` on a
     `const _absent: ScreenCommand = { kind: 'healParty' };` (or the equivalent Command type the file
     already imports — import it type-only if needed) with a WRONG-IMPL comment.
C. feedbackPolicy.test.ts — remove `'heal-unavailable'` from the roster; update the header's
   row-count narrative (59 -> 58; 32 -> 31 toast). Add a named tooth that `MESSAGE_KINDS` /
   `FEEDBACK_POLICY` has no `'heal-unavailable'` if the roster's exactness doesn't already fail by
   name (it likely does; then no extra tooth).
D. catalog.test.ts / catalogParity.test.ts / resolver.test.ts — remove `chrome.status.healUnavailable`
   from every expected roster/table. Ensure at least one test fails TODAY because the catalog still
   has the key (an exact-roster pin usually does; if the roster is a subset check, add an explicit
   `expect(Object.hasOwn(EN_CATALOG_OR_WHATEVER, 'chrome.status.healUnavailable')).toBe(false)` for
   en AND fr).
E. boxView.test.ts — drop the moot hasOwn/onHealParty probes and comments that describe onHealParty as
   a live member; add a typecheck tooth: `// @ts-expect-error onHealParty is not a BoxViewCallbacks member`
   on an object literal typed `BoxViewCallbacks` that includes `onHealParty: () => {}` (excess
   property check). The CTL10A-4-NO-HEAL-CONTROL behaviour test stays.
F. overlayA11yWiring.test.ts — remove `onHealParty: noop` (boxView), `onChallenge: noop` (pvpView),
   and the second argument of `new RaisingView(appMount(), …)`.
G. pvpView.test.ts — remove `onChallenge` from callback fixtures and `challengeablePlayers` from every
   VM fixture; tests whose ONLY point was that challengeablePlayers renders nothing (e.g. ~1328-1343,
   and ~553) are rewritten to their remaining intent or removed if the field's deletion makes them
   vacuous (say which in your report). Add a typecheck tooth: `// @ts-expect-error onChallenge is not a
   PvpViewCallbacks member` on a literal typed `PvpViewCallbacks`.
H. pvpModel.test.ts — add a describe for `buildPvpChallengeViewModel` asserting
   `Object.keys(vm).sort()` equals `['incoming', 'outgoing']` over a fixture where an online,
   non-busy other player exists (so today's code returns a non-empty challengeablePlayers), with a
   WRONG-IMPL comment; plus a control that incoming/outgoing are still built (names resolved from
   `players`).
I. raisingView.test.ts — add a tooth `expect(RaisingView.length).toBe(1)` (the constructor takes
   the parent alone) plus a typecheck tooth `// @ts-expect-error the constructor takes the parent alone`
   on `new RaisingView(parent, {})`. The file's header (line ~9) already states the contract.
J. contextStack.test.ts:2330 — `['healParty', { kind: 'healParty' }]` becomes
   `['healParty', { kind: 'healParty', locationId: 7 }]` (any id; it is a battle-refusal row).
K. main.controls.test.ts:1905 — the comment lists `heal-unavailable` as a toast example; drop it.
L. reachability.test.ts — only if it references a deleted member (grep it); otherwise leave it.

Every new tooth gets a one-line `// WRONG IMPL KILLED:` comment naming the mutant it kills.

## Report

List per file: removed tests (by name), re-pointed tests (old -> new), new teeth (name + what
makes it red today: runtime assertion or unused ts-expect-error). Keep it under 60 lines.
