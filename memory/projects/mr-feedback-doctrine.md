# mr-feedback-doctrine — operator feedback handling (v1.0 ACTIVE 2026-07-26)
Binds: the native loop whenever it processes operator feedback artifacts (playtest gates lifting,
feedback/notes files, decision-issue answers) or fleshes out milestone skeletons into specs.
§1 INVARIANTS bind everywhere in REDUCED form: outside the loop (casual/Cowork), I-1 means RELAY
the statement verbatim into a §2 channel or tell Drew explicitly it won't be tracked — the ledger
duty itself attaches only at §2 channels (an unenforceable invariant breached daily would teach the
system that breaches are tolerable). The invariants are the lightweight doctrine; everything else
scales in via §5 routing. Runs cite the version they
followed. Supersedes (2026-07-26): the SSOT coverage-doctrine paragraph — now a pointer here; §10 subsumes it.

## §1 INVARIANTS (universal; breach = tracked PROCESS defect)
- I-1 NOTHING VANISHES. Every operator statement, every channel, becomes a ledger item (verbatim
  quote + source pointer) or is logged deliberately-not-actioned. Paraphrase never substitutes.
- I-2 NO INVENTED CONTENT. Every recorded interpretation/status claim traces to a source. An
  untraceable claim is treated as false and retracted (ornith confabulation incident, 2026-07-25).
- I-3 WORDS BIND BY KIND (§3) — and kind, WEIGHT (§5), and item GRANULARITY (no splitting a HEAVY
  into LIGHTs to dodge ceremony; no merging distinct claims) may never be assigned self-servingly.
  When ambiguous, ASK — never pick what is cheapest for the system. The §11 auditor samples all three.
- I-4 EXPECTATIONS MATCH REALITY AT EVERY PLAYTEST. Before Drew plays he holds a manifest: fixed /
  deferred(+reason,target) / declined(+reason) / parked(+what we need). Deferral is legitimate only
  once communicated — even when the deferral decision itself was correct (r1→r2 incident, 2026-07-26).
- I-5 NO SELF-CERTIFICATION. Done = an agent that did not write the change confirms the ORIGINAL
  complaint no longer reproduces. No size exemption; only verification depth scales (§5).
- I-6 EFFORT PROPORTIONAL TO STAKES. Caps and floors of §5. Hitting a cap forces a state change
  (park / escalate / descope) — never quiet continued burn.
- I-7 STUCK WORK SURFACES ITSELF. No item holds one state ≥3 processing cycles without progress or
  operator escalation.
- I-8 ONE-LOOKUP AUDITABILITY. Every status claim in the ledger links evidence (PR, test run,
  quote, issue). "What happened to the thing I said about X?" is answerable in one lookup.

## §2 INTAKE
Channels (enumerated; each sweep logs per-channel counts INCLUDING zero — a flatline is a signal):
(a) `specs/monster-realm-v2/playtest-feedback-*.md` wake files; (b) `$MEM/PlaytestReport.md` and
other freeform operator notes; (c) operator directives relayed via handoffs/briefs; (d) DECISION
issue answers (`$MEM/decisions/`). Spawn the `feedback-triage` agent (harness `.claude/agents/`) to
decompose: one item per independently-dispositionable claim; ID + verbatim quote + source pointer +
relations. Appendices/asides/parentheticals are items (that is exactly what fell through in r1).
COVERAGE MAP: every source paragraph maps to >=1 item ID or an explicit `no-op:<reason>` marker —
mechanically verifiable; and `mr-feedback covermap verify` checks the map mechanically; the §11 auditor
then samples the `no-op:` markers and multi-claim paragraphs for buried items (triage must never
be its own checker; a full recount would pay triage twice — the verified map narrows residual risk
to exactly the no-op'd and merged paragraphs).
Operator lists are non-exhaustive; interpret intent over literal wording (typos, misused words,
omissions) — but record the interpretation, and fact-check his assertions honestly in both
directions: he may be wrong; so may we (I-2 applies to our corrections too).

## §3 CLASSIFICATION — kinds, deference, bias
Two axes — DEFERENCE to his stated direction and OBLIGATION to act — are the MODEL behind the
kinds; the ledger records kind + confidence only (axes are derived, not data). Perceive continuously, act discretely — snap to the nearest kind below;
interpolation lives in the tie-break: prefer the interpretation CHEAPEST TO REVERSE, and for
HEAVY-adjacent ambiguity post a read-back (one paragraph of intended interpretation, via decision
issue, non-blocking) before budget commits.
- CORRECTION (he says we erred): comply, next cycle, queue-jumping. A factual counter-record may be
  attached; compliance proceeds regardless — EXCEPT when the §2 fact-check produced reproducible
  evidence his premise is false: then a decision issue goes up BEFORE reverting reviewed work, and
  compliance proceeds anyway if unanswered by the next cycle (one round, never more).
- DIRECTIVE ("implement X"): outcome binding, means ours; moderate action-bias. Genuine
  disagreement → say so once, with alternatives/compromises + downside mitigations, and confirm
  before proceeding against our advice. His word is final; execute whatever he decides as well as
  it can be executed.
- SUGGESTION (specific proposal, not an order): slight bias to follow; declining is viable only
  with strong recorded reasons.
- ISSUE-REPORT (symptom, ± proposed solution): symptom is ground truth; moderate action-bias but
  ZERO solution-bias — his proposal is one candidate among ours; optimize for most-correctly
  addressing the issue. Unreproducible/undiagnosable → OBSERVABILITY disposition (§4 note).
- INFO/OPINION REQUEST (ledger token `question`): zero bias, enforced structurally (§6 protocol), grounded in evidence,
  research, and reasoning. Answered within the processing episode or it becomes a tracked item;
  never silently converts to work and never silently goes unanswered.
- PREFERENCE: weigh in future decisions at judged strength; distinguish from idle remarks.
- REMARK (offhand): log verbatim, zero obligation. Cluster-promotion: ≥3 remarks circling one
  irritation → a system-inferred preference item whose ONLY action is a confirm/dismiss question to
  Drew (flagged "you never asked for this"). The auditor samples LOGGED remarks each gate for
  missed clusters — the promoter must not be the only eye on the pile.
- DELEGATION ("make this better", vague/autonomous): judgment transfers to us — including deciding
  what needs action at all. BEFORE spend: written scope statement (what "better" was taken to
  mean), budget cap, definition-of-done; HEAVY delegations route the scope statement through
  `judge` first.
- REVIEW/ADVERSARIAL REQUEST (ledger token `review-request`): slight bias against the subject — assume unreliable, double-check
  everything — but findings must be real, evidenced, hallucination-free; "it was correct" is an
  acceptable verdict.
CROSS-KIND RULES (not kinds — fewer bins classify better): (1) PRECEDENCE — explicit beats
implied; later beats earlier; specific beats general; a retraction closes the old item LINKED to
its reversal (history preserved, I-8). (2) CONTEXT — descriptions/added information rarely shift
bias; they attach as context to related items. (3) TARGET=DOCTRINE — feedback about this doctrine
routes to §12, never absorbed silently. (4) DEFAULT — unclassifiable: best judgment, lean
unbiased; if plausible kinds differ materially in behavior, ASK (I-3).

## §4 ACTION TAXONOMY (what each item becomes; never duplicated — reconcile against the EXISTING
backlog (PLAN §9, open specs/milestones) before creating: update, don't duplicate)
- FIX: bug/discrepancy/unexpected behavior. Root cause required; sweep for similar issues; tests
  that BITE added/updated (type per judgment: unit/contract/integration/API/E2E/regression/smoke/
  perf) — mindful that excess or wrong-type tests cost suite time and false positives.
- IMPLEMENT: new feature/script/behavior — full plan/execute/test/review.
- REFACTOR: behavior-preserving improvement (quality, efficiency, security, debt).
- REDESIGN: pivot changing existing work/plans/goals; destructive; plans before subdivision into
  fix/implement/refactor/improve/clean children.
- IMPROVE: adjusts an EXISTING feature's behavior (unlike refactor) without being new (unlike
  implement).
- DRAFT: new milestone(s)/spec sets; additive — does NOT change existing decisions (that is
  REDESIGN); plans before subdivision.
- CLEAN: leftovers — wiring, configs, docs/specs/context truth, deps, handoffs, commits, merges.
OBSERVABILITY note: an unactionable ISSUE-REPORT becomes a FIX/IMPLEMENT action whose target is
telemetry/tracing/testing/debuggability aimed at the symptom, so a recurrence is catchable. The
original item PARKs (§8) — it does not close.

## §5 WEIGHT & ROUTING (ceremony is a routing outcome, not a document choice)
- FEATHER (<~1h agent-time, no structural touch): scripts + `mr-ollama` advisory drafts; batch
  kindred items into polish slices (caps stay per-item; batch verification still complaint-repros
  EACH item); verify via a PRE-EXISTING or non-author-authored script, else one
  reviewer — an implementer-authored check is self-certification (I-5) however mechanical. Cap $5/item.
- LIGHT (< half a slice): normal slice pipeline; single adversarial reviewer + complaint-repro
  check. Cap $40/item (PROVISIONAL — derived from per-RUN
  stats, median $11 / p90 $54; recalibrate from §8 per-ITEM data after the first gate).
- HEAVY (≥ half a slice OR risk-promoted: SpacetimeDB schema, net protocol, save data, economy
  balance — size never demotes risk): full §6 ceremony. Cap = the SPEND-ALERT threshold (SSOT:
  `mr-budget-config.json`; $150 at ratification, hard-tier p90 evidence),
  process (non-implementation) share ≤40% (~$60).
- FLOOR at every weight: one independent verification (I-5). Cap hit → park + notify (I-6).
- Playtest-initiated design changes are typically HEAVY: the full ceremony is warranted there
  (operator ruling 2026-07-26); FEATHER/LIGHT exist so trivia never pays design-change overhead.

## §6 HEAVY CEREMONY (operator's pipeline, kept intact)
1. INVESTIGATION: diagnose root causes, current behavior, blast radius, obsolescence candidates.
2. IDEATION: 6 brainstormers — 1 unbiased, 1 + investigation context, 2 with unique relevant
   lenses, 2 + research context (§7); each refines against its own adversarial reviewer.
3. SYNTHESIS: the `judge` agent (structural bias protocol is part of its definition) synthesizes
   the optimal plan; the synthesis is refined by its own adversarial reviewer.
4. EXECUTION: per action type (§4) — code, or specs/milestones/ADRs for DRAFT/REDESIGN.
5. REVIEW: adversarial pass for quality/standards/correctness PLUS the distinct complaint-repro
   verification (I-5): does the thing Drew reported actually not happen anymore?
6. FINALIZATION: definition-of-done cleanup — wiring, configs, docs/specs/context truth, deps,
   tests run, handoffs, commits pushed, branches merged (per merge authority rules).
Structural bias techniques — SSOT is the `judge` agent definition; restated ONLY because they bind
EVERY reviewer in this pipeline, not just judges (drift between the two lists is a §12 defect): pre-committed criteria before reading candidates; evidence-before-verdict;
provenance-blind evaluation where feasible; no one judges work they produced; falsifiable verdicts;
like-for-like comparisons (blended, not best-case).
Budget-pressure degradation order (I-6): shed brainstormers 6→4, then their refiners; NEVER shed
§6.5 review or the complaint-repro check. (Basis: subagent invocations ≈ $1-5 sonnet / $5-15 opus —
a full ceremony fits the ~$60 process share; recalibrate from §8 per-item cost data.)

## §7 RESEARCH (ADR-0007 machinery; keeps this doctrine lean)
Research what the §4 actions actually need — via `expert` over `<project>/docs/research/INDEX.md`
(≤3 docs); missing domain → `researcher` persist-mode (`/research-domain`), paid once, cached.
Research docs carry dates; treat agentic-coding and fast-moving-dependency advice as perishable —
re-verify stale docs before relying on them. Sources are unreliable by default; "best" is
situational; hunt pros/cons/gotchas/alternatives, not just the first answer. Seed domains: `docs/research/
SEED-DOMAINS.md` in the project research library (Drew 2026-07-26, non-exhaustive — reference
data, not doctrine; mine via `/research-domain` as §4 actions demand).

## §8 TRACKING & CONSERVATION (the part r1 lacked; enforcement is scripted, not aspirational)
Ledger: `$MEM/feedback-ledger.jsonl` via `mr-feedback` (state machine enforced at write time). Work rows in the usage ledger carry the feedback-item
ID so `mr-metrics` can report cost-per-feedback-item (the evidence base for tuning §5 caps).
STATES & TRANSITIONS (this table is the authority; `mr-feedback` implements exactly this):
  CAPTURED→CLASSIFIED (triage) | CLASSIFIED→DISPOSED (supervisor decision run; DISPOSED is INVALID
  unless it records action type §4 + weight §5 + scheduled target — a bare "FIX, someday" is the
  r1 failure with a ledger row; reconciler flags it) | CLASSIFIED→LOGGED (remarks) |
  DISPOSED→ANSWERED / DECLINED-COMMUNICATED (at communication time) | DISPOSED→IN-WORK (launch) |
  IN-WORK→VERIFIED
  (non-author complaint-repro, I-5) | VERIFIED→terminal (supervisor only, at communication time) |
  DISPOSED→PARKED (diagnosis budget exhausted; PARKED is a held substate of DISPOSED — counts as
  accounted for conservation, staleness-exempt while waiting on operator) | PARKED→IN-WORK (repro found) | PARKED→terminal
  (operator ack, or 2 consecutive playtests clean OF THAT SYMPTOM — auto-close recorded in the
  brief: "closing X; object to reopen"). Terminals: SHIPPED-VERIFIED, ANSWERED (LIGHT+ answers get
  a non-author source-check first — invented answer content is exactly failure (c)),
  DECLINED-COMMUNICATED, LOGGED (kind=REMARK only), OPERATOR-CLOSED. Only supervisor decision runs
  write terminal states. Reopen re-enters at CLASSIFIED with its old ID + regression counter. Rules:
- CONSERVATION: items-in == items-accounted, per processing episode; the reconciler (cheap script,
  run by the tick) blocks the next playtest gate on mismatch. FALSE-BLOCK REPAIR: a mismatch
  auto-creates a top-priority PROCESS item AND a decision issue offering Drew an explicit override
  to raise the gate anyway — the tool must never deadlock the loop it serves.
- LEDGER INTEGRITY: append-only JSONL, git-tracked; reconciler validates parseability every run —
  corruption is a top-priority PROCESS item, never silent. ACTIVATION GATE (PASSED 2026-07-26, 15 checks):
  `mr-feedback selftest` — seeded faults (omission, bare disposition, illegal transition, corrupt
  line, non-remark LOG, covermap gap) must stay green; re-run after any `mr-feedback` change.
- DISPOSITION cannot sit unmade across two cycles; "deferred past next playtest" is valid only if
  Drew's own text says so for that item (§10).
- STALENESS: 3 cycles unchanged → escalate = move to queue FRONT (kind-order tiebreak among
  escalated items). Waiting-on-operator substates are EXEMPT from the clock — they surface via the
  brief, not repeat pings (§9 alert economy).
- REGRESSION MEMORY: a reopened item keeps its ID + a regression counter; second reopen escalates
  its review band.
- PARKED (unreproducible/undiagnosable): bounded diagnosis budget (FEATHER 30min / LIGHT 2h /
  HEAVY half-slice), then OBSERVABILITY action (§4) + notify Drew with what-we-tried and
  what-we-need; closable only by operator ack or two consecutive clean playtests — never silence.
- Mid-run arrivals: new feedback QUEUES via the ledger; only CORRECTIONs and CI-red-class items
  interrupt live work. Operator-stated urgency adjusts queue position; absent a stated urgency,
  kind ordering applies (correction > issue-report > directive > the rest).
- DEFINITIONS: "processing episode" = the decision run(s) consuming one feedback artifact end to
  end; "cycle" = one supervisor decision run; "CI-red-class" = master CI red or an mr-audit
  gating-test integrity flag; "half a slice" ≈ half the median merged-slice effort — judgment call,
  with the burden of proof on choosing the LIGHTER class (I-3).

## §9 COMMUNICATION (push, batched by urgency; sessions are ephemeral — state is files + issues)
- BLOCKING decisions: `mr-ask-drew <slug> --blocking` — standardized issue (root issue / question /
  recommendation / alternatives / context), written for a human deciding on his phone;
  `mr-decision-watch` resumes the loop on his comment/close (close-without-comment = recommendation
  accepted; for destructive or HEAVY decisions the acceptance is echoed in the next brief BEFORE
  execution — one accidental phone-close must not spend real money silently). Fallback on ASK-DREW-UNAVAILABLE: plain `.blocked-on-human` + wake_file.
- NON-BLOCKING: batched into the DISPOSITION BRIEF — the pre-playtest gate artifact (I-4): Fixed
  (PR links) / Deferred (reason, target) / Declined (reason) / Parked (needs) / Answered, plus
  `decision-defaulted:` records for async review, plus the reconciliation line "N received, N
  accounted". Reconciliation failure blocks the gate. One push (issue or toast) when a brief lands
  — individual FYI pings are forbidden (alert fatigue kills the channel). Asks inside a brief are
  ordered by consequence and capped (~5); the remainder queue to the next brief — batching prevents
  spam, the cap prevents decision fatigue.
- Read-backs (§3 — HEAVY-adjacent ambiguity of ANY kind; §3 controls the trigger): non-blocking
  issue; proceed after a 24h grace window if unanswered, recording the interpretation as
  decision-defaulted. >=2 consecutive unreviewed defaults on one milestone → the next read-back is
  BLOCKING (chronic defaulting must not become de facto autonomy).

## §10 PLAYTEST SPECIALIZATION (subsumes the 2026-07-26 SSOT coverage doctrine)
When a playtest feedback artifact lifts a gate: full §2→§9 pass over EVERY item (incl. freeform/
appendix strays); dispositions restricted to FIX / PARTIAL /
OBSERVABILITY / ANSWER / DECLINE(+reason — appears in the brief) / DEFER(only when Drew's own text
authorizes it for that specific item; +target) / LOG(valid ONLY for kind=REMARK — the auditor flags
any LOGGED non-remark; LOG is not a garbage disposal). PARTIAL
only when the full solution is foundational and complex enough that the part honestly deserves
isolated playtesting before building on top; remainder explicitly queued, never dropped. A
PARTIAL's queued remainder is next-cycle work, NOT a coverage milestone — the gate may raise with
the part shipped and the remainder in the manifest as Deferred(+target); otherwise PARTIAL would
nullify its own purpose (or deadlock the gate). Separation
of concerns stands (hardening vs UI/UX = separate milestones) but ALL coverage milestones — both
tracks — complete BEFORE the next playtest gate is raised. The gate-raise BLOCKER carries the
manifest (I-4). An undispositioned item = incomplete table = gate does not raise.

## §11 VERIFICATION SUMMARY (who checks what — no overlap, no gap)
Plan quality: ideation adversaries + judge (§6.2-3). Code quality/standards: review pass (§6.5,
mr-audit gating block). Outcome vs complaint: complaint-repro check (I-5) by a non-author. Set
completeness: coverage map (§2, `mr-feedback covermap verify`, mechanical) + auditor sampling of
no-op/multi-claim paragraphs; ledger-internal consistency: conservation reconciler (§8, script). Expectation alignment: Disposition Brief gate
(§9). Process compliance: pre-playtest auditor samples I-2/I-3/I-5/I-8 (subagent; never audits work
it touched; findings are falsifiable or per-criterion attestations). Sample >=8 items per gate
(or all, if fewer); every CONFIRMED breach auto-files a PROCESS item and appears in the Disposition
Brief — visibility, not gate-blocking (no new deadlocks).

## §12 SELF-CORRECTION
Invariant breaches are CAPTURED as PROCESS items in the same ledger. Two breaches of one invariant
within a month → mandatory revision proposal to Drew via decision issue. Doctrine changes bump the
version + one-line changelog below. Meta-feedback (§3) lands here. Judgment calls a reasoning model
must make (vs. scripts) are legitimate — scripts enforce state, models interpret language; neither
substitutes for the other.

## Changelog
- v1.0 (2026-07-26): ACTIVATED — `mr-feedback` built (event-sourced JSONL, transition validation,
  reconciler w/ dedup'd decision-issue alerting, covermap extract/verify, 15-check seeded-fault
  selftest PASSED); tick reconciler hook; SSOT paragraph → pointer (r2 addendum preserved);
  `feedback-triage` agent aligned; seed domains → research library.
- v0.96 (2026-07-26): simplification round (operator-requested) — kinds 13→9 with cross-kind rules
  extracted; seed domains moved to research library; ledger schema = kind+confidence (axes are
  model, not data); auditor full recount → mechanical covermap verify + targeted no-op/multi-claim
  sampling; transition table gains ANSWER/LOG/DECLINE communication-time paths + PARKED→IN-WORK.
- v0.95 (2026-07-26): adversarial-review round — 20/20 findings applied (coverage map + auditor
  recount; DECLINE/DEFER added + LOG restricted to remarks; ledger integrity + activation gate +
  false-block override; FEATHER non-author verification; anti-self-serving extended to weight/
  granularity; transition table; correction valve; staleness exemptions; PARTIAL/gate fix; caps
  re-anchored; read-back limits; definitions).
- v0.9 (2026-07-26): initial merged draft — operator proposal + blind-agent structures (A:
  ledger/conservation, B: kind×weight routing, C: invariants) + all conversation rulings.
