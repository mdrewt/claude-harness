# 20r-c plan — rate-limit `quest_defs_load_error` (npc.rs) — REVISED after reviewer + red-team

Branch `feat/20r-c-quest-defs-load-error-limiter`, worktree `.claude/worktrees/20r-c`, base origin/master@acc8acf.
Touches: server-module/src/npc.rs, server-module/src/npc_tests.rs (+ ARCHITECTURE.md bracket-note, docs/knowledge regen).
No new ADR (none assigned; decision = ADR-0170 D4 + ADR-0173 D4). ADR-0173:293-301 follow-up is discharged here;
annotating ADR-0173's body is OUTSIDE this slice (reserved-number rule) → register as a residual + PR follow-up flag.
Cargo package for server-module/ is `monster-realm-module` (NOT `-p server-module`).

## Production change (npc.rs) — names use the house `_ERR_` idiom (ENCOUNTER_TABLE_ERR_LIMITER, LEAD_LEVEL_ERR_LIMITER)
After the existing `QUEST_DEF_MISSING_*` pair (line 36), add its OWN pair, fully-qualified type spelling, with doc
comments carrying the why (window on the injected clock ADR-0003; separate LIMITER per ADR-0170 D4 independence —
a dangling-row burst must not silence a registry-parse fault or vice-versa; separate WINDOW CONST because the two sites
differ in severity/cardinality/fault class, accounts.rs:93 already declares its own 60_000 rather than importing, and a
shared const would force the ERROR gate to spell `QUEST_DEF_MISSING_WINDOW_MS` — NOT "hides a mutant"; the doc comments
must NOT contain the literal `log::error!(` (raw-source census) nor a lowercase `quest_defs_load_error` inside the fn):
```rust
const QUEST_DEFS_LOAD_ERR_WINDOW_MS: i64 = 60_000;
static QUEST_DEFS_LOAD_ERR_LIMITER: crate::movement::RateLimiter =
    crate::movement::RateLimiter::new();
```
Err arm (post-rustfmt; args = 58 cols < fn_call_width 60 → inline args, NO trailing comma; the long format string
line is retained by rustfmt either inline or wrapped like the sibling — write it wrapped like npc.rs:191-193):
```rust
Err(e) => {
    let escaped = crate::guards::json_escape(&e);
    if let Some(suppressed) = QUEST_DEFS_LOAD_ERR_LIMITER
        .check(crate::marshal::now_ms(ctx), QUEST_DEFS_LOAD_ERR_WINDOW_MS)
    {
        log::error!(
            "{{\"evt\":\"quest_defs_load_error\",\"reason\":\"{escaped}\",\"suppressed\":{suppressed}}}"
        );
    }
    return;
}
```
Squashed (comment-stripped, whitespace-removed) arm interior — the FROZEN pin:
`letescaped=crate::guards::json_escape(&e);ifletSome(suppressed)=QUEST_DEFS_LOAD_ERR_LIMITER.check(crate::marshal::now_ms(ctx),QUEST_DEFS_LOAD_ERR_WINDOW_MS){log::error!("{{\"evt\":\"quest_defs_load_error\",\"reason\":\"{escaped}\",\"suppressed\":{suppressed}}}");}return;`
Constraints kept: 12r-d E3 all six layers (emission stays INLINE, no helper fn); brace-balanced, paren-free format string;
.log-baseline `npc.rs 2 3 1 0` unchanged (error=1 warn=3) — no regen.

## Tests (tester; `s20rc_` prefix; new section appended to npc_tests.rs) — 9 tests
New helpers: `s20rc_squashed_apply_quest_trigger()` (own brace-balance canary), `s20rc_load_error_arm()` (anchor
`cached_quest_defs(){Ok(q)=>q,Err(e)=>{` exactly once → brace-matched interior; panic names an Ok-binding rename as the
likely cause), `find_rate_limited_log(arm, level)` generalisation with `find_rate_limited_warn` becoming a one-line
delegator `find_rate_limited_log(a, "warn")` (T4 call sites untouched; body otherwise byte-equivalent).
Reused untouched: NPC_SOURCE, strip_npc_comments, extract_npc_fn_body, squash_ws, matching_*_end, split_top_level_commas,
d12r_* helpers, D12R_DQUOTE. Needles via `.concat()` parts; no bare `"` char literal; no verbatim contiguous copies.

a. behavioral on the REAL static + REAL const, order-independent (reviewer SF-11): reset with `check(i64::MIN, W)`
   (clock-backwards always emits; assert is_some), then check(1_000,W)==Some(0); check(1_000,W)==None  ← the EARS proof;
   check(1_000+W-1,W)==None; check(1_000+W,W)==Some(2) (boundary inclusive, count reported); plus
   assert_eq!(QUEST_DEFS_LOAD_ERR_WINDOW_MS, 60_000) (M8). Doc: SOLE owner of the static in the test binary.
   COMPILE-RED at HEAD (E0425 ×2).
b. gate is ONE contiguous `ifletSome(suppressed)=X.check(..){log::error!(` expression, exactly once in the arm. Kills `let _ = check`.
c. limiter ident == `QUEST_DEFS_LOAD_ERR_LIMITER` (own, not the sibling). (No pin on the sibling's name — T4 owns that.)
d. exactly 2 check args; parts[0] == `crate::marshal::now_ms(ctx)` by EQUALITY (M1 — no bare `now_ms(ctx)` alternative).
e. parts[1] == `QUEST_DEFS_LOAD_ERR_WINDOW_MS`; file-scope value pin `constQUEST_DEFS_LOAD_ERR_WINDOW_MS:i64=60_000;` (or 60000)
   count==1; ident `QUEST_DEFS_LOAD_ERR_WINDOW_MS` count==2 in squashed stripped file (M3 — kills cfg twins / fn-local const).
f. site located by match_indices(evt) exactly once in the fn body; THAT site's format string contains contiguous
   `quest_defs_load_error","reason":"{escaped}","suppressed":{suppressed}` (quotes via d12r_escaped_quote()).
g. arm: `log::` ==1, `log::error!(` ==1, zero warn!/info!/debug!/trace!. GREEN at HEAD (non-regression fence; the
   debug/trace ban is the half .log-baseline does not cover — say so in its doc).
h. FROZEN ARM EQUALITY (M6): `s20rc_load_error_arm()` == the squashed interior above, assembled from ≥6 `.concat()` parts;
   message also says the tail must be `}return;` (swallow-and-return) so a diverging exit / early return / extra statement
   is named in the failure.
i. file-scope censuses on squashed stripped NPC_SOURCE: `staticQUEST_DEFS_LOAD_ERR_LIMITER` ==1; exact decl
   `staticQUEST_DEFS_LOAD_ERR_LIMITER:crate::movement::RateLimiter=crate::movement::RateLimiter::new();` present (fully-
   qualified MANDATED, M9); ident `QUEST_DEFS_LOAD_ERR_LIMITER` ==2 (M2 — the (a)→production bridge: decl + receiver, so no
   `use … as`/const/let shadow can exist); `QUEST_DEFS_LOAD_ERR_LIMITER.check(` ==1; `fnapply_quest_trigger(` ==1 (M5 —
   kills #[cfg(any())] pub twin + raw-string decoy); no `pubstatic…`/`pub(crate)static…` prefix (M7); and on the RAW
   unstripped NPC_SOURCE `log::error!(` ==1 (M4 — blinding-immune emission census; doc: never spell `log::error!(` in an
   npc.rs comment; re-derive deliberately if a second error site is ever sanctioned).
RED proof in two stages ((a) is compile-coupled): stage 1 with (a) `#[cfg(any())]`-stripped → b,c,d,e,f,h,i assertion-RED,
g green; stage 2 with (a) → E0425. Orchestrator runs both + the bite proofs (tester cannot execute).

## Red-team mutant register (to re-run against the delivered tests; all must be CAUGHT except the clippy-owned one)
1 bare `now_ms` alias w/ atomic tick (d) · 2 fn-local `const` limiter (clippy declare_interior_mutable_const; also i census) ·
3 `use QUEST_DEF_MISSING_LIMITER as …` alias (i census==2) · 3b fn-local static shadow (i) · 4 cfg(test)/cfg(not(test)) const
twin (e counts) · 5 fn-local window const (e counts, h) · 6 second ungated emission in `talk` (i raw census) · 7 `/*` `*/`
string-literal blinding before the gate (i raw census, h) · 8 `#[cfg(any())] pub fn apply_quest_trigger(` decoy (i fnDef) ·
9 raw-string decoy (i fnDef + raw census) · 10 extra statement before the gate (h) · 11 pub(crate) static + foreign re-anchor (i) ·
12 `"suppressed":0` literal (f) · 13 `.is_some()` (b..h) · 14 swapped operands (d,e) · 15 per-stmt cfg gate (g,h) ·
16 `let _ =` / `_suppressed` / helper-fn / `continue` / `Err(err)` (b/h/anchor).
Not scan-closable (diff review): a logging helper called from `talk`; `.check(` on this static from another file.

## Anti-patterns
helper-fn extraction · reusing sibling static/const · `let _ = check` · accounts.rs `.is_some()` (drops count) · `_suppressed` ·
dropping/reordering `"suppressed"` · unbalanced braces or any parens in the format string · lowercase evt token elsewhere in fn ·
`log::error!(` in any npc.rs comment · #[rustfmt::skip] (flat ban, observability-log-wrapper eval) · hand-wrap · contiguous
verbatim needles or bare `"` in tests · editing T4/E3 helper bodies beyond the delegating generalisation · touching the
QuestComplete arm · changing talk's signature/doc/Result · editing ADR-0173 · diverging exit instead of `return;` · pub static.

## Boy scout (2 hunks, comment-only, line-count NEUTRAL — cross-file citations into npc_tests.rs:351-371 / 1117-1223 /
1142-1154 / 1205-1222 from evolution_tests, battle_tests, pvp_tests, content_tests, movement_tests, ADR-0166)
Retire two false present-tense "RED at HEAD" claims in npc_tests.rs section headers (T4 :758-760, E3 :1412-1414) → past
tense; the E3 rewrite must DROP its `npc.rs:164` line citation (this slice moves that line). Done by the orchestrator AFTER
the tester delivers (single writer per file). Do NOT touch the 14+ stale `npc.rs:NNN` prose citations.

## Docs
ARCHITECTURE.md: append a `[20r-c: …]` bracket-note to the END of the 11r-i paragraph (line 1945, single physical line →
zero inserted lines), scoped to the LIMITER item only; say 11r-j's other two items remain uncreated.
docs/knowledge: `just knowledge` moves `resource:` anchors for talk/advance_dialogue/dismiss_dialogue — regen + commit.
CHANGELOG: git-cliff. ADR: none. Residual: ADR-0173 body annotation (supervisor-owned).

## Ledger
B1 CHECK: PATH=$HOME/.cargo/bin:$PATH cargo nextest run -p monster-realm-module -E 'test(s20rc_)' 2>&1 | tail -3
   EXPECT: /\b9 tests run: 9 passed\b/   (literal numeral = tester's delivered count)
X1 (hand-added production oracle, independent of the test file — count-based CHECKs are forgeable by test stubbing):
   CHECK: PATH=... node /home/mdrewt/projects/ai-apps/claude-harness/memory/projects/gates/20r-c.oracle.cjs
   EXPECT: 20rc-X1:ORACLE-PASS  — proven ORACLE-FAIL at HEAD before implementation.

## Risks
static single-ownership is a test-authoring convention (cargo test shares a process; nextest isolates) · real Err path
undrivable in-process (honest limit) · brace canary necessary-not-sufficient · raw `log::error!(` census is comment-sensitive ·
`.check(` args at 58/60 cols — a longer rename tips rustfmt vertical (trailing comma → re-derive pins, never loosen) ·
ADR-0173 stays un-annotated until the supervisor amends it.
