# AGENTS.md — {{NAME}}

Project-specific rules. Inherits the workspace `AGENTS.md` and `standards/`.

- **Stack:** {{STACK}}
- **Run:** `just setup` · `just test` · `just lint` · `just typecheck` · `just security` · `just ci`
- **Done =** `just ci` green, honestly: no test weakened or quarantined to pass, deletions adjudicated, new behavior covered by a test watched failing first (`standards/testing-tdd.md`).

## Notes
- Spec lives in `docs/specs/`; decisions in `docs/DECISIONS.md`.
- Tests are authored from acceptance criteria; the implementer doesn't grade its own tests.

## Principle tiers & inversions (this project)
Inherits `standards/principles.md`. Declare deviations here, one line of rationale each:
- Promoted to Tier 1: (none yet)
- Demoted / skipped: (none yet)
- Inverted: (none yet — e.g. "Postel inverted: reject out-of-contract input, don't clamp")

Add a `docs/DECISIONS.md` entry only when a call constrains future work and its
why is not evident from the code (`standards/decisions.md`); most changes record nothing.
