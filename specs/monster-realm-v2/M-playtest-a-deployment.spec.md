# Sketch: M-playtest-a — Local playtest build & ops (solo tester)

**Status:** design sketch (scheduled — playtest replan 2026-07; **rescoped 2026-07-17 per Drew: local-only,
no hosted deployment** — Drew is the sole tester for this gate) · **Pre-gate** · See
`playtest-replan-2026-07.md` (§4 records the rescope).

Sketch — EARS + final `touches:` drafted by the build-time slicing pass. Land after M17.5's HIGH slices
(17.5a/b); the playtest build must not carry the side-B exploit.

## Problem / intent
The dev loop (local SpacetimeDB @ `127.0.0.1:3000` + `vite` dev server) is not a *playtest* build: dev
reducers (`start_wild_battle`, `grant_bait`) and the `__game`/`__mrTrade`/`__mrPvp` hooks would let the
tester accidentally invalidate H1/H2 feedback, there is no version stamp for bug bundles, and no
reset/republish ritual. Produce a **one-command honest local playtest build** — same rigor as a hosted
deploy, minus the hosting.

## Scope (condensed)
- **`just playtest-up` / `playtest-down`:** publish a **release-profile** module (`dev_reducers` ABSENT —
  verified mechanically against the published module, not a source grep) to the local instance under DB
  name **`monster-realm-playtest`** (never the dev-default `monster-realm`); `sync_content` on (re)publish
  (ADR-0006); serve the **production client build** (`vite build` + `vite preview` or equivalent static
  serve) — not the dev server.
- **Client build hygiene:** `VITE_STDB_URI`/`VITE_STDB_DB` env-driven; `__game`/`__mrTrade`/`__mrPvp`
  gated behind `import.meta.env.DEV` (resolves D-17.5-E; reconciles ADR-0115 the direction the in-code
  comment asks) — absent from the playtest build.
- **Version stamp:** git SHA + build time visible in-client and embedded in the F9 bug bundle
  (M-playtest-b consumes it) — still required locally: it pins which build a finding came from across
  wipe/republish cycles.
- **Ops runbook:** `docs/playtest-ops.md` — playtest-up/down, wipe/reset (`--delete-data` semantics incl.
  the 13.5c-4 owner-re-register note), republish-with-content-resync, "which build am I on" check.
- **DEFERRED (explicit YAGNI exception, not dropped):** hosted module (Maincloud/self-host), static client
  hosting, deploy CI workflow — re-book as **M-playtest-a2 (hosted)** when external testers join
  (pre-gate research 2026-07: Maincloud viable — free tier / Pro $25/mo, scales-to-zero).
- **Out of scope:** accounts (M21), uptime/monitoring (M20), multi-tester ops.

## Candidate slices (build-time slicing pass finalizes)
| slice | summary | candidate touches |
|---|---|---|
| pt-a1 | env-driven client config + DEV-gated hooks + version stamp + prod-build serve path | `client/src/main.ts`, `client/vite.config.ts`, `client/src/ui/*`, sibling tests |
| pt-a2 | `just playtest-up/down` + release-publish w/ dev_reducers-absent proof + wipe/republish flow + `docs/playtest-ops.md` | `justfile`, `scripts/*`, `docs/playtest-ops.md` |
Pairing: pt-a1 ‖ M-playtest-d content slices OK (disjoint). pt-a2 is justfile/scripts-only (no CI
workflow anymore) — still SERIAL vs other justfile-touching slices.

## Risks / decisions
The dev_reducers-absent check must inspect the *published module* (reducer list via CLI/introspection),
because a wrong feature flag in the publish path is exactly the failure it guards. Local-only means the
playtest DB shares the machine with dev churn — the distinct DB name + runbook wipe ritual is the
isolation. Keep the client build honestly production-mode (minified, no DEV hooks) so solo findings
transfer to the eventual hosted build.
