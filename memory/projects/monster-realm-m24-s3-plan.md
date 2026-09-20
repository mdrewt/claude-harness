# Plan — m24-s3: migration batch A (battleView + pvpView → t()/tf()) (planner output, 2026-09-20)

Worktree: projects/monster-realm/.claude/worktrees/m24-s3 · branch feat/m24-s3-i18n-migration-a · ADR 0259 · after S2 (ec3482a)

## Files
- client/src/ui/battleView.ts — 16 failing sinks + 5 hoisted literals ('You','Opponent', 3 outcomes) → t()/tf(); `import { t, tf } from './i18n/resolver'`.
- client/src/ui/pvpView.ts — 8 failing sinks → t()/tf().
- client/src/ui/i18n/messageIds.ts — +32 MessageId members, +11 MessageParams rows (ONE table, ADR-0256 D7).
- client/src/ui/i18n/catalog.en.ts — +32 entries each with adjacent `// @desc:` ≥10 non-ws chars; values byte-identical (incl. ’ U+2019, … U+2026).
- client/src/ui/i18n/__fixtures__/i18n-hardcoded.json — 81 → 57.
- Tests (tester): battleView.test.ts (+3 its + vi.mock('./i18n/resolver',{spy:true})), pvpView.test.ts (+3, same), catalog.test.ts (roster 10→42, SAMPLE_PARAMS table, +2 its).
- docs/adr/0259-*.md (new) · docs/adr/DIGEST.md (just adr-digest) · ARCHITECTURE.md (m24-s3 paragraph under M24 heading ~:2303).
- docs/knowledge/** — no change (OKF schema bundle; no schema change).
- Harness: spec §4 S3 row as-built bracket "[As built, ADR-0259: 42 sinks (25+17), 24 failing; ceiling 81 → 57]"; gates ledger X1..X8.

## Key roster (32 new; 42 total). ★ = param key.
battleView: battle.title 'Battle' · battle.continueHint 'Press Esc to continue' · battle.swap.hint (one literal, '. When' join) · battle.pvp.waiting 'Waiting for opponent’s action…' · ★battle.weather.banner {label,turns} `${label} (${turns} turns)` · battle.card.you 'You' · battle.card.opponent 'Opponent' · ★battle.card.level {level} `Lv${level}` · ★battle.card.hpLine {current,max,affinity} `HP ${current}/${max} · ${affinity}` · ★battle.skill.pvpSubmit {name,affinity} `Submit: ${name} · ${affinity}` · ★battle.skill.pveLabel {name,power,affinity} `${name} (${power}) · ${affinity}` · ★battle.skill.accuracyTitle {accuracy} `Acc ${accuracy}%` · battle.action.flee 'Flee' · battle.recruit.noBait 'No bait' · battle.recruit.submit 'Recruit' · battle.cure.placeholder 'Select item' · ★battle.cure.option {name,cureStatus,count} `${name} (cures ${cureStatus}) ×${count}` · battle.cure.submit 'Use Item' · ★battle.swap.pvpSubmit {species} `Submit Swap: ${species}` · ★battle.swap.pveLabel {species,current,max} `Swap: ${species} (${current}/${max})` · battle.outcome.victory 'Victory!' · battle.outcome.defeat 'Defeat...' · battle.outcome.fled 'Got away safely!'
pvpView: pvp.title.idle 'PvP' · pvp.title.challenge 'PvP Challenge' · ★pvp.incoming.label {challenger} `${challenger} has challenged you!` · pvp.incoming.accept 'Accept' · pvp.incoming.decline 'Decline' · ★pvp.outgoing.label {target} `Challenge sent to ${target} — waiting…` · pvp.outgoing.cancel 'Cancel Challenge' · pvp.players.none 'No players online to challenge' · pvp.players.heading 'Challenge:'
Untouched (passing, glyph-only, tier-(e)): `${label}: ${species}` (:370), bait option (:528), card.status, p.name, feedback msg, '' clears, replaceChildren().

## Decisions
1 Byte-identical English is the invariant; 24 failing + 5 hoisted = scope. Population correction (spec 43 total → measured 42 (25+17); 24 FAILING; 81→57) in ADR.
2 Hoisted literals migrated ('You','Opponent', outcomes). opponentLabel = vm.isPvp && vm.pvpOpponentName ? vm.pvpOpponentName : t('battle.card.opponent'); #renderMonsterCard signature unchanged.
3 Glyph-only compound rows untouched (tier-(e) reorderability residual; named S7 risk).
4 `(${turns} turns)` keeps literal plural — fixing = reword → fresh key + first oneOther use; follow-up.
5 Every t(/tf( first arg is a string literal (ternaries `c ? tf('a') : tf('b')`; never `t(c ? 'a':'b')`); no unused keys; model data (affinity, w.label, status, cureStatus, names) are params never catalogued.
6 Routing oracle = spy + sentinel: vi.mock('./i18n/resolver',{spy:true}) assert exact key+params per site; then mockImplementation → `«key»` sentinels, assert DOM shows sentinels and none of the English roster words. Alias `import { t as i18nT, tf as i18nTf }` (tests already import t from ./a11yCopy).
7 Per-file zero-failing pin in the VIEW tests (not hardcodedStrings.test.ts): scanSource + stripComments over own source → {sinks:25,failing:0} / {sinks:17,failing:0}.
8 catalog.test.ts: SAMPLE_PARAMS table (two sets per ★ key) replaces {where:'x'}; roster → 42; values pinned at catalog layer; ’/… by code point.
9 No resolver.ts change; no shards; no view-local t wrapper; no String.replace/regex; no main.ts edit (showFeedback text is S6's). Dev-facing throw/console strings stay.
10 ADR-0259 Extends: 0256, 0257; Subsystems client-ui, ci-gates; sections: population correction, taxonomy, residuals, S6 boot-order note (constructor-time t() calls resolve at construction → S6 must setLocale before constructing views).

## Tests (RED at HEAD)
1 m24s3 BV-01 routing keys+params per site, DOM strings byte-identical · 2 m24s3 BV-02 sentinel mode + English-roster absence + post-reset control · 3 m24s3 BV-03 battleView scan {25,0} · 4 m24s3 PV-01 · 5 m24s3 PV-02 · 6 m24s3 PV-03 pvpView scan {17,0} · 7 m24s3 CAT-01 roster 42, SAMPLE_PARAMS bijection, pinned values both sample sets, glyph code points · 8 m24s3 CAT-02 pure-interpolation (string params appear verbatim), @desc violations [] after growth. Edit: m24s1 CATALOG-SHAPE roster→42, {where:'x'}→SAMPLE_PARAMS.

## Ledger X1..X8
X1 ratchet: hardcodedStrings -t 'm24s2 I18N-18' && node -e print CEILING → /CEILING=57$/m · X2 BV-01 · X3 BV-02 · X4 BV-03+PV-03 (2 passed) · X5 PV-01 · X6 PV-02 · X7 catalog.test.ts all (7 passed (7)) · X8 npm run typecheck && echo M24S3-TYPECHECK-OK.

## Tasks
T1 tester (RED) → T2 red-team tests (mutants: literal-beside-t(), constant closure, ternary key swap, t() wrapper, JSON-only edit) → T3 specialist: messageIds → catalog.en → battleView → pvpView → I18N-18x measured 57 → JSON → typecheck/biome/client-test/just eval → T4 ADR-0259 + adr-digest + ARCHITECTURE + ledger + spec bracket → T5 reviewer ∥ verifier (mutants on detached copy), doc-keeper.

## Risks
mockReset on {spy:true} automock call-through semantics (control assertion); sentinel roster colliding with fixture names (use 'Sproutle'/'Emberfang'/'Plant'); swap.hint >100 cols (biome cannot wrap); biome import order; exact sink pins 25/17 drift on later slices; S6‖S3 ceiling race (second to merge re-measures); X1 node -e chain vs mr-gates lint; S6 boot ordering.

## Hidden-dependency flags
NONE. Verified evals (reduced-motion-hp-bar, a11y-static-shell:2073 fixture-only, keyboard-operable-rows:3322, overlay-a11y-manifest), i18nTypes.compile.test.ts (no roster enumeration), e2e/main.wiring/store string pins (byte-identical). a11yCopy.ts 'Battle'/'PvP Challenge' ARIA copies are M23's — untouched.

## Revisions after reviewer(+simplify) ∥ red-team (plan lenses, 2026-09-20)
R1 CONSTRUCTOR-TIME STRINGS (reviewer MAJOR-1): `battle.title`, `battle.swap.hint`, `battle.continueHint` are set once in the constructor today (battleView.ts:110/:216/:243) and never rewritten. Resolve them in `show()` instead (idempotent, matches every other sink's per-render resolution) so no cross-file boot-order invariant with S6's `setLocale` is created. ADR-0259 records the why.
R2 PER-FILE PIN (reviewer MAJOR-2): BV-03/PV-03 assert `failing.length === 0` EXACTLY and `sinks.length >= 25` / `>= 17` as a FLOOR (the SINK_FLOOR idiom, HC-03) — never an exact sink count (an unrelated clean sink added later must not red an i18n gate).
R3 KEY RENAME (reviewer MINOR-3): `battle.skill.accuracyTitle` → `battle.skill.accuracy` (semantic, not DOM-mechanism-derived).
R4 ADR NOTE (reviewer MINOR-4 / red-team F1): the 5 hoisted literals are structurally invisible to the S2 scanner (bare-identifier RHS / function argument) and move NO ratchet — 32 keys added vs 24 failing sinks migrated; the ONLY mechanical proof they were migrated is the sentinel test. Say so in ADR-0259.
R5 SENTINEL MATRIX (red-team F1 BLOCKER + F2 MAJOR): BV-02 renders, under `«key»` sentinels, an EXPLICIT VM matrix hitting every conditional branch: outcome ∈ {SideAWins, SideBWins, Fled} (reuse `makeTerminalVM`, battleView.test.ts:623) + Ongoing; isPvp=false with weather present, skills≥1, bench≥1 (canSwap), canRecruit + bait items, cureItems≥1; isPvp=true with pvpOpponentName UNSET (→ `battle.card.opponent`) and SET (→ raw name, no key), pvpPendingSubmit true (waiting banner) and false (Submit:/Submit Swap: labels). PV-02 likewise: idle(null), incoming, outgoing Pending, players empty+showTitle, players present. The "no English roster word" check is a WHOLE-SUBTREE walk over `#root`'s descendants' `textContent` AND every element's `title` attribute (and `<option>` text) — never per-element spot checks. Sentinel install/teardown in try/finally with explicit `.mockRestore()` (not `clearAllMocks`), plus a post-restore call-through control.
R6 CAT OUTPUT-EQUALITY (red-team F3 MAJOR): for every ★ key SAMPLE_PARAMS holds TWO sets differing in EVERY field (numbers included); CAT-01 pins the EXACT output string for BOTH sets (which implies A≠B) — a closure ignoring a numeric-only param (`() => 'Acc 50%'`) dies. CAT-02's "string params verbatim" is kept as the I18N-21 structural half only, explicitly not the mutant-killer.
R7 INDEPENDENT TRANSCRIPTION (red-team F4 MAJOR): CAT-01's expected literals are transcribed by the TESTER from the CURRENT pre-migration battleView.ts/pvpView.ts source BEFORE the catalog exists (test-first order makes them independent of the specialist's transcription); 14 of 29 strings have no other byte-identity dependent, so this pin is load-bearing — the tester copies bytes from source, never retypes.
R8 X1 chained CHECK is lint-legal (verified against mr-gates source by the reviewer) — kept.
Non-issues PoC'd by the red-team: catalog keys containing `.title` never match the `.title =` sink shape; 12-entry MessageParams compiles through tf's single cast (TS2322 on a wrong param); client-no-pii-logs / main.wiring comment-mass / a11y-static-shell:2073 needle are unaffected.
