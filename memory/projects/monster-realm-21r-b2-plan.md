# 21r-b2 plan — route claimModel.ts + privacyBanner.ts copy through the i18n catalog (en+fr)

Base: origin/master a3934d23. Worktree `.claude/worktrees/21r-b2`, branch `21r-b2` (draft PR #530).
Spec: `specs/monster-realm-v2/M-postgate-twentyfirst-review-residuals.spec.md` #21r-b2.
Ledger: `memory/projects/gates/21r-b2.gates.md` (one seeded gate, E1).

## Verified scope (re-read @a3934d23)

Raw copy that reaches the DOM today (`claimView.ts:139-145` writes `vm.title/body/nudge/feedback/confirmPrompt`
raw; `privacyView.ts:175-198` writes every vm label raw; `main.ts:3169` writes `privacyBannerLabel()` raw):

- `claimModel.ts` — 23 literals: `CLAIM_DISCONNECTED_FEEDBACK` (:93, fourth copy of the disconnected line),
  `CLAIM_VETO_FEEDBACK` (:96), `NUDGE_COPY`/`CONFIRM_PROMPT` (:320-322), 3 title/body pairs (:324-331),
  `'Sign-in did not finish'` (:381), `REJECT_COPY` 4 pairs (:333-350), `SIGN_IN_FAILED_COPY` 4 + fallback (:352-364).
- `privacyBanner.ts` — 21 literals + the 4 unit suffixes of `formatDuration` (:62-65): countdown 3 (:31-33),
  terminal notice (:126), disconnected notice (:131), 3 status lines (:133-135), 5 export lines (:147-155),
  5 control labels (:157-164). `formatDuration`'s `d/h/m/s` are letters, i.e. translatable per the repo's own
  rule (`hardcodedStrings.ts` NON_TRANSLATABLE_CHARS = whitespace ∪ digits ∪ 19 glyphs); the single-space
  joiner is non-translatable and stays a literal.
- `sessionModel.ts:3` and `:15` — the two `AUTH-46/47` comment tokens the spec names.

### The one string that CANNOT move inside `touches:` — the pseudonymization disclosure
`PRIVACY_PSEUDONYMIZATION_DISCLOSURE` (privacyBanner.ts:116) is written by `privacyView.ts:150` in the
CONSTRUCTOR (a value import, painted once), and `privacyView.i18n.test.ts:279` pins
"PRIVACY_PSEUDONYMIZATION_DISCLOSURE stays raw" under «key» sentinels. Neither file is in `touches:`.
A module-level `t()` would freeze the boot locale (the spec forbids it); a resolve-at-render route needs
`privacyView.ts` to paint it in `show()`/`render()`. `privacyView.ts:144` cites "M24 §2.5" for leaving it
raw, but §2.5 is the CONTENT-registry cut (species/item/dialogue text), not UI chrome — so this is an
unadjudicated leftover, not a decision. DISPOSITION: the disclosure stays a raw en constant pinned to
`evals/account-e2e.eval.mjs` `PIN_PSEUDONYMIZATION` (unchanged tooth); it is registered as a residual
(`mr-gates residuals add` AFTER the review lenses — add is not upsert; ux-a11y/LOW, target backlog) naming
`privacyView.ts:150` + `privacyView.i18n.test.ts:279` as the out-of-touches edits, noting that M22 §9 mandates
the sentence "verbatim in any UI copy" so a French rendering needs a DECISIONS.md ruling first, and listing
`client/e2e/accounts.spec.ts:26-39` (a header that says the claim copy is "NOT in the i18n catalog" and cites
the deleted constants — stale prose after merge, still green on identical en bytes). Called out in the PR body. NOT a silent
narrowing: the spec's own citation ranges (`:31-33, :131-159`) exclude it, and the supervisor's scope note
about the pin is honoured (the en pin stays; nothing fr-pins it).

## Key roster — 45 new keys (133 → 178), existing `claim.*` / `privacy.*` namespaces; en BYTE-IDENTICAL

Grammar: `[a-z][a-zA-Z0-9]*` segments, ≥2 (SHAPE-03). Every entry gets an adjacent `// @desc:` (SHAPE-01).
`{…}` = `MessageParams` row (closure in both catalogs, FR-01 requires fr to read exactly en's fields).

### claim.* (23, all plain)
| key | en |
|---|---|
| claim.feedback.veto | Finish or decline the pending claim before rejoining. |
| claim.nudge | Guest progress transfers only from the device you claim it on. |
| claim.decline.confirmPrompt | Declining permanently deletes this claim code — your guest progress cannot be undone once the code is gone. Decline and continue as a guest? |
| claim.pending.title | Keep your guest progress |
| claim.pending.body | Sign in to claim the progress you made as a guest, or decline to keep playing as a guest on this device. |
| claim.awaiting.title | Finishing your claim |
| claim.awaiting.body | Waiting for your account to be ready before your guest progress can transfer. |
| claim.claimed.title | Progress claimed |
| claim.claimed.body | Your guest progress is now attached to your account. |
| claim.signInFailed.title | Sign-in did not finish |
| claim.signInFailed.rejected | Sign-in was rejected. Please try signing in again. |
| claim.signInFailed.expired | That sign-in link expired. Please try signing in again. |
| claim.signInFailed.declined | Sign-in was cancelled. You can try again whenever you are ready. |
| claim.signInFailed.unreachable | We could not reach the sign-in service. Please try again in a moment — your guest progress is safe. |
| claim.signInFailed.fallback | Sign-in did not complete. Please try again — your guest progress is safe. |
| claim.reject.unusable.title | That claim code is no longer usable |
| claim.reject.unusable.body | This claim code has already been used or has expired. You can keep playing on this device. |
| claim.reject.destination.title | This account cannot take that progress |
| claim.reject.destination.body | This account already has game data, so the guest progress cannot be moved onto it. The claim code is still valid on another account. |
| claim.reject.transient.title | Not ready to claim yet |
| claim.reject.transient.body | The claim could not complete right now — close your other tab or finish your current battle, then try again. |
| claim.reject.generic.title | Could not complete the claim |
| claim.reject.generic.body | Signing in is required before this progress can be claimed. Your guest progress is safe. |

The disconnected line takes the EXISTING `chrome.feedback.disconnected` (no new key; `CLAIM_DISCONNECTED_FEEDBACK`
export removed — its only consumer is claimModel.test.ts).

### privacy.* (22; 7 parameterised)
| key | params | en |
|---|---|---|
| privacy.countdown.dark | — | Account deletion pending — time remaining unavailable |
| privacy.countdown.due | — | Account deletion is due now |
| privacy.countdown.grace | {duration: string} | Account deletion in ${duration} |
| privacy.countdown.days | {n: bigint} | ${n}d |
| privacy.countdown.hours | {n: bigint} | ${n}h |
| privacy.countdown.minutes | {n: bigint} | ${n}m |
| privacy.countdown.seconds | {n: bigint} | ${n}s |
| privacy.notice.terminal | — | This account has already been permanently deleted. It cannot be restored. |
| privacy.notice.disconnected | — | Not connected — your request was not sent. Try again. |
| privacy.status.active | — | This account is active. |
| privacy.status.unknown | — | Account status unavailable. |
| privacy.status.terminal | — | This account has been permanently deleted. |
| privacy.export.none | — | No data export has arrived on this device yet. |
| privacy.export.incomplete | {received: number; total: number} | Data export incomplete — ${received} of ${total} chunks delivered. |
| privacy.export.incompleteDark | — | Data export incomplete — some chunks are missing. |
| privacy.export.inconsistent | — | Data export could not be assembled — the delivered chunks do not describe one request. Request it again. |
| privacy.export.complete | {received: number} | Data export ready — ${received} chunks. |
| privacy.action.delete | — | Delete my account |
| privacy.confirm.prompt | — | This cannot be undone. Confirm deletion? |
| privacy.action.cancel | — | Cancel account deletion |
| privacy.action.export | — | Request my data export |
| privacy.action.download | — | Download my data export |

`PRIVACY_TERMINAL_NOTICE` export removed (consumers: privacyBanner.ts + three test files, all in touches).
No plural keys: en keeps its pre-existing "1 chunks" shape byte-for-byte (the `battle.weather.banner`
precedent — a reword is a fresh key), and fr mirrors that shape so `PLURAL_PARAM_KEYS` need not grow.

### French (catalog.fr.ts conventions: U+00A0 before `:;!?`, `’` U+2019, `…`, accented capitals)
claim.feedback.veto → Terminez ou refusez le transfert en attente avant de rejoindre la partie.
claim.nudge → La progression d’invité ne se transfère que depuis l’appareil sur lequel vous la récupérez.
claim.decline.confirmPrompt → Refuser supprime définitivement ce code de transfert — votre progression d’invité ne pourra plus être transférée vers un compte une fois le code disparu. Refuser et continuer en tant qu’invité ?   (verifier: declining keeps the progress on this device; only the transfer is lost)
claim.pending.title → Conservez votre progression d’invité
claim.pending.body → Connectez-vous pour récupérer la progression réalisée en tant qu’invité, ou refusez pour continuer à jouer en tant qu’invité sur cet appareil.
claim.awaiting.title → Finalisation du transfert
claim.awaiting.body → En attente que votre compte soit prêt avant que votre progression d’invité puisse être transférée.
claim.claimed.title → Progression récupérée
claim.claimed.body → Votre progression d’invité est désormais rattachée à votre compte.
claim.signInFailed.title → La connexion n’a pas abouti
claim.signInFailed.rejected → La connexion a été refusée. Veuillez réessayer de vous connecter.
claim.signInFailed.expired → Ce lien de connexion a expiré. Veuillez réessayer de vous connecter.
claim.signInFailed.declined → La connexion a été annulée. Vous pourrez réessayer quand vous le souhaitez.
claim.signInFailed.unreachable → Impossible de joindre le service de connexion. Veuillez réessayer dans un instant — votre progression d’invité est en sécurité.
claim.signInFailed.fallback → La connexion ne s’est pas terminée. Veuillez réessayer — votre progression d’invité est en sécurité.
claim.reject.unusable.title → Ce code de transfert n’est plus utilisable
claim.reject.unusable.body → Ce code de transfert a déjà été utilisé ou a expiré. Vous pouvez continuer à jouer sur cet appareil.
claim.reject.destination.title → Ce compte ne peut pas recevoir cette progression
claim.reject.destination.body → Ce compte possède déjà des données de jeu, la progression d’invité ne peut donc pas y être transférée. Le code de transfert reste valable sur un autre compte.
claim.reject.transient.title → Transfert pas encore possible
claim.reject.transient.body → Le transfert n’a pas pu aboutir pour le moment — fermez votre autre onglet ou terminez votre combat en cours, puis réessayez.
claim.reject.generic.title → Impossible de finaliser le transfert
claim.reject.generic.body → Vous devez vous connecter avant de pouvoir récupérer cette progression. Votre progression d’invité est en sécurité.
privacy.countdown.dark → Suppression du compte en attente — temps restant indisponible
privacy.countdown.due → Suppression du compte imminente
privacy.countdown.grace → Suppression du compte dans ${duration}
privacy.countdown.days → ${n} j   (a REAL U+00A0 between number and unit inside EVERY group — French unit-symbol typography; groups are still joined by the ASCII-space literal)
privacy.countdown.hours → ${n} h
privacy.countdown.minutes → ${n} min
privacy.countdown.seconds → ${n} s
privacy.notice.terminal → Ce compte a déjà été définitivement supprimé. Il ne peut pas être restauré.
privacy.notice.disconnected → Non connecté — votre demande n’a pas été envoyée. Réessayez.
privacy.status.active → Ce compte est actif.
privacy.status.unknown → Statut du compte indisponible.
privacy.status.terminal → Ce compte a été définitivement supprimé.
privacy.export.none → Aucun export de données n’est encore arrivé sur cet appareil.
privacy.export.incomplete → Export de données incomplet — fragments livrés : ${received} sur ${total}.   (count after a label: no singular/plural form for 0/1)
privacy.export.incompleteDark → Export de données incomplet — certains fragments manquent.
privacy.export.inconsistent → L’export de données n’a pas pu être assemblé — les fragments livrés ne décrivent pas une seule demande. Demandez-le à nouveau.
privacy.export.complete → Export de données prêt — fragments reçus : ${received}.
privacy.action.delete → Supprimer mon compte
privacy.confirm.prompt → Cette action est irréversible. Confirmer la suppression ?
privacy.action.cancel → Annuler la suppression du compte
privacy.action.export → Demander l’export de mes données
privacy.action.download → Télécharger l’export de mes données

## Plan-review outcome (planner, opus)
- ACCEPTED: 45-key roster (every en value re-verified byte-identical vs source; no grammar/collision hits);
  step-time feedback resolution + projection-time labels; `switch` with literal keys (a `Record<_, key>` +
  `t(x)` is DYNAMIC-KEY and fails PARITY-04; a thunk table gains nothing); the `default:` arm also removes
  `SIGN_IN_FAILED_COPY[reason]`'s prototype read.
- CHANGED: French — "réclamation" reads as *complaint*; use transfert/récupérer; U+00A0 before `?` and inside
  every unit group. `EXPECTED_PARAM_OUTPUTS` growth added. WIRING-FR boots via `?locale=fr`. Vacuous negatives
  fixed with a typeof-asserted const. Key-call census added. catalogShape.test.ts added to the gate.
- YAGNI: no disclosure doc-comment amendment; delete (not re-cite) the stale claimModel.test.ts:450-455 comment.
- VERIFIER brief must include a human read of the fr claim/privacy lines (no test judges translation meaning).

## Plan-review outcome (reviewer sonnet + red-team sonnet + /simplify, 2026-09-30)
- DROPPED the key-call census (reviewer MAJOR): a spy-call-set pin is implementation detail and the only cheats it
  uniquely catches (`currentLocale()==='en' ? literal : t(key)`; dead literal `t()` calls beside a
  `CATALOGS[currentLocale()]` read) produce no player-visible defect; a module-load freeze is caught by the
  import-then-`setLocale('fr')` ordering, wrong/missing keys by PARITY-03/04 and the en byte sweep. Red-team's
  alias source-scan is a forbidden shape (source text). `testing-tdd.md`: when unsure, don't add it.
- ACCEPTED from red-team: prototype-name reasons/outcomes; `hidden` in the sweep; en sweep at the site; explicit
  dark-incomplete; both notice routes; hand-written fr expectations with `\u00A0`; 1157-day fr alphabet tooth;
  bigint samples 1157n / 2^53+1; fr byte pins on the four destructive labels; fr typography sweep; fr erasure
  census; WIRING-FR asserts `lang`/`currentLocale()` first and keeps the raw-disclosure `toContain`.
- ACCEPTED from reviewer: FR-DIFFERS owns every `!== en` assertion (no duplication in the model tests);
  privacyBanner.ts header amended like claimModel.ts (locale cell = sole ambient input; the "spelled once" doc
  at :28-30 deleted); messageIds.ts:180-182 `MessageParams` comment gains one line for the `duration` param
  (formatter output built from catalogued unit text, not model data); "append at END" rule dropped (the cited
  lines are already stale and both citing files are outside touches); WIRING-FR hoists `bootMain`.
- DECLINED: an `Object.keys(module)` export-roster pin (dead raw exports are a review finding, YAGNI); blocking
  on supervisor sign-off for the disclosure (autonomous loop — the residual + PR body + handoff carry the
  explicit carve-out and the totality argument: `Catalog` totality forces a French value for any new key and
  M22 §9 mandates the sentence verbatim in UI copy, so cataloguing it needs a DECISIONS.md ruling first).
- GATE CHECK hardened (red-team item 8): each tag must pass in ITS OWN file (`testResults[].name` binding);
  the seven gating files must contain no `.fails(`; the report file is removed before the run; vitest's own
  exit code gates the `&&` chain. Not addressed by E1 (by design, `just ci` owns it): `tsc` over
  `MessageParams`.
- Pre-existing, out of scope: the server's `rejectMessage` reaches the DOM verbatim under fr (design: never
  paraphrase a rejection).

## Code-lens outcome (reviewer + red-team on 47f46fca, 2026-09-30)
- No BLOCKER/MAJOR. 45/45 en values verified byte-identical by both lenses (red-team: a 945k-comparison
  differential of origin/master vs HEAD under en found zero diffs on type-legal input).
- FIXED (impl): fr `claim.reject.generic.body` reworded ("Une connexion est requise" read as a NETWORK
  connection beside "Non connecté"); fr chunk sentences made count-after-label so 0/1 need no singular
  ("fragments livrés : 2 sur 5", "fragments reçus : 5") — new fr text has no byte-identity constraint, so
  correct French beats mirroring en's "1 chunks" defect; `rejectCopy` last arm is `default:` so the
  projection stays total for an untyped `null` (old `??` fallback behaviour); `@desc` for
  `claim.feedback.veto` says "above its buttons" (claimView appends `claim-feedback` before the
  buttons); `buildClaimViewModel` doc no longer claims `feedback` is resolved there.
- SENT TO THE TESTER: red-team survivors 1+2 — placeholder / meaning-inverted fr values pass because the fr
  sweeps compare against `CATALOG_FR` itself and only 11 fr values were byte-pinned. Fix: extend the fr
  byte-pin table to all 38 plain keys (transcribed from THIS plan's French table); update the two fr chunk
  expectations; retitle the three stale roster titles ("21-file", ">=100/133", "42-key roster"); drop the
  duplicate literal pin of `chrome.feedback.disconnected` (survivor: catalog.test.ts CAT-01 (c)).
- KEPT (adjudicated): the en sweeps (site pins + prototype-name reasons under en); the pre-migration
  `file:NN` citation convention; slice-narrating comments (house style of messageIds.ts / the roster tests).
- FOLLOW-UPS (outside touches): `catalogString` helper is copy-pasted in 4 test files → one export beside
  `client/test-util/stripComments`; `privacyView.i18n.test.ts:93-97` narrates "RAW model text" / "the real
  CONFIRM_PROMPT constant" (now false) → added to the residual; ledger `Touches:` line is stale
  (`client/net/sessionModel.ts`, missing messageIds.ts + the sibling tests) → supervisor reseed.

## Verifier outcome (opus, on 8e571d41, 2026-09-30): PASS
- E1 CHECK as stored → `21r-b2-E1:PASS`; tsc 0; biome 0 (one pre-existing warning); detached `just ci`
  CI-EXIT=0 (nextest 1960/1960, 15/15 evals incl. account-e2e, vitest 3158/3158). Test ownership clean:
  implementer commits touched no test file; every removed `it(` is a retitle; the one deleted assertion has
  its named survivor. RED re-proven in scratch copies (9 fail on master, 8 fail with catalogs-only).
- French read as a player: correct, consistent glossary, destructive labels point the right way.
- FIXED after the verdict: `claim.decline.confirmPrompt` fr precision (declining keeps the progress on
  this device — only the transfer to an account is lost; the old line read as "progress will be lost");
  the tester adds a `rejectedWith(null as never)` case so `rejectCopy`'s `default:` totality claim is
  tested (the verifier's own mutant reverted it to explicit cases and survived 3158 tests).

## Functional core / imperative shell (no shell file changes)
- LAZY resolution ONLY (21r-b rule): `t()`/`tf()` read the module-level locale cell that boot sets AFTER
  import, so a module-scope `const X = t(...)` freezes English. Every call sits inside a function body:
  - claimModel.ts: `claimStep` resolves `claim.feedback.veto` / `chrome.feedback.disconnected` at EVENT time
    (sessionModel precedent — the state carries the resolved string, exactly as today); `buildClaimViewModel`
    resolves title/body/confirmPrompt/nudge at PROJECTION time. `REJECT_COPY` / `SIGN_IN_FAILED_COPY` become
    `switch` statements with LITERAL keys (PARITY-02 flags any non-literal `t(x)` as DYNAMIC-KEY; PARITY-04
    needs a literal call site per key). Header comment: add the sessionModel sentence naming the locale cell as
    the sole ambient input; AUTH-55's no-clock scan (claimModel.test.ts:911) is untouched by a resolver import.
  - privacyBanner.ts: `privacyBannerLabel`, `formatDuration` (unit groups via `tf('privacy.countdown.days', {n})`
    etc., joined by `' '`), `statusLabelFor`, `noticeLabelFor`, `exportStatusLabelFor`, `buildPrivacyViewModel`
    all resolve inside the function. Every module-level copy constant except the disclosure is deleted.
    `main.ts:3169/3175` call these per frame → the label is re-resolved every render, no wiring change.
  - sessionModel.ts: `:3` `AUTH-46/47/49/56/59` → `AUTH-49/56/59`; `:15` drop ` (AUTH-46/47)`. Nothing else.
- Additive data model: `MessageId` union +45; `MessageParams` +7 rows; `Catalog` totality forces both
  catalogs at `tsc` time. No view-model SHAPE change (`ClaimViewModel`/`PrivacyViewModel` fields unchanged).
- Anti-patterns ruled out: module-level `t()`; computed keys; a new top-level namespace; `oneOther` in en
  (SHAPE-06 + byte-identity); `Number(days).toLocaleString()` (RB51-LABEL-ASCII); re-deriving enablement.

## Sibling-test fallout (touches-delta; roster pins that MUST grow with the catalog — 21r-b precedent)
- `client/src/ui/i18n/catalog.test.ts` — `EXPECTED_PLAIN` +38, `SAMPLE_PARAMS` +7 (two sample sets each,
  bigint samples for the unit keys) AND `EXPECTED_PARAM_OUTPUTS` +7 (no bijection check links it to
  SAMPLE_PARAMS, so it is the only en byte pin for the closures); CAT-01 title/comments 133→178.
- `client/src/ui/i18n/catalogParity.test.ts` — PARITY-02 resolver roster 21→23 (`ui/claimModel.ts`,
  `ui/privacyBanner.ts`); FR-01's "133" anti-vacuity message; a `21r-b2 FR-05` per-key fr≠en test over the
  45 keys (param keys compared through one concrete sample).
- `client/src/ui/i18n/resolver.test.ts` — unaffected (its snapshot is `chrome.*` only).
- NOT touched: `privacyView.i18n.test.ts` (disclosure stays raw, so it stays green), `main.privacyCountdown.test.ts`
  (en bytes identical), `claimView*.test.ts` (synthetic vms), `hardcodedStrings.*` (no new sinks).

## Tests (tester, RED first; tag every new test with the per-file-unique tag shown so the gate can name it)
1. `claimModel.test.ts` — `[21R-B2-CLAIM-FR]`: import the module first (static import), then `setLocale('fr')`,
   then for EVERY phase (INCLUDING `hidden`), every outcome (the 4 + `undefined` → generic), every reason (the 4
   known + an unknown string + `undefined` + the prototype names `'constructor'`/`'toString'`/`'__proto__'` →
   fallback), armed confirm, and the nudge frame: assert the vm string `=== CATALOG_FR[key]` (key hand-written per
   arm from the roster table — never derived from the implementation); `claimStep` veto + the 3 disconnected arms
   → `CATALOG_FR['chrome.feedback.disconnected']`. Then the SAME sweep under en asserting `=== CATALOG_EN[key]`
   (today 19 of the 23 en strings have no pin at the site; this is the byte pin). No `!== EN` halves here —
   `[21R-B2-FR-DIFFERS]` owns that. `afterEach(setLocale('en'))`. Replace the `CLAIM_DISCONNECTED_FEEDBACK` import with `CATALOG_EN['chrome.feedback.disconnected']`.
   Existing en literal pins stay (byte-identical). DELETE the obsolete comment at :450-455 (this slice IS the
   one-shared-source fix it asks for). APPEND every new test at the END of the file — `exportAssembly.test.ts:596`
   and `privacyModel.test.ts:1281` cite `claimModel.test.ts:940-961` by line. Cover the 4 known reasons, an
   unknown reason string and `undefined` (fallback), and `rejected` with `outcome: undefined` (generic).
2. `privacyBanner.test.ts` — `[21R-B2-PRIVACY-FR]`: same shape (fr sweep + en sweep) for `privacyBannerLabel`
   (grace at the four magnitudes ≥1d/≥1h/≥1m/<1m with HAND-WRITTEN fr expectations carrying `\u00A0` inside every
   unit group, e.g. `Suppression du compte dans 2\u00A0j 3\u00A0h 4\u00A0min 5\u00A0s`; due; dark), every
   `buildPrivacyViewModel` label, every export status INCLUDING an explicit dark-incomplete assembly
   (`totalChunks: undefined`, `receivedChunks` ≠ 0) and `received=2,total=5` for the two chunk closures, BOTH
   notice routes (`terminal-row` via a terminal countdown AND `permanently-deleted` via `state.notice`), and a
   1157-day fr alphabet tooth mirroring RB51-LABEL-ASCII (ASCII digits + `j h min s` + U+00A0 + U+0020 only —
   kills `toLocaleString('fr')`, which emits U+202F at ≥1000). Replace the
   `PRIVACY_TERMINAL_NOTICE` import with `CATALOG_EN['privacy.notice.terminal']`. The PIN and erasure-census teeth stay.
3. `privacyView.test.ts` + `main.privacyWiring.test.ts` — swap the `PRIVACY_TERMINAL_NOTICE` import for ONE
   file-level const read from `CATALOG_EN['privacy.notice.terminal']` and asserted `typeof === 'string'` (a
   `.not.toBe(undefined-from-a-mistyped-key)` negative is vacuous forever: client specs are not typechecked);
   rewrite the two file headers that describe the removed import; do not rename existing test titles.
   `[21R-B2-WIRING-FR]` gets its OWN `describe` in main.privacyWiring.test.ts: boot main.ts under fr via
   `window.history.replaceState(null, '', '/?locale=fr')` + `vi.resetModules()` + `await import('./main')`
   (main.feedbackI18n.test.ts:407-410 precedent — hoist ONE `bootMain(url)` helper used by both describes rather
   than copying the harness), afterEach restores `'/'`; assert FIRST that `document.documentElement.lang === 'fr'`
   and `currentLocale() === 'fr'` (a vacuous un-awaited boot must not pass), then the terminal-row notice on open
   `=== CATALOG_FR['privacy.notice.terminal']`, the status line `=== CATALOG_FR['privacy.status.terminal']`, and
   `toContain(PRIVACY_PSEUDONYMIZATION_DISCLOSURE)` on the overlay text (pins the residual's boundary so it cannot
   quietly widen).
4. `catalog.test.ts` — `[21R-B2-ROSTER-178]` growth as above (byte-identical en pins from THIS table); the four
   unit keys' `SAMPLE_PARAMS` use bigint samples `1157n` and `2n ** 53n + 1n` with `EXPECTED_PARAM_OUTPUTS`
   `'1157d'` / `'9007199254740993d'` etc. (kills `${p.n.toLocaleString()}d`).
5. `catalogParity.test.ts` — roster 23 + `[21R-B2-FR-DIFFERS]`.
6. NO key-call census (adjudicated, see review outcome): the spy-set test is dropped.
7. fr typography + compliance (in `catalogParity.test.ts` `[21R-B2-FR-DIFFERS]`): for every one of the 45 fr
   values (closures evaluated with one concrete sample) assert every `?`/`!`/`:`/`;` is preceded by U+00A0 and
   no ASCII apostrophe; literal fr byte pins for the FOUR destructive labels (`privacy.action.delete`,
   `privacy.action.cancel`, `privacy.confirm.prompt`, `claim.decline.confirmPrompt`) so a swapped or benign
   fr line fails by name. In `privacyBanner.test.ts` under fr: the RB52C erasure census re-run over the
   fr matrix with stems `erasure`, `effac`, `purg` (zero hits — the disclosure is raw en and not in the matrix).
Red reason to expect: TS2741/TS2345 on missing keys → vitest transpiles without tsc, so the RED is a
runtime throw `i18n: no entry for key 'claim.…'` from `lookup()` plus `undefined` catalog reads.

## Gate E1 CHECK (ledger)
Run the six gating spec files plus `client/src/ui/i18n/catalogShape.test.ts` (it checks `// @desc:` adjacency
and key grammar in BOTH catalogs; untagged) through `npm --prefix client run test -- --reporter=json --outputFile=…`, then a
v18-safe `node -e` assert: exit 0, `success`, `numFailedTests===0`, `numPendingTests===0`, `numTodoTests===0`,
`numTotalTests>0`, and each of the five tags above appears EXACTLY ONCE among PASSING `assertionResults`
titles; prints `21r-b2-E1:` + (PASS|FAIL) built from a branch (never verbatim). EXPECT `21r-b2-E1:PASS`.

## Out of scope → follow-ups
- The disclosure (above) — residual, ux-a11y/LOW.
- `PRIVACY_PSEUDONYMIZATION_DISCLOSURE`'s doc comment is NOT amended with a cross-file "why still raw" claim
  (it would go stale when the residual closes); the residual and the PR body carry the reason.
- en "1 chunks"/"1 turns" plural defects — pre-existing, a reword = fresh key + first `oneOther` (M24 rule).
