# 5-gen context-engineering review (2026-07-27)

Dissection of two claude.com posts — "The New Rules of Context Engineering for
Claude 5-Generation Models" and "A Field Guide to Claude Fable: Finding Your
Unknowns" — against this harness, with a skeptical eye on which claims are fact
vs. opinion vs. marketing. Referenced by `docs/routing.md` (generation-staleness
note) and the Cowork memory card `context-engineering-5gen-review`.

## 1. What the articles claim

**Article 1 (context engineering)** argues 5-gen models (Opus 5, Fable 5) need
far less scaffolding: Anthropic reports removing "over 80% of Claude Code's
system prompt … with no measurable loss on our coding evaluations." Six shifts:
rules → judgment, examples → expressive interfaces, upfront → progressive
disclosure, repetition → single-home instructions, manual CLAUDE.md memory →
auto-memory, simple specs → rich references. Prescription: lightweight,
gotcha-focused CLAUDE.md; skills for episodic guidance; `/doctor` to rightsize.

**Article 2 (field guide)** frames the gap between "the map" (prompt/context)
and "the territory" (the real codebase) as *unknowns* in Rumsfeld quadrants.
Claim: "Claude Fable is the first model where quality is bottlenecked by my
ability to clarify its unknowns." Techniques: blind-spot passes, prototypes to
surface recognize-on-sight criteria, one-question-at-a-time interviews
("prioritize questions where my answer would change the architecture"), code
references over prose, an `implementation-notes.md` with a Deviations section,
and post-hoc explainers/quizzes.

## 2. Credibility assessment

**"80% removed, no measurable loss."** Directionally credible, not transferable
as a number. (a) Unverifiable — no methodology published, and coding evals
measure coding outcomes, not process compliance: deleting "never `git add -A` in
the runner-shared tree" would never register as a coding-eval regression; it
surfaces as a corrupted commit weeks later. (b) Selection effect — what they
deleted were *style guardrails* compensating for older models' taste; that says
nothing about rules encoding environment facts or incentive structure. (c) The
article concedes it: "we can delete **many** of them" — not all — and never
identifies which constraints must stay.

**"Let Claude use judgment" — true for taste, wrong for gates.** Style judgment
has genuinely improved. But the tester/implementer split, the verifier's
weakening-vs-correction protocol, and the judge's structural-bias protocol are
not capability crutches: an agent under pressure to go green has an *incentive*
to weaken its own gates, and a more capable model games a weak gate better, not
less. Capability improvements don't dissolve principal-agent problems. Keep.

**Expressive interfaces over examples.** Sound; adopt where cheap (enum states
in CLI `--help` output beats worked examples in agent briefs).

**Progressive disclosure / don't repeat.** Sound; mostly describes what this
harness already does. The strongest actionable line is the diagnosis of
"conflicting messages in a single request" — conflicts, not volume, are the
real failure mode.

**Auto-memory replacing CLAUDE.md.** A product-feature announcement dressed as
a principle — the weakest of the six. Auto-saved memories are unaudited; the
harness memory + feedback doctrine is curated with verbatim-quote discipline.
The legitimate kernel: memory should be cheap to write and pruned aggressively.

**Rich references over descriptions.** Sound and already lived here (spec-kit +
EARS + vendored references).

**Article 2's bottleneck claim.** One practitioner's experience of *interactive*
work, honestly caveated. For autonomous fleet operation the bottleneck is at
least equally verification integrity — hence the review-residual milestones.
Adopt the unknowns techniques at the spec/plan boundary (operator in the loop);
don't rebuild the autonomous loop around them. Its best caveat — too-specific
instructions block pivots, too-vague ones invite generic best-practice guesses —
is exactly what EARS criteria + ADR'd decisions already answer.

**The quadrant framework.** Repackaged Rumsfeld/Johari — useful vocabulary,
zero evidentiary weight.

## 3. What the harness already gets right

Thin always-on context (CLAUDE.md as a 12-line pointer; AGENTS.md a lean lookup
table) *is* the articles' target architecture. Skills with Gotchas logs are
progressive disclosure done properly — and the Gotchas format (symptom → cause →
avoid) is exactly the "repository gotchas" content the article says belongs at
CLAUDE.md tier. Subagent isolation with summary-only returns, the research
library's slug+abstract contract, lazy MCP loading — all anticipate the article.
`just audit` is a home-grown `/doctor`, and the AGENTS.md authoring rule ("if an
agent already does something correctly without being told, delete that line") is
the article's entire thesis, written before the article. Article 1's value here
is permission and a trigger to run that deletion pass now that the model
generation changed underneath the config.

## 4. Recommendations (prioritized)

1. **Deletion/conflict sweep** — bucket every rule as *capability crutch*
   (delete after a ~1-week observation window on 5-gen diffs), *environment
   fact* (keep: WSL paths, runner git discipline, toolchain pins, vitest
   footguns), or *incentive rule* (keep verbatim: tester/verifier/judge
   protocols, budget caps, depth=1). Hunt duplicates and conflicts while
   sweeping.
2. **Refresh `docs/routing.md`** — tiers/economics were calibrated on 4.x;
   re-derive from current pricing + this harness's eval gates; re-check agent
   `model:` pins (under-tiering hurts most at verifier/judge; over-tiering
   wastes most at doc-keeper).
3. **Unknowns-surfacing at the spec boundary** — interview step in `/spec`
   (architecture-changing questions first) + blind-spot pass via `/consult`.
4. **Deviations log in the build loop** — `implementation-notes.md` with gate
   teeth: reviewer+verifier read it; doc-keeper folds it into the memory card;
   the file never merges (gitignored in templates).
5. **Prune `memory/projects/`** — lifecycle + `just memory-prune` for `.bak`
   clutter; archive superseded progress files.
6. **Extend `doctor.mjs`** — near-duplicate instruction detection across
   AGENTS.md / standards / skills / agent bodies; split oversized Gotchas logs.
7. **CLI expressiveness** — enumerate valid kinds/states in in-house CLI
   `--help` so agent briefs can shrink.

## 5. What NOT to change, despite the articles

Don't delete 80% of anything on an unverifiable internal benchmark — this
harness's context is mostly environment facts and incentive structure, which
their experiment didn't test. Don't replace curated memory with auto-memory.
Don't soften the tester/implementer split, the verifier weakening protocol, or
the judge bias protocol — these police incentives, not capability, and the case
for them strengthens as models get more persuasive. Don't trade mechanical
enforcement for "judgment" — "wire a check; never rely on remembering" is
orthogonal to model quality. Treat quizzes/explainers as optional operator
tooling, not loop ceremony.

## 6. Status (2026-07-27)

Shipped: №2's staleness note (not yet the re-derivation), №3, №4, №5's recipe,
plus a `just 1.55.1` root pin repairing the doctor gate (harness commits
f3356b6, a54f341, and the follow-up commit referencing this doc). `/spec` also
absorbed two mechanics from the operator-local `grilling` skill: a recommended
answer per question, and answer-from-the-codebase-when-discoverable. Open: №1
(observation window runs from 2026-07-27), №2's re-derivation, №5's progress-
file archival, №6, №7.
