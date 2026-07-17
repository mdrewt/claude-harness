# Sketch: M-playtest-a — Hosted deployment & playtest ops

**Status:** design sketch (scheduled — playtest replan 2026-07) · **Pre-gate** · **Decision:** ADR at
build time (hosting target) · See `playtest-replan-2026-07.md`.

Sketch — EARS + final `touches:` drafted by the build-time slicing pass. Land after M17.5's HIGH slices
(17.5a/b); no hosted URL may ship the side-B exploit.

## Problem / intent
Nothing today runs off `ws://127.0.0.1:3000`: `just publish` targets a local instance, the client
hard-defaults to localhost, and there is no hosted client, reset story, or version stamp. Remote
playtesters cannot play. Stand up the **closed-playtest deployment**: hosted SpacetimeDB module + hosted
static client + the ops runbook to reset/republish/roll during a test cycle.

## Scope (condensed)
- **Hosted module:** publish `server-module` to **SpacetimeDB Maincloud** (primary; verified current
  2026-07 — free tier / Pro $25/mo, scales-to-zero; self-host docker = fallback). In-milestone ADR
  records the call + limits. `sync_content` runs on (re)publish per ADR-0006.
- **Hosted client:** production Vite build with `VITE_STDB_URI`/`VITE_STDB_DB` env-driven (no localhost
  fallback in prod builds); static hosting (GitHub Pages / Cloudflare Pages — in-milestone decision);
  deploy via a **manual-trigger CI workflow** (`workflow_dispatch`), never auto on merge.
- **Release hygiene:** release profile verified `dev_reducers`-ABSENT (mechanical check vs the published
  module, not a source grep); `__game`/`__mrTrade`/`__mrPvp` gated behind `import.meta.env.DEV`
  (resolves D-17.5-E; reconciles ADR-0115 the direction the in-code comment asks).
- **Version stamp:** git SHA + build time visible in-client (corner overlay / help panel) and in bug
  bundles (M-playtest-b consumes it).
- **Ops runbook:** `docs/playtest-ops.md` — publish, wipe/reset (`--delete-data` semantics incl. the
  13.5c-4 owner-re-register note), roll-forward, tester-URL rotation, incident quick-checks.
- **Out of scope:** accounts (M21 — anonymous device-bound identity is *communicated*, not fixed),
  autoscaling/multi-region, CDN tuning, uptime SLOs (M20).

## Candidate slices (build-time slicing pass finalizes)
| slice | summary | candidate touches |
|---|---|---|
| pt-a1 | env-driven client config + release hygiene (DEV-gate hooks, no-localhost prod, version stamp) | `client/src/main.ts`, `client/vite.config.ts`, `client/src/ui/*`, sibling tests |
| pt-a2 | Maincloud publish + deploy workflow + smoke (hosted variant of `smoke-republish.sh`) + ops runbook | `justfile`, `.github/workflows/*`, `scripts/*`, `docs/playtest-ops.md` |
Pairing: pt-a1 ‖ M-playtest-d content slices OK (disjoint); pt-a2 touches CI config → treat as
structural-adjacent, SERIAL vs other workflow-touching slices.

## Risks / decisions
Hosting target + static host = in-milestone ADR. Maincloud energy budget under playtest load is unknown —
measure during the first smoke, record in the runbook. Secrets (deploy tokens) live in GH Actions
secrets, never in-repo. The hosted DB name must NOT be `monster-realm` (collision with local dev
convention); use `monster-realm-playtest`.
