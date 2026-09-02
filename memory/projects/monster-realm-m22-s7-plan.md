# m22-s7 — plan of record (M22 S7 runbook + G24 citation gate)

Worktree `.claude/worktrees/m22-s7`, branch `slice/m22-s7`, from origin/master@62aea8a. ADR **0230**.

## Verified ground truth (planner, deltas from brief)
- `DATA_LIFECYCLE_MANIFEST` (schema.rs:997) real per-class counts: Erase 13, Anonymize 4, ViaJoin 5,
  NotOwned 18 = 40. Enum spells it `ViaJoin(&'static str)` (schema.rs:961) — **no `JoinOnly` symbol**.
  Earlier grep counts were inflated by the validator arm at schema.rs:1286-1287.
- **PRV1-17 / PRV1-20 are already TRUE of shipped code.** `delete_account` (accounts.rs:769-799) and
  `cancel_account_deletion` (:804-834) log only via `reject()` -> `guards::log_reject`
  (guards.rs:47-56) with **static literal** reasons; `account_deletion_reaper` (:923-958) emits **no log
  line at all**; all 11 delegated cascade helpers have zero `log::`/`mr_log`; privacy.rs bans logging
  macros file-wide (:19-28). Only transitive logging is via 6a `resolve_all_live_interactions` ->
  `pvp::forfeit_on_disconnect` / ADR-0185 write-back, which log `battle_id` + escaped internal errors.
- `export_bundle` TTL reaper is **DEFERRED to S4b** (privacy.rs:16-17). Bundles purged only by
  `purge_export_bundles` (privacy.rs:58) from `request_data_export` purge-before-write (:1495),
  `complete_guest_claim` (accounts.rs:694) and the cascade (accounts.rs:949). No independent expiry.
- Runbook consumers (exactly 3): account-e2e.eval.mjs:92/2111-2125 (G23);
  observability-stack-config.eval.mjs:6727/6867/6870 (C17+C18);
  ops/observability/checks/stack-config-checks.test.mjs:1747/1755-1757 (REAL-FILES).
- `parseGraceConst` IS exported (`evals/deletion-grace-wasm-ssot.eval.mjs:227`) -> import, never edit.
- adr-digest SUBSYSTEM_VOCAB (scripts/adr-digest.mjs:22-33): battle, evolution-fusion, movement-netcode,
  content, schema-persistence, client-ui, ci-gates, tooling-docs, security-authz, economy-quests.

## Steps
0. `npm ci` in client/ if node_modules absent; check no stray spacetime process (global lock).
1. RED first: add G24 pure checker + fixtures to `evals/account-e2e.eval.mjs` after the G23 block (~:856):
   `squashDocText`, `PIN_PSEUDONYMIZATION`, `PIN_BACKUP_LIMIT` (+ length pins),
   `DELETION_CITATIONS`, `resolveDeletionCitations(sources)`, `checkDrRunbookDeletionSection(text,sources)`,
   `readDeletionCitationSources()`, `GOOD_DELETION_RUNBOOK_LINES` + own decoy appendix + map/without
   helpers, `g24Teeth()` returning `{bit,total,firstMiss}` with counts DERIVED from the run.
   Reuse `extractSection` (:662) and `parseGraceConst`; array-of-strings fixtures, never template
   literals; no scheme literals even in comments; no `new RegExp`.
2. Wire G24 into phase 0 (teeth) and phase 1 (real doc, unconditional, before the CLI probe). Success
   `detail` gains derived `G24 n/6 clauses, n/6 citations, teeth n/n ALL-BIT`. Eval `name` stays
   BYTE-IDENTICAL (a static replay fixture `.claude/hooks/quiet/fixtures/evals-green.txt` quotes it).
3. Append `## 9. Data deletion & backup retention` at EOF of `docs/observability-dr-runbook.md`.
4. Turn G24 green by fixing the SECTION, never the gate.
5. `docs/adr/0230-<slug>.md`; `Extends:` (never `Amends:`); subsystems `tooling-docs, ci-gates,
   security-authz`; Decision <=240 chars; then `just adr-digest` + `just adr-digest-check`.
6. `ARCHITECTURE.md` one targeted sentence (deployment bullet ~:1177-1180).
7. `docs/knowledge/**` NO EDIT (generated from schema.rs; untouched).
8. `just fmt` (pinned biome) then `just lint`, then full `just ci`.

## Runbook section content (9 paragraphs A-F)
A: the two REQUIRED-EXACT sentences verbatim (spec section 9 residual 1 + residual 2).
   FLAG: residual 2 names `DELETION_GRACE_MS`, which does not exist; the real symbol is
   `DELETION_GRACE_MS_DEFAULT`. Quote verbatim (it is required-exact), then a separate unpinned
   sentence naming the real spelling. ADR-0230 records this deliberately.
B: grace window `DELETION_GRACE_MS_DEFAULT` = 604_800_000 ms (7 days); honest basis — arbitrary
   placeholder, spec section 8.1 escalation #1 UNRESOLVED; `_DEFAULT` != runtime override column.
C: what runs — arm-last in `delete_account`, disarm in `cancel_account_deletion`,
   `account_deletion_reaper` one-shot + re-arm (`reaper_rearm_at_ms`, ADR-0228 D3a),
   `ensure_deletion_reapers_armed` republish sweep (ADR-0221 R2), cascade 6a-6b-6d-6c-6e one txn.
D: export bundles AS LANDED — `request_data_export`, `my_export_bundle` view; purged only on
   re-export and on cascade; **no independent TTL, PRV1-14 reaper deferred to S4b**; operator
   consequence: an un-re-exported bundle persists and lands in every subsequent backup.
E: `DATA_LIFECYCLE_MANIFEST` is the SSOT; classes spelled as the enum spells them
   (Erase / Anonymize / ViaJoin(parent) / NotOwned). NO per-class counts, NO table roster (drifts).
F: operator procedure, one small fenced block (restic snapshots / forget --dry-run).

Consumer-safety constraints: no `X=value` / `X: "value"` where X ends password|secret|api_key|token|
hash|private_key (checkNoQuotedCredential, case-insensitive, stack-config-checks.mjs:1030-1060);
C18 counts fenced blocks not headings and only needs >=1 live restic/borg line (all in sections 2-6);
appending `## 9.` only truncates section 8 after every G23 needle.

## G24 clauses (+ BAD fixture each, teeth total 11)
1a PIN_PSEUDONYMIZATION verbatim in squashed section body — BAD: `not erasure`->`complete erasure`
1b PIN_BACKUP_LIMIT verbatim (PRV1-18 core) — BAD: `makes no claim`->`makes no strong claim`
2  names DELETION_GRACE_MS_DEFAULT + ms value == parseGraceConst(deletion.rs) + whole-day figure —
   BAD (a) 604_800_001, (b) `7 days`->`30 days`
3  names account_deletion_reaper AND AccountDeletionReaperSchedule AND `one-shot` AND `re-arm` —
   BAD: delete the schedule-type mention before the appendix
4  names export_bundle AND my_export_bundle AND asserts `no independent TTL` AND `S4b` —
   BAD: delete only the deferred-TTL sentence, keeping both names
5  every roster symbol resolves to EXACTLY ONE declaration in its named file (comment-stripped) —
   BAD (a) missing source file -> FAIL-LOUD, (b) duplicated struct decl -> ambiguous
plus heading-absent (FAIL-LOUD), duplicate-heading, section-bounds, GOOD-passes.
Citation roster: DELETION_GRACE_MS_DEFAULT (deletion.rs:40), account_deletion_reaper (accounts.rs:923),
AccountDeletionReaperSchedule (accounts.rs:889), export_bundle (schema.rs:931),
DATA_LIFECYCLE_MANIFEST (schema.rs:997), my_export_bundle (privacy.rs:1542) — each 1 hit.
REJECTED clause: the erase/anonymize/join-only class roster (prose paraphrase, already gated
bidirectionally by ADR-0229). Residual named: the class prose itself is ungated.

## Disposition
MEET PRV1-18 (gated by G24). MEET PRV1-17 (verified true, ungated — recorded in ADR-0230).
DEFER PRV1-20's mechanical enforcement (property verified true today).

## Hidden-dependency STOPs: NONE.

## Plan-review reconciliation (reviewer + red-team + simplify), 2026-09-02

VERIFIED by orchestrator (all 5 anchors unique after `stripRustComments`):
`pub fn account_deletion_reaper(` accounts.rs:923 | `pub struct AccountDeletionReaperSchedule`
accounts.rs:889 | `accessor = export_bundle)` schema.rs:931 | `pub const DATA_LIFECYCLE_MANIFEST`
schema.rs:997 | `accessor = my_export_bundle,` privacy.rs:1542. Each count == 1.

ACCEPTED changes to the plan:
- **RT#1 (HIGH):** citation roster anchors are DECLARATION-SHAPED, not bare identifiers. Measured: every
  bare identifier except DELETION_GRACE_MS_DEFAULT has 2-3 post-strip hits in its own file (attribute
  args, string literals, type positions), so a bare-name count would false-RED on day one and invite
  loosening `===1` to `>=1`. Reuse the RED-TEAMED `requireSoleDefinition` exported from
  `evals/deletion-grace-wasm-ssot.eval.mjs:90` (returns -1 on zero, THROWS on >1) rather than rolling one.
- **RT#4 (MED-HIGH):** one BAD fixture per ANDed TERM, not per clause. Clause 3 -> 4 fixtures, clause 4
  -> 4, clause 2 -> 3. Teeth total rises from 11 to ~16 badDocs + extras; `bit`/`total` derived at run.
- **RT#3:** keep HTML-comment stripping in `squashDocText` and add a tooth that hides a clause's pinned
  text inside `<!-- ... -->` and asserts REJECTION.
- **RT#2 + #8:** negation-blindness is structural to any substring gate (shipped G23 has it too). NOT
  closed; recorded explicitly in ADR-0230 as "G24 defends against accidental trimming/drift, not an
  adversarial same-token negating rewrite" — PRV1-18's "reworded" is honestly narrower than it reads.
- **RT#5:** `docs/adr/DIGEST.md` is regenerated by the gated `just adr-digest` -> declare it in
  `touches-delta:`.
- **Reviewer MINOR-1:** the verbatim residual-2 quote gets an explicit "spec-mandated language
  (verbatim)" lead-in and the real-spelling corrective sentence IMMEDIATELY adjacent, so no operator
  greps for the nonexistent `DELETION_GRACE_MS`.
- **Reviewer MINOR-2:** ADR-0230 records the PRV1-17/20 evidence as the full call chain with file:line
  (reaper -> resolve_all_live_interactions -> pvp::forfeit_on_disconnect :645-701 -> apply_pvp_forfeit /
  settle_pvp_battle :559-599, logging only `battle_id` + escaped internal error), not a paraphrase.
- **Reviewer:** ADR header must still carry `**Amends:** —` alongside `**Extends:**` (precedent
  0229:6-9). `adr-digest-check` success line is `adr-digest: DIGEST.md is up-to-date (no drift).`
- **Simplify#5:** DROP `DELETION_GRACE_MS_DEFAULT` from the citation roster (5 symbols, not 6) — clause
  2 already binds it through `parseGraceConst`, which is strictly stronger than a presence pin.
- **Simplify#3:** generalize the fixture helpers to `linesWithout(lines,pred)` /
  `linesMapBefore(lines,marker,fn)` and make G23's existing `runbookWithout` /
  `runbookMapBeforeAppendix` one-line delegates. G23 call sites UNCHANGED, behaviour byte-identical.
- **Simplify#4 (partial):** trim runbook para C — cite ADR-0228 for the cascade step order instead of
  reciting 6a-6b-6d-6c-6e. Keep the operator-facing names an incident responder must grep.

REJECTED, with reason:
- **Simplify#1 (drop `squashDocText`):** kept. It is ~4 lines (strip HTML comments, collapse
  whitespace), not the 40-80 estimated, and HTML-comment hiding is a MEASURED bypass class in this repo.
  Whitespace collapse also makes the exact-sentence pins survive a markdown re-wrap.
- **Simplify#2 (drop clause 1a / PIN_PSEUDONYMIZATION):** kept. Spec section 9 residual 1's language is
  required-exact for the ADR, not the runbook, so this is a deliberate ADDITION — but the single most
  misleading possible edit to this section is deleting "not erasure", and nothing else in the repo gates
  that sentence's presence where an operator will actually read it (ADR-0211:38 is prose).
- **Simplify#4 (full):** rejected for paras D/E. A DR runbook is read under incident pressure; the
  export-bundle backup exposure and the manifest SSOT name are operator-facing, not mechanism trivia.

Quote-style note: biome `quoteStyle: "single"` (biome.json:17). The pinned sentences contain
apostrophes, so they are authored as DOUBLE-quoted JS literals (fewer-escapes heuristic keeps them
double) and guarded by a phase-0 length pin + a no-backslash assertion.

## Artifact-review reconciliation (reviewer + red-team + simplify on the SHIPPED diff)

APPLIED:
- **reviewer MAJOR — fabricated ADR citation.** ADR-0230 cited `battle.rs:894`/`:936` as the
  cascade-reachable ADR-0185 write-back logs. Those are inside `swap_active`/`flee`, player-invoked
  reducers the cascade never reaches. The actually-reachable one is
  `battle::resolve_wild_battle_on_disconnect` (`battle.rs:1459-1510`), whose write-back failure line
  is `battle.rs:1495-1499` (`wild_disconnect_writeback_err`, carrying battle_id + a json_escaped
  internal error). Corrected, and the correction itself is recorded in the ADR so the wrong citation
  cannot silently reappear. NOTE: this is the SECOND fabricated-citation defect in this ADR from the
  same source (the planner's brief); the first batch was caught pre-review.
- **reviewer MINOR** — `apply_pvp_forfeit` is `pvp.rs:382-389`, not inside the cited 559-599 range
  (that is `settle_pvp_battle`, 559-602). Split into two citations.
- **reviewer MINOR** — `erase_character_rows` (`lib.rs:253-257`) is the reaper's 12th direct cascade
  call and was missing from the 11-helper log census. Added (it is log-free).
- **red-team MEDIUM — the aggregate teeth floor was satisfiable by a gutted suite.** MEASURED:
  deleting 17 of the 18 negative fixtures still reported 16/16 ALL-BIT, because the 13 EXTRA_CHECKS
  plus the 2 guards clear `total >= 16` on their own. Added a SECOND floor binding
  `G24_BAD_FIXTURES.length >= 18` in the phase-0 wiring.
- **red-team LOW/MED — fenced code blocks were not stripped.** MEASURED: removing every prose `S4b`
  from the real §9 and re-adding it inside a ```text fence kept G24 at 6/6. `squashDocText` now
  strips fenced blocks as well as HTML comments; bypass re-run and confirmed REJECTED.
- **red-team extra** — `squashDocText`'s comment strip is ~O(n^2) on pathological input (~6 s for
  100k unclosed openers). Not attacker-reachable (the only caller reads a committed file); a
  complexity caveat is now on the function.
- **red-team LOW #3** — clauses 3/4's polarity blindness now called out explicitly in ADR-0230
  ("they assert the section NAMES these things, not that it describes them correctly").
- **simplify #3/#4** (DELETION_FILE_* duplicating DELETION_SOURCE_*, and g24Teeth() hardcoding the
  heading phrase instead of DELETION_SECTION_HEADING_PHRASE) — routed to the tester with the new
  teeth, since both live in tester-authored code.

REJECTED:
- **simplify #5 (cut ADR-0230's verbatim-quotes section)** — the lens did not have the spec. M22 §9
  requires that exact language "to be used verbatim in the ADR"; the section is compliance, not
  duplication.
- **simplify #1/#2** (drop `clause4-export-bundle-pair` and the three fixture-self-check teeth) —
  the lens itself rated these take-it-or-leave-it and noted they buy a more specific failure
  message. ~34 lines is not worth re-opening a tester-authored gating suite for.

RED-TEAM ATTACKS THAT FAILED (no bypass found, measured): clause hollowing across all 6 clauses and
their sub-terms (NO shadowing pair — every disabled term was caught by its own fixture with the
correct `firstMiss`); the `=== -1` inversion mutant (also reds the real doc, so it cannot ship);
clause reordering (fixtures are properly orthogonal); prototype pollution via a real
`Object.prototype` write against the shipped code; 8 non-string/null/array `sources` variants;
citation forgery per marker (string-literal twin, `///` and `/** */` doc comments, `#[cfg(test)]`
twins for `DATA_LIFECYCLE_MANIFEST` and `my_export_bundle`, and a bogus 6th roster entry — all
caught); `groupThousands` across 1/2/4/5/9-digit inputs and the day-divisibility guard; the
duplicate `## 9b.` heading on the real doc; HTML-comment hiding; and both whole-doc runbook
consumers against the real file.
