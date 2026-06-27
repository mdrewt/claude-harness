---
name: research-protocol
description: Contract for the persistent research library. Preloaded into the researcher (to write and register durable domain summaries) and the expert (to find and consult them). Use whenever persisting deep research or advising from it.
---
# Research protocol

Single source of truth for how durable domain knowledge is written, indexed, and
consumed in this workspace. The library is reusable research (genre mechanics, art
direction, netcode, etc.) that informs later decisions — distinct from `/deep-research`,
which is throwaway.

## Where it lives
Per project: `<project>/docs/research/`. One markdown file per topic; the kebab-case
filename equals the `slug`. The manifest `docs/research/INDEX.md` is GENERATED from doc
frontmatter — never hand-edit its `BEGIN:auto … END:auto` block.

## Document template
```
---
title: <human title>
slug: <kebab-case == filename>
domain: gameplay        # gameplay | art | netcode | meta | ...
tags: [tag-a, tag-b]
status: active          # draft | active | stale | superseded
updated: YYYY-MM-DD
confidence: medium      # low | medium | high
sources: <count>
supersedes:             # slug this replaces, if any
abstract: "One single line the index surfaces verbatim so the expert can route without opening the doc."
---
## Scope
## Key findings
## Concrete examples & references   (cite every claim)
## Design implications for THIS project
## Open questions
## Sources
```
Keep `abstract` to one line (the index truncates at ~120 chars).

## Writing a doc (researcher — persist mode)
1. Deep-dive in your own context (web + code; Context7 for library docs).
2. Write `docs/research/<slug>.md` from the template; fill every frontmatter key.
3. Keep it a tight, structured summary with design implications for THIS project — not a
   transcript. Cite sources.
4. Do NOT edit the index yourself; the write hook regenerates it. If unavailable, run
   `just research-index <project>/docs/research`.
5. Return to the caller ONLY the slug + a 5-line abstract. Never dump the doc body.

## Consuming docs (expert)
1. Read `docs/research/INDEX.md` first.
2. Select the **≤3** most relevant rows by domain/tags/abstract; ignore the rest.
3. Open only those docs. If nothing relevant exists, say so and recommend
   `/research-domain <topic>` — do not bluff domain expertise.
4. Advise through that lens and cite each doc slug you used. Never modify code.

## Status lifecycle
`draft → active → stale → superseded`. When replacing a doc, set the new one's
`supersedes:` to the old slug and set the old one's `status: superseded`. Prune the
library like skills: fewer, better-targeted docs beat a sprawling pile.

## Gotchas
- **Bare `.md` in `.claude/skills/` fails `just validate-wiring`** → this skill must stay
  a `research-protocol/SKILL.md` directory. avoid: don't flatten it to a file.
- **Hand-editing `INDEX.md`** → overwritten on next research write. cause: it's
  generated. avoid: edit only prose outside the `BEGIN/END:auto` markers.
- **Researcher returning the whole doc body** → rots the main context, defeating
  isolation. avoid: return slug + 5-line abstract only.
- **Folded `abstract: >` blocks** → the index generator reads a single line. avoid: keep
  `abstract` on one quoted line.
