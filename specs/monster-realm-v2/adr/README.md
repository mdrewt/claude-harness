# ADR registry — Monster Realm (v2)

All architecture decisions, MADR format. **All 29 accepted.** Decisions 0002/0003/0004 were settled by
`/debate` and ratified; the rest accepted as load-bearing for their milestone. See `../PLAN.md` for the
roadmap and `../spec-corpus-review.md` for the holistic review.

| ADR | Title | Milestone | One-line decision |
|---|---|---|---|
| 0001 | Record architecture decisions | M0 | MADR ADRs in `docs/adr/`; `ARCHITECTURE.md` links them |
| 0002 | Server platform & netcode | M0/M2 | **SpacetimeDB 2.x** (runs the shared Rust core authoritatively) |
| 0003 | Shared rule core & client prediction | M0/M1/M3 | Pure Rust `game-core` → wasm; predict movement only, battles server-only |
| 0004 | Client rendering stack | M0/M4 | **PixiJS v8 + TS** (bundle size, 2D fit, vendored skills) |
| 0005 | Single cohesive repo | M0 | One cargo workspace (no cross-repo SSOT split) |
| 0006 | Schema evolution & content-sync | M0+ | Platform automigration + idempotent `sync_content` + re-derive; additive-first |
| 0007 | Spatial / zoned subscriptions & per-zone tick | M0/M2/M11 | Indexed `zone_id` from day one; per-zone subs + ticks |
| 0008 | Map / content authoring pipeline | M11 | Tiled → RON, pure tested importer, no in-engine editor |
| 0009 | CI completeness & merge gates | M0/M5 | Full gated pipeline incl. containerized e2e + bindings-drift |
| 0010 | Falsifiable gates (proof-of-teeth) | M0+ | Every mechanical gate ships a known-bad fixture it must reject |
| 0011 | Server-paced zoned movement | M2 | Bounded queue + scheduled per-zone tick draining one move/tick |
| 0012 | Client prediction & reconciliation | M3 | 4-step reconcile vs auth state + server queue; rebase time, divergence-return |
| 0013 | Netcode smoothness | M3/M4 | Remote interpolation buffer + decoupled own slide clock + atomic reconcile |
| 0014 | Client app architecture | M4 | Read-only store + one-way flow + DOM-overlay menus; no UI framework in the loop |
| 0015 | Owner-scoped RLS privacy | M6+ | RLS = **defense-in-depth**, stakes-classified; true secrets → private tables |
| 0016 | Individuality & progression model | M6/M9 | **IV / EV / nature** (hidden IVs, dual-capped EVs, nature, bond); integer derive |
| 0017 | Battle data & turn model | M7 | `battle_id` pk + `opponent_identity` (PvP-ready); server-resolved, no prediction |
| 0018 | Inventory & item model | M9 | One saturating stack per `(owner,item)`; `grant_item`/`consume_one` only |
| 0019 | Evolution & fusion model | M10 | Individuality-preserving transforms + content-integrity gates |
| 0020 | Zone transitions (warps) | M11 | Server-authoritative warp + reconcile + subscription switch |
| 0021 | Dialogue & quest system | M12 | Data-driven dialogue trees + flag-based quest state, server-evaluated |
| 0022 | Currency & shop economy | M13 | Single saturating owner-private currency; content-priced atomic buy/sell |
| 0023 | Additive battle-depth | M14 | Status/abilities/weather as additive layers on the symmetric `resolve_turn` |
| 0024 | Cross-player escrow | M15 | Dual-consent, escrow-in-row, atomic re-verified swap, display-only snapshots |
| 0025 | PvP orchestration | M16 | Handshake + secret both-submit + turn-deadline reaper + forfeit-on-disconnect |
| 0026 | Persistent ranked profile | M17 | Identity-keyed persistent `profile`; integer linear-Elo, once per decisive result |
| 0027 | Co-op raid model | M18 | Additive `resolve_coop_turn`, 2-ally + AI boss, degrade-to-one |
| 0028 | Social subsystem | M19 | Server-auth chat (escaped/RLS-scoped/rate-limited) + role guilds + moderation |
| 0029 | Observability & performance strategy | M0/M20 | 3-layer: M0 substrate + per-milestone invariant + M20 capstone; OTel→Datadog |
| 0030 | Authentication & account model | M21 | Delegate to OIDC; stable identity (cross-device/recovery); no in-game passwords; guest-claim |
| 0031 | Privacy & data lifecycle | M22 | Registry-driven deletion cascade (erase/anonymize) + export + retention; completeness eval |
| 0032 | Accessibility strategy | M23 | WCAG-aligned; accessible DOM menus + `pixijs-accessibility`; reduced-motion switches the visual layer |
| 0033 | Internationalization strategy | M24 | Externalized catalogs + locale-keyed RON; a new language is a data drop; chat untranslated |
| 0034 | Security audit & threat-model gate | M25 | Maintained threat model + tooled/manual audit + blocking launch sign-off + re-audit cadence |
| 0055 | Server-module internal module boundary | M8.9 | Split `server-module/src/lib.rs` into domain modules → narrow `touches:` for parallel fan-out (proposed) |

> **Numbering note:** 0035–0054 are *implementation* ADRs that live in the project repo (`projects/monster-realm/docs/adr/`), per `../../../projects/monster-realm/AGENTS.md` (design ADRs 0002–0034 here; impl ADRs 0035+ there). **0055** is recorded here because it is driven by the harness-spec'd M8.9 milestone; its project-side implementation ADR is filed at the confirmed next-free number when M8.9 builds.

**Companion SSOT docs:** `../netcode-quality-review.md` (feel) · `../observability-performance-plan.md`
(robustness/perf) · `../security-threat-model.md` (attack surface) · `../spec-corpus-review.md` (holistic).
