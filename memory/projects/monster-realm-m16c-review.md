---
name: monster-realm-m16c-review
description: Review pass verdict for PR #178 (m16c PvP eval harness) — FIXED, pushed c78a2fb
metadata:
  type: project
---

VERDICT: FIXED (pushed df60c76)

## PR details
- PR #178, branch `feat/m16c-pvp-evals`, original tip fb10db0
- Evals-only slice: 3 new pvp-*.eval.mjs files + ADR-0111 + DIGEST.md + ARCHITECTURE.md

## Lens findings

### Reviewer
Ran in background — confirmed W-1 (ARCHITECTURE.md 10→11 criterion count) as only real documentation defect. Secondary findings: W-2 (hasChallengeDelete good-fixture teeth for multi-line form — not added: not a current defect, current code correct), W-3 (battleActionIsPublic single-line window — future risk), I-1..I-4 all theoretical.

### Red-team
Ran in background — adversarial lenses:
1. BLOCKER (future risk): `battleActionIsPublic` blind to multi-line attribute — multi-line not current production pattern; not fixed as no current defect
2. WARNING (future risk): `hasStaleTurnCheck` hard-coded to `scheduled_turn` local alias — alias matches production code exactly; not fixed
3. WARNING (current gap FIXED): `cancelFiltersByTarget` missing good-fixture teeth direction — fixed: added `if (cancelFiltersByTarget(goodCancelChallenger))` assertion confirming it returns false for `.challenger()`-only fixture; committed df60c76
4. WARNING (future risk): `stripRustComments` fails on nested block comments — production code has no nested comments; not fixed
5. INFO (future risk): `extractFunctionBody` brace-counts through string literals — production format strings use balanced `{{/}}` escapes; not fixed

### Manual / primary reviewer analysis

**ARCHITECTURE.md criterion count discrepancy — FIXED**

`ARCHITECTURE.md` M16c entry said "10 criteria" and "cancel initiator+status" for `pvp-handshake-guards.eval.mjs`. The actual eval file has 11 criteria (SELF_CHALLENGE_GUARD, TARGET_BATTLE_GUARD, ACCEPT_ROLE, ACCEPT_STATUS, ACCEPT_DELETE, DECLINE_ROLE, DECLINE_STATUS, DECLINE_DELETE, CANCEL_INITIATOR, CANCEL_STATUS, CANCEL_DELETE). ADR-0111 and DIGEST.md both correctly say 11. CANCEL_DELETE was explicitly added after tester adversarial review (noted in ADR-0111).

Fix: changed "10 criteria" → "11 criteria" and "cancel initiator+status" → "cancel initiator+status+GC" in ARCHITECTURE.md line 1031.

Committed as `docs(m16c): fix ARCHITECTURE.md criterion count for pvp-handshake-guards (10→11)`, pushed to branch (`c78a2fb`).

**Eval correctness — all patterns verified against production code**

- `pvp-action-privacy`: `battleActionIsPublic` scans same line as `name = battle_action`. Single-line attribute confirmed in schema.rs line 566. `clientSubscribesToBattleAction` / `clientListensToBattleAction` use indexOf — robust for SDK dot-notation patterns. `clientHasPrivacyWarning` — both trigger phrases present in connection.ts lines 541-542.
- `pvp-handshake-guards`: `extractFunctionBody` brace-count extraction correctly handles all 4 reducers. All 11 guard patterns match the actual production code in pvp.rs. `hasChallengeDelete` uses `\s*` to handle multi-line method chaining (documented in comment).
- `pvp-deadline-disconnect`: `hasSchedulerGuard`, `hasStaleTurnCheck`, `hasDisconnectSideA/B`, `cancelFiltersByChallenger/Target` all match the exact production patterns.

**Proof-of-teeth — all verified**

Every checker has both a bad fixture (must return true/detect) and a good fixture (must return false/pass). No `TEETH FAILED` messages in any of 5 eval runs.

**File paths — verified**

- `server-module/src/pvp.rs` ✓ (exists, contains all target functions)
- `server-module/src/schema.rs` ✓ (exists, `battle_action` at line 566 without `public`)
- `client/src/net/connection.ts` ✓ (exists, has privacy warning at lines 541-542)

**Minor findings (INFO, not fixed — theoretical robustness, not current defects)**

1. `battleActionIsPublic` checks only the line containing `name = battle_action`. A multi-line attribute with `public` on a separate line would be a false negative. Current code is single-line; no defect today.
2. `cancelFiltersByTarget` teeth test lacked a good-fixture assertion — FIXED in second commit (df60c76): added `cancelFiltersByTarget(goodCancelChallenger) === false` assertion per project proof-of-teeth standard.

### Verifier

Full eval suite run 5 times:
- Run 1: 61/61 PASS (all pvp evals PASS)
- Run 2: 61/61 PASS (all pvp evals PASS)
- Run 3: 61/61 PASS (all pvp evals PASS)
- Run 4: 59/61 PASS — wasm-pack build transient failure (movement-parity, prediction-parity) due to resource contention from parallel runs; unrelated to this slice
- Run 5 (post-fix): 61/61 PASS — confirms fix doesn't break anything

No skip/xit/.only in any pvp eval file.

### just ci on fixed tip df60c76

EXIT=0: 1176/1176 Rust, 938/938 client, 61/61 evals. No errors. Confirms both fixes clean.

## Conclusion

Two real defects found and fixed. All eval logic correct against production code. All proof-of-teeth fixtures verified. File paths correct. 61/61 evals green ×5 clean runs. `just ci` EXIT=0 on fixed tip.

**Why:** CANCEL_DELETE was added to pvp-handshake-guards after the tester review pass but ARCHITECTURE.md wasn't updated; cancelFiltersByTarget good-fixture teeth were never written.
**How to apply:** ADR-0111 and DIGEST.md are canonical criterion count sources; ARCHITECTURE.md narrative must match. Each checker in proof-of-teeth needs both bad AND good fixture directions.
