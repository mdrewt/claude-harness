# Contributing to {{NAME}}

1. Start from a spec (`docs/specs/`) with EARS acceptance criteria.
2. Branch `feat/...` or `fix/...`; work in a worktree for parallel agents.
3. TDD: failing test first, then implement. Don't grade your own tests.
4. `just ci` must pass, honestly, before a PR. Add a `docs/DECISIONS.md` entry only
   when a call constrains future work and its why is not evident from the code
   (`standards/decisions.md`) — most changes record nothing.
5. Conventional Commits; squash-merge with a Conventional Commit title.
