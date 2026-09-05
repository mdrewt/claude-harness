# rb-52 — build plan (PRV1-3/PRV1-4 privacy surface)

Slice: `rb-52` · residual `R-m22-s8-X10` (promoted from m22-s8 X10) · branch
`feat/rb-52-privacy-surface` · worktree `.claude/worktrees/rb-52` (forked from
`origin/master@1406816`, master CI verified GREEN).

Acceptance ledger: `memory/projects/gates/rb-52.gates.md` — ONE seeded gate, E1.

> **E1 (verbatim):** [PRV1-3/PRV1-4 UI surface] WHEN the player opens the privacy surface
> THE CLIENT SHALL expose reachable delete/cancel controls wired to conn.reducers and render
> the distinct terminal notice once `terminal_at_ms` is `Some`.

`touches:` `client/**`, `evals/overlay-a11y-manifest.eval.mjs`,
`evals/dom-shell-coverage-exclusion.eval.mjs` + the always-in-scope companions
(sibling `*.test.ts`, `docs/adr/**`, `docs/knowledge/**`, `CHANGELOG.md`, `ARCHITECTURE.md`).

---

## 1. What already exists (do NOT re-derive)

| Module | Ships | Slice |
|---|---|---|
| `client/src/ui/privacyModel.ts` | `deriveDeletionCountdown`, `privacyStep`, `PRIVACY_INITIAL`, the event/effect/notice unions | m22-s8 |
| `client/src/ui/privacyBanner.ts` | `privacyBannerLabel(countdown)` — the pure copy layer | rb-51 |
| `client/src/main.ts` | the `#privacy-countdown` HUD banner + frame tick + `deletion_grace_ms_default()` read | rb-51 |

Reducer call sites for `deleteAccount` / `cancelAccountDeletion` / `requestDataExport` have
**zero** occurrences in `client/src` outside `module_bindings` today. This slice wires them.

---

## 2. Design decisions (→ ADR-0231 Amendment A2, D1–D9)

Read A2 in `docs/adr/0231-*.md` for the reasoning. Summary of what the plan-review lenses
CHANGED from the first draft (both were verified against the tree before adopting):

| # | first draft | corrected | why |
|---|---|---|---|
| shell | static `index.html` markup | **constructed at runtime** (`ensureElement`) | `evals/overlay-live-region-custody.eval.mjs` pins `EXPECTED_ARIA_MODAL_SHELLS = 11` EXACTLY; a static shell needs `aria-modal="true"` and reds an eval outside `touches:` — a slice-parking STOP |
| `BATTLE_FORCE_HIDE` | excluded | **included**, + `hide()` disarms | the exclusion reason was FALSE: `refreshBattle` never consults `canOpen`, so excluding denies nothing and instead leaves two `aria-modal` roots + two focus traps co-visible |
| terminal notice | keyed on `state.notice` | **keyed on `countdown.phase === 'terminal'` OR `notice`** | `account-changed` never writes `notice`, so a `state.notice`-keyed VM renders NOTHING on open — E1 failing while every click test passes |
| `account-changed` | fed per rAF frame | **fed on observed change only** | the arm writes `inFlight: 'none'` unconditionally; per-frame gives the double-submit guard a ~16 ms lifetime |
| `hasLiveConnection` | `conn !== undefined && !linkFrozen()` | **`conn?.live() !== undefined && !linkFrozen()`** | `undefined?.catch()` is silent; `inFlight` sticks forever and every later click is a silent no-op |
| anchor | a `tabindex="-1"` heading | **a native `<button>`, field typed `HTMLButtonElement`** | `evals/keyboard-operable-rows.eval.mjs` (outside `touches:`) hard-fails a non-native click receiver AND any undeclared `tabindex` write |
| disclosure pin | hand-typed literal | **`PIN_PSEUDONYMIZATION` imported from `evals/account-e2e.eval.mjs`** | a hand-typed pin cannot see one bad transcription copied into both sides |

## 3. Hard constraints (each verified; violating one is a CI red or a STOP)

1. `client/index.html` is NOT edited. `aria-modal` count is exact-pinned at 11.
2. No `.focus(` / `?.focus` / `['focus']` / `autofocus` in `privacyView.ts` —
   `evals/overlay-a11y-manifest.eval.mjs` `FOCUS_SPELLINGS` bans every spelling in `*View.ts`.
   `KNOWN_VIEW_FILES` also requires the exact declaration `export class PrivacyView`.
3. No `tabindex` write from `privacyView.ts`; button fields declared `HTMLButtonElement`.
4. No `aria-live` / `role="status"` / `role="alert"` / `<output>` anywhere new — exactly one live
   region exists and `ui/liveRegion.ts` owns it.
5. No animation/transition declarations (`evals/reduced-motion-hp-bar.eval.mjs`).
6. No hard-coded duration, numeric OR prose. G5 scans `client/**/*.ts` RAW including tests, and
   catches `604_800_000`, `7n * 24n * ...`, `86_400_000n * 7n`, `6.048e8`. It does NOT catch the
   prose "7 days" — the closing tooth is the positive one: the grace sentence must be FORMATTED
   from the injected `remainingMs`, proven with two different injected values.
7. No `new RegExp(` anywhere, INCLUDING in comments (Semgrep is remote-only and matches comments).
8. `main.ts` comment budget: measured slack is **869 bytes**, budget `C < 1739 + K` where `K` is
   added code bytes. Rationale goes in the ADR, not in `main.ts`.
9. The privacy Escape branch goes at the END of the Escape stack.
   `W-UXD3-ESCAPE-ANCHOR-FIRST` requires the FIRST `e.code === 'Escape'` to stay the rename branch,
   and three teeth slice fixed windows forward from it.
10. `worldHasFocus()` censuses stay at 12 / 12 / 13 — no new hotkey.
11. `deriveDeletionCountdown(` stays at EXACTLY ONE call site; hoist to a named `const` and reuse
    it for the banner and the model. `renderPrivacyCountdown(` stays at 2; `import.meta.env.DEV`
    stays at 1 gate / 4 reads.
12. `main.ts`'s handle-table entry must be the byte-identical `privacyView: () => privacyView?.hide(),`.
13. `renderClaim()` is suppressed while the privacy overlay is visible.
14. The constructed `ensureElement` idiom sets `display:none` on EVERY element it creates and
    `claimView` never un-hides its buttons — do NOT copy that bug. Every privacy control sets its
    own `textContent` and `display`.

## 4. Functional core / imperative shell split

**PURE** — `client/src/ui/privacyBanner.ts` (extended; header rescoped from "the deletion-grace
countdown" to the privacy surface's copy layer):

```ts
export const PRIVACY_PSEUDONYMIZATION_DISCLOSURE: string;  // M22 §9 residual 1, verbatim
export const PRIVACY_TERMINAL_NOTICE: string;              // PRV1-4's distinct, non-generic copy
export interface PrivacyViewModel {
  readonly statusLabel: string;                 // the phase/countdown sentence
  readonly deleteLabel: string;                 // each control gets its OWN label
  readonly cancelLabel: string;
  readonly exportLabel: string;
  readonly deleteEnabled: boolean;
  readonly cancelEnabled: boolean;
  readonly exportEnabled: boolean;
  readonly confirmPrompt: string | undefined;   // step two of the two-step confirm
  readonly noticeKind: PrivacyNotice | 'terminal-row';  // the CODE, so distinctness is assertable
  readonly noticeLabel: string | undefined;     // the copy
}
export function buildPrivacyViewModel(state: PrivacyModelState): PrivacyViewModel;
```

`disclosure` is NOT a VM field — it never varies, so it is an exported const the view renders
directly (a constant in a per-render VM is dead weight, and a single `toBe` on the const is a
stronger tooth). `statusLabel` reuses `privacyBannerLabel` for the grace/due/dark phases so there is
ONE copy source per phase.

**DOM SHELL** — `client/src/ui/privacyView.ts`: constructed `ensureElement` shell, `HTMLButtonElement`
fields, `textContent` only, `openOverlayA11y`/`closeOverlayA11y` last, `hide()` calls `onDismissed`.

**IMPERATIVE SHELL** — `client/src/main.ts`: `applyPrivacy(event)` → `privacyStep` → effect →
`sendGuarded(where, () => conn?.live()?.reducers.X())` → `renderPrivacy()`.

## 5. The minimum tooth set (from the red-team; each closes a PROVEN wrong impl)

1. **Visibility, not clickability** — walk the ancestor chain for `display:none` before asserting a
   handler fires; also assert `btn.disabled === !vm.xEnabled` on the same node.
2. **Three spies, exclusive** — `live()` returns real `reducers` spies; per control, one called
   once and the other two ZERO times. Plus `devGateIndex(stripped)` ordering pins on all three
   call sites (a bare `includes` is beaten by a decoy literal, a comment, or a DEV block).
3. **Terminal notice from the ROW** — fixture built by running `privacyStep` with
   `account-changed` + `deriveDeletionCountdown({terminalAtMs: 0n, ...})`; assert the exact
   `PRIVACY_TERMINAL_NOTICE` in the DOM with NO click; assert it differs from the
   `request-rejected` copy; assert both routes independently. `0n` specifically — it is a valid
   marker and a truthiness-keyed VM inverts PRV1-4 on it.
4. **Disarm on close** — `hide()`, Escape and the force-hide thunk each leave `confirm === 'none'`;
   re-open shows no `confirmPrompt`.
5. **Double-submit** — two `delete-confirmed` separated by an `account-changed` yield exactly one
   `call-delete-account`.
6. **Non-delivery is visible** — with `live()` returning `undefined`, the surface shows the
   disconnected notice and the controls stay usable.
7. **Disclosure** — `expect(PRIVACY_PSEUDONYMIZATION_DISCLOSURE).toBe(PIN_PSEUDONYMIZATION)`
   (cross-imported), asserted rendered across EVERY phase × notice pair, plus a single-occurrence
   census on `'erasure'` scoped inside the literal's span.
8. **Focus return** — after open-from-claim and close, `document.activeElement` is body/canvas and
   a later overlay hotkey still opens.

## 6. File census (all inside `touches:`)

NEW (3): `ui/privacyView.ts`, `ui/privacyView.test.ts`, `main.privacyWiring.test.ts`.

MODIFIED production (5): `ui/overlayRegistry.ts`, `ui/a11yCopy.ts`, `ui/privacyBanner.ts`,
`ui/claimView.ts`, `main.ts`. **`client/index.html` and `client/vite.config.ts` are NOT edited.**

MODIFIED tests (≈11): `overlayRegistry.test.ts`, `a11yCopy.test.ts`, `overlayA11y.test.ts`,
`overlayA11yWiring.test.ts`, **`overlayA11yWiring.concurrency.test.ts` (pins 116 tests → 123)**,
`announcements.test.ts`, `indexShell.test.ts` (`CONSTRUCTED_SHELL_IDS` +1), `main.wiring.test.ts`,
`privacyBanner.test.ts`, `claimView.test.ts`, `privacyModel.test.ts` (comment truth).

MODIFIED evals (1): `evals/overlay-a11y-manifest.eval.mjs` (`KNOWN_VIEW_FILES` 18 → 19, and its
"EIGHTEEN *View.ts files" comment).

COMMENT TRUTH (present-tense claims only — past-tense measurements like "all sixteen mutants
survived" are dated records and stay): `overlayRegistry.ts`, `a11yCopy.ts`, `overlayA11y.ts`,
`privacyBanner.ts`, `main.ts:406-407` (says "15", already stale), `privacyModel.ts`,
`indexShell.test.ts`, `overlayA11yWiring.test.ts`, `main.a11yFocus.test.ts`, `main.wiring.test.ts`
(its "once rb-52 lands" future references), `ARCHITECTURE.md`. Do NOT retro-edit other ADR bodies.

DOCS: ADR-0231 Amendment A2, `ARCHITECTURE.md` (minimal), `docs/knowledge/**` regen.

## 7. Risks

- `docs/PLAYTEST.md` — a hidden-dependency STOP, designed around by A2-D5 and DEFERred.
- `overlayA11yWiring.concurrency.test.ts` spawns a 240 s vitest child — its 116→123 bump is a
  slow, late red if missed.
- `overlayRegistry.test.ts` verdict arithmetic 16 × (16+120) = 2176 → 17 × (17+136) = 2601.
