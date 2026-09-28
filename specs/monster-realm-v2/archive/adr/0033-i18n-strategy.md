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

## Amendment — 2026-09-19 (M24 ceremony corrections; DECISION issue #485)

**Trigger:** M24 slice S1 was hard-blocked — this ADR's original text makes claims the 2026-08-23 M24
ceremony (investigation → 6-way ideation → judge synthesis → adversarial review,
`M24-internationalization.spec.md` §1.1/§8-4) found either false (no chat system exists to defend), out of
this milestone's scope (content localization), or understated relative to what M24 actually builds (typed
drops, interchange-only ICU, text-direction-only RTL). An accepted ADR is amended, not quietly out-voted by
a ceremony, hence this formalization. Escalated via `mr-ask-drew` issue #485; operator accepted the
recommendation as drafted, with the intent that a chat system will be added in a future milestone (the
strike below removes a claim about a nonexistent feature, not a decision against ever building one).

**Six corrections (supersede the corresponding clauses in "Decision outcome" above; all other clauses
stand):**

1. **Strike the chat clause.** "user chat is not machine-translated (rendered safely, ADR-0028)" defended a
   feature that does not exist at M24 time. Replaced by the `set_profile_name` display-name rule (§2.7,
   I18N-20 of the M24 spec) — display names pass through untranslated, same rationale, real surface. Should
   a chat system land in a future milestone, its translation posture needs its own decision at that time;
   this strike does not pre-judge it.
2. **Content is not locale-keyed RON in M24.** M24 localizes no content-registry text at all (§2.5). Any
   future content-localization scheme is written against **ADR-0057**'s glob loader, not against ADR-0006
   alone — ADR-0006 predates ADR-0057 and does not by itself support locale variants.
3. **"A new language is a data drop" → "a typed drop."** A stronger guarantee than originally promised: an
   incomplete locale catalog is a `tsc` compile error, not a runtime blank string.
4. **"ICU-style" is satisfied only at the interchange layer** (export/import), never at runtime. Runtime
   ICU-style formatting would require dynamic `RegExp` construction from locale data, which ADR-0055
   prohibits; this ADR did not previously acknowledge that constraint.
5. **"RTL supported" narrows to text direction only.** Layout mirroring is explicitly out of scope for M24
   (tracked as a future C6-class slice, not this ADR's concern).
6. **Permanent prohibition: no `locale` column on content row tables.** This is a decided architectural
   constraint (content stays locale-agnostic at the row level; localization, if ever added, lives in a
   side table or the catalog layer), not a scheduling preference subject to later relaxation.

Full corrections trail and evidence: `M24-internationalization.spec.md` §1.1 (S-A…S-E) and §8 item 4.
