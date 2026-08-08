# M21a — adjudicated build plan (accounts/auth structural spine)

Branch `feat/m21a-accounts-auth-spine`, worktree `.claude/worktrees/M21a`, base `8defbd0`.
HARD tier. SERIAL, no sibling. Full planner plan draft: `monster-realm-M21a-plan-draft.md`.
This memo records the ADJUDICATED decisions (planner + reviewer + red-team + /simplify + two
live probes). Where this memo and the draft differ, THIS memo wins.

## Empirical probes run (both resolved — no open blockers)
- **P1 (has_jwt):** `ctx.sender_auth().has_jwt()` is **true for EVERY connection** — the host mints
  its own JWT (`iss=localhost`, `aud=["spacetimedb"]`) even for a tokenless first connect, and
  authToken.ts replays it. So the spec's AUTH-2/3 "Err → disconnect on unrecognized issuer" would
  disconnect every player. Fix = D1″ below.
- **P2 (txn rollback):** a reducer that inserts a row then returns `Err` leaves NO row (confirmed via
  `spacetime sql`). So AUTH-16's "reject with Err AND delete the row as the only side effect" is
  structurally impossible — a reducer Err rolls back all its own writes. Fix = AUTH-16 amendment below.

## Adjudicated design decisions

### D1″ — asymmetric issuer/audience handling (supersedes the draft's D1′; closes red-team CRITICAL-2)
`provision_or_touch_account`:
1. `has_jwt()==false` → `Ok(())` (belt; unreachable in practice).
2. **issuer NOT in `ALLOWED_ISSUERS`** → `Ok(())`, no account row, RATE-LIMITED log (fail-SAFE:
   this is the host's own anonymous-token path — `iss=localhost` — plus any unknown issuer; must
   NEVER disconnect). *(AUTH-2 amended: "SHALL return Ok without provisioning, leaving the
   connection anonymous".)*
3. **issuer allowed but audience NOT in `ALLOWED_AUDIENCE`** → `Err("unrecognized audience")` →
   disconnect. *(AUTH-3 UNCHANGED from spec — Err/disconnect.)* Only reachable by a token whose
   issuer we explicitly allowlisted = a same-issuer cross-app confused-deputy token; a legitimate
   player never hits it. **Invariant that keeps this outage-safe: never put the host's anonymous
   issuer in `ALLOWED_ISSUERS` (it is not an account provider).** With the `.invalid` placeholder
   this branch is unreachable in M21a; it becomes live only post-OQ1 with a real issuer.
4. both allowed → insert `Active` account, or update ONLY `last_login_at_ms`.
Rationale: preserves audience-as-an-authz-control (red-team CRITICAL-2) at zero new config and zero
outage risk, and keeps AUTH-3 satisfiable exactly as the spec wrote it. Add ZERO new config knobs.

### D4′ — `is_account_holder(ctx, id)` is the account-row predicate; `has_jwt()` is only on_connect's belt
`start_guest_claim` AUTH-7 gate = `is_account_holder`, NOT `has_jwt()`. (Draft §0.2. Documentation
fix per /simplify #5: it has ONE real call site — start_guest_claim — the other reducers bind the
row via `.find()` because they need its fields.)

### AUTH-16 / AUTH-26 amendment (closes red-team CRITICAL-1, P2-confirmed)
- **AUTH-16 (amended):** "WHEN complete_guest_claim receives a code whose `expires_at_ms` has elapsed
  THE SYSTEM SHALL reject with `code expired` and modify no row. The expired `guest_claim` row is
  reaped by `guest_claim_reaper` (a separate transaction)." — the expiry branch performs NO
  delete/disarm (it would roll back). Reaper owns expired-claim cleanup.
- **AUTH-26 (simplified):** "WHEN complete_guest_claim returns Err THE SYSTEM SHALL leave the
  guest_claim row intact and unconsumed." (Drop the "for any reason other than expiry" carve-out —
  now uniformly true and simpler/stronger.) The ENTIRE reject region (guards 1–11 incl. expiry) has
  zero `ctx.db.` writes. Keep the distinct "code expired" UX message (spec intent; oracle is
  low-value per D3 real-entropy).

### Confirmed decisions carried from the draft (reviewer/red-team/simplify all ACCEPT)
- **C1** colocate `GuestClaimReaperSchedule` + `guest_claim_reaper` in `accounts.rs` (not schema.rs/
  lib.rs) — the `scheduled(` word-char scanners would extract `crate` from a path form. `account`/
  `AccountStatus`/`GuestClaim`/`my_account` view stay in schema.rs.
- **C2** ship reject string `"already has game data"` (AUTH-20 EARS is the contract; D5's prose is M21b UX).
- **C3** split `delete_claim` (row only, used by reaper) vs `consume_claim_and_disarm` (row+disarm,
  used by success/replace paths). Reaper does NOT self-disarm (runtime auto-deletes fired one-shot rows).
- **C4** recipe is `just gen` (not `just gen-bindings`).
- `.invalid` placeholder `ALLOWED_ISSUERS` (fail-closed until OQ1). `ALLOWED_AUDIENCE=["monster-realm"]`.
- start_guest_claim "not joined" reject when no `player` row (spec gap; matches 8 repo precedents).
- Malformed-JWT panic posture accepted (no PII in vendor panic messages; aborts txn → no row).
- All rekey PK shapes / update-in-place-vs-delete+insert per draft §5 (reviewer verified every PK).
- monster/monster_pub dual-write via `pub_from_monster(&m, existing_pub.tier)` (2-arg), fail-loud on
  missing pub row (the only fallible rekey). Never literal-0 tier, never `MonsterPub{` literal.
- wallet: credit-forward via `grant_currency` + zero-in-place, NEVER delete. profile: copy-forward
  via `get_or_init_profile` (reuse — insert-count-1 pin) + zero-on-guest + `PROFILE_TOMBSTONE_NAME`,
  NEVER delete, NOT a reducer.
- ranking_tests update-count pin: RE-SCOPE per-function (not a 2→4 bump), reuse existing
  `extract_squashed_fn_body`. apply_pvp_rating=2, get_or_init_profile=0, rekey_profile=2, whole-file backstop=4.

### Adopted review changes
- **HIGH (reviewer): rate-limit the unrecognized-issuer log** via `crate::movement::RateLimiter`
  static (precedent: npc.rs:35, battle.rs:288). The audience-disconnect log stays a plain
  `log_reject` (rare, attack-signal).
- **/simplify #2: guard-order tests use a PARTITION check** (max index of caller-state needles <
  min index of code-resolution needles) + presence, NOT a full index chain. DROP the AUTH-7 ordering
  pin (no code-resolution oracle in start_guest_claim). KEEP AUTH-10 ordering (GuestClaim PK is
  guest_identity → insert-before-delete is a real PK collision) and AUTH-34 "consume before Ok".
- **/simplify #7: CUT the "G6 manifest const in M21a" instruction.** M21a ships no G6 eval and no
  manifest const. Write the CODE so G6 passes when M21c authors it (new-table Identity columns:
  `account.identity`/`account.claimed_from` EXEMPT; `guest_claim.guest_identity` /
  `guest_claim_reaper_schedule.guest_identity` BLOCKED — consumed+deleted by consume_claim_and_disarm).
  Note these for the M21c author in the PR body.
- **/simplify: merge `needs_deletion_write`/`needs_cancel_write`?** OPTIONAL — keep both (cheap,
  1:1 with AUTH-28/38 executed idempotency). `claim_expires_at` MAY inline into `claim_row`.
- **MEDIUM (red-team): AUTH-36/G12 is rename-evadable** (identifier-absence scan). M21a code uses
  named `&'static str` consts for reject reasons; flag for M21c that G12 should whitelist by VALUE.
- **LOW: `arm_claim_reaper` use `saturating_mul`** for ms→µs (consistency).

## touches (final)
Declared: schema.rs, accounts.rs(new), accounts_tests.rs(new), lib.rs, monster_mgmt.rs, inventory.rs,
npc.rs, raising.rs, economy.rs, ranking.rs · sibling _tests.rs (npc/raising/economy/ranking) ·
client/src/module_bindings/** · spec file.
**touches-delta (mechanical, schema-forced, precedented — EG5 did the same):**
`evals/baselines/table-schemas.json`, `evals/baselines/spacetime-types.json` (schema-snapshot
baselines), `docs/knowledge/**` (regen), `docs/adr/0179-*.md` (correction notes), `ARCHITECTURE.md`.
**Skip (stay minimal/in-scope):** scripts/okf-export.mjs PRIVATE_ADRS (optional, non-failing);
pvp_tests.rs G9 + evolution_tests.rs scheduled-scan (GREEN today, deferred to M21c — flag in PR).
CHANGELOG.md NOT hand-edited (git cliff).

## Package name: `monster-realm-module` (NOT server-module). Gate: `just ci-fast monster-realm-module`.
## Toolchain PATH (memory): `export PATH="$HOME/.asdf/shims:$HOME/.cargo/bin:$HOME/.local/bin:$PATH"`

## Ordered steps
T1 schema → T2 six rekey_+six exists helpers (per owning module) → T2b ranking_tests re-scope →
T3 accounts.rs pure core → T4 accounts_tests pure half (tester) → T5 accounts.rs shell+reducers+reaper
→ T6 lib.rs wiring + `just build` (wasm proves scheduled()/view) → T7 source-scan tests + sibling
_tests additions → T8 baselines → T9 `just gen` bindings → T10 `just knowledge` (AFTER code commit) →
T11 spec ticks+AUTH-16/26/AUTH-2 amendments → T12 single full `just ci` → T13 migration rehearsal →
T14 graph refresh (main checkout, post-merge).
Test-first: tester writes gating tests RED (T4, T7), specialist/orchestrator implements green,
verifier gates. Implementer never edits gating tests.
