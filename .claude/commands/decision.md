---
description: Record a decision in docs/DECISIONS.md (only when it meets the bar).
argument-hint: [decision summary]
---
Delegate to the doc-keeper. Detect the decision from the recent conversation
(or $ARGUMENTS) and first test it against the bar in
`standards/decisions.md`: it must constrain future work AND not be evident
from the code. **If it doesn't meet the bar, say so and record nothing** —
that is a correct outcome. If it does, write or supersede-in-place the entry
in the project's `docs/DECISIONS.md` (title as a claim; what / why / what it
rules out; 10–25 lines), pulling alternatives from any prior /brainstorm or
/debate. No numbering, no index, no status fields.
