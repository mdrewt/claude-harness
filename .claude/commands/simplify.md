---
description: Reduce complexity — remove premature abstraction, dead code, and unjustified deps.
argument-hint: [path]
---
Review $ARGUMENTS (default: the current change) for over-engineering against
`standards/principles.md` (YAGNI with named exceptions, DRY-but-not-across-
boundaries, least surprise). Propose the *smallest* change that preserves
behavior and still clears the eval gate: collapse needless layers, delete
speculative generality and dead code, and flag any dependency or pattern that
lacks an ADR. Show a concrete diff. Do not change behavior. Part of every task's
definition-of-done alongside `/review`.
