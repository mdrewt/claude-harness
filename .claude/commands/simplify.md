---
description: Reduce complexity — remove premature abstraction, dead code, and unjustified deps.
argument-hint: [path]
---
Review $ARGUMENTS (default: the current change) for over-engineering against
`standards/principles.md` (YAGNI with named exceptions, DRY-but-not-across-
boundaries, least surprise). Propose the *smallest* change that preserves
behavior and keeps CI green: collapse needless layers, delete speculative
generality and dead code, and flag any dependency or pattern missing its
`docs/DECISIONS.md` entry. **Checks are in scope**: you may propose deleting a
test or check under the legitimate-deletion rule in `standards/testing-tdd.md`
(redundant, implementation-detail, source-scan, prose-pin, superseded) — name
the reason and the surviving check. A proposal against a test that gates the
current change is executed by the **tester**, never the implementer, and the
verifier adjudicates every deletion. Show a concrete diff. Do not change
behavior. Part of every task's definition-of-done alongside `/review`.
