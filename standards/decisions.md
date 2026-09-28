# Decision records

Decisions live in **one `docs/DECISIONS.md` per project** — a current-state
decision log, not an append-only archive. It answers "why is the code this
way?" for choices a reader could not re-derive from the code in a few minutes.

## When an entry is warranted
Write an entry only when **both** hold:
1. The decision **constrains future work** (rules an approach in or out,
   freezes a surface, sets a pattern others must follow).
2. The "why" is **not evident from the code** (a maintainer would plausibly
   undo it or ask why).

New dependencies and cross-cutting patterns usually qualify. Bug fixes,
implementation details, process events, and anything the type system or an
existing test already explains do not. **Roughly a few entries per milestone
is normal; zero per slice is normal.** A slice that mints a decision entry as
a matter of routine is doing it wrong.

## Format
```
## <Decision title — a claim, not a topic>
<What was decided, in one or two sentences.>
<Why — the constraint or trade-off that forced this choice.>
<What it rules out — the tempting alternative a maintainer should not re-try, and why.>
```
10–25 lines each. Numbering, statuses, date fields, and "Confirmation gate"
ceremony are deliberately absent — if a decision needs enforcement, the
enforcement is an ordinary test or lint (see `testing-tdd.md`), and the entry
simply mentions it in prose.

## Maintenance
- **Supersede in place.** When a decision changes, rewrite its entry to the
  current state (git history is the archive). Never chain "Amends:" /
  "Superseded-by:" entries.
- **Factual claims** about the code are re-derivable from it; one that can't
  be verified gets dropped, not carried. **Rationale** (the "why") is by
  nature not in the code — it is judged for plausibility against the stated
  constraint, never stripped for being unverifiable.
- The `/decision` command drafts entries; the reviewer checks new entries meet
  the bar above (and flags routine minting).
