---
title: Internationalization & localization (i18n/l10n) — string catalogs, ICU MessageFormat, RTL, fonts, and translation workflow
slug: internationalization-localization
domain: i18n
tags: [i18n, l10n, icu-messageformat, unicode-cldr, rtl-bidi, pseudo-localization, string-catalog, translation-workflow, font-glyph-coverage, text-expansion, fluent]
status: active
updated: 2026-06-27
confidence: high
sources: 14
supersedes:
abstract: "Build-time i18n contract: externalize all strings into keyed catalogs, use ICU MessageFormat for plurals/gender/select, never concatenate fragments, format via CLDR, mirror RTL, budget 40% text expansion, pseudo-localize in CI."
---

## Scope

A **project-agnostic** deep reference covering the full spectrum of making software speak every language correctly and gracefully: the i18n-vs-l10n distinction; externalized string catalogs and their file formats (PO/XLIFF/ARB/JSON/Fluent); ICU MessageFormat for plurals, gender, and select; Unicode CLDR as the data backbone for locale-aware number, date, currency, and unit formatting; right-to-left (RTL) / bidirectional (bidi) layout; font and glyph coverage for CJK, Indic, Arabic, and other scripts; UI text-expansion budgets and flexible layout; pseudo-localization as a CI quality gate; locale-keyed content and the "new language = data drop" model; translation management systems (TMS) and the translator workflow; and scoping decisions (what to localize, what not to). Applies to web apps, native apps, and games alike. Pairs with [[accessibility-interactive-apps]] for screen-reader and ARIA concerns that intersect with locale-aware markup.

---

## Key findings

### 1. i18n vs. l10n — two distinct phases with different owners

**Internationalization (i18n)** is the engineering work done *once* to make software capable of adaptation: encoding strings as UTF-8, extracting all user-visible text into externalized catalogs, using locale-aware APIs for dates/numbers/currencies, designing layouts that flex to accommodate text expansion, and shipping font support for every target script. It precedes any translation and is a precondition for l10n being tractable.

**Localization (l10n)** is the adaptation work done *per locale*: translating the string catalog, adapting images or culturally specific content, selecting appropriate date/number/currency formats, switching layout direction for RTL scripts, and adjusting any region-specific legal or UX conventions. L10n is cheaper and faster when i18n was done thoroughly; expensive and often impossible when it was not.

The cost asymmetry is significant: retrofitting i18n into a shipped product is far more expensive than doing it up front. The canonical heuristic is to treat i18n readiness as a technical debt item that compounds — every hardcoded string added after launch increases the audit burden for the first localization pass.


### 2. Externalized string catalogs — the foundational i18n contract

Every user-visible string must live in an externalized catalog keyed by a stable identifier, never hardcoded in source. The catalog is the unit of work handed to translators; the app resolves the current locale at runtime and loads the matching catalog.

**Common catalog formats:**
- **GNU gettext PO/POT** — default for C, Python, PHP, Ruby, WordPress. Human-readable; supports plurals and context comments (`msgctxt`). Three files (.pot source template, .po translated, .mo binary) add release-cycle steps.
- **XLIFF 1.2 / 2.0** — industry-standard XML interchange format used by Xcode, many CAT tools, and enterprise localization platforms. Bilingual (source + target in one file) and monolingual variants exist.
- **ARB (Application Resource Bundle)** — JSON-based; the Flutter/Dart standard. Supports ICU MessageFormat inline.
- **JSON / YAML / Android XML / Apple Strings** — ecosystem-specific flat-key formats. Widely supported by TMS tools.
- **Project Fluent (.ftl)** — Mozilla's format. Asymmetric localization: the source (English) stays simple; translators can add complexity in their locale files without touching source code. Leverages CLDR, ICU, and ECMA-402 instead of gettext's custom plural data.

**Keying discipline.** Keys should be semantically stable identifiers (`nav.save_button`, `error.network_timeout`) not the English string itself. Gettext's practice of using the English string as the key creates problems when a string has two distinct meanings in English that must translate differently — for example, `Open` as a command vs. `Open` as a status.

**Context annotations.** Every catalog entry should include developer notes to the translator: what screen it appears on, what variable placeholders mean, character limits for buttons, and any grammatical context (is `{count}` the number of files or the number of users?). TMS tools surface these as translator-facing comments.


### 3. ICU MessageFormat — plurals, gender, and select

**ICU MessageFormat** is the standard for expressing messages that vary based on runtime values — counts, genders, enumerated states — in a way that translators can adapt to their language's grammar without touching code. It is implemented in the ICU C/C++/Java libraries and ported to virtually every major language ecosystem (react-intl, messageformat.js, i18next-icu, Lingui, Phrase, Lokalise, Crowdin).

**Why naïve string concatenation breaks.** Concatenating fragments — `"You have " + count + " messages"` — is unworkable for localization: translators cannot rearrange sentence structure, gender inflections cannot be expressed, and plural rules for languages like Russian (four plural categories) or Arabic (six) cannot be represented. ICU MessageFormat keeps the entire message as a single unit with placeholders, enabling translators to freely restructure sentences for their language's grammar.

**The three complex argument types:**

`plural` — selects a sub-message based on a numeric value and CLDR plural rules for the active locale:
```
{count, plural,
  =0 {No messages}
  one {One message}
  other {# messages}
}
```
A translator for Russian will add `few` and `many` branches; the English source never needs to change. The `#` token expands to the formatted number.

`select` — selects a sub-message from a fixed keyword set; primary use case is grammatical gender:
```
{gender, select,
  female {She saved the file.}
  male   {He saved the file.}
  other  {They saved the file.}
}
```

`selectordinal` — like `plural` but for ordinal numbers (1st, 2nd, 3rd…).

**Nesting select and plural.** Place `select` on the outside and `plural` inside. This ensures translators see complete, grammatically coherent sentences rather than orphaned fragments. The ICU documentation explicitly warns against covering only a minimal part of a sentence with a complex argument, because translators cannot see how fragments interact with the rest of the sentence.

**MessageFormat 2.0.** A successor spec developed by the Unicode MessageFormat Working Group is now in final-candidate status in ICU4J. MF2 offers cleaner syntax, better error recovery, and a more composable API, but the 1.x API remains dominant in production tooling as of 2026.

**Mozilla Fluent as an alternative.** Fluent (.ftl format) takes a different approach: asymmetric localization where the source stays maximally simple and translators add complexity only where their language requires it. A Czech translator can add plural branches to a message that has none in English; those branches do not affect any other locale. Fluent also supports `terms` — reusable, inflectable brand names — and has clean integration with CLDR/ECMA-402 formatters. Best fit for projects that want translator empowerment over a strict developer-controlled grammar model.


### 4. Unicode CLDR — the data backbone for locale-aware formatting

The **Unicode Common Locale Data Repository (CLDR)** is a curated dataset of locale-specific formatting rules, plural rules, calendar systems, collation orders, and language/region/currency names for 100+ languages. It is incorporated into all modern operating systems, browsers, and programming languages — when JavaScript's `Intl.DateTimeFormat` formats a date as "12. Februar 2026" in German, or "12 فبراير 2026" in Arabic, it is consuming CLDR data.

**What CLDR provides:**
- **Number formatting** — decimal separators (`,` vs `.`), digit grouping (thousands), percent, scientific, and compact notation per locale. German uses `.` for thousands and `,` for decimals; many Arabic locales use Eastern Arabic-Indic digits.
- **Currency formatting** — symbol placement (before or after the amount), ISO currency code vs. symbol, rounding rules.
- **Date and time formatting** — calendar systems (Gregorian, Hijri, Hebrew, Buddhist, Japanese era), field ordering (M/D/Y vs D/M/Y), 12h vs 24h, month and day names.
- **Plural rules** — per-language rules mapping a count to one of: `zero`, `one`, `two`, `few`, `many`, `other`. English has `one`/`other`; Arabic has all six; Mandarin Chinese has only `other` (no grammatical number).
- **List formatting** — "A, B, and C" vs "A, B et C" vs "A、B、C".

**Usage pattern.** Developers should never hardcode date/number formats. Instead use the platform's locale-aware APIs — `Intl.NumberFormat`, `Intl.DateTimeFormat`, `java.text.NumberFormat`, `NSNumberFormatter`, `DateFormatter`, etc. — which all consume CLDR data under the hood. Locale should include the regional variant (e.g., `fr-CA` not just `fr`) so CLDR's region-specific overrides apply correctly; Canadian French date ordering differs from metropolitan French.

**CLDR release cadence.** Two releases per year (CLDR 48 released October 2025; CLDR 49 vetting in progress as of June 2026). Platform runtimes lag by one to several releases, so production code should rely on the platform's built-in CLDR data rather than bundling its own.


### 5. RTL / bidi — right-to-left layout and bidirectional text

Arabic, Hebrew, Persian, Urdu, and several other scripts are written right-to-left. Supporting these locales requires both **layout mirroring** and **bidirectional text handling**.

**Layout mirroring.** When an interface is switched from LTR to RTL, the overall spatial organization is horizontally flipped: navigation panels that were on the left move to the right; progress indicators fill from right to left; scroll indicators appear on the left. The foundational CSS mechanism is `dir="rtl"` on the `<html>` element, which automatically reverses text alignment, inline flow, and many browser-handled elements. However, properties with explicit `left`/`right` in their names (`margin-left`, `padding-right`, `border-left`) are *not* automatically mirrored. The correct modern approach is **CSS Logical Properties** (`margin-inline-start` instead of `margin-left`, `padding-inline-end` instead of `padding-right`), which automatically resolve to the correct physical direction based on the document's writing mode.

**Icon mirroring.** Directional icons (back/forward arrows, progress indicators, text-alignment icons, reading-direction indicators) must be mirrored. Non-directional icons (a save icon, a microphone, a camera) must not be mirrored. Material Design and the W3C both document which categories require mirroring.

**The Unicode Bidirectional Algorithm (UBA).** Most mixed-direction text handling is automatic via the Unicode Bidirectional Algorithm, which determines the display order of characters in a string containing both LTR and RTL segments. The algorithm works correctly for most prose, but inline variables (user names, product titles, numbers) inserted into RTL strings can cause unexpected direction spillage. The correct fix is to wrap embedded LTR segments in a Unicode bidi isolate (U+2066 LEFT-TO-RIGHT ISOLATE … U+2069 POP DIRECTIONAL ISOLATE) or use the HTML `<bdi>` element for user-generated content. Never use raw LRM (U+200E) characters as a band-aid; they bleed into adjacent copy-paste operations.

**Testing.** Automated layout checks catch truncation and overflow. Meaningful RTL QA requires a native speaker: alignment heuristics that look correct to an LTR developer are often subtly wrong in Arabic context.


### 6. Font and glyph coverage

A string can be perfectly translated but display as boxes or question marks if the UI font lacks glyphs for that script. Font strategy is a first-class i18n concern.

**Script size asymmetry.** A typical Latin font contains 200–500 glyphs. A CJK (Chinese, Japanese, Korean) font must cover 20,000+ glyphs to be usable; comprehensive pan-CJK fonts like Noto CJK cover 65,000+ and ship files of 10–22 MB uncompressed. Shipping a single bundled font file that covers all scripts is impractical; web and app delivery must use subsetting and font-face unicode-range descriptors to load only the glyphs needed for the active locale.

**Han unification and locale disambiguation.** Unicode unifies many Chinese, Japanese, and Korean characters at the same code point (CJK Unified Ideographs), but the correct glyph shape differs by locale — the same code point renders differently in Simplified Chinese, Traditional Chinese, Japanese, and Korean. Font fallback stacks must be locale-aware: `Noto Sans SC` (Simplified Chinese) must be prioritized over `Noto Sans JP` (Japanese) for `zh-Hans` content. CSS `lang` attribute + `font-face` with `unicode-range` handles this correctly.

**Fallback strategy.** The industry standard is: (1) a primary font optimized for the default script, (2) locale-specific supplemental fonts for target scripts, (3) Google Noto (or a system equivalent) as the pan-Unicode last-resort fallback. Noto covers 162 of 168 Unicode scripts as of version 16.0. For games and native apps where web CSS is unavailable, the equivalent is configuring the runtime's font fallback list, which on Android and most Linux distributions includes Noto by default.

**Practical checklist:**
- Audit every script target locale requires; add a font that covers it.
- For web, use `unicode-range` in `@font-face` to split CJK fonts so Latin users do not download CJK assets.
- For games, pre-load locale-appropriate fonts at locale-switch time, not at scene load.
- Use design tools' glyph-coverage view (e.g., InDesign's glyph panel, Figma's missing-glyph highlight) to audit translated strings before shipping.
- Test with the actual translated strings, not Lorem Ipsum — some edge-case CJK characters are not in the common subsets.

**Indic, Arabic, and other complex scripts.** These require shaping engines (HarfBuzz, DirectWrite, CoreText) that handle ligature formation, contextual glyph substitution, and bidirectional rendering. Confirm the target platform's text stack correctly shapes the scripts in scope; custom game UI renderers often use simple glyph-at-a-time rendering that breaks for Arabic, Devanagari, and similar scripts. This intersects with [[accessibility-interactive-apps]] where screen readers also depend on correct Unicode code-point sequences for these scripts.


### 7. Text expansion — designing UI for longer translated strings

English is among the most compact major languages. Translations consistently expand text length, and UI layouts must accommodate this from the beginning.

**Typical expansion factors:**
| Source → Target | Button/label expansion | Running text expansion |
|---|---|---|
| English → German | 30–50% | 20–35% |
| English → French | 15–25% | 10–20% |
| English → Spanish | 20–30% | 15–25% |
| English → Finnish | 30–60% | 25–40% |
| English → Russian | 30–50% | 20–35% |
| English → Japanese | −10 to +10% | (characters pack more meaning) |

Short strings (button labels, tab titles) expand proportionally more than long strings because function words and articles pad them. A two-word button label like `Save As` may become five words in German: `Speichern unter`. The worst-case rule of thumb is to budget 40% expansion on any displayed string and test at that expansion before strings are translated.

**Layout design rules:**
- Use flexible layouts (CSS Flexbox/Grid; Auto Layout in mobile; layout groups with expand-to-fill in game engines) rather than fixed-width containers with hardcoded pixel widths.
- Avoid fixed-height text containers; allow wrapping where the context permits.
- For buttons and compact labels where text must not wrap, define an overflow policy (truncate with ellipsis, shrink text, or redesign the label) and test with long strings.
- Design mockups at 130% or 140% text length during UI review. Figma's Auto Layout or text substitution plug-ins can do this automatically.
- Strings longer than ~40 characters should be allowed to wrap; strings in buttons/toasts/notifications typically must not exceed one or two lines.

**Pseudo-localization** (see §8) is the main automated tool for verifying layout under expansion before real translations exist.


### 8. Pseudo-localization — i18n quality gate in CI

Pseudo-localization transforms every source-language string into a visually distinct, artificially lengthened, and diacritically adorned version without requiring real translators. The result is a runnable build in a "pseudo-locale" (e.g., `en-XA` or `qps-ploc`) that reveals i18n defects early and cheaply.

**What pseudo-localization detects:**
1. **Un-externalized strings.** Pseudo-localized strings are wrapped in brackets: `⟦Hëllo wörld⟧`. Any text on screen without brackets is hardcoded in source and was never handed to the catalog.
2. **Text truncation and UI overflow.** Strings are padded to 130–150% of their original length (e.g., by repeating characters or appending `!!!`). Containers that clip or overflow under this artificial expansion will clip real German translations.
3. **Encoding issues.** Substituting Latin letters with diacritics (`ã`, `ë`, `ö`, `ü`, `ñ`) surfaces font-loading and encoding assumptions baked into the renderer.
4. **RTL layout problems.** Some pseudo-localization tools generate a mirrored pseudo-RTL variant, catching RTL layout issues without requiring an Arabic translation.
5. **Format string errors.** If a placeholder (`{0}`, `%s`, `{count}`) is accidentally included in a non-ICU string concatenation, pseudo-localization will surface the wrong output visually.

**CI integration pattern.** Generate the pseudo-locale catalog as part of the build step. Run the existing automated UI test suite (screenshot tests, layout tests, smoke tests) against the pseudo-locale build. Fail the build on: strings without brackets visible in UI (un-externalized), visible overflow of text containers beyond a threshold, missing glyphs (boxes) in the rendered output. This costs zero translation dollars and catches a category of defects that would otherwise surface only after expensive translator passes.

**Tooling.** Most major i18n libraries and TMS platforms support pseudo-localization generation natively: Android's `tools:locale="en-rXA"`, iOS's `NSDoubleLocalizedStrings`, Lokalise, Phrase, Crowdin, and SimpleLocalize all expose pseudo-locale generation. For game engines, pseudo-localization is typically implemented as a pre-processing step on the exported string catalog.


### 9. Locale-keyed content — "a new language is a data drop"

Beyond UI strings, many applications and games have content that varies by locale: localized voice-over audio files, locale-appropriate splash images, market-specific store descriptions, locale-keyed achievement names, subtitles/captions, tutorial text, and legal disclosures. This content is best modeled as **locale-keyed data**: a structured data layer where each record is associated with a locale tag and loaded at runtime based on the active locale, exactly as string catalogs are.

**Practical patterns:**
- Store locale-specific assets in locale-tagged subdirectories (`assets/audio/ja/`, `assets/audio/en/`) and resolve at runtime by substituting the active locale tag.
- For large games with many locale assets, ship locale-specific content in separate delivery packages or DLC depots (Steam's language-specific depots ensure users download only their language's assets). This is especially important for voice-over, which can reach several GB per locale for a AAA title.
- Separate *translatable content* from *procedural/dynamic content*. Procedurally generated text (in-game economy updates, dynamic event descriptions with many variable slots) is structurally difficult to translate accurately; budget extra effort or constrain procedural strings to templates that ICU MessageFormat can handle.

**What not to translate:**
- **User-generated content (UGC)**: player chat, custom character names, player-authored descriptions. These are produced by users in whatever language they write; translating them changes the user's voice and is ethically problematic. Display UGC as-is; apply the Unicode Bidi Algorithm for inline direction.
- **Debug/developer strings**: crash stack traces, log output, dev console messages. These should remain in English (or be untranslated) so developers can reason about them.
- **System-provided UI elements**: OS-level dialogs (file pickers, permission dialogs, notification system chrome) are already localized by the OS; do not attempt to replace them with translated equivalents.
- **Brand names and product identifiers**: trademarks, API endpoint URLs, and SKU codes must not be translated. Mark these as non-translatable in the TMS.


### 10. Translation management systems (TMS) and translation workflow

A TMS is the operational hub for moving string catalogs from developers to translators and back into the build, with translation memory, glossary enforcement, and CI/CD integration.

**Core TMS capabilities:**
- **Translation memory (TM)**: a database of previously translated string pairs. When a new or updated string closely matches a prior translation, the TM suggests the prior result. Fuzzy-match thresholds (typically 75–100%) control auto-reuse. TM dramatically reduces cost for iterative development where most strings carry over between releases.
- **Glossary / terminology management**: per-project term lists (brand names, product feature names, technical vocabulary) that translators must use consistently. The TMS highlights violations during translation.
- **Workflow automation**: assignment of strings to translators by language pair, progress tracking, review and QA steps, machine translation (MT) pre-fill with human post-editing.
- **CI/CD integration**: GitHub/GitLab webhooks or CI plugins that push new/changed strings to the TMS automatically and pull completed translations back into the repo. This keeps translation continuously in sync with development rather than as a waterfall phase at the end.
- **Format support**: all major TMS platforms (Lokalise, Phrase/Memsource, Crowdin, Transifex, Weblate, Locize, Smartling) support PO, XLIFF, JSON, ARB, Android XML, Apple Strings, and Fluent .ftl.

**Typical workflow:**
1. Developer externalizes string with a stable key and context annotation.
2. CI pipeline detects new/changed strings and pushes to TMS.
3. TMS applies TM and MT pre-fill; assigns remainder to human translators.
4. Translators review, edit, approve.
5. Optional: linguistic QA pass (consistency, glossary compliance, formatting).
6. TMS publishes translations back to repo (pull request or direct commit).
7. Build CI picks up the updated catalog; pseudo-localization test runs.

**Scope decisions before engaging a TMS.** Localization ROI analysis (store page analytics, sales by region, community requests) should determine which locales to support — not all locales have the same return on investment. Tier your locales: Tier 1 (human-translated, full QA), Tier 2 (human-translated, lighter QA), Tier 3 (machine-translated with no human review, disclosed to users). Budget for ongoing translation maintenance, not just a one-time initial pass.


---

## Concrete examples & references

- **ICU MessageFormat gender + plural nested pattern**: The canonical example from the ICU docs nests `num_guests, plural` inside `gender_of_host, select` to produce grammatically correct sentences for all combinations of host gender and guest count. The recommendation: `select` on the outside, `plural` inside; write full sentences in every branch so translators see complete context (https://unicode-org.github.io/icu/userguide/format_parse/messages/).

- **Mozilla Fluent asymmetric localization**: A Czech translation of "You are about to close {$count} tabs" adds a `few`/`other` plural split for the noun *panel* — required by Czech grammar — without changing the English source at all. The French translation is a simple one-variant string. Both are managed in isolation. Fluent terms support inflection: an Italian brand name term can expose `uppercase`/`lowercase` variants; a Polish translation can expose grammatical cases like `nominative`/`genitive`. (https://hacks.mozilla.org/2019/04/fluent-1-0-a-localization-system-for-natural-sounding-translations/)

- **CLDR as the universal locale data source**: Used by Apple (macOS/iOS), Google (Android/Chrome), Microsoft (Windows/Office), Meta (Facebook/WhatsApp), Mozilla, and essentially every operating system and browser. Java, C#/.NET, Swift, JavaScript `Intl.*`, Python (Babel), Ruby (TwitterCLDR) all consume CLDR data. Current release CLDR 48 (October 2025), CLDR 49 vetting in progress. (https://cldr.unicode.org/)

- **CSS Logical Properties for RTL**: `margin-inline-start`/`margin-inline-end` automatically resolve to left/right based on writing direction, replacing fragile `margin-left`/`margin-right` overrides in RTL stylesheets. Mozilla's RTL guidelines and the W3C Internationalization Working Group both document this as the preferred approach. (https://firefox-source-docs.mozilla.org/code-quality/coding-style/rtl_guidelines.html; https://www.w3.org/International/geo/html-tech/tech-bidi.html)

- **Material Design bidirectionality guide**: Documents the icon-mirroring rule — directional icons (back/forward arrows, progress fill) mirror in RTL; non-directional icons (camera, microphone, save) do not. Includes edge cases like clocks (direction-neutral but the hands rotate the same direction), sliders (direction of fill flips), and text alignment icons (mirror). (https://m2.material.io/design/usability/bidirectionality.html)

- **Google Noto fonts**: 162 scripts covered as of Unicode 16.0, 77,000+ characters, pre-installed on Android and most Linux distributions. Not a single file — split into per-script families (Noto Sans, Noto Sans CJK SC/TC/JP/KR, Noto Serif, Noto Sans Arabic, etc.) because a single file cannot fit all glyphs. Web delivery uses `unicode-range` subsetting. (https://en.wikipedia.org/wiki/Noto_fonts; https://notofonts.github.io/noto-docs/website/use/)

- **Pseudo-localization bracket-detection pattern**: Strings are wrapped `⟦like this⟧` during pseudo-localization. Any visible text without brackets is hardcoded. String length is padded to ~140% using repeated characters appended after the text body. Pseudo-locale `en-XA` (Android) and `qps-ploc` (Windows) are standardized pseudo-locale tags. The technique catches un-externalized strings, truncation, encoding errors, and RTL layout issues before translators are engaged. (https://dev.to/anton_antonov/pseudo-localization-for-automated-i18n-testing-31; https://simplelocalize.io/blog/posts/internationalization-guide-software-localization/)

- **Steam locale-specific depot pattern**: Steam's partner documentation recommends separate depots per language for games with large locale-specific assets. On install Steam delivers only the language-specific depot(s) the user's system requests, avoiding multi-GB unnecessary downloads for users who only need one language. (https://partner.steamgames.com/doc/store/localization)

- **W3C on string concatenation**: The W3C Internationalization Working Group states explicitly that splitting translatable text into fragments that are concatenated in code makes correct translation structurally impossible for many languages. Named placeholders with a single full-sentence template are the correct pattern. (https://w3c.github.io/bp-i18n-specdev/; https://learn.microsoft.com/en-us/globalization/internationalization/concatenation)

- **Fluent vs. gettext**: Gettext uses the English string as the message ID (creating ambiguity when one English string needs multiple translations), has a three-file release cycle (.pot/.po/.mo), and does not integrate CLDR for date/number formatting. Fluent uses stable semantic keys, a single .ftl file, and integrates CLDR/ECMA-402 natively. (https://github.com/projectfluent/fluent/wiki/Fluent-vs-gettext)

- **TMS ecosystem**: Lokalise, Crowdin, Phrase (formerly Memsource), Transifex, Weblate, Locize, and Smartling are the dominant platforms. All support GitHub/GitLab CI integration, translation memory, machine translation pre-fill, and ICU MessageFormat rendering in the translator UI. Choice criteria: per-word pricing vs. flat-rate; self-hosted (Weblate) vs. SaaS; format coverage; workflow customization depth. (https://lokalise.com/blog/translation-management-system/; https://crowdin.com/blog/translation-management-system)

- **Text expansion benchmark**: Industry-reported expansion from English: German labels 30–50%, French labels 15–25%, Finnish labels 30–60%. Short button strings (2–3 words) can expand 200–300% in extreme cases due to function-word padding. The 40% buffer design rule covers the majority of European languages. (https://www.kwintessential.co.uk/blog/translation-text-expansion-how-it-affects-design-2; https://www.pairaphrase.com/blog/text-expansion-in-translation)

- **ICU MessageFormat 2.0**: A successor to the long-standing ICU 1.x MessageFormat API; final-candidate spec from the Unicode MessageFormat Working Group, available in ICU4J technical preview. Cleaner syntax, better composability, improved error recovery. (https://unicode-org.github.io/icu/userguide/format_parse/messages/mf2.html)

- **Lokalise ICU guide**: Comprehensive documentation of `plural`, `select`, `selectordinal`, and nested patterns with translator-facing rendering in the TMS UI. Notes that deeply nested patterns (>2 levels) significantly increase translator error rates and recommends keeping nesting shallow. (https://lokalise.com/blog/complete-guide-to-icu-message-format/)


---

## Design implications & transferable principles

**1. Treat i18n readiness as a non-negotiable launch requirement, not a post-ship retrofit.**
Every hardcoded user-visible string added after launch is a debt item that must be audited before the first localization pass. The cost of retrofitting i18n into a shipped product — finding and externalizing all strings, auditing layout for text expansion, adding font coverage, adding bidi support — is an order of magnitude higher than doing it correctly from the start. Establish the string catalog structure and locale-loading mechanism in the first sprint.

**2. Externalize all user-visible strings into keyed catalogs; the key is the contract.**
The key (not the English value) is what the code references, what the TMS tracks, and what the translator works against. Keys should be semantically stable: they survive English copy changes without breaking the catalog or requiring translator rework. Keys must include enough namespace structure to avoid collisions (`ui.button.save`, `error.network.timeout`).

**3. Use ICU MessageFormat for any message that varies based on runtime values.**
Never concatenate translated fragments. Pass the entire natural-language sentence as a single ICU pattern with named placeholders; let ICU resolve plurals, gender, and select against the active locale. For gender/select on the outside and count-based plural on the inside — not the reverse. Wrap try/catch around ICU formatting: a malformed translator pattern must not crash the app; fall back to the message key and log the error.

**4. Let CLDR APIs format all numbers, dates, currencies, and units.**
Never hardcode `en-US` format patterns in production code. Use the platform's `Intl.*` / `NSDateFormatter` / `DateTimeFormatter` APIs and pass the active locale tag (including regional variant). The only exception is internal data formats (ISO 8601 dates in API payloads, IEEE floats in save files) which must be locale-invariant and should never be presented to users directly.

**5. Design for 40% text expansion from the start; pseudo-localize in CI.**
Every text container that does not gracefully accommodate 40% longer strings will require a design revision when German or Finnish translations arrive. Use flexible layouts from day one. Add pseudo-localization as a CI check: it is the only automated technique that simultaneously verifies externalization, expansion tolerance, encoding, and RTL layout, at zero translation cost. Run it against every build.

**6. Adopt CSS Logical Properties for all layout that must RTL-mirror.**
Writing `margin-inline-start` instead of `margin-left` costs nothing in development and eliminates an entire category of RTL-specific overrides. For projects where LTR-only legacy CSS already exists, prioritize logical property migration on interactive navigation, sidebars, and form layouts — the most visually disorienting elements when mirrored manually with direction-specific overrides.

**7. Map your script targets to font coverage before your first locale ships.**
For each target locale, identify the Unicode scripts required and verify font coverage in the target rendering environment. For web, configure `unicode-range`-split font stacks with Noto as fallback. For native apps and games, verify the platform's font stack or bundle locale-appropriate fonts. For scripts requiring complex shaping (Arabic, Devanagari, Thai), verify the rendering pipeline uses a proper shaping engine (HarfBuzz, DirectWrite, CoreText) — custom renderers frequently lack this. This overlaps with [[accessibility-interactive-apps]]: screen readers for RTL and complex-script locales depend on the same correct Unicode sequences.

**8. Model locale content as data, not as code paths.**
Locale-specific assets (audio, images, subtitles, legal text) should be addressed by locale tag and resolved by a single lookup mechanism, exactly as string catalogs are. New locale support is then a data drop: add the tagged assets and catalog, redeploy or ship the update, no code change required. For large game releases, pre-plan the asset delivery mechanism (separate depots, optional DLC packs) before launch.

**9. Establish a TMS integration early; translation memory compounds in value over time.**
The first project-to-TMS integration has a setup cost; the benefit of TM compounds over subsequent releases as string re-use reduces translation cost. Configure CI/CD integration so strings reach translators automatically on merge; eliminate the manual "export-email-import" cycle, which is the main source of localization delays in iterative development teams.

**10. Scope what to translate deliberately; exclude UGC and internal strings by policy.**
Player-generated chat, user-authored names, and dynamic procedural text are not appropriate for translation by default. Mark them as non-translatable in the TMS and ensure the rendering layer handles arbitrary-script Unicode correctly (using the bidi algorithm for inline direction). Developer/debug strings should remain in English for engineering legibility. Document these exclusion policies explicitly so future developers do not accidentally route untranslatable content through the translation pipeline.


---

## Open questions to resolve per project

- Which locales are Tier 1 (full human translation + QA), Tier 2 (human translation, lighter QA), and Tier 3 (MT-only, disclosed)? This drives budget, TMS workflow configuration, and release sequencing.
- Does the project's rendering pipeline support complex-script shaping for all target locales? (Arabic, Devanagari, Thai, Hangul syllable composition.) If a custom renderer is in use, this must be audited before Arabic or Indic locales are committed.
- Is the UI layout built with CSS Logical Properties (web) or equivalent writing-mode-aware layout primitives (native/game)? If not, what is the migration plan before the first RTL locale ships?
- What is the string catalog format and which TMS will be used? TMS selection should precede the first string externalization pass, not follow it.
- How will locale-specific large assets (voice-over, music, video) be delivered? This affects download size, CDN/depot strategy, and locale-switch UX.
- Does the game or app have procedurally generated user-facing text? If so, can ICU MessageFormat templates cover all required grammatical cases for target locales, or does the generation logic need structural redesign?
- Is pseudo-localization wired into CI as a blocking check, or only as an advisory? Recommend blocking: pseudo-locale failures reliably predict real l10n failures.
- What is the policy for ongoing string maintenance? Who is responsible for marking modified strings as needing re-translation in the TMS when English copy is updated?

---

## Sources

1. https://unicode-org.github.io/icu/userguide/format_parse/messages/ — ICU Documentation, "Formatting Messages" (MessageFormat 1.x, complex argument types, nesting recommendation)
2. https://unicode-org.github.io/icu/userguide/format_parse/messages/mf2.html — ICU Documentation, "MessageFormat 2.0" (successor spec, technical preview in ICU4J)
3. https://cldr.unicode.org/ — Unicode Consortium, "Unicode CLDR Project" (mission, data scope, release cadence, CLDR 48/49)
4. https://hacks.mozilla.org/2019/04/fluent-1-0-a-localization-system-for-natural-sounding-translations/ — Małolepszy, "Fluent 1.0: a localization system for natural-sounding translations", Mozilla Hacks, 2019
5. https://github.com/projectfluent/fluent/wiki/Fluent-vs-gettext — Project Fluent, "Fluent vs gettext" (ID strategy, CLDR integration, Unicode support comparison)
6. https://github.com/projectfluent/fluent/wiki/Fluent-and-ICU-MessageFormat — Project Fluent, "Fluent and ICU MessageFormat" (design relationship and differences)
7. https://www.w3.org/International/geo/html-tech/tech-bidi.html — W3C Internationalization, "Handling Right-to-left Scripts in XHTML and HTML Content"
8. https://firefox-source-docs.mozilla.org/code-quality/coding-style/rtl_guidelines.html — Mozilla, "RTL Guidelines — Firefox Source Docs"
9. https://m2.material.io/design/usability/bidirectionality.html — Material Design, "Bidirectionality" (icon mirroring rules, layout direction)
10. https://en.wikipedia.org/wiki/Noto_fonts — Wikipedia, "Noto fonts" (coverage: 162 scripts, 77,000+ characters, 2024 data)
11. https://notofonts.github.io/noto-docs/website/use/ — Noto Fonts project, "Use Noto fonts" (fallback strategy, subsetting)
12. https://dev.to/anton_antonov/pseudo-localization-for-automated-i18n-testing-31 — Antonov, "Pseudo-localization for Automated i18n Testing", DEV Community
13. https://lokalise.com/blog/complete-guide-to-icu-message-format/ — Lokalise, "Complete Guide to ICU Message Format" (plural, select, nesting depth recommendation)
14. https://partner.steamgames.com/doc/store/localization — Valve, "Localization and Languages — Steamworks Documentation" (locale-specific depots, language scoping)
