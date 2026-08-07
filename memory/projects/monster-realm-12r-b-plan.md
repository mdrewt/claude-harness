# 12r-b — PLAYTEST.md control-table reconciliation — ADJUDICATED PLAN

Branch `feat/12r-b-playtest-control-table`, worktree `.claude/worktrees/12r-b`, base `42505e7` (origin/master).
Slice spec: `specs/monster-realm-v2/M-postgate-twelfth-review-residuals.spec.md` §12r-b.
**No ADR number assigned → author NO ADR.** Complexity: LIGHT. Domain auditors (`reducer-security-auditor`,
`desync-guard`) **not applicable** — no reducer, no `game-core`, no schema, no wasm boundary, no netcode.

## Ground truth (verified, do not re-derive)

- Live keydown set in `client/src/main.ts`: `Escape F8 F9 KeyB KeyE KeyI KeyL KeyM KeyN KeyO KeyP KeyQ KeyT KeyU Space`
  + `?` via `e.key`. **No `KeyG` / `KeyH` anywhere.** `KeyM` at `main.ts:1128` (uxd3 / ADR-0162).
- `helpModel.ts` `CONTROLS` keys (16, in order): `?` `M` `WASD / Arrows` `Space` `Escape` `T` `B` `I` `E` `Q` `U` `P` `L` `N` `O` `F9`.
- `docs/PLAYTEST.md` table (`:43-61`, 17 rows) keys: `?` `WASD / Arrows` `Space` `Escape` `T` `B` `I` `E` `Q`
  **`H`** **`G`** `U` `O` `P` `L` `N` `F9`. Drift = `H`/`G` dead, `M` missing.
- The doc's `T` action reads "Talk to a nearby NPC"; the SSOT reads
  "Interact — talk to an NPC, shop at a shopkeeper, heal at a heal tile" (**U+2014 EM DASH**). Materially wrong,
  because §4 step 7 depends on `T` routing shop + heal.
- `docs/PLAYTEST.md:74` step 7: "**Shop** (`G`) and **heal** (`H`) in town." — dead keys in PROSE, not the table.
- Inline-code spans across the whole doc, single-character: `? T B I E Q H G U O P L N`. F-key spans: `F9`, **`F8`**.
  `F8` (error-overlay dismiss, §6) is a LIVE key that is deliberately **absent from `CONTROLS`** — so any F-key
  scan would demand an out-of-scope `helpModel.ts` edit. This is why the prose scan is **single-character only**.
- `client/vite.config.ts`: vitest `include: ['src/**/*.test.ts']`, `allowOnly: false`; coverage
  `include: ['src/**/*.ts']`, `exclude` already contains `'src/**/*.test.ts'`. A new **non-test** `.ts` module
  would enter the 96% coverage denominator and require editing the exact-set-guarded exclude list → so the
  parser lives **inside the test file**. A new `*.test.ts` under `src/ui/` disturbs nothing
  (`evals/dom-shell-coverage-exclusion.eval.mjs` verified unaffected).
- Precedent for reading a repo file from a vitest test: `readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), ...))`
  — `client/src/main.wiring.test.ts`, `client/src/prediction/predictor.test.ts`. cwd-independent.
- `docs/specs/pt-c2b-plan.md:116` — the ORIGINAL slice explicitly chose "PLAYTEST.md controls table =
  hand-written to match helpModel, no generator". This slice is the consequence of that decision.

## Scope

`touches: docs/PLAYTEST.md` + always-in-scope companions. The one companion actually used is the **new sibling
test file** `client/src/ui/playtestControlsDoc.test.ts` (the spec's EARS E1 explicitly prefers a real check;
a brand-new file has zero sibling-collision risk). `helpModel.ts`, `main.ts`, `vite.config.ts`, `evals/**`,
`CHANGELOG.md`, `docs/adr/**` are **NOT** touched.

## Deliverable A — `docs/PLAYTEST.md` edits

1. Table: **delete** the `` `H` `` and `` `G` `` rows.
2. Table: **insert** `| `M` | Open the main menu |` immediately after the `?` row (mirrors `CONTROLS` order).
3. Table: `T` action → the SSOT string **verbatim** (copy the bytes from `helpModel.ts:32`; do NOT retype —
   the em dash is U+2014).
4. Table: `F9` action → exactly `Download a bug-report bundle`; the `(see §6)` cross-reference **moves out of
   the cell** to a prose line under the table. (This is what lets the gate be exact-equality with **zero**
   exceptions — strictly better than the equality-plus-hardcoded-exception the red-team proposed.)
5. §4 step 7 → route shop and heal through the interact key `T`; no `` `G` ``/`` `H` `` anywhere.
6. Boy Scout (cap: ~40 lines / ≤3 hunks): `:40`'s "Kept in sync with … `helpModel.ts`" note also names the
   enforcing test, so the next editor of either file learns the gate exists.

## Deliverable B — the gate: `client/src/ui/playtestControlsDoc.test.ts`

A pure `parseControlTable(markdown)` + `codeSpans(markdown)` defined **in the test file**, unit-tested against
literal-string fixtures, plus integration tests that read the REAL `docs/PLAYTEST.md`.

**No dynamic `RegExp` anywhere** (`String.split`/`indexOf`/`startsWith` only) — Semgrep
`detect-non-literal-regexp` has bitten this repo twice.

Parser contract (throws loudly; **never** returns `[]` silently — a vacuous pass is how this gate dies):
- `indexOf('## 3. Controls')` **first**, then `indexOf('| Key | Action |', afterSection3)`. Throw if either is
  absent. (Anchoring prevents binding to a future second table elsewhere in the doc.)
- The line after the header must be a separator — every cell only `-`/`:`/whitespace — else **throw** (turns a
  removed separator into a direct diagnostic instead of a confusing "`?` is missing").
- Consume subsequent lines whose trim starts with `|`; stop at the first that does not.
- Per row: `split('|')`, drop the leading/trailing empty segments, **assert exactly 2 cells remain else throw**
  (a literal `|` inside a cell must be a loud failure, not silent truncation), strip backticks via
  `.split('`').join('')`, trim.

Assertions:
- **A1 (EARS E1)** — key set-equality in BOTH directions, order-independent. Failure message names the
  offending keys with `JSON.stringify` (so an NBSP / double space is visible, not invisible).
- **A2** — for each key, the doc action **exactly equals** the SSOT action. (NOT `.includes` — the red-team
  PoC'd that containment is a false-green oracle: `| `T` | <ssot text> (also try `G` for shop…) |` passes
  containment while re-teaching the dead keys, cosigned by a green test.)
- **A3 (structural anti-vacuity)** — `rows.length === CONTROLS.length` **and** no duplicate keys
  (`new Set(keys).size === rows.length`). Replaces the originally-planned `>= 10` magic floor, which was both
  redundant with A1 and a future landmine if the keymap ever shrinks below 10.
- **A4 (prose scan — closes the hole that caused the ORIGINAL bug)** — strip fenced code blocks first
  (`split('```')`, keep even segments), then take every inline-code span in the WHOLE document; every span that
  is **exactly one character** must be a key in `CONTROLS`. Whitelist is *derived from `CONTROLS`*, not a
  hardcoded denylist. Single-char-only is deliberate: it catches the demonstrated `` `G` ``/`` `H` `` prose
  regression at `:74` everywhere in the file, while leaving `` `F8` `` (live, not in `CONTROLS`) alone.
- **A5 (meta-attack defence)** — every failure message names BOTH file paths and says explicitly that the fix
  is to update the doc or `CONTROLS`, **not** to weaken the test.

Order is deliberately **not** gated (E1 is set semantics; the doc's teaching order puts `O` before `P`).

## Proof-of-teeth (each must independently bite)

1. Re-add the `` `G` `` row → A1 RED. 2. Delete the `` `M` `` row → A1 RED. 3. Revert `T`'s action text → A2 RED.
4. Append "(also try `G`)" to a doc action → **A2 RED** (containment would have passed — the red-team PoC).
5. Re-add "Shop (`G`) and heal (`H`)" to §4 step 7, table untouched → **A4 RED** (the original bug's exact shape).
6. Corrupt the table header / remove the separator / a 3-cell row → **throws**, not a silent green.
7. Duplicate the `T` row → A3 RED.

## Adjudicated review findings

**Adopted:** RT-1 (containment false-green → exact equality, and better: zero exceptions by relocating
`(see §6)`), RT-2 (2-cell assertion), RT-3 (prose hole → single-char span scan, scoped to dodge `F8`),
RT-4 (anchor to `## 3. Controls`), RT-5/REV-1 (duplicate keys), RT-6 (drop the magic `>= 10`),
RT-7 + RT-10a (diagnostics + anti-weakening failure messages), REV-2 (copy the em-dash, don't retype),
REV-3 (validate the separator).

**Rejected / deferred, with reasons:**
- **RT-10b — a gate-hardening eval protecting this test file from deletion/skip.** Requires editing
  `evals/gate-hardening-config.eval.mjs`, outside `touches:` → **hidden-dependency, flag as follow-up, do not
  touch.** Residual risk is bounded: `allowOnly: false` is already global and the verifier runs an
  anti-weakening audit per slice.
- **Row-order gating** — E1 is set semantics; gating order would spuriously RED a harmless future doc reorder.
- **Non-backticked prose mentions** ("press G to shop", no backticks) — out of reach of any non-fragile gate.
  The doc's convention is backticks for keys; noted as a known limit, not chased.

## Disclosed consequence

A2 (exact equality) **couples** the known follow-up micro-slice that fixes `helpModel.ts:35`'s stale
"Open Evolution / fuse monsters" copy: it must now also update `docs/PLAYTEST.md`'s `E` row. That is the gate
working as intended (SSOT drift becomes mechanical), and is named in the PR body — not a reason to weaken it.
