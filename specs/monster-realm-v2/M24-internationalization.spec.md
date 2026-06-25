# Sketch: M24 — Internationalization (i18n)

**Status:** design sketch (provisional) · **Phase D** · **Decision:** ADR-0033 (builds on 0006).

> Provisional sketch — EARS criteria + tasks deferred to build time. Cross-cutting text externalization.

## Problem / intent
Externalize player-facing text so reaching another language is **data, not code**. Chat (user content) is
rendered safely but **not** machine-translated.

## Scope (condensed)
- **UI strings** → keyed **message catalogs** per locale (ICU plural/interpolation); no hard-coded player-
  facing strings (an extraction lint enforces it).
- **Content localization:** dialogue/species/skill/item text get **locale variants in RON** (rides the
  ADR-0006 pipeline); `validate_content` requires the default-locale key.
- Locale selection + **fallback to default** + locale-aware number/date + **RTL**; a coverage report;
  default (English) always complete. A11y copy (M23) flows through the catalogs.
- **Out of scope:** machine-translating chat (no — safety/scope); a TMS workflow (ops/vendor).

## Key design + boundary
A new language is a **data drop** + the hard-coded-string lint makes externalization mechanical.

## Risks / decisions
Hard-coded literal ships → extraction lint fails. Missing default key → `validate_content` fails. Partial
locale → fallback + coverage report.
