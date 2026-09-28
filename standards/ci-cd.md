# CI/CD

GitHub Actions, one pipeline per project repo.

## Required pipeline stages (gate merge)
1. **Setup** — pinned toolchain (devcontainer/mise), cached deps.
2. **Lint + format check** — fail on drift.
3. **Typecheck.**
4. **Unit + integration tests** — services via Compose. Coverage is collected
   as a **report, never a gated threshold** (`testing-tdd.md`).
5. **Project checks** — machine-contract suites where the project has them
   (bindings drift, schema snapshots); no standalone eval tier for new work.
6. **Security** — gitleaks + dependency review/SCA always; SAST and SBOM when
   the project's threat model warrants them, not by default.
7. **Build** — artifacts / container.

Mutation testing runs **out of band** (nightly or pre-merge on sensitive
modules) and produces a report to read, not a score to gate (`testing-tdd.md`).

## Branch protection
- PRs required; no direct pushes to `main`.
- All required checks must pass, plus an approving review: a human, or — in a
  supervised autonomous loop — the supervisor's audited merge (its `mr-audit` +
  acceptance-ledger adjudication IS the approval; doc-only PRs may auto-merge
  on green).
- Linear history; squash-merge with a Conventional Commit title.

## Releases
- Tags drive SemVer releases.
- Changelog generated from Conventional Commits (never hand-written).
- CI credentials via short-lived OIDC, never long-lived keys in the repo.
