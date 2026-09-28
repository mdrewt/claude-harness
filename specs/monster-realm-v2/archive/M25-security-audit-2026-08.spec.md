<!-- CEREMONY COMPLETE 2026-08-24 — mr-feedback-doctrine.md §6 heavy ceremony
     (investigation -> 6-way ideation -> judge synthesis w/ attribution table -> adversarial review).
     This file is no longer a design sketch. The pre-ceremony sketch is preserved VERBATIM in §11. -->

# Spec: M25 — Security audit & threat-model gate

**Status:** converged, implementation-ready (**CEREMONY COMPLETE**, 2026-08-24) · **Phase D — the final
pre-launch gate** · still governed by Phase D's `blocked:playtest-gate` framing; this ceremony delivers the
SPEC, not the implementation.
**Design authority:** ADR-0034 `security-audit-gate` (`specs/monster-realm-v2/adr/0034-security-audit-gate.md`,
accepted 2026-06-24) — **ELABORATED throughout, and AMENDED in exactly two clauses** (its "RLS enforcement is
*verified* at M25" consequence, and its "untrusted chat" context premise). **Both amendments are DRAFTED at
§8-1 and are a hard BLOCKER on slice S0; neither is yet written into the ADR file.**
**Mechanism authorities:** **ADR-0199** (`declared-table-visibility-gate` — the enumerative table-visibility
gate M25 must NOT rebuild; M25 amends the applicability of its D5, see §2.2) · **ADR-0198** / **ADR-0194**
(the private-table + participant/owner-scoped `#[view]` pattern) · **ADR-0197** (the 2.8.1 toolchain pin that
settles RLS) · **ADR-0203** (`nightly-red-response-policy` — the structural-gate-over-a-human-owned-doc
precedent every M25 gate is shaped on) · **ADR-0200** (nightly failure notification) · **ADR-0056**
(`require_owner`).
**Stack:** spacetimedb-game · **Project:** monster-realm ·
**Boundary:** ← **M22** extends the `REKEY_MANIFEST` totality shape, never duplicates it. ← **M24** inherits
§2.1's two-channel model; and M24's deferred `M-error-codes` slug **collides with §5.2's `err_literal` pins**
— the seam is named normatively in §2.6. → **launch** is gated on §2.7's sign-off.


## 1. Problem / intent

Per-system security is designed in and mechanically gated — 45+ reducer authz scans, 11 per-table privacy
evals, blocking gitleaks/`cargo audit`/Semgrep, the M22 rekey-completeness registry, and since 2026-08-17 the
ADR-0199 enumerative table-visibility gate. Nothing **audits the whole surface**, nothing **triages and tracks
findings**, and nothing **blocks launch on an open critical**. M25 closes that.

But the sketch's headline job — "RLS-leak verification on the pinned version" — is a **dead premise**, and the
ceremony's investigation found the replacement job is *also* already half-done. What is genuinely unproven is
narrower, sharper, and was invisible to every framing the sketch offered. §1.1 records it.

### 1.1 Ceremony corrections to the sketch's own premises

Six corrections, each verified against the live tree at `master` `12af096`. They are recorded because the
sketch, the threat model, and the operator's 2026-08-23 authorization note all predate them.

1. **`ADR-0199` already built the enumerative table-visibility gate — M25 must not rebuild it.** 38 tables,
   **18 public / 20 private**, `visibility` carried as a third projection over the existing single parse in
   `evals/battle-schema-snapshot.eval.mjs`, baseline `evals/baselines/table-schemas.json`, with
   `[visibility-shape]`, `[visibility-escalation]`, `[visibility-drift]` and a `T-VIS-ANCHORS` tooth that pins
   the 18/20 split, every table name in **both** sets, and set *equality* — the last of which exists
   specifically to defeat a **compensating double flip** (promote one private table, demote one public table,
   count stays 18/20) that was demonstrated to pass the whole gate during its own bootstrap window. The
   sketch's "enumerate every stakes-classified table" instruction is, mechanically, **already satisfied**.
2. **ADR-0199 states its own limit, and that limit is M25's opening.** Verbatim from its Consequences:
   *"This gate records the split; it does not bless it."* It then names two still-open residual disclosure
   channels left as plain `public` — `trade_offer` and `battle_challenge` (§2.4/§2.5) — and adds that
   *"a green `[visibility-shape]` on those two entries is not an approval, and because D5 requires no
   `visibility_note` on standing public tables, nothing in the baseline says so — hence this paragraph."*
   **The non-approval currently lives only in ADR prose, enforced by nothing.** Baseline check: **zero** of
   the 38 entries carry a `visibility_note`.
3. **THE CORRECTION THAT REFRAMES THE MILESTONE: the client-visible surface is exactly TWO channels, and the
   sketch only ever described one.** Of the **50 production reducers** across the 21 non-test files in
   `server-module/src/`, **48 return `Result<(), String>`**; the only two exceptions are the lifecycle hooks
   `init` and `on_disconnect` (`server-module/src/lib.rs:149,214`), which return `()` and therefore cannot
   carry an `Err` payload **at all** — they are a *subset* of channel-2 silence, not a counterexample to it.
   A SpacetimeDB reducer therefore *structurally cannot* return row data. So everything a hostile client can observe arrives through exactly:
   **(1) subscription** over public tables and `#[view]`s, and **(2) the `Err(String)` payload** of a rejected
   reducer call. ADR-0199 gates the *declaration* of channel 1. **Channel 2 is gated by nothing, and a
   read-side completeness audit — which is the entire audit the sketch and the threat model describe — is
   structurally blind to it.** This is M25's real subject. See §2.1.
4. **Exact-body pinning of the 5 scoped views already ships too.** `schema.rs:369-370,419-420,771` declare
   "THIS BODY is the entire security boundary and is pinned exactly"; `evals/monster-privacy.eval.mjs` carries
   `SANCTIONED_ATTR_BATTLE = 'accessor=my_battle,public'` plus one sanctioned body spelling; and
   `evals/account-privacy.eval.mjs:213-219` pins the view-name list to **exactly**
   `['my_account','my_battle','my_conversation','my_monster_pub','my_wallet']`. **Consequence: adding a 6th
   view FAILS that gate until the list is updated** — a hard, non-obvious integration constraint on §2.5.
   Any M25 proposal to "scan that each view's filter binds the caller identity" is rebuilding shipped
   machinery, and doing it worse (§3, cut 1).
5. **Two `UNVERIFIED` classifications from the investigation are now SETTLED as correct.**
   `player_dialogue_state` (`schema.rs:556`) and `heal_cooldown` (`schema.rs:624`) are private with no view
   and were flagged as possible *functional* gaps. They are not: `grep` over `client/src/` returns **zero**
   references outside generated `client/src/module_bindings/types.ts`, and both are written server-side only.
   Correctly classified; no latent bug; the flag is closed.
6. **The threat model's "untrusted chat" surface does not exist.** There is no chat system in monster-realm
   (the same correction M22 and M24 each had to make). The real UGC surface is `set_profile_name`
   (ADR-0132), `<bdi>`-isolated on render. **Any M25 criterion predicated on chat would be vacuous**, so none
   is written; ADR-0034's Context clause naming chat is amended at §8-1.

---

## 2. The converged design

### 2.0 The central decision

> **M25 is the audit of the second channel.** ADR-0199 proved the *declaration* of the subscription channel
> is total and stable; M25 proves the `Err(String)` channel does not leak, and — the part no prior mechanism
> models at all — that **the two channels are coupled**, so closing a leak in one can open a leak in the
> other.

Defence. The sketch asked M25 to verify RLS (dead premise, §1.1) and then, per the 2026-08-23 recency note,
to verify *completeness* of the private-table+view migration. §1.1(1) shows that completeness is already
mechanically enforced for what a gate can enforce, and §1.1(4) shows the per-view boundary is already pinned
exactly. Re-deriving a "stakes taxonomy" over that would be elaborate bookkeeping whose only novel yield is
"a note exists" (§3, cut 1). Meanwhile channel 2 carries **243 `Err(` sites** (206 `return Err(`) across the
production modules, at least two of which leak predicates over private tables *today* (§2.3), and it is
touched by no eval, no ADR, and no line of the threat model. That is the genuinely unproven property, and it
is the one an audit milestone exists to find.

### 2.1 The two-channel model — the spec's load-bearing frame

Stated once, normatively, because every gate below is derived from it:

| Channel | What carries it | What gates it today | M25's job |
|---|---|---|---|
| **1 — subscription** | rows of `public` tables + the 5 `#[view]`s | ADR-0199 (declaration totality + escalation) · per-view exact-body pins · 11 per-table privacy evals | **Nothing new.** One narrow applicability amendment (§2.2) + the two named residuals (§2.4/§2.5) |
| **2 — `Err(String)`** | the rejection payload of the 48 reducers that return one (§1.1(3)) | **nothing** | **All of it** (§2.3) |

**The severity rule for channel 2** (the ceremony's discriminator — without it, every one of the 243 `Err(`
sites reads as a finding and the audit drowns):

> An `Err` string is an **oracle** if and only if the predicate it reveals is **not already readable from a
> `public` table.** Otherwise it discloses nothing a subscription already gives away, and it is not a finding.

Applied to the four branches the ceremony examined, this rule *refutes* as many candidate findings as it
confirms — which is why it is normative and not advisory:

| Branch | Predicate over | Table's visibility | Verdict |
|---|---|---|---|
| `trading.rs:86,91` — `"monster {mid} not found"` vs `"monster {mid} not owned by caller"` | `monster` | **private**, no view | **REAL oracle.** Ownership of an arbitrary probed `monster_id`, for any caller. Highest severity of the set. |
| `pvp.rs:764,769` — `"target player not found"` / `"target player is offline"` | `player` | **public**, carries `online` | **REFUTED — leaks nothing.** Already fully subscription-visible. |
| `pvp.rs:806` — `"target is already in an ongoing battle"` | `battle` | **private** + participant-scoped `my_battle` | **REAL oracle.** Not derivable from a participant-scoped view. (Note `pvp.rs:799` is the *self*-guard `"already in an ongoing battle"` — a different branch, and not an oracle.) |
| `pvp.rs:827` — `"target already has a pending incoming challenge"` | `battle_challenge` | **public** *today* | **DORMANT.** Leaks nothing now — **and becomes a live oracle the instant §2.5's view lands.** |

Note that `pvp.rs:775-780` shows the project *already reasons this way* — the ranked-account gate is
deliberately placed after guard 3 "so account existence is only ever disclosed for a target the caller can
already observe online, never for arbitrary identities (ADR-0189 D8; ADR-0179 G1)". M25 does not invent this
doctrine; it **generalizes an existing local practice into a gated invariant.**

### 2.2 Channel 1 — the D5-applicability amendment, and nothing more

**DECIDED: M25 adds no new read-side taxonomy.** It makes exactly one change: **amend ADR-0199 D5's
applicability** so the *existing* `visibility_note` field becomes **mandatory on the standing-public set** for
tables with named confidentiality stakes, not only at a private→public transition.

Seeded with the four tables that have real, already-documented stakes:

| Table | `path:line` | The stake | The note must cite |
|---|---|---|---|
| `inventory` | `schema.rs:472` | every client reads every owner's item composition + counts (`schema.rs:459-471` accepts this; RLS unavailable for `Vec<u64>` membership) | ADR-0018 / the accepting ADR |
| `player_quest` | `schema.rs:567` | every player's `quest_id` + `step_index` world-readable | the accepting ADR (benign-on-`inventory`-precedent) |
| `trade_offer` | `schema.rs:654` | lower bound on both parties' currency (ADR-0117 D6) **+ the §2.4 residual** | ADR-0117 + the §2.4 tracking ADR |
| `battle_challenge` | `schema.rs:847` | `challenger_party_ids` team composition (the §2.5 residual) | the §2.5 fix ADR |

Why this and not the "3-class stakes taxonomy" four of six lenses proposed: because ADR-0199's D9 table-count
check and `T-VIS-ANCHORS` already catch a table appearing, vanishing, flipping, or double-flipping, so the
taxonomy's entire novel yield is *"a `/ADR-\d+/` string exists next to a `public` entry"* — a
documentation-existence check identical in kind to D5's shipped mechanism. A one-line applicability amendment
buys that yield; a fourth projection buys it plus permanent maintenance. **The honest limit, stated plainly:
nothing can force the declaration to be TRUE. A false "no stakes" is undetectable — exactly as it is today
for escalations.** That residual is why §2.7 exists.

### 2.3 Channel 2 — the oracle-coupling gate (the milestone's real machinery)

New: **`evals/reducer-oracle-coupling.eval.mjs`** + baseline **`evals/baselines/oracle-coupling.json`**.

**Data shape** — one entry per *branch*, not per reducer:

```jsonc
{ "table": "monster",
  "visibility_at_seed": "private",
  "branches": [ { "file": "server-module/src/trading.rs", "line": 88,
                  "err_literal": "monster {mid} not found",
                  "verdict": "ORACLE", "severity": "high", "finding_id": "SEC-F-001" } ] }
```

**Granularity is the load-bearing choice.** The attacker lens proposed a 4-way tag on each reducer
(`OWNER_SCOPED|PARTICIPANT_SCOPED|PUBLIC_WRITE|NEEDS_ORACLE_REVIEW`). That is a **category error** and the
adversarial pass proved it two ways: (a) an oracle is a *pairwise property of two `Err` branches*, not a
whole-function attribute — 243 branches vs 50 reducers, so a reducer tagged `PARTICIPANT_SCOPED` reads as
"audited" when one of N branches was looked at; and (b) **`build_cards` (`trading.rs:86,91`) is a bare `fn`,
not a `#[spacetimedb::reducer]` — it has no tag slot at all**, yet it is the single worst oracle site in the
tree. Branch-level granularity represents it; reducer-level cannot.

**Three checks.**

- **`[oracle-coupling-01]` — the coupling invariant.** For every entry, `visibility_at_seed` is compared
  against that table's live `visibility` in `evals/baselines/table-schemas.json` (the ADR-0199 projection, read
  — never re-parsed). **On divergence the gate FAILS until the entry is re-triaged** (verdict re-decided,
  `visibility_at_seed` re-pinned). This is the mechanization of §2.1: *closing a read-side visibility gap on
  table T converts every reducer branch predicating on T from "already public, harmless" into a new write-side
  oracle.* **Triggered by change — never a static sweep of all 50 reducers.**
- **`[oracle-coupling-02]` — line-drift / literal anti-vacuity.** Each `err_literal` must still be found in
  its named file. A pin that silently stops matching is the known line-drift trap; the gate fails loudly
  rather than passing on an empty match.
- **`[oracle-coupling-03]` — the census backstop (totality).** The seeded set covers 3 of 243 branches; a new
  reducer added tomorrow with a fresh oracle would be caught by nothing, and calling that "triggered, not
  swept" would launder incompleteness as design. So: **scan every `Err(` literal in `server-module/src/*.rs`
  (non-test) for the textual name of any table that ADR-0199's baseline marks `private`. Any hit whose
  `file`+`line` is not already an entry fails the gate** with `NEW-CANDIDATE-ORACLE — triage or allow-list`.
  Cheap (a regex census, not a manifest), bidirectional in the M22 `checkRekeyCompleteness` spirit, and it
  makes the gate's coverage claim honest.
  *Anti-vacuity floor:* the census must observe **≥ 200 `Err(` sites across ≥ 15 files** and fail if it
  observes fewer — a population floor in the gate's own vocabulary, because unlike §2.4's fixture the `Err(`
  population never legitimately shrinks to zero.

**What this gate cannot prove:** whether two `Err` strings differ on a *caller-observable* axis in a way a
human would call a leak. That judgment is **tier [e]**, forced into existence by `[oracle-coupling-01]`/`03`
and recorded in §2.7's findings ledger — **never** rubber-stamped by the gate.

### 2.4 Residual 1 — `trade_offer`: SPLIT, one half now, one half deferred with a mechanism

ADR-0199 says both residuals are *"fixable with the same two-identity view pattern `my_battle` uses."*
**For `trade_offer` that is false, and it is false twice over.** The ceremony splits it:

**(a) The oracle half — IN SCOPE (S3).** `build_cards` (`trading.rs:86,91`) returns
`"monster {mid} not found"` vs `"monster {mid} not owned by caller"` for **any** caller probing **any**
`monster_id`. `monster` is private, so this is a live leak *independent of `trade_offer`'s visibility* — a
scoped view over the table changes what a *subscription* returns, not what a *reducer call's error* reveals.

> **The fix is narrower than "unify the error strings", and the distinction is normative.** `log_reject`
> (`guards.rs:47-56`) logs the *same string* it then returns. Collapsing both literals would delete the
> not-found/not-owned distinction from the **server-side log too**, trading a confidentiality invariant for
> the project's fail-loud/diagnosability invariant. **S3 MUST unify only the client-facing `Err` payload while
> passing the specific reason to `log_reject`.** An implementer who collapses both has regressed
> observability; the acceptance criterion (SEC-9) is written to catch exactly that.

**(b) The visibility half — DEFERRED, with the mechanism decided so the future milestone inherits the
arbitration.** A scoped view is **necessary but insufficient**: `propose_trade` *writes* the counterparty's
`MonsterCard` snapshot into the table at propose time, so the disclosure happens on the write, before consent.
Dual-consent escrow requires **the offer itself not be visible pre-confirmation** — i.e. a **private staging
row materialized into a scoped view only after both-party confirm**. That is economy/reducer redesign, out of
a spec-authorship slice and out of M25's own scope. **It is not silently forgotten:** §2.2 now makes a
`visibility_note` on `trade_offer` *mandatory*, and that note must cite the tracking ADR — so the deferral is
carried by a gate, not by prose. Target: `backlog` (§8-3 routes the milestone placement to the operator).

### 2.5 Residual 2 — `battle_challenge`: the obvious fix is a REGRESSION; split the payload instead

The judge's synthesis proposed adding a flat two-identity `my_challenge` view. **The adversarial pass
falsified it against the live client, and this is the single most valuable catch of the review phase.**

`client/src/ui/pvpModel.ts:89-94` builds a `busyIdentities` set by iterating **every** `Pending`
`battle_challenge` row and adding **both** `c.challenger` and `c.target`, then derives
`challengeablePlayers` (`:100-105`) by excluding busy identities from the online player list. That is a
**legitimate non-participant read of every challenge row** — the client subscribes `battle_challenge`
unfiltered. A flat `my_challenge` view would return rows only to the two parties of each challenge, silently
breaking *"who can I challenge right now"* for every player. The residual is real; the obvious fix trades a
minor composition leak for a broken feature.

**DECIDED — split the payload by stakes, not the row by participant:**

1. Keep a **public** projection carrying only `{challenger, target, status}` — exactly what the busy-set
   computation needs, and a fact both parties' `player` rows already make largely inferable.
2. Move **`challenger_party_ids`** — the actually-sensitive field, a player's PvP team composition — behind a
   **two-identity (`challenger` ∪ `target`) scoped `#[view]`**, on the `my_battle` pattern.
3. **`pvp.rs:827` must be resolved in the SAME PR** (redacted, or explicitly accepted with a finding row).
   The moment step 2 lands, `battle_challenge`'s stakes change and that dormant branch becomes live — this is
   §2.3's `[oracle-coupling-01]` firing on its first real trigger, by design, on day one.
4. **`evals/account-privacy.eval.mjs:213-219`'s exact view-name list MUST be extended to 6 entries**, and
   `evals/monster-privacy.eval.mjs`'s sanctioned-view set with it (§1.1(4)). Omitting this is an automatic
   CI red, and it is the kind of coupling that is invisible until it bites.

### 2.6 The forward seam with M24 / `M-error-codes` — named, because it will bite

§2.3's `err_literal` pins are snapshot assertions over English server error strings. M24 counted
**84 `return Err("` / 100 `Err("`** sites and **explicitly deferred** their localization to a tracked
follow-up slug **`M-error-codes`** (M24 spec §8-3, escalated for operator sign-off — deliberately *not*
buried as a cut). So there is **no collision today**, and M25 must not pre-solve one. But when
`M-error-codes` lands it rewrites that entire surface at once.

**Normative instruction to that future milestone:** every `oracle-coupling.json` entry's `err_literal` must be
re-derived from the new error-code scheme **in the same PR**, and `[oracle-coupling-02]` is expected to go red
until it is. Recorded here so a future contributor meets a signpost instead of a wall of unrelated-looking CI
failures. Note also the happy consequence: an error-*code* scheme makes the oracle question far easier to
gate, since codes are enumerable in a way prose strings are not.

### 2.7 The sign-off gate, the findings ledger, and the severity rubric

Three lenses proposed mutually exclusive placements for the sign-off gate. The contradiction is resolved by a
verified mechanism fact, not a preference:

> `justfileCiDepsAppearInCi` (`evals/ci-gate-wiring.eval.mjs:257-331`) reads
> `extractJobBlock(ciYaml, 'ci')` — **the `ci` job only.** A separate `anchorIsWired` (`:446-482`) hardcodes
> the `e2e`-job anchor for `ci-gate-wiring.eval.mjs` itself.

Therefore **"structurally undroppable via `ci-gate-wiring`" and "does not run on every PR" are mutually
exclusive.** A sign-off gate wired as a `just ci` dep goes **permanently red** the moment any finding is open
mid-milestone — the bypass-training trap. And a gate placed outside the `ci` job gets **no** anti-gutting
protection from the existing predicate, so any claim that it does is unsupported.

**DECIDED:**

- **Recipe:** new `just security-signoff`, **deliberately excluded from the `ci:` dep list** so it never
  fights `justfileCiDepsAppearInCi`'s parity check and never reddens an ordinary PR.
- **Trigger: `workflow_dispatch` in a new `.github/workflows/release-gate.yml`.** **NOT `push: tags: v*`** —
  `git tag` returns **zero tags** and the repo has only `ci.yml` and `nightly.yml`, so a tag trigger would
  **never fire**, and a gate that cannot fire is strictly worse than no gate. Adding the tag trigger is
  deferred to whenever a tag convention actually exists (§8-2 routes that decision to the operator).
- **Anti-gutting:** earned honestly via a **new** `signoffAnchorIsWired` check added to
  `ci-gate-wiring.eval.mjs`, in the shape of the existing anchor — not by claiming existing coverage.
- **Artifact:** `docs/security-sign-off/M25-<version>.md`, human-authored, structurally gated on the ADR-0203
  pattern (fixed section-key set checked by **equality**, owners from a closed enum, back-citation) — the
  precedent that also *concedes*, at ADR-0203:146-149, that a well-formed but semantically wrong cell is
  undetectable. M25 inherits that concession rather than pretending otherwise.
- **The blocking predicate:** a literal `Open-Critical-Count: N` line that must **equal a count computed from
  `docs/security/findings.json`** — computed, so a hand-edited number is a hard fail rather than silent drift.
  Fails when `N > 0`.
- **Unblocking:** flip a finding `open → remediated` (citing the fix commit) **or** `open → accepted-risk`
  (citing an ADR, with a **non-null `owner`**). **Never silent row deletion** — the one state that must be
  structurally impossible is an open critical with no owner.
- **Findings ledger:** `docs/security/findings.json`, lifecycle `open → remediated → accepted-risk`, one row
  per finding with `id, channel (1|2), table_or_branch, severity, status, owner, evidence`. It is the durable
  home that survives session boundaries; the prose sign-off doc renders from it.
- **Severity rubric:** `docs/security/severity-rubric.md` — a **CVSS-lite** house rubric over three axes
  (**data-exposure scope × auth-bypass-possible × reversibility**), because an undefined "critical" cannot
  gate anything and nothing in-tree gates on CVSS today. The **weight table is an operator decision** (§8-4).
- **`SECURITY.md`** (confirmed **absent** at both repo root and `.github/`) — **adopted**, as static
  coordinated-disclosure prose only.
- **REJECTED as theater: per-severity SLAs and a disclosure inbox.** The project has zero live players and no
  public release; an SLA clock with nothing on it is vacuous ceremony of exactly the kind this spec's own
  anti-vacuity discipline exists to refuse. Revisit at public launch.
- **Accepted risk, recorded not built:** CVSS-lite is unenforced arithmetic, so severity-gaming (labelling a
  critical as high to hold `Open-Critical-Count` at zero) is possible. For a single-operator project this is
  acknowledged, not mechanized.

### 2.8 Re-audit cadence and the RLS version tripwire

OBS-47 (`security-threat-model.md:55-62`) and OBS-15 instruct that RLS stabilization be re-checked **on every
SpacetimeDB version bump**. Investigation finding: **nothing fires on a version bump** — these are prose
obligations with zero enforcement, handled ad hoc by dated ADRs (ADR-0197). This is a real, cheap, closable
gap and the most under-rated item in the sketch.

- **Tripwire → NIGHTLY.** New `evals/rls-stabilization-tripwire.eval.mjs`: diff the pinned SpacetimeDB
  version against `docs/security/last-verified-spacetime-version.txt`; on divergence **fail with an artifact**
  (never silent pass) so ADR-0200's `notify` job opens the issue. Placement justified: a version bump is rare
  and intentional, so per-PR execution is pure false-red cost for zero benefit; nightly catches it within a
  day of the bump landing.
- **Wiring is structurally forced:** a new nightly job requires a matching row in
  `docs/nightly-red-response-policy.md`, because `evals/nightly-smoke-wiring.eval.mjs` checks that matrix's
  key set for **equality** against `declaredJobKeys(nightly.yml)`. The coupling already exists; M25 rides it
  rather than inventing enforcement.
- **`[oracle-coupling-*]` and the §2.2 note check → `just ci`** (cheap source scans, per-PR, steady-state
  green).
- **Semantic re-audit → calendar/human, 90-day**, raised via `mr-ask-drew`. Auditing *correctness* is not
  mechanizable; only the audit-log's **freshness** is gated, never its content.

---

## 3. Scope discipline — what is CUT, and what each cut costs

1. **The 3-class stakes taxonomy** (proposed by 4 of 6 lenses; rejected on adversarial evidence). Class A's
   filter-scan is FATAL — a regex cannot separate a correct filter from a subtly wrong one, and
   `my_account`'s own comment (`schema.rs:775-778`, citing ADR-0154 D2) records the live evasion: *a decoy
   `find(ctx.sender())` followed by `find(other)` compiles clean and leaks*; besides, exact-body pinning
   already ships (§1.1(4)). Class B is FATAL and **vacuous by construction** — "no reducer returns the rows"
   is true for all 50 reducers *always* (§1.1(3)), so the gate would be green for a reason unrelated to what
   it claims, and would sail straight past `trading.rs:86,91`. Class C reduces to §2.2's amendment.
   **Cost:** classification correctness beyond §2.2's four named tables stays human judgment — the same
   limit ADR-0199 already accepted explicitly.
2. **A second baseline file** (`table-stakes.json` as a sibling of `table-schemas.json`). **Cost:** none —
   this is a pure win. Two files that can disagree with no oracle for which wins is the rot mode M22's
   single-source `REKEY_MANIFEST` was built to avoid. If anything is added it is a *field*, never a file.
3. **A per-reducer `REDUCER_MANIFEST`** (§2.3). **Cost:** real and named — no totality guarantee across all
   243 branches beyond §2.3's census backstop; branches only get individual verdicts when seeded, triggered,
   or manually audited.
4. **Per-severity SLAs + a disclosure inbox** (§2.7). **Cost:** no formal IR timeline at launch. Acceptable
   at zero live players; revisit at public launch.
5. **A full live-operations buildout** — abuse-detection policy, GM-reverse/rollback runbook. The
   research-grounded lens argued this is the milestone's real gap, and it was **partly refuted**: telemetry
   *does* exist (ADR-0180, `server-module/src/observability.rs` `mr_log`, the private `playtest_event`), so
   what is missing is a policy layer, not instrumentation. **Cost:** M25 ships a one-paragraph
   rollback-policy stub (§9-4) rather than a runbook — deliberately, because the research's own warning
   ("define the rollback policy *before* it happens") is satisfied by a decided default, and a full runbook
   for a single-operator pre-playtest project would be ceremony.
6. **Public-table composition analysis** — `character` + `player` + `profile` + `inventory` + `player_quest`
   cross-joined across all players enables stalking, sniping, and market inference. **Cost: the highest of
   any cut, and it is honest.** No mechanism short of RLS (unavailable) closes it, and the individual
   disclosures are already accepted (ADR-0117 D6, `schema.rs:459-471`). Recorded as an **accepted-risk
   follow-up row in `findings.json`**, not silently dropped (§9-2).
7. **A third-party pen-test.** Out of scope in the sketch and still out. **Cost:** none for M25; it remains a
   recommendation M25's threat model prepares for.

---

## 4. Slices, dependency spine, and fan-out

M25's own implementation is **`blocked:playtest-gate`**; these slices describe the milestone's future build.
Each declares a narrow `touches:` set per PLAN §9 so siblings can fan out `touches:`-disjoint.

| Slice | Deliverable | `touches:` | Depends on |
|---|---|---|---|
| **S0** | Threat-model consolidation + the §7 corrections; the two ADR-0034 amendments (§8-1) | `specs/monster-realm-v2/security-threat-model.md`, `specs/monster-realm-v2/adr/0034-security-audit-gate.md` | — |
| **S1** | ADR-0199 **D5-applicability amendment** + the 4 `visibility_note`s (§2.2) | `docs/adr/0199-declared-table-visibility-gate.md`, `evals/battle-schema-snapshot.eval.mjs`, `evals/baselines/table-schemas.json` | S0 |
| **S2** | The **oracle-coupling gate** + census backstop + seed (§2.3) | `evals/reducer-oracle-coupling.eval.mjs` **(new)**, `evals/baselines/oracle-coupling.json` **(new)** | S1 (reads its `visibility` projection) |
| **S3** | `trade_offer` **oracle half**: unify the client-facing literal, keep the logged reason (§2.4a) | `server-module/src/trading.rs`, `server-module/src/trading_tests.rs` | S2 |
| **S4** | `battle_challenge` **payload split** + two-identity view + `pvp.rs:827` + the 6-entry view-list updates (§2.5) | `server-module/src/schema.rs`, `server-module/src/pvp.rs`, `server-module/src/pvp_tests.rs`, `evals/account-privacy.eval.mjs`, `evals/monster-privacy.eval.mjs`, `client/src/ui/pvpModel.ts` | S2 |
| **S5** | Findings ledger + CVSS-lite rubric + `SECURITY.md` (§2.7) | `docs/security/findings.json` **(new)**, `docs/security/severity-rubric.md` **(new)**, `SECURITY.md` **(new)** | S0 |
| **S6** | Sign-off gate + release workflow + `signoffAnchorIsWired` (§2.7) | `justfile`, `.github/workflows/release-gate.yml` **(new)**, `evals/security-signoff.eval.mjs` **(new)**, `evals/ci-gate-wiring.eval.mjs` | S5 |
| **S7** | RLS version tripwire + nightly wiring (§2.8) | `evals/rls-stabilization-tripwire.eval.mjs` **(new)**, `docs/security/last-verified-spacetime-version.txt` **(new)**, `.github/workflows/nightly.yml`, `docs/nightly-red-response-policy.md`, `justfile` | S0 |
| **S8** | **The audit pass itself** + sign-off authoring (the human/agent work the gates frame) | `docs/security-sign-off/**` | S1–S7 |

**Spine and fan-out.** Serial: `S0 → S1 → S2`. Then **S3 ‖ S4** (disjoint modules — `trading` vs
`pvp`/`schema`/`client`) and **S5 → S6** and **S7** all run in parallel with each other. S8 is terminal.
Note **S6 and S7 both touch `justfile`** and are therefore *not* `touches:`-disjoint — declare them serial
(S7 then S6, or vice versa) rather than pretending otherwise. **S4 is the widest slice** and the only one
touching `client/`; it is also the only one that can regress a feature (§2.5), so it earns the heaviest
review.

### 4.1 Post-integration verification (the milestone's real DoD)

Slices passing in isolation does not prove the milestone works. After the serial merges:

1. Full `just ci` **green and meaningful** · `bindings-drift = 0` (S4 adds a view ⇒ new generated bindings) ·
   `evals/baselines/table-schemas.json` regenerated and its `T-VIS-ANCHORS` split updated **deliberately**
   (S4 flips `battle_challenge`'s effective stakes; that churn is the point, not a defect).
2. **The cross-slice contract that actually matters:** S4 changes a table's visibility, so
   `[oracle-coupling-01]` **must fire** on `pvp.rs:827` and the integrated tree must show that branch
   re-triaged. A green `[oracle-coupling-01]` after S4 that never fired is proof the gate is inert — the
   integration test is *that the coupling gate reddened and was resolved*, not merely that CI is green.
3. `client-test` + the PvP e2e prove `challengeablePlayers` still populates for a non-participant after S4's
   payload split (§2.5's regression, the one M25 could plausibly ship).
4. `just eval` glob picks up the two new evals automatically (`evals/run.mjs:8-20`) — verify each **fails on
   its proof-of-teeth fixture** (§5) in the integrated tree, not only in isolation.
5. Every EARS criterion in §6 satisfied end-to-end, and `Open-Critical-Count` reconciles against
   `findings.json`.

---

## 5. Gates — the eval design

House contract (`evals/run.mjs:8-20`): a pure glob over `evals/*.eval.mjs`, default export
`async () => ({name, pass, detail})`, process fails on any `pass:false` or throw, and the runner **hard-fails
if zero files are found**. Nothing needs registering. Every gate below ships proof-of-teeth.

### 5.1 `evals/reducer-oracle-coupling.eval.mjs` **(new)** — closes §2.3

Tags `[oracle-coupling-01|02|03]` as specified in §2.3. Reads ADR-0199's `visibility` projection rather than
re-parsing `schema.rs` (single-source discipline, §3 cut 2).
**Anti-vacuity:** census must observe **≥200 `Err(` sites across ≥15 files**; fewer ⇒ fail.
**Proof-of-teeth (3 fixtures, each must FAIL the gate):**
 (a) an entry whose table's live `visibility` differs from `visibility_at_seed` ⇒ `[oracle-coupling-01]` fails;
 (b) an entry whose `err_literal` is absent from its named file ⇒ `[oracle-coupling-02]` fails;
 (c) a synthetic `Err(format!("player_wallet row {id} missing"))` naming a *private* table at a line absent
 from the baseline ⇒ `[oracle-coupling-03]` fails with `NEW-CANDIDATE-ORACLE`.
**Deciding output:** the failing tag plus `file:line`.

### 5.2 `evals/security-signoff.eval.mjs` **(new)** — closes §2.7

Fixed section-key set by **equality** (ADR-0203 shape); `owner` non-null when `status=accepted-risk`;
`Open-Critical-Count` must equal the count computed from `findings.json`.
**Anti-vacuity:** `findings.json` must parse and contain **≥1** row (an empty ledger is not a pass — it is an
unrun audit); the closed severity enum must be non-empty and every row's severity must be a member.
**Proof-of-teeth:** (a) a `critical`+`open` row ⇒ fail; (b) a hand-edited `Open-Critical-Count` that
disagrees with the computed count ⇒ fail; (c) an `accepted-risk` row with null `owner` ⇒ fail; (d) a missing
section key ⇒ fail.
**Placement:** `just security-signoff`, **not** a `ci:` dep; invoked from `release-gate.yml` via
`workflow_dispatch` (§2.7).

### 5.3 `evals/rls-stabilization-tripwire.eval.mjs` **(new)** — closes §2.8 / OBS-47

Diffs the pinned SpacetimeDB version against `docs/security/last-verified-spacetime-version.txt`.
**Anti-vacuity:** both the pinned version and the baseline file must be found and non-empty — a missing
either side FAILS rather than passing vacuously (the trap ADR-0199's own fail-open residual demonstrates).
**Proof-of-teeth:** a baseline naming a version different from the pin ⇒ fail with the two versions in the
detail. **Placement:** nightly job + a matching `docs/nightly-red-response-policy.md` row (required by
`declaredJobKeys` equality).

### 5.4 Extensions to shipped gates (no new files)

- `evals/battle-schema-snapshot.eval.mjs` — D5-applicability check (§2.2). **Proof-of-teeth:** one of the 4
  named tables with its `visibility_note` removed ⇒ fail.
- `evals/account-privacy.eval.mjs` + `evals/monster-privacy.eval.mjs` — the view-name list goes 5 → 6 entries
  (§2.5(4)). **Proof-of-teeth:** the new view present in source but absent from the list ⇒ fail (this is the
  existing tooth; S4 must not weaken it to pass).
- `evals/ci-gate-wiring.eval.mjs` — new `signoffAnchorIsWired`. **Proof-of-teeth:** `release-gate.yml`
  missing the `- run: just security-signoff` step ⇒ fail.

### 5.5 Oracle tiering — every M25 property classified

- **(a) compiler/type:** none. M25 adds no types; its subject is string payloads and JSON baselines.
- **(b) source-scan eval:** `[oracle-coupling-01..03]` · the D5-applicability note check · the 6-entry
  view-list pins · `signoffAnchorIsWired` · the sign-off structural checks · the version tripwire.
- **(c) unit/integration:** the unified-client-literal-but-distinct-log assertion (§2.4a) ·
  the two-identity view returning zero rows to a third party (§2.5) · `challengeablePlayers` still populating
  for a non-participant (§2.5, the regression guard) · `Open-Critical-Count` reconciliation.
- **(d) e2e / nightly:** the PvP challenge flow after S4's payload split · the nightly version tripwire.
- **(e) MANUAL — never reported CI-green:**
  1. Whether two `Err` strings differ on a caller-observable axis in a way that constitutes a leak (§2.3).
  2. Whether a §2.2 `visibility_note`'s reasoning is *true* — a false "no stakes" is undetectable (§2.2).
  3. Whether a CVSS-lite severity was assigned correctly; severity-gaming is possible (§2.7).
  4. Whether the 5 (soon 6) view filters are the *semantically right* stakes boundary — body-pinned, not
     semantically verified (§1.1(4)).
  5. The public-table composition risk (§3 cut 6).
  6. That the audit pass in S8 was actually *good*.

**Binding rule, restated because it is the one most often broken:** a tier-(e) property is recorded in the
S8 sign-off artifact and is **never** reported CI-green, never asserted by an eval, and never cited as
evidence M25 is done. M25's gate is green when (b)–(d) are green; the tier-(e) list is signed off by a human,
separately and visibly.

---

## 6. Acceptance criteria (EARS)

**S0–S1 — channel 1, the applicability amendment**
- **SEC-1** [b] WHEN `evals/battle-schema-snapshot.eval.mjs` runs and any of `inventory`, `player_quest`, `trade_offer`, `battle_challenge` lacks a `visibility_note`, THE SYSTEM SHALL fail with the offending table name.
- **SEC-2** [b] WHEN a `visibility_note` is present but contains no `ADR-` citation matching `/ADR-\d{4}/`, THE SYSTEM SHALL fail rather than accept the note as satisfied.
- **SEC-3** [b] WHEN the gate runs, THE SYSTEM SHALL confirm it observed exactly 38 table entries and SHALL fail if the count differs without a deliberate baseline update.
- **SEC-4** [e] WHEN a `visibility_note` asserts a table has no confidentiality stakes, THE SYSTEM SHALL record that assertion as human-attested and SHALL NOT report it as mechanically verified. **(MANUAL — a false "no stakes" is undetectable by design, §2.2.)**

**S2 — channel 2, the oracle-coupling gate**
- **SEC-5** [b] WHEN a baseline entry's `visibility_at_seed` differs from that table's live `visibility` in `evals/baselines/table-schemas.json`, THE SYSTEM SHALL fail `[oracle-coupling-01]` until the entry is re-triaged.
- **SEC-6** [b] WHEN an entry's `err_literal` is not found in its named file, THE SYSTEM SHALL fail `[oracle-coupling-02]` and SHALL NOT pass on a zero-match scan.
- **SEC-7** [b] WHEN an `Err(` literal in a non-test `server-module/src/*.rs` file textually names a table marked `private`, and its `file`+`line` is absent from the baseline, THE SYSTEM SHALL fail `[oracle-coupling-03]` reporting `NEW-CANDIDATE-ORACLE`.
- **SEC-8** [b] WHEN the census completes, THE SYSTEM SHALL confirm it observed ≥200 `Err(` sites across ≥15 files and SHALL fail if it observed fewer.

**S3 — `trade_offer`, the oracle half**
- **SEC-9** [c] WHEN `build_cards` rejects because a `monster_id` does not exist AND when it rejects because that monster is not owned by the expected owner, THE SYSTEM SHALL return a byte-identical client-facing `Err` string in both cases, AND SHALL pass distinct reason text to `log_reject` in each case.
- **SEC-10** [b] WHEN `server-module/src/trading.rs` is scanned, THE SYSTEM SHALL find no `Err` literal containing the substring `not owned by caller`.

**S4 — `battle_challenge`, the payload split**
- **SEC-11** [c] WHEN a client that is neither challenger nor target subscribes, THE SYSTEM SHALL deliver `{challenger, target, status}` for every `Pending` challenge and SHALL NOT deliver `challenger_party_ids`.
- **SEC-12** [c] WHEN the two-identity challenge view is queried by an identity that is neither challenger nor target, THE SYSTEM SHALL return zero rows.
- **SEC-13** [c] WHEN `buildPvpViewModel` runs for a player with two other players busy in a mutual challenge, THE SYSTEM SHALL still exclude both busy identities from `challengeablePlayers`. **(The §2.5 regression guard.)**
- **SEC-14** [b] WHEN `evals/account-privacy.eval.mjs` and `evals/monster-privacy.eval.mjs` run after the new view lands, THE SYSTEM SHALL require the sanctioned view-name list to contain exactly 6 entries including the new view.
- **SEC-15** [b] WHEN S4 lands, THE SYSTEM SHALL show `[oracle-coupling-01]` having fired for the `pvp.rs` pending-challenge branch and that branch re-triaged in the same change. **(Proves the coupling gate is not inert, §4.1(2).)**

**S5–S6 — findings ledger and sign-off**
- **SEC-16** [b] WHEN `docs/security/findings.json` contains a row with `severity: critical` and `status: open`, THE SYSTEM SHALL fail `just security-signoff`.
- **SEC-17** [b] WHEN a row has `status: accepted-risk` and a null or absent `owner`, THE SYSTEM SHALL fail.
- **SEC-18** [b] WHEN the sign-off artifact's literal `Open-Critical-Count` differs from the count computed from `findings.json`, THE SYSTEM SHALL fail rather than trust the literal.
- **SEC-19** [b] WHEN the sign-off artifact's section-key set is not equal to the declared fixed set, THE SYSTEM SHALL fail.
- **SEC-20** [b] WHEN `findings.json` parses to zero rows, THE SYSTEM SHALL fail, treating an empty ledger as an unrun audit rather than a clean one.
- **SEC-21** [b] WHEN `.github/workflows/release-gate.yml` lacks a `- run: just security-signoff` step, THE SYSTEM SHALL fail `signoffAnchorIsWired`.
- **SEC-22** [b] WHEN `just ci`'s dep list is inspected, THE SYSTEM SHALL NOT contain `security-signoff`. **(Prevents the permanent-red regression, §2.7.)**

**S7 — the version tripwire**
- **SEC-23** [b] WHEN the pinned SpacetimeDB version differs from `docs/security/last-verified-spacetime-version.txt`, THE SYSTEM SHALL fail the nightly tripwire and emit both versions in its detail.
- **SEC-24** [b] WHEN either the pinned version or the baseline file cannot be read or is empty, THE SYSTEM SHALL fail rather than pass vacuously.
- **SEC-25** [b] WHEN the tripwire job is added to `nightly.yml`, THE SYSTEM SHALL require a matching row in `docs/nightly-red-response-policy.md` for the matrix key set to remain equal.

**Milestone-wide**
- **SEC-26** [b] WHEN M25 is complete, THE SYSTEM SHALL show `SECURITY.md` present at the repository root.
- **SEC-27** [e] WHEN M25 reaches its gate, THE SYSTEM SHALL require human sign-off on the §5.5 tier-(e) list in `docs/security-sign-off/M25-<version>.md`, and SHALL NOT report any item on that list as CI-green.
- **SEC-28** [b] WHEN the full suite runs, THE SYSTEM SHALL show every new eval failing its proof-of-teeth fixtures (§5.1–§5.4) and passing on the live tree.

Ids are unique and contiguous SEC-1 … SEC-28. **No criterion is predicated on chat** (§1.1(6): there is
none). No criterion asserts anything about RLS behaviour (§1.1: settled, inert).

---

## 7. Threat-model corrections — normative, to be applied in S0

`specs/monster-realm-v2/security-threat-model.md` is **outside this ceremony's declared `touches:` set**, so
the ceremony specifies its edits rather than making them; S0 applies them. (Same discipline M24 used for its
ADR-0033 amendment.) The corrections:

1. **Add channel 2 to §1's STRIDE table.** Every row is a *subscription*-channel mitigation. Add a row:
   *Reducer rejection payloads — threat: an `Err(String)` distinguishes a predicate over a private table
   (information disclosure) — mitigation: the §2.1 severity rule + the `[oracle-coupling-*]` gate.*
2. **Delete the "untrusted chat" surface.** §1's `Chat / social` row and §0's implicit claim describe a system
   that does not exist. Replace with `set_profile_name` (ADR-0132) as the real UGC surface.
3. **Rewrite §3's audit description.** Its "completeness verification of the private-table+scoped-view
   migration across every stakes-classified table" is **already delivered** by ADR-0199 for what a gate can
   deliver (§1.1(1)). Replace with M25's actual additions: the D5-applicability amendment, the
   oracle-coupling gate, the sign-off, the tripwire.
4. **Add the two named residuals** (`trade_offer`, `battle_challenge`) to §4's accepted-risk list **with their
   split verdicts** (§2.4/§2.5) — they are currently invisible there.
5. **Add three accepted risks now named by this ceremony:** the public-table composition risk (§3 cut 6); a
   future second identity issuer — `Identity = f(iss, sub)`, so a Steam-linked player is a *different*
   identity than their OIDC one absent a linking mechanism, meaning **a future auth protocol can silently
   invalidate today's sign-off**; and CVSS-lite severity-gaming (§2.7).
6. **Record that OBS-47's re-check obligation is now mechanized** by §2.8's tripwire rather than left as
   prose.

---

## 8. Operator escalations (routed via `mr-ask-drew`, standing BLOCKER discipline)

Four. **§8-1 is a hard BLOCKER on S0; §8-2 is a hard BLOCKER on S6.** The rest take documented defaults and
are recorded as `decision-defaulted:` per §9 of the doctrine.

- **§8-1 — BLOCKER (S0). The ADR-0034 amendment.** Two clauses of an *accepted* ADR are now false, and
  amending an accepted ADR is not a spec author's call. (a) Its Decision-outcome consequence *"RLS enforcement
  is **verified** at M25 on the pinned version (ADR-0015's defense-in-depth caveat is resolved or data moves to
  private tables)"* — the premise is dead (RLS confirmed unenforced, ADR-0197) and the disjunct already
  happened twice (ADR-0194/0198). (b) Its Context premise *"untrusted chat"* — no chat system exists.
  **Recommendation:** amend (a) to name the two-channel model and the completeness-of-declaration framing;
  strike "untrusted chat" from (b) and substitute `set_profile_name`.
- **§8-2 — BLOCKER (S6). Is a release-tag convention adopted?** §2.7 pins the sign-off to
  `workflow_dispatch` **because `git tag` returns zero tags** and a `tags: v*` trigger would never fire. If
  the operator wants a real launch gate, a tag convention is a prerequisite — and whether
  `security-signoff` should additionally **block merge** before any tag convention exists is a policy call
  with real cost either way. **Recommendation:** adopt `workflow_dispatch` now, add the tag trigger when
  tagging starts, and do **not** block merge in the interim (§2.7's permanent-red argument).
- **§8-3 — non-blocking. Where does `trade_offer`'s escrow redesign land?** §2.4b defers it with its
  mechanism decided (private staging row + post-confirm materialization). It needs a real milestone, not a
  sentence. **Default if unanswered:** `backlog`, materialized into a spec section by the supervisor, with the
  mandatory §2.2 `visibility_note` carrying the tracking ADR in the meantime.
- **§8-4 — non-blocking. The CVSS-lite weight table.** §2.7 fixes the three axes (data-exposure scope ×
  auth-bypass-possible × reversibility) but the thresholds that make something `critical` decide what blocks
  launch. **Default if unanswered:** any finding that discloses another player's private-table data to an
  arbitrary caller is `critical`; anything requiring an existing relationship is `high`.

---

## 9. Non-goals, residual risks, accepted limitations

1. **Non-goals:** RLS anything (§1.1) · a third-party pen-test or bug bounty · formal certification · new
   per-system controls (M25 consolidates and gates; the standing mechanical gates do the continuous work) ·
   chat moderation (no chat) · localizing server `Err` strings (that is `M-error-codes`, §2.6).
2. **Accepted risk — public-table composition.** §3 cut 6. Recorded as an `accepted-risk` row in
   `findings.json` with a named owner, not silently dropped.
3. **Accepted risk — the semantic ceiling.** Only structure, totality, and freshness are gateable. A false
   `visibility_note`, an under-triaged oracle branch, a mis-scored severity, and a bad S8 audit are all
   possible and undetectable. §5.5(e) names each; ADR-0203:146-149 is the precedent that says so out loud.
4. **Rollback / GM-reverse policy — the decided default (§3 cut 5).** Written as one paragraph in
   `SECURITY.md`, not a runbook: *on a confirmed economy exploit, the response is to disable the affected
   reducer path, snapshot before mutating, reverse only the identified exploit transactions, and publish what
   was reversed.* Deciding it now is the cheap half of the research's warning; building an IR runbook for a
   pre-playtest single-operator project is the ceremonial half.
5. **Residual risk — ADR-0199 fails OPEN outside a git work tree** (`pass:true` with a warning, inherited
   ADR-0193 D4). M25 inherits it for the checks that ride that eval. §5.3 deliberately does **not** repeat
   the pattern. Recorded, not fixed — fixing it belongs to whoever owns ADR-0193.
6. **Residual risk — S6 and S7 both touch `justfile`** and cannot fan out (§4). Named so a runner does not
   discover it as a merge conflict.

---

## 10. Attribution table (mandatory §6.3 ceremony artifact)

Six lenses: **B1** un-grounded · **B2** investigation-grounded · **B3** attacker/exploit-chain · **B4** CI
gate-mechanism engineer · **B5** research (online-game security / virtual economy) · **B6** research
(auth-identity / vuln-management process). Two adversarial passes plus a synthesis adversary.

| Lens | UNIQUE elements ADOPTED (and where they landed) | REJECTED (falsifiable reason) |
|---|---|---|
| **B1** | **First** to split `trade_offer` into two defects and to state that a view changes what a *subscription* returns, not what a *reducer error* leaks → §2.4, the seed of the whole two-channel frame. The launch-gate-not-`just ci` instinct → §2.7. Its explicit concession that a false class-C "none" is undetectable → §2.2's stated limit and SEC-4. | The 3-class taxonomy (§3 cut 1) — Class B is **vacuous by construction**: all 50 reducers return `Result<(), String>`, so "no reducer returns the rows" is true always, leak or not. |
| **B2** | "The note IS the deferral record" — a mandatory `visibility_note` makes a deferral carried by a gate rather than by prose → §2.4b. The discipline of reusing ADR-0199's *single* parse rather than a sibling file → §3 cut 2. Deliberately scoping notes to the 4 named tables instead of prose-for-everything → §2.2. | Its sign-off wiring (`just security` inside `just ci`, protected by `ci-gate-wiring`) — **mechanically impossible**: `justfileCiDepsAppearInCi` inspects only the `ci` job, so "undroppable" and "not every PR" cannot both hold; it yields permanent red. |
| **B3** | **The central decision itself** — the only lens to find that the write path/`Err(String)` channel exists at all and that a read-side audit is structurally blind to it → §2.0/§2.1. Both live oracle citations (`trading.rs:86,91`, `pvp.rs:806`) → §2.3's seed. The instinct to extend M22's totality shape rather than invent one → §2.3's census. Its honest cut of composition risk *with* the accepted-risk requirement → §3 cut 6 / §9-2. | The per-reducer `REDUCER_MANIFEST` — **category error**, proven two ways: an oracle is a pairwise property of two `Err` branches (243 vs 50), and **`build_cards` is a bare `fn` with no `#[reducer]` tag slot**, so the manifest structurally cannot represent the worst site in the tree. Its `pvp.rs:764,769` findings — **refuted**: `player` is public and carries `online`. |
| **B4** | The launch-tag/e2e placement diagnosis → §2.7. The **file-count-vs-site-count floor** distinction → §5.1's `≥15 files` and §5.2's `≥1 row`. The warning that a gate accepting any non-empty note is theater → §2.2's `/ADR-\d{4}/` requirement (SEC-2). Explicitly naming that a hand-maintained parallel manifest rots → §3 cut 2. | Its claim of anti-gutting coverage via the existing predicate — **unsupported**, that predicate never inspects the `e2e` job; repaired into a *new*, honestly-named `signoffAnchorIsWired` (§2.7, SEC-21). Its "diff the filter body against a declared `scope:` tag" — the same exact-string pin that already ships, plus an unchecked human label. |
| **B5** | The **escrow refutation** of "same view pattern" for `trade_offer` — the offer must not be visible *pre-confirmation*, so a scoped view over a world-readable write is necessary-but-insufficient → §2.4b, the strongest single correction to the judge's draft. "Codify freshness, never content" → §2.8. The rollback-policy-before-you-need-it warning → §9-4's decided default. | The live-ops reframe as the *central* decision — **partly refuted**: telemetry exists (ADR-0180, `observability.rs`, `playtest_event`), so the gap is a policy layer, not instrumentation; and a full IR runbook is oversized for a `blocked:playtest-gate` single-operator project (§3 cut 5). |
| **B6** | The **`SECURITY.md` absence** (verified) → SEC-26. **CVSS-lite** + the `findings.json` lifecycle + the `owner`-non-null rule — "an undefined *critical* cannot gate anything" → §2.7, SEC-16/17. The **second-identity-issuer** insight (`Identity = f(iss, sub)`, so a future Steam issuer can silently invalidate today's sign-off) → §7-5. Its "extend, never duplicate" discipline toward M22 → §2.3. | Per-severity **SLAs and a disclosure inbox** — theater at zero live players and no public release; an SLA clock with nothing on it is the vacuity this spec refuses (§2.7). |

**Adversarial passes** (not lenses, recorded for completeness): Adversary A killed classes A and B and forced
the `justfileCiDepsAppearInCi` verification; Adversary B settled the severity rule, refuted `pvp.rs:764/769`,
closed the `player_dialogue_state`/`heal_cooldown` UNVERIFIED pair, and produced the coupling invariant. The
**synthesis adversary** produced the two most valuable catches of the entire ceremony: that a flat
`my_challenge` view is a **confirmed feature regression** against `pvpModel.ts:89-94`, and that
`push: tags: v*` **would never fire** (zero tags in the repo).

### 10.1 Calibration datum — the operator's open 6-vs-4 question (2026-07-27)

**Most valuable: B3.** It alone identified the property M25 actually proves; every other adopted element is
downstream repair of B3's diagnosis with a corrected mechanism. Notably its *own* mechanism was rejected —
the diagnosis was worth far more than the design.

**Most marginal: B2.** Its two surviving contributions (ADR-0199 reuse discipline, the deferral-note idea) are
subsumed by cleaner versions from B1 and Adversary A, and its one distinctive mechanical claim was the single
proposal flatly refuted by verified fact.

**Would cutting to 4 have lost anything load-bearing?** *In the final design, no* — dropping B2 and one of
B1/B4 loses no adopted element. **But it would have cost the ceremony its verification pressure.** B1, B2 and
B4 proposed three *mutually exclusive* sign-off placements, and it was precisely that contradiction which
forced reading `justfileCiDepsAppearInCi` and discovering it inspects only the `ci` job — the fact that
resolved §2.7 and falsified B4's protection claim. The yield of six lenses here was a **triangulable
contradiction for the adversary to resolve**, not six independent good ideas.

This is a third distinct pattern across three ceremonies: M23's marginal lens was the **un-grounded** one;
M24's was the one working a **question the ceremony then declined to answer**; M25's was a **well-grounded
lens whose contributions were simply superseded** — while M25's un-grounded lens (B1) self-grounded by
reading the tree and produced the seed of the central frame. **Grounding is not the discriminator it looked
like after M23.** See `mr-loop-credit-economics`.

---

## 11. Ceremony input of record — the original sketch (preserved VERBATIM, 2026-08-23)

Everything below this line is the pre-ceremony design sketch exactly as it stood, retained because §1.1
corrects several of its premises and the corrections are only auditable against the original text.

---

# Sketch: M25 — Security audit & threat-model gate

**Status:** design sketch (provisional) · **Phase D — final pre-launch gate** · **Decision:** ADR-0034 ·
See `security-threat-model.md`.

> Provisional sketch — EARS criteria + tasks deferred to build time. The threat model + the gate decision are
> the durable content (here, the ADR, and the threat-model doc).

## Problem / intent
Per-system security is designed in + gated, but nothing **audits the whole surface** or gates launch on a
sign-off. M25 consolidates the threat model, runs a **structured audit**, tracks remediation, and **blocks
launch on open criticals** — so security is a *verified, signed-off* property.

## Scope (condensed)
- Maintain **`security-threat-model.md`** (STRIDE over movement/battles/economy/trade/PvP/chat/auth/privacy/
  platform/supply-chain) as the SSOT.
- **Audit pass:** the harness `/audit` + `security-review` skill + a `red-team`, covering authz, injection
  (chat-XSS), economy/dupe, **RLS-leak verification on the pinned version** (the headline check — resolves
  ADR-0015's defense-in-depth caveat or moves data to private tables), auth/account-takeover, rate-limit/DoS,
  deletion/export.
- **Remediation tracking + a blocking launch security sign-off** (no launch with open criticals); a
  disclosure/IR path + a **re-audit cadence**.
- **Out of scope:** a third-party pen-test (recommended; M25 preps for it); bug bounty; formal certification.

## Key design + boundary
Consolidation + a gate, not new per-system controls — the standing mechanical gates (auditor/privacy/supply-
chain/no-PII) do the continuous work; M25 is the periodic human+tooled assurance. The final pre-launch item.

## Risks / decisions
RLS confirmed not enforcing at 2.8.1 (see Recency check — this is settled, not a thing to discover) →
private-table-plus-scoped-view migration, audited for completeness. Audit theater → severity-triaged
findings + a blocking sign-off, not a checkbox.

## Recency check (2026-08-23, review pass — ceremony AUTHORIZED, PLAN.md §9)

**The "RLS-leak verification on the pinned version" headline check's premise moved from open question to
settled fact.** RLS (`client_visibility_filter`) is confirmed **unenforced** at 2.8.1 — `ADR-0197` FF3/W0-6
verified it byte-identically `unstable`-gated and unimplemented on the pinned toolchain, corroborated by
`OBS-47`'s standing instruction to build any future read-path as a `#[view]` "unless a subsequent
SpacetimeDB release documents RLS as stable" (still not the case). This is stronger than
`security-threat-model.md`'s current wording ("RLS is experimental... accepted as defense-in-depth,"
"verified per-version") suggests — that doc (this milestone's own SSOT) has been corrected in the same
session (2026-08-23) to say RLS is confirmed unenforced, not merely unverified; re-read it fresh at ceremony
time rather than trusting a cached summary. **The mitigation this sketch deferred a choice on ("verify RLS,
or move data to private tables") has already been exercised twice in production**: `ADR-0194`
(`monster_pub`) and `ADR-0198` (`battle`), both private-table + owner/participant-scoped `#[view]`. M25's
actual audit job is now narrower and more concrete than "resolve ADR-0015's caveat" — **verify completeness**
of that migration: enumerate every stakes-classified table in the threat model and confirm each either (a)
has no real confidentiality stakes, or (b) is private with a scoped view proven to match its stakes class,
with no table silently still relying on RLS for anything that matters. Per the 2026-08-23 unstable-feature
policy ruling (`mdrewt/monster-realm#342`), do not let this finding read as "avoid all unstable/beta
SpacetimeDB surface forever" — the ruling is specifically that RLS *itself* is not usable (still unstable,
zero evidence of stabilization), not a blanket stance against newly-stable features elsewhere in the audit
scope. Everything else (STRIDE coverage, chat-XSS/economy-dupe/auth audit scope, the blocking sign-off gate,
re-audit cadence) is unaffected.

## Fan-out & integration note (for the slicing agent)

When finalizing this milestone's slices and `touches:` sets — drafted at build time per `PLAN.md` §9 for the M15–M25 sketches; refined from the existing task breakdown for the fuller M11–M14 specs — design for **`touches:`-disjoint parallel fan-out** and plan for **post-integration correctness**:

- **Size and organize files so independent work declares narrow, disjoint `touches:` sets** and can run concurrently (bounded N≤2, `docs/routing.md`). Slice along the natural boundaries: a `game-core` rule module; a **server-module domain module** (the M8.9 map — `schema/guards/marshal/content/movement/monster_mgmt/battle/taming` plus any new domain file this milestone adds); `client/`; content data (`game-core/content/` + `validate_content`); and `evals/`. Two slices are parallelizable only when their `touches:` sets do not overlap (e.g. a server-reducer slice ‖ a client slice, or two different server-domain modules).
- **Don't grow a new monolith.** If this milestone would push a file toward the size that made `server-module/src/lib.rs` a serialization bottleneck (the reason for M8.9), introduce the module split **as part of this milestone** — add a new domain module and extend the M8.9 `touches:` vocabulary — rather than appending to one large file. Keep new tables additive in `schema.rs`; keep module/file names stable so downstream `touches:` declarations remain valid.
- **Disjoint files are necessary but not sufficient — respect the dependency chain.** A pure `game-core` rule gates its reducer, which gates the client/evals; the client needs regenerated bindings. The realistic shape is usually a **serial rule→reducer spine with a parallel client ‖ evals tail**; declare slice *order* accordingly, not just `touches:`.
- **Include an explicit post-integration verification plan in the definition-of-done.** Parallel slices passing in isolation does **not** prove they work together. After the slices merge (serial, verifier-gated, each later slice rebased on the merged earlier ones), the milestone MUST verify the *integrated whole*: full `just ci` green-and-meaningful, `bindings-drift = 0`, schema-snapshot intact, the e2e/integration gate green, and a check that the **combined** behavior satisfies this milestone's EARS acceptance criteria end-to-end (not merely that each slice was individually green). Name every cross-slice contract (shared types, table columns, reducer signatures, generated bindings) and the test that proves it holds after integration.

---

## 12. Notes for the runner

Read §1.1 before anything else — six of the sketch above's premises are corrected there, and two of them
(the dead RLS premise, the already-built ADR-0199 gate) would otherwise send a slice rebuilding shipped
machinery. Then read §2.1: the two-channel model is the frame every gate derives from, and the severity rule
in it is what keeps 243 `Err(` sites from all reading as findings.

**Do not start S6 before §8-2 is answered** (a `tags: v*` trigger never fires — the repo has zero tags), and
**do not start S0 before §8-1** (amending an accepted ADR is not a spec author's call). S4 is the widest
slice, the only one touching `client/`, and the only one that can regress a shipped feature — §2.5(1-4) has
four required parts and omitting part 4 is an automatic CI red. Expect `[oracle-coupling-01]` to go RED when
S4 lands: that is the gate working (§4.1(2)), and a green there is the thing to be suspicious of.
