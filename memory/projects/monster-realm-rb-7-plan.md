# rb-7 — PLAN ADJUDICATION (residual R-m22-s1-X2)

Slice: rb-7 · branch `slice/rb-7` · fork `origin/master` @ 07a1c0c · ADR-0211 (supervisor-assigned)
Worktree: `projects/monster-realm/.claude/worktrees/rb-7`

## Criterion
M22 §3 requires `player.name` and `profile.name` to be overwritten with a tombstone on account
deletion. §7.2's S1 row lists six symbols and omits a name tombstone, so S1 shipped none. The only
existing constant is `server-module/src/ranking.rs:161 pub(crate) const PROFILE_TOMBSTONE_NAME =
"(claimed guest)"`, the M21 GUEST-CLAIM sentinel whose `tombstoned_profile()` also zeroes
rating/wins/losses. Reusing it for a genuinely deleted account makes the row read as an unclaimed
guest. Single-source the deletion tombstone name so S3 cannot silently reuse it. Proof-of-teeth
required (ADR-0010): the criterion's own gate must RED before the fix and pass after.

## Baseline measured in the worktree before any edit (fork 07a1c0c)
`just ci` exit 0 · `node evals/run.mjs` 95/95 PASS 0 FAIL · `cargo nextest run --workspace` 2007
passed 0 skipped · client vitest 96 files / 2818 tests · `validate.mjs` 8/8.

## Decisions

**D1 — the constant lives in `game-core/src/accounts/deletion.rs` AND is re-exported flat.**
Reviewer verdict: `deletion.rs` already owns an M22 tombstone-sentinel family
(`TOMBSTONE_IDENTITY_BYTES`, `TOMBSTONE_AUTH_ISSUER`) of exactly this shape — game-core owns the
sentinel VALUE, server-module keeps the charset/length RULE. Not a new abstraction.
The flat re-export was initially deferred as out-of-touches (Option A). Both the planner and the
reviewer independently judged that harmful: `game-core/tests/m22_s1_deletion_surface.rs:1-17` exists
precisely to guarantee `use game_core::TOMBSTONE_*;` for "S2/S3/S4 ... at their own call sites", so
making the deletion name the single deep-path outlier is how an S3 author ends up reaching for the
flat, familiar guest-claim constant — the exact failure this slice exists to prevent. Taken as a
DECLARED touches-delta (one symbol appended to two pre-existing `pub use` lists), measured
gate-neutral, flagged for supervisor audit. `m22_s1_deletion_surface.rs` is NOT edited: the
cross-crate flat path is proven instead by clause B2, which resolves
`game_core::TOMBSTONE_DISPLAY_NAME` from `server-module`.

**D2 — the VALUE is unpinned by spec, so the tests assert properties, never the literal.**
M22 §3:106,108 says "the tombstone constant"/"tombstone" with no literal. §8.2:558-563 decided the
tombstone SHAPE (one shared sentinel, not per-account) and explicitly did NOT escalate it; the value
is absent from all five §8 operator escalations. ADR-0031 does not exist yet. The doc comment must
not imply the spec chose the string. Value shipped: `"(deleted account)"`.

**D3 — `PROFILE_TOMBSTONE_NAME` becomes module-private.** Compiler-enforced unreachability beats a
convention or a text ban (illegal states unrepresentable). MEASURED in the worktree:
`cargo check -p monster-realm-module --all-targets` is clean with the const narrowed to `const`.
Full reference enumeration (grep + CodeGraph + cbm, all three agree): `ranking.rs:161` (decl),
`ranking.rs:185` (`tombstoned_profile`), `ranking_tests.rs:1475,1499,1550,1551,1555` via `super::`
(a descendant module — private items resolve), `evals/ranking-security.eval.mjs:335` (comment prose
inside a scope note, not a needle), `docs/adr/0179-...:307` (prose). No eval pins a visibility shape
on it; no `dead_code`/clippy consequence (`:185` keeps it live; `unreachable_pub` is
allow-by-default, `redundant_pub_crate` is nursery, and `just lint` runs default clippy `-D warnings`).

**D4 — no `accounts.rs` literal scan.** `stripped_for_scan` (`ranking_tests.rs:238`) runs
`strip_rust_strings` FIRST, so `"(claimed guest)"` can never be seen by a needle — the clause would
be VACUOUS. The identifier half is redundant with the compiler and would false-RED an S3 author who
writes a warning comment. Handed to S3/S6 as a POSITIVE obligation in ADR-0211's Residuals.

**D5 — §9.1 mandated language.** M22 §9.1:581-585 requires verbatim: *"Direct name/display fields
are severed on deletion. The `Identity` key and its associated timestamps/behavioral history are not
purged from multi-user or historical rows; this is a documented, accepted pseudonymization
limitation, not erasure."* ADR-0211 carries it and never calls the name write "erasure".

## Change set (production)
1. `game-core/src/accounts/deletion.rs` — new `pub const TOMBSTONE_DISPLAY_NAME: &str =
   "(deleted account)";` in its own section beside `TOMBSTONE_AUTH_ISSUER` (:80-86), with a doc
   comment recording D2 and the ownership boundary (game-core owns the value, server-module owns the
   rule) and naming the guest-claim collision it exists to prevent.
2. `game-core/src/accounts/mod.rs:12-15`, `game-core/src/lib.rs:33-36` — append the symbol.
3. `server-module/src/ranking.rs:157-161` — `pub(crate) const` -> `const`, doc comment rescoped.

## Tests (tester-authored, RED before the fix)
- A1 `deletion_tests.rs` — INTRINSIC properties only, matching the `TOMBSTONE_AUTH_ISSUER` idiom
  (`deletion_tests.rs:309-346`): non-blank, not whitespace-only, trim-stable. The charset predicate
  was CUT (reviewer N1: it hand-copies `guards.rs:96`'s rule into the crate that must not own it).
- A2 `deletion_tests.rs` — distinct from the live same-crate `TOMBSTONE_AUTH_ISSUER`. The
  hand-typed `"(claimed guest)"` literal was CUT (reviewer M2: an un-synced second copy of a
  server-module-private string is the very SSOT hazard this slice exists to remove; B2 subsumes it).
- B1 `ranking_tests.rs` — the EXECUTABLE twin, mirroring `:1545-1559`: `!trim().is_empty()`,
  `chars().count() <= crate::MAX_NAME_LEN`, `crate::guards::validate_name(..).is_err()`. All three
  together are load-bearing — `is_err()` alone is satisfied by `""` and by a 30-char alphanumeric.
- B2 `ranking_tests.rs` — `assert_ne!` between the two LIVE symbols, using the FLAT cross-crate path
  `game_core::TOMBSTONE_DISPLAY_NAME` (so it doubles as the m22_s1-style flat-reachability pin).
- B3 `ranking_tests.rs` — visibility pin over `stripped_for_scan(RANKING_RS)`, POSITIVE form.
- B5 `ranking_tests.rs` — machinery teeth for B3.
(B4 from the draft CUT — see D4.)

## Boy Scout
Reviewer swept `deletion.rs`, `deletion_tests.rs`, `ranking.rs`, `ranking_tests.rs`: nothing worth
doing — recently authored, consistently commented, no stale comments or dead code. Empty section is
the honest outcome.

## Lens record
- planner (144k tok): corrected the draft on 7 counts; found B4 vacuous; supplied the D2 spec
  adjudication and the D5 mandated-language requirement.
- reviewer + /simplify (92k tok): BLOCKER none. MAJOR M1 (flat re-export) accepted -> D1 flipped to
  Option B; MAJOR M2 and MINOR N1 accepted -> two clauses cut from the game-core tests.
- red-team: see the RED-TEAM section appended below.

## RED-TEAM adjudication (measured; the lens ported the whole stripper pipeline to JS and ran it)

The lens found that **B3 as planned pinned only the DECLARATION shape and was blind to every
reachability leak.** Four measured bypasses, all keeping the const `const` (private) and all
leaving B3 GREEN, while genuinely restoring cross-module reach to the guest-claim tombstone:

| # | Bypass | Why B3 missed it |
|---|---|---|
| 1 | `pub(crate) use self::PROFILE_TOMBSTONE_NAME;` elsewhere in `ranking.rs` | a `use` item never produces the `constPROFILE_TOMBSTONE_NAME` needle |
| 2 | `pub(crate) fn guest_claim_tombstone() -> &'static str { PROFILE_TOMBSTONE_NAME }` | same; and it reads as a legitimate helper, so human review misses it too |
| 3 | a second `pub(crate) const GUEST_TOMBSTONE_NAME: &str = "(claimed guest)";` | a different identifier defeats the needle; B2 compares only the two NAMED constants |
| 4 | `#[macro_export] macro_rules! …{ () => { "(claimed guest)" } }` | same value-level leak, no `const` token |

`server-module/src/lib.rs:39` declares `mod ranking;` (private), and Rust makes a private module
visible to its whole crate, so a `pub use` inside it IS reachable from `accounts.rs` — #1 and #2
are the literal S3 reuse path this slice exists to close.

**B3 was consequently rewritten from one clause into three, and the lens's "make it a review
checklist item" recommendation was upgraded to real teeth:**
- **B3a — declaration shape.** `constPROFILE_TOMBSTONE_NAME` occurs EXACTLY ONCE in
  `stripped_for_scan(RANKING_RS)` and the char immediately preceding it is neither `b` nor `)`.
  Every visibility form squashes to one of those two (`pubconst` / `pub(crate)const` /
  `pub(super)const` / `pub(in crate::ranking)const`), and nothing else can. This also fixes the
  lens's finding #7: the earlier "preceding char must be `}` or `;`" spelling FALSE-RED a
  perfectly compliant `#[allow(dead_code)]`-annotated private const (attributes squash to `]`).
- **B3b — identifier-leak pin.** The identifier `PROFILE_TOMBSTONE_NAME` occurs EXACTLY TWICE in
  the stripped view (the declaration + its single use in `tombstoned_profile`). Kills #1 and #2:
  either adds a third occurrence.
- **B3c — value-leak pin, over the RAW (unstripped) file.** The guest-claim VALUE occurs exactly
  once in `RANKING_RS` verbatim. Kills #3 and #4, which carry the value under a new identifier or
  no identifier at all. This clause is deliberately RAW: the lens's finding #14 is that
  `stripped_for_scan` blanks string CONTENT, so a stripped scan for a string VALUE is structurally
  vacuous — a raw one is not. That distinction is the sharpened residual note handed to S3/S6.

**Two more property gaps closed (measured against the pre-fix clause set):**
- #12 — `"(Claimed guest)"` (capitalisation) and `"(claimed  guest)"` (double space) pass every
  planned clause including `assert_ne!`, yet reproduce exactly the human-legibility confusion the
  criterion names. B2 gains a case-folded, whitespace-squashed inequality.
- #13 — `"\u{200B}deleted"` / `"\u{202E}(deleted account)"` pass "un-typable" (control and format
  chars are not alphanumeric) while rendering blank or right-to-left on a leaderboard. A1 gains a
  printable-ASCII-only assertion. (Intrinsic, so it does not reintroduce the charset-rule copy the
  reviewer cut in N1.)

**Finding #8 — char-literal quote desync — accepted as a real fragility, already gated elsewhere.**
`strip_rust_strings` has no char-literal lexer, so a single `'"'` anywhere earlier in `ranking.rs`
inverts string/code polarity and collapses the whole needle battery to an undifferentiated
"0 occurrences". It fails CLOSED (loud RED), never open — the lens tried and could not construct a
false PASS. And the repo already gates the input: `evals/zone-warp-server-runtime.eval.mjs`'s
`W-pre` check REDs CI when ANY non-`_tests.rs` server-module source carries a char-literal
double-quote, naming the file. B5 carries a fixture recording the interaction so the next
maintainer reads "the scan desynced", not "the symbol was removed".

**Finding #15 — independently reached the reviewer's M1** (flat re-export). Two lenses, same
verdict; D1 flipped to Option B. See D1.
