# Node / TypeScript standards
- **Toolchain:** `pnpm`; Node **`24.13.1`** pinned via asdf/mise `.tool-versions` (the preferred version — bump deliberately); every `package.json` declares `"engines": { "node": ">=24.13.1 <25" }`, enforced by an `.npmrc` `engine-strict=true` (a mismatched Node **fails** `npm install`, not just warns — guards against the system Node on `PATH` in non-login shells); `tsconfig` `strict: true`.
- **Lint/format:** **Biome** (`biome check .` lints + format-checks + organizes imports; `biome format --write .` to fix); `tsc --noEmit` typecheck. One tool for lint + format — no ESLint/Prettier.
- **Tests:** `vitest`; e2e with Playwright where needed; mutation via StrykerJS; property via fast-check.
- **Contracts:** `zod` to validate all external IO at the edge; branded types for invariants.
- **Modules:** ESM; explicit exports; no default exports for libraries.
