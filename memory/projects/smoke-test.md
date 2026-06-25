# smoke-test

- **Stack:** node-ts-app (TypeScript)
- **Status:** throwaway — build-verification example (self-described "safe to delete" in its `package.json`).
- **Path:** `projects/smoke-test/`
- **Repo:** independent git repo (per root `.gitignore`); `master` default branch.
- **Purpose:** Sanity-checks `new-project.mjs` scaffolding output. Contains scratch artifacts (`_deltest`, `justfile_probe`) left over from harness verification.

## Pointers
- AGENTS: `projects/smoke-test/AGENTS.md`
- Specs: `projects/smoke-test/docs/specs/` · ADRs: `projects/smoke-test/docs/adr/`
- CI: `projects/smoke-test/.github/workflows/ci.yml` · Evals: `projects/smoke-test/evals/`

> Recommendation: this project is disposable. Consider deleting it natively once
> scaffolding behavior has been verified, rather than maintaining it.
