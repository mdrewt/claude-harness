# 0033. Internationalization (i18n) strategy
- Status: accepted
- Date: 2026-06-24
- Surfaced by: the holistic review (launch-readiness gap). Load-bearing for M24; builds on ADR-0006 (content).

## Context and problem statement
Player-facing text (UI, dialogue, names, a11y copy) is hard-coded English. Reaching other languages — and
keeping copy maintainable — needs externalized, locale-keyed text, ideally as **data** so a new language is
a content drop, not a code change.

## Considered alternatives
- **Externalized message catalogs (UI) + locale-keyed RON (content), ICU plural/interpolation, default-
  complete + fallback + RTL (chosen).** UI strings are keyed catalogs per locale; content carries locale
  variants in the existing RON pipeline (validated for default-key completeness); a hard-coded-string lint
  enforces externalization; user chat is **not** machine-translated (rendered safely, ADR-0028).
- **Hard-coded English only.** Excludes non-English players; copy changes touch code. Rejected for launch.
- **Runtime machine translation of everything (incl. chat).** Quality/safety/cost issues; chat translation is
  a privacy/safety hazard. Rejected.
- **A heavyweight TMS integration in-engine.** Overkill; engineering provides catalogs + extraction, the TMS
  is an ops/vendor concern. Deferred.

## Decision outcome
- Chosen: **keyed message catalogs (UI) + locale-keyed RON (content), ICU-style, default-complete with
  fallback + RTL; a hard-coded-string lint; chat untranslated.**
- Consequences: a new language is a **data drop** (rides ADR-0006); externalization is mechanical (lint +
  `validate_content` default-key check); a11y copy (M23) flows through the catalogs; locale-aware formatting
  + RTL supported; translation vendor/workflow is an ops concern.
