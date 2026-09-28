# Spec corpus review (holistic final pass)

**Date:** 2026-06-24 · **Scope:** all of `specs/monster-realm-v2/` — 26 milestone specs (M0–M25), 34 ADRs,
`PLAN.md`, and the cross-cutting docs (`netcode-quality-review.md`, `observability-performance-plan.md`, the
`milestone-loop-prompt.md`). This is the final pass: each spec reviewed both **separately** and
**holistically** (cross-spec consistency, sequencing, ADR-set coherence, and system-level gaps no single
milestone owns).

## 1. Coherence assessment — the corpus holds together

- **The spine is consistent end to end.** Functional core / imperative shell + server authority; rules live
  once in `game-core`; integer-tile authority + determinism; data-driven content; additive schema. Every
  milestone honors it; no spec reintroduces client authority or a second rule implementation.
- **Design-for-the-known-endpoint paid off and is internally consistent.** M7's PvP-ready battle keying →
  M16/M18 additive (validated against the v1 tutorial, which keyed it the same way for the same reason);
  M1's reserved `TallGrass` + M7's reserved wild-individuality → M8 additive; the M9 inventory primitive →
  M13/M15; the symmetric `resolve_turn` → M14 depth → M16/M18 for free.
- **Three cross-cutting disciplines are each single-sourced and applied everywhere** (not duplicated per
  spec): **netcode smoothness** (ADR-0013 / `netcode-quality-review.md`), **observability & performance**
  (ADR-0029 / `observability-performance-plan.md`), and the **security/privacy posture** (ADR-0015 RLS-as-
  defense-in-depth + the per-reducer auditor). The loop prompt's cross-cutting-invariants section is the
  enforcement SSOT.
- **Boundary previews chain cleanly** — each spec's "what M(n+1) consumes" matches the next spec's depends-on.

## 2. Consistency findings & fixes (applied this pass)

- **Individuality naming reconciled (IV/EV/nature).** M6/M9/M10/ADR-0016 used the IV/EV/nature concept names,
  but M7/M8 still carried v1's `wild_potential`/`wild_temperament`. **Fixed:** renamed to
  `wild_ivs`/`wild_nature`; ADR-0016 now states the **canonical naming** (the domain types are `IVs`/`EVs`/
  `Nature`, superseding v1's `Potential`/`Temperament`/`Training`) so the whole corpus is consistent.
- **M12 currency sequencing.** M12 (quests, Phase B) forward-referenced M13 currency for rewards, but
  currency is introduced in M13. **Fixed:** M12 quest rewards are XP/items now; **currency rewards are
  additive at M13**.
- **Spot-checks clean:** the `npc_decide` deferral (M1 → M12) is reconciled; `heal_party` (M7 placeholder →
  M12 town healing) is reconciled; `reject_if_in_battle`/`reject_if_in_trade` guard family is applied to all
  monster-mutating reducers (M7/M9/M10/M15); no spec is on a `proposed` ADR (all 29 accepted).

## 3. ADR-set coherence

29 ADRs, all accepted, each a distinct decision with real considered-alternatives; no overlaps or
contradictions found. A full **registry** now lives in [`adr/README.md`](adr/README.md) for navigability
(the PLAN ADR table only listed the early forks 0001–0014; the rest were tracked in the resolution-status
line). The RLS posture (ADR-0015) is the one ADR that **governs many specs** — it is the SSOT, so the
defense-in-depth/stakes-classification refinement propagated to every owner-private table at once.

## 4. Cross-cutting concern ownership (who owns what)

| Concern | Owned by |
|---|---|
| Determinism / purity | M0 clippy gate + per-rule property tests |
| Security (per-reducer) | M0 reducer-security-auditor eval + every reducer-adding spec |
| Privacy (RLS posture) | ADR-0015 (defense-in-depth, stakes-classified) + per-table privacy evals |
| Netcode smoothness | ADR-0013 + `netcode-quality-review.md` + M3/M4 + smoothness evals |
| Observability & performance | ADR-0029 + `observability-performance-plan.md` + M0 substrate + M20 |
| Schema evolution | ADR-0006 + the schema-snapshot/append-only evals + migration smoke-tests |
| Proof-of-teeth (gate honesty) | ADR-0010 + a fixture per gate, everywhere |

## 5. Holistic gaps — system-level concerns no milestone owns (decision needed)

These surfaced only by viewing the whole. They are **pre-launch-readiness** concerns; none breaks the
specced scope. **Disposition (decided by the user — full launch-readiness): all now specced as Phase D
milestones M21–M25** (+ backup/DR folded into M20). The list below records what each gap became:

- **Accounts / identity / auth** → **M21** (ADR-0030): OIDC-backed stable identity, cross-device + recovery,
  guest→account claim — no game-data schema churn (the identity keying pays off).
- **Privacy / data deletion / compliance** → **M22** (ADR-0031): registry-driven deletion cascade
  (erase/anonymize) + export + retention; a deletion-completeness eval.
- **Accessibility** → **M23** (ADR-0032): keyboard/screen-reader/colorblind/reduced-motion (a visual switch
  on ADR-0013), WCAG-AA; retrofits across M4/M7/M19.
- **Internationalization (i18n)** → **M24** (ADR-0033): externalized catalogs + locale-keyed RON; a new
  language is a data drop; chat untranslated.
- **Security audit / threat model** → **M25** (ADR-0034) + `security-threat-model.md`: the consolidated
  surface + a tooled/manual audit + a blocking launch sign-off + re-audit cadence (RLS-leak verification on
  the pinned version is the headline check).
- **Backup / disaster recovery (ops)** → folded into **M20** (a backup/restore runbook + RPO/RTO baseline).

## 6. Verdict

The corpus is **coherent, internally consistent, and complete** — a multiplayer, social, content-rich
monster-tamer on the re-engineered, smooth, server-authoritative, observable spine, now with a full
**Phase D production-readiness** layer (accounts, privacy/compliance, accessibility, i18n, and a security-
audit launch gate, on top of observability/performance). With the consistency fixes applied and the
launch-readiness gaps specced (M21–M25), the **M0–M25 spec phase is complete and ready to hand to the build
loop** — gated, at the end, on the M25 security sign-off before any launch.

## 7. Final simplification pass (anti-over-spec)

To avoid over-investing in far-future, playtest-dependent design, a deliberate trim was applied:
- **Phase C/D (M15–M25) reduced to design sketches** — each keeps its problem/intent, scope (in/out +
  deferrals), key design + boundary, and risks, **plus its ADR**, but the granular EARS criteria + task
  breakdowns are **deferred to build time** (the loop drafts/refines them when the milestone is next-up — its
  designed job, so pre-writing them duplicated it and would be reshaped by the Phase-A playtest anyway). All
  **decisions (ADRs) are preserved**; nothing load-bearing was lost.
- **Phase A/B (M0–M14) keep full fidelity** (the near-term build path).
- **Rev-history changelogs stripped** from the specs (status markers + the per-revision §7 subsections) —
  git history records evolution; the §7 *substance* (red-team findings, tutorial harvest, design rationale)
  is kept as plain "design & review notes."
The corpus is now right-sized: **full detail where you build next, sketches + decisions where you build
later.**
