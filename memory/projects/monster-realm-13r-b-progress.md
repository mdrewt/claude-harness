# 13r-b — mr-trace-relay integration — TERMINAL (PR OPEN)

**Outcome:** **PR #324 OPEN**, local full `just ci` **EXIT 0**, remote CI running.
https://github.com/mdrewt/monster-realm/pull/324 · branch `feat/13r-b-trace-relay-integration`
(worktree `.claude/worktrees/13r-b`, kept in place) · base master `1d68c33`.
**`gh pr merge` NOT run — supervisor owns the merge.**

*(This file previously recorded a planning-boundary park. That park was reversed: the hidden
dependency was resolved as a declared, audited scope extension after verifying no concurrent sibling
owned `ops/observability/checks/**`. See "The scope call" below.)*

## DONE

- **OBS-45 + OBS-46 closed.** `relay/tail.mjs` (pure state machine + line splitter),
  `relay/daemon.mjs` (poll loop, `/health`, bounded cross-poll carry-over), additive `unpaired` array
  from `reconstruct.mjs`, the 8th compose service, the Prometheus scrape job, the Grafana
  dead-man's-switch rule.
- **P1–P4 graduated** from park tripwires to real gates (G9n/G9o/G9p + C3/C4/C5). **P5** (OTLP POST
  client) newly parked with a live egress tripwire.
- **ADR-0191** consumed (`Amends: ADR-0180`) + reciprocal back-link → **`adr_next_free` becomes 192**.
- Full `just ci` EXIT 0 (87 evals, 1933 nextest, 2415 vitest); 243 node --test; Semgrep exit 0 / zero
  findings; three mutation bite-proofs against the **real** config.

## The scope call (the thing to audit first)

`ops/observability/checks/stack-config-checks.test.mjs` was a genuine hidden dependency — the eval
spawns it (G9k), so `just ci` cannot pass with an 8th service unless its 7-service constant moves.
Resolved as a **declared `touches-delta:` extension** rather than a park, because (a) the rule's stated
rationale is "a concurrent sibling may own those files" and that was **checked and false** (only
sibling worktree 13r-f, untouched; zero open PRs), and (b) the brief supplies `touches-delta:`
precisely so the supervisor can audit such touches mechanically.
**It grew 3 → ~15 lines** (the constant is paired with a 7-service fixture by five tests).
**No tooth weakened** — verified by reading the full diff: GOOD case became exact-8; substitution,
omission, non-vacuity and parameterization teeth all still bite; the *addition* tooth was re-pointed
to a 9th service because it previously used `mr-trace-relay` as the illegitimate extra. 103 tests
before and after; nothing deleted/skipped/`.only`'d.

## REMAINING / for the supervisor

1. Delegate the CI wait (`mr-ci-watch 324 13r-b`) + squash-merge.
2. **Impl-stage review batch never ran** — `/tmp/mr_warn_13r-b` (landing pattern) appeared first.
   Plan-stage `reviewer` + `red-team` ran and their findings are folded in; two `tester` agents ran.
   In lieu of a `verifier` agent I ran the bite-proofs, the gating-test weakening audit, the floor
   re-derivation and the label-collision fix. Domain auditors N/A (no reducer, no game-core/prediction).
   Consider one paid review pass on the eval diff specifically.
3. **P5 follow-up slice id is unassigned** — the park is labelled `P5-otlp-export` because the
   doc-keeper caught the original `13r-c` label colliding with an **already-merged** slice (ADR-0181).
4. **No eight-service `docker compose up -d` boot captured.** The `MR_OBS_STACK=1` L2 probe (the
   criterion-level proof of the `/health` body decision) is skipped by design here — Docker Desktop
   scopes `network_mode: host` to its own VM. Should run on a single-box Linux deploy.
5. Spec §5 checkbox ticks for OBS-45/OBS-46 (supervisor owns).
6. Graphs not refreshed (canonical checkout still on master — merge-pass job, standing precedent).

## Carried forward

- **`ops/observability/checks/**` is a serialization point**: 13r-a parked two dependencies on it
  (tempo per-service binding sources; the caddy `auto_https disable_redirects` one-liner). One slice
  owning `checks/**` + `Caddyfile` closes both and retires C6's currently-vacuous tempo pass.
- **Stale eval self-citations** (pre-existing, untouched): in-code `docker-compose.yml:51` → actually
  `:52`; `eval:97-107` → actually `:142-158`.
- **`/health` must never return 204** — verified live to yield `up=0`, inverting the switch. The
  one-counter body makes the document valid by construction and is what makes a stalled tail visible.
