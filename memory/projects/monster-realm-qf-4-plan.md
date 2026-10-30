# qf-4 plan — journal chrome + list-style sweep (QF4.1–QF4.3)

Spec: specs/monster-realm-v2/M-pt3-quickfix.spec.md §qf-4 · base origin/master 1a244065 · FEATHER.
Worktree: projects/monster-realm/.claude/worktrees/qf-4 (branch slice/qf-4).

## Verified facts (scope check)

- `client/index.html:28-30` — `#quest-log-overlay` holds ONLY `<ul id="quest-log-list" tabindex="-1">`.
- **Constraint F1 (hidden-dependency avoidance):** `client/src/indexShell.smoke.test.ts:406-583`
  (OUTSIDE touches) EXACT-pins the set of `[id]` elements inside `#frame-layer` in the STATIC
  index.html (`INNER_IDS['quest-log-overlay'] = ['quest-log-list']`) and the data-testid set.
  => NO new id/data-testid may be added to index.html. The title and empty-state elements are
  CONSTRUCTED AT RUNTIME by `QuestLogView` (precedent: `#quest-log-detail`, built in the
  constructor via `this.list.after(...)`).
- **Constraint F2:** `styles.css` header — CLASS, ATTRIBUTE and `:root` selectors ONLY, ZERO `#id`.
  => the list-style sweep cannot be `#quest-log-list, …`; it is a new class rule.
- `#quest-log-list` is the overlay's `initialFocusSelector` (overlayRegistry.ts:198-201, OUTSIDE
  touches) — unchanged; the title is NOT a focus anchor (no tabindex).
- `questLogView.test.ts:405` pins "empty active list renders zero `<li>`s" — kept: the empty state
  lives OUTSIDE the listbox (a non-option row inside it would be painted as the cursor by
  `applyPaint`'s `rows[0]` fallback and break the listbox semantics).
- Help/leaderboard titles are resolved through `t('chrome.help.title')`-style keys written by the view.

## Design

### QF4.1 — visible Journal title
- `QuestLogView` constructor builds `<div id="quest-log-title" class="mr-frame-title">` and inserts it
  as the overlay's FIRST child (`this.list.before(title)`).
- Text = `t('chrome.journal.title')` written in `render(vm)` on every non-null render (so a locale
  change is picked up on the next render; cheap, idempotent). textContent only.
- New key `chrome.journal.title`: en `'Journal'`, fr `'Journal'` (the menu entry is `Journal` in both
  locales; `menu.journal.title` precedent). `@desc` comment required (catalogShape SHAPE-01).

### QF4.2 — empty state
- Constructor builds `<div id="quest-log-empty">` placed right after the list (before the detail).
- `render(vm)`: when `vm.active.length === 0` → empty element shown (`style.display = ''`), text
  `t('journal.empty')`; otherwise hidden (`style.display = 'none'`) and its text cleared.
- a11y: while empty, the listbox carries `aria-describedby="quest-log-empty"` (so the focused,
  option-less listbox announces the reason); while a detail is open, `quest-log-detail` (existing);
  otherwise no attribute. Computed in `applyPaint` (the one place that writes it today).
- New key `journal.empty` (one string carrying reason + cue + next step):
  - en: `No active quests yet. Villagers with a problem share it when you talk to them: walk up to one and talk to take on a quest.`
  - fr: `Aucune quête en cours. Les villageois qui ont un souci vous en parlent quand vous leur adressez la parole : approchez-vous de l’un d’eux et parlez-lui pour accepter une quête.`
  - (reason = "no active quests yet"; cue = "villagers with a problem share it when you talk";
    next step = "walk up to one and talk"). No key names (bindings are remappable).

### QF4.3 — list-style sweep
- New class `mr-nav-list` added STATICALLY in `client/index.html` to the five `<ul>`s:
  `#quest-log-list`, `#heal-list`, `#leaderboard-list`, `#help-controls`, `#help-goals`
  (class attribute only — no id/testid change, so indexShell.smoke stays green).
- `styles.css`: `.mr-nav-list { list-style: none; }` (with a comment citing qf-4/QF4.3 and the
  Rankings inverted-marker artifact). Nothing else (padding/margin unchanged — spec asks only for
  the marker sweep; layout tweaks are the chrome-redesign milestone's).
- Verified no view overwrites `className` on those `<ul>`s (grep: only `li`/strip/tab writes).

## Gating tests (tester writes; orchestrator proves red)

In `client/src/ui/questLogView.test.ts` (new describe "qf-4") and `questLogView.i18n.test.ts`:
- `QF4-1-TITLE`: after `render(vm)` (non-empty AND empty), the overlay contains exactly one
  `#quest-log-title`, it is the overlay's first element child, carries `mr-frame-title`, textContent
  === `t('chrome.journal.title')` and is non-empty; it sits OUTSIDE `#quest-log-list`; the list
  still has no title `<li>` (row count == active count). Survives hide()+reopen (one title, not two).
- `QF4-1-TITLE-I18N` (i18n file): under the fr locale (or the «key|json» sentinel mechanism the file
  already uses), the title text is the resolver output for `chrome.journal.title` — proves it is
  catalogued, not a literal. Also `catalog.en['chrome.journal.title']` / fr exist and are non-empty.
- `QF4-2-EMPTY`: `render({active: []})` → `#quest-log-empty` exists, is shown, textContent ===
  `t('journal.empty')` (non-empty), the list has zero `<li>`, and listbox `aria-describedby` ===
  `quest-log-empty`. Then `render(vm with 2 quests)` → empty element hidden (display 'none'), and
  listbox has no `aria-describedby` (no detail). Then back to empty → shown again. Anti-vacuity:
  the empty element is not inside the listbox (`list.contains(empty) === false`).
- `QF4-2-EMPTY-I18N` (i18n file): fr/sentinel resolution of `journal.empty`.
- `QF4-3-LIST-STYLE`: load the REAL `client/index.html` + REAL `client/src/styles.css` (installed as
  a `<style>`, the overlayA11yWiring.test.ts:1414 precedent) into happy-dom; for each of the five ids
  `getComputedStyle(el).listStyleType === 'none'` (or the resolved `list-style` equivalent), AND each
  carries `mr-nav-list`. SANITY tooth: a probe `<ul>` without the class in the same document does
  NOT compute `none` (proves the sheet/UA modelling is non-vacuous) — the tester must confirm what
  happy-dom computes for a bare `<ul>`; if happy-dom has no UA default, the sanity tooth is instead
  "a probe `<ul class="mr-nav-list">` computes none AND a probe whose class is removed does not".
  Plus runtime: after `new QuestLogView(); render(vm)` over the real markup, `#quest-log-list` still
  carries the class (the view never clobbers it).

Red proof: QF4-1/QF4-2 fail (no title/empty element); QF4-3 fails (no class, no rule).

## Gates (CHECK/EXPECT)
- QF4.1: `npm --prefix client run test -- src/ui/questLogView.test.ts src/ui/questLogView.i18n.test.ts -t "QF4-1-"` — EXPECT exact passed count.
- QF4.2: same with `-t "QF4-2-"`.
- QF4.3: `npm --prefix client run test -- src/ui/questLogView.test.ts -t "QF4-3-"`.
(EXPECT regexes pin `Test Files N passed` + `Tests K passed | S skipped (T)` — vitest -t zero-match exits 0.)

## Anti-patterns to avoid
- Adding a static id to index.html (reds indexShell.smoke — outside touches).
- An `#id` selector in styles.css (header ban).
- Rendering the empty state as an `<li role="option">` (cursor paint + "zero li" pin).
- A literal English string in the view (hardcodedStrings.test.ts).
- Writing the title only once in the constructor (locale boot happens after construction? — write in render).

## touches-delta
- none beyond declared (all 8 declared; index.html gains classes only).

## AMENDMENTS after plan review (reviewer + red-team, 2026-10-26) — these SUPERSEDE the text above

A1. **catalog.test.ts** (`client/src/ui/i18n/catalog.test.ts`) exact-pins the en key roster + count
    (371 → 373). It is the SIBLING TEST of the declared `catalog.en.ts`/`catalog.fr.ts` → allowed under
    the sibling rule; tester updates EXPECTED_PLAIN / count pins / roster comment; listed under
    `touches-delta:` in the PR. (qf-3 precedent widened the same file.)
A2. Sweep widened (in-touches, intent of the spec evidence "every nav-ified `<ul>`"): `mr-nav-list`
    goes on EVERY static `<ul>` in index.html (9: quest-log-list, heal-list, shop-for-sale,
    shop-inventory, pvp-player-list, leaderboard-list, help-controls, help-goals, menu-rows). Census
    tooth: every `<ul>` in the static index.html carries the class. Runtime-built ULs (tradeView.ts:308,
    :326; helpView runtime list if any) are OUTSIDE touches → residual, not fixed here.
A3. happy-dom 20.x: NO UA default list style (bare `<ul>` → `''`), and the `list-style` SHORTHAND is
    NOT expanded (`listStyle === 'none'`, `listStyleType === ''`). Oracle = `listStyle === 'none'`
    (equality) on the real elements, with sanity probes: a fresh `<ul class="mr-nav-list">` (no inline
    style) computes `listStyle === 'none'`; the same probe with the class removed computes `!== 'none'`.
    Static `<ul>`s carry no `style` attribute. Also: the styles.css text carries a `.mr-nav-list` rule
    whose body declares `list-style: none` (comment-stripped), and the file still has no `#id`
    selector introduced by this rule.
A4. `aria-describedby` written from `this.empty.id` (identifier), never the literal (hardcodedStrings
    SET_ATTRIBUTE sink rule).
A5. Copy reworded: en `No active quests yet. Talk to villagers to find out who needs help.`;
    fr `Aucune quête en cours. Parlez aux villageois pour savoir qui a besoin d’aide.`
A6. Write order: title + empty-state writes happen BEFORE `openOverlayA11y` (it stays the last
    statement of render). Per-render title write is kept because the i18n test constructs the view
    before switching the resolver (setLocale runs before construction in main.ts, so prod is fine
    either way).
A7. Extra teeth: title has no `hidden`/`aria-hidden`/`tabindex`/inline style, class list exactly
    `['mr-frame-title']`; initial focus still lands on `#quest-log-list` after a macrotask; empty state
    is SET not toggled (empty, empty → still shown; rows, rows → still hidden; hide() then render(empty)
    → shown); `paint()` after an empty render keeps `aria-describedby = quest-log-empty`; hidden empty
    element has empty text; en copy matches /no active quests/i and /talk/i, fr differs from en.
A8. Residuals (not fixed, outside touches): runtime tradeView `<ul>`s; wallet-balance.spec.ts:679
    comment ("one child, 1280x0 when empty") drifts.
