---
name: research-protocol
description: Contract for the persistent research library. Preloaded into the researcher (to write and register durable domain summaries) and the expert (to find and consult them). Use whenever persisting deep research or advising from it.
---
# Research protocol

Single source of truth for how durable domain knowledge is written, indexed, and
consumed in this workspace. The library is reusable research (genre mechanics, art
direction, netcode, etc.) that informs later decisions — distinct from `/deep-research`,
which is throwaway.

## Where it lives — two tiers
- **Shared library (default — the reusable "consultant" knowledge):** the harness repo's
  `docs/research/`. **General, project-agnostic** domain knowledge (genre mechanics, art
  direction, netcode, …) that informs brainstorming / planning / review on *any* similar
  project. This is what the `expert` consults by default; write general findings here so they
  stay reusable across projects.
- **Per-project library (optional — project-specific findings):** `<project>/docs/research/`,
  for research that only makes sense for one project (its stack, constraints, decisions).

One markdown file per topic; the kebab-case filename equals the `slug`. Each library's
`docs/research/INDEX.md` is GENERATED from doc frontmatter — never hand-edit its
`BEGIN:auto … END:auto` block. Default to the shared library; only put genuinely
project-bound findings in a project library.

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
## Design implications & transferable principles   # shared/general doc
#  (a project-local doc may instead title this "Design implications for THIS project")
## Open questions
## Sources
```
Keep `abstract` to one line (the index truncates at ~120 chars).

## Writing a doc (researcher — persist mode)
1. **Check first — never research a topic twice.** Read `docs/research/INDEX.md`. If an
   entry already covers this topic, REFRESH that doc in place (reuse its existing slug,
   bump `updated`) and return its slug — do not create a parallel doc. Only create a new
   file for a genuinely new topic, with a slug distinct from every existing entry.
2. Deep-dive in your own context (web + code; Context7 for library docs).
3. Write `docs/research/<slug>.md` from the template; fill every frontmatter key.
4. Keep it a tight, structured summary with design implications — **transferable principles**
   for a shared/general doc (no dependence on one project's roadmap), or project-specific for a
   project-local doc — not a transcript. Cite sources.
5. Do NOT edit the index yourself; the write hook regenerates it. If unavailable, run
   `just research-index <project>/docs/research`.
6. Return to the caller ONLY the slug + a 5-line abstract. Never dump the doc body.

## Authoring standard (every doc)
- **Project-agnostic by default (shared library).** A shared doc must read as portable
  knowledge for *any* similar project — **no project names, milestone numbers (`M1`/`M8b`),
  or ADR ids**, and generalize project-specific tech (say "the authoritative server", "a 2D
  sprite renderer", not the exact product). A *project-local* doc may reference its own
  milestones/ADRs. `just research-lint <dir> --shared` enforces this mechanically.
- **Consultant voice.** Present options + tradeoffs + **named precedents** (real systems,
  titles, techniques), and **state your assumptions** — you may not know the reader's stack,
  scope, or roadmap. Cite a source for every load-bearing claim; frame applicability by
  generic feature-area, not a roadmap.
- **Verify version-sensitive facts.** For fast-moving libraries/toolchains, do NOT trust
  training for current versions/APIs — verify against current official docs, set
  `confidence` honestly, and **explicitly flag any fact you could not confirm** rather than
  inventing it. Keep toolchain docs decision/architecture-level and point to the vendored
  API skills instead of duplicating reference.
- **Confirm the write landed.** After writing, verify the file exists and is complete — a
  silent write failure (e.g. a dropped fan-out agent) leaves the library inconsistent and
  the index stale.
- **Abstract <= ~120 chars, one line** — the index surfaces it verbatim and truncates at 120.

## Mechanical gate
- `just research-lint <dir> [--shared]` — per-doc validation: frontmatter completeness,
  single-line abstract, `status`/`confidence` enums, `slug == filename`; with `--shared`,
  project-agnostic purity (FAIL on project-name/ADR leakage, WARN on milestone-looking
  tokens). Exits 1 on FAIL.
- `just research-index-check <dir>` — index in sync, no duplicate slugs.
- Both gate the harness shared library in `just ci` (recipe `research-gate`). Batch growth
  goes through `/research-library` (fan-out -> verify each file landed -> regen index -> lint).

## Consuming docs (expert)
1. Read the **shared library** `docs/research/INDEX.md` in the harness repo first (your default
   knowledge base — the harness ships these agents/standards; from a sibling project it is
   `../claude-harness/docs/research/`, or locate it by the repo with `AGENTS.md` + `standards/`).
   Also read the current project's `docs/research/INDEX.md` if one exists.
2. Select the **≤3** most relevant rows by domain/tags/abstract across both; ignore the rest.
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
- **Two docs, one subject** → wasted work + a split library. cause: researching without
  reading the index first, or giving an existing topic a new slug. avoid: step 1 — refresh
  in place. `research-index --check` fails on duplicate slugs as a deterministic backstop.
- **A fanned-out researcher silently fails to write** -> a dropped/errored research
  subagent reports nothing but never wrote its file; the library is missing a doc and the
  index is stale. avoid: after any batch, verify each expected `<slug>.md` exists before
  regenerating/trusting the index (the `/research-library` workflow does this).
