---
title: Accessibility (a11y) for interactive apps & games — WCAG/POUR, input remapping, screen readers, color contrast, reduced motion, captions, and canvas/WebGL
slug: accessibility-interactive-apps
domain: accessibility
tags: [wcag, pour-principles, aria, screen-reader, color-contrast, colorblind-safe, reduced-motion, captions, input-remapping, canvas-accessibility, game-accessibility]
status: active
updated: 2026-06-27
confidence: high
sources: 14
supersedes:
abstract: "WCAG 2.2 POUR canon for interactive apps and games: perceivable (contrast, captions, color+shape), operable (keyboard, remapping, reduced-motion), understandable (clear UI), robust (ARIA), canvas DOM-overlay gap, and legal drivers."
---

## Scope

A **project-agnostic** deep reference on the full accessibility stack required for interactive web applications and games: the WCAG 2.1/2.2 framework and POUR principles; perceivable design (contrast ratios, colorblind-safe palettes, captions/subtitles, scalable text); operable design (full keyboard navigation, remappable controls, one-handed modes, reduced-motion); understandable design (clear language, consistent UI, error recovery); robust design (ARIA roles/states/properties, screen-reader compatibility); the unique challenge of canvas and WebGL surfaces that have no DOM semantics; the DOM-overlay pattern as the primary mitigation; testing strategy (automated and manual); and legal/standards drivers (WCAG 2.1/2.2 AA, CVAA, EN 301 549). Applies to browser-based games, native game clients with web-adjacent UI, progressive web apps, and hybrid app architectures. Pairs with [[internationalization-localization]] for locale-sensitive text sizing and right-to-left layout considerations.

---

## Key findings

### 1. The WCAG framework and POUR principles

WCAG (Web Content Accessibility Guidelines), maintained by the W3C Web Accessibility Initiative, is the internationally recognized standard. WCAG 2.1 (2018) introduced 78 success criteria; WCAG 2.2 (October 2023) added nine more, with a focus on mobile, cognitive, and motor accessibility. Three conformance levels exist: A (minimum), AA (the legal and de facto industry target), and AAA (enhanced). The EU's EN 301 549 mandates WCAG 2.2 AA for digital products sold in EU markets as of June 28, 2025; the US CVAA covers communication features in games.

All WCAG criteria are organized under four principles — **POUR**:

- **Perceivable**: information must be presentable in ways all users can sense (visual, auditory, textual alternatives).
- **Operable**: all interface components and navigation must be operable without requiring interactions a user cannot perform.
- **Understandable**: information and interface operation must be comprehensible.
- **Robust**: content must be interpretable by a wide variety of user agents, including current and future assistive technologies.

Each principle is elaborated below with game- and app-specific implications.

### 2. Perceivable — contrast, color, captions, text scaling

**Color contrast ratios.** WCAG 2.1 AA requires a minimum luminance contrast ratio of **4.5:1** for normal text and **3:1** for large text (18 pt regular or 14 pt bold) and for non-text UI components (buttons, icons, input borders, game HUD elements). The ratio is defined as `(L1 + 0.05) / (L2 + 0.05)` where L1 is the lighter relative luminance and L2 the darker. WCAG AAA raises the bar to 7:1 for normal text. Tools: WebAIM Contrast Checker, Colour Contrast Analyser (CCA) by TPGi, axe DevTools.

**Color is never the sole signal.** Approximately 5% of the global population has color vision deficiency (CVD); the most common forms are deuteranopia and protanopia (red-green confusion). Critical information — team affiliation, item rarity, enemy status, form validation errors — must always be redundantly encoded via shape, pattern, icon, or text label in addition to color. In Grounded (Xbox), a "Missing ingredients" alert uses red color *plus* a warning triangle shape *plus* the text label "Missing ingredients"; any one channel alone would fail a portion of the audience.


**Colorblind-safe palettes.** A palette is CVD-safe when it maintains sufficient luminance contrast (not just hue difference) between every pair of meaningfully distinct colors. Useful starting points: the Okabe-Ito palette and the Paul Tol palettes are empirically validated for the three common CVD types. Design workflow: run every in-game color scheme through a CVD simulator (Color Oracle, Stark for Figma) before shipping; do not rely only on simulation — test with actual CVD players. Where color carries essential meaning (e.g., team colors on a mini-map), provide a colorblind mode or allow per-category color assignment. Forza Horizon 4 offers Deuteranopia, Protanopia, and Tritanopia presets; Call of Duty: Black Ops Cold War allows free per-role color assignment on the mini-map.

**Captions and subtitles.** Captions (full accessibility tool) differ from subtitles (translation only). WCAG success criterion 1.2.2 requires synchronized captions for all pre-recorded audio; 1.2.4 requires live captions for live audio. Game-specific best practice (Xbox Accessibility Guideline 104): captions should be enabled by default or offered immediately before any audio plays; they should be customizable in font size, color, and background opacity; speaker identity should be labeled in ALL CAPS on the caption line each time a new speaker begins; background and ambient sounds should be described in brackets (e.g., [thunder], [door slams]); and the captioning system should allow independent toggling of dialogue, ambient sounds, and music cues. Captions placed at the bottom center of the screen should not occlude critical UI elements, and lines should not exceed 32 characters with a minimum 16 pt sans-serif font.

**Scalable text.** WCAG 1.4.4 (Resize Text, AA) requires that text can be scaled to 200% without loss of content or functionality. WCAG 1.4.10 (Reflow, AA, 2.1 new) requires that content can be presented in a single column at 320 CSS pixels width (equivalent to 400% zoom on a 1280 px viewport) without horizontal scrolling. Implementation: use `rem` for all font sizes and spacing so that user browser font-size preferences cascade correctly; never lock text in `px` only. For game UI: expose an in-game text size slider and ensure the layout engine reflows rather than truncating or overlapping at larger sizes. Game Accessibility Guidelines (Basic): "Use an easily readable default font size" and "Allow the font size to be adjusted" (Advanced).

### 3. Operable — keyboard, input remapping, reduced motion

**Full keyboard navigability.** WCAG 2.1.1 requires that all functionality is operable via keyboard. WCAG 2.1.2 prohibits keyboard traps (focus that cannot be moved away via keyboard). For web apps: every interactive element must be reachable via Tab (or arrow keys within a composite widget), activatable via Enter/Space, and dismissable via Escape for modals and overlays. For games with browser-rendered menus: all menus, pause screens, settings dialogs, inventory UIs, and HUD controls must be fully keyboard-operable even if gameplay itself uses mouse or gamepad. Game Accessibility Guidelines: "Ensure that all areas of the user interface can be accessed using the same input method as the gameplay."

**Remappable controls.** Input remapping is consistently rated among the highest-value accessibility features in community surveys. It addresses motor disabilities ranging from limited hand mobility to one-handed play to tremor. Requirements: every in-game action should be rebindable to any input (button, key, axis); simultaneous multi-button combos should be avoidable (provide toggle or sequential alternatives to chords); "hold to activate" actions should have a toggle-on option; analogue, gesture, and speech input should be supplementary, not required for any key action. Xbox Accessibility Guideline 107 documents these requirements in detail. The Xbox Adaptive Controller is the hardware manifestation: it allows gamepad inputs to be driven from foot pedals, chin joysticks, or specialty switches.

**Reduced-motion.** WCAG 2.3.3 (Animation from Interactions, AAA) and the widely-adopted best practice below AA: honor the OS/browser `prefers-reduced-motion: reduce` media query. Vestibular disorders, epilepsy, migraines, and ADHD can all be triggered by parallax, auto-playing animation, rapid camera movement, or flashing content. WCAG 2.3.1 (AA) prohibits content that flashes more than three times per second. Implementation in CSS: wrap all non-essential animations in `@media (prefers-reduced-motion: reduce) { ... }` blocks — removing them or substituting a cross-fade. In JavaScript: check `window.matchMedia('(prefers-reduced-motion: reduce)').matches` before starting animation loops. In-game: provide a "Reduce motion / camera shake" toggle that persists; turn off background particle effects, screen-shake, and auto-scroll at high speed. The W3C technique C39 documents the canonical CSS implementation. Game Accessibility Guidelines: "Avoid flickering images and repetitive patterns" (Basic) and "Provide an option to turn off / hide background movement" (Intermediate).

**Touch target size.** WCAG 2.5.5 (Target Size, AA in 2.2) requires interactive targets to be at least 24×24 CSS pixels with 24px spacing. The recommended gold standard is 44×44 px (Apple HIG) or 48×48 dp (Material Design). For on-screen virtual controls in touch-based games, Game Accessibility Guidelines specify: "Ensure interactive elements / virtual controls are large and well spaced, particularly on small or touch screens."


### 4. Understandable — language, consistency, error recovery

WCAG Guideline 3.1 requires that the language of the page and any language changes within a passage are programmatically declared (`<html lang="en">`, `lang` attribute on inline passages). This enables screen readers to switch speech synthesis voices and inflection correctly. See [[internationalization-localization]] for locale handling, right-to-left scripts, and number/date formatting.

WCAG 3.2 (Predictable) requires that components behave consistently: navigation menus must appear in the same position across pages; elements with the same function must be labeled identically. For games: the pause menu must always be reachable by the same input; icon meanings must be consistent across UI contexts. Game Accessibility Guidelines: "Give a clear indication that interactive elements are interactive" and "Indicate / allow reminder of controls during gameplay."

WCAG 3.3 (Input Assistance) requires that input errors are identified in text, not just by color; that labels and instructions are provided before required fields; and that users can review, correct, and confirm submissions before finalization. For game save/purchase flows, these rules apply in full.

Plain language: use CEFR B1-equivalent vocabulary for UI text; avoid jargon and idiom in critical instructions; reinforce text instructions with icons or short video demonstrations. Game Accessibility Guidelines: "Use simple clear language" and "Ensure no essential information is conveyed by text alone, reinforce with visuals and/or speech."

### 5. Robust — ARIA, accessible name/role/value, screen-reader compatibility

**The ARIA model.** WAI-ARIA (Accessible Rich Internet Applications) is a W3C specification that allows authors to annotate HTML elements — including custom widgets — with semantic roles, states, and properties that assistive technologies read. The accessible name/role/value model: every interactive element must have a role (what it is), a name (how it is announced), and current value/state (checked, expanded, selected, etc.). The first rule of ARIA: if a native HTML element already provides the semantics (`<button>`, `<input>`, `<select>`, `<dialog>`), use it without ARIA augmentation. Only use ARIA when building custom widgets that have no native HTML equivalent.

Key ARIA patterns for games and apps:
- Modal dialogs: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing at the heading; focus must be trapped inside and restored on close.
- Progress bars / health meters: `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label="Health"`.
- Live game events (score, chat): `aria-live="polite"` for non-urgent updates; `aria-live="assertive"` only for critical alerts that must interrupt the screen reader immediately.
- Icon-only buttons: `<button aria-label="Pause game">` — never rely on Unicode glyphs as the text content, as screen readers announce their Unicode description rather than game intent (Xbox XAG 103 documents this pitfall explicitly: a Unicode clock character announced as "3 o'clock" rather than "Timed Mode").
- Tabs / inventory panels: `role="tablist"` / `role="tab"` / `role="tabpanel"` with `aria-selected` and arrow-key navigation managed in JavaScript.

**Screen reader ecosystem.** The dominant screen readers are NVDA (free, Windows), JAWS (paid, Windows, enterprise), and VoiceOver (built-in, macOS and iOS). Each interprets ARIA somewhat differently; cross-SR testing is required. VoiceOver is used by approximately 71% of mobile screen reader users (iOS). Apple's App Store now has Accessibility Nutrition Labels (2025–2026) listing which accessibility features an app exposes, creating a market incentive for disclosure.

### 6. The canvas and WebGL accessibility gap

`<canvas>` and WebGL surfaces render pixels directly to a bitmap; their content has no DOM representation and is therefore completely opaque to assistive technologies. A screen reader scanning a canvas-based game sees only the element itself — not its rendered characters, inventory items, score, or map.

**The DOM-overlay pattern** is the canonical mitigation. Two complementary layers are maintained:
1. The canvas renders the game visuals as normal.
2. A hidden or visually-transparent DOM layer — absolutely positioned over the canvas — contains ARIA-annotated HTML elements that mirror the interactive and informational content of the canvas. This layer is navigable by keyboard and screen reader but is visually invisible to sighted users (using `position: absolute; opacity: 0; pointer-events: none` with `pointer-events` re-enabled only for the AT layer, or using `clip-path`/off-screen positioning for truly hidden elements).

For static canvas images (charts, maps), the minimum viable approach is `role="img"` plus `aria-label` on the `<canvas>` element itself, or fallback content inside `<canvas>...</canvas>` tags that screen readers surface when canvas is not rendered. For interactive canvases, the fallback-content approach is insufficient; a full parallel DOM is required.

**ARIA live regions** bridge canvas state changes to screen readers: when a game event occurs (enemy defeated, level up, objective updated), a visually-hidden `<div aria-live="polite">` is updated with a text description; the screen reader announces it without the user navigating away from gameplay focus.

**Emerging approaches.** The HTML-in-Canvas API (Chrome, 2026) proposes rendering live DOM subtrees inside WebGL scenes, preserving keyboard navigation and screen reader semantics. This would dramatically reduce the overhead of the DOM-overlay pattern for HUD elements. Until it is stable and cross-browser, the DOM overlay remains the production-grade approach. Chart.js documents a reference implementation: `<canvas>` with fallback `<table>` inside, plus ARIA annotations, serving as a template for data-visualization use cases.


### 7. Testing strategy — automated + manual

**Automated tools** catch approximately 30–40% of WCAG violations programmatically. Key tools:
- **axe-core / axe DevTools** (Deque): 96 rules, integrates with Jest, Cypress, Playwright; the most comprehensive automated rule set. Google Lighthouse accessibility audits run a subset (~57 rules) of axe-core.
- **WAVE** (WebAIM): browser extension focused on visual annotation of issues; good for design review.
- **Colour Contrast Analyser** (TPGi): standalone tool for sampling on-screen colors against WCAG ratios; essential for canvas and image-based UI where CSS is not analyzable.

**Manual testing matrix.** Automated tools cannot assess logical focus order, meaningful label quality, or real AT interaction behavior. Required manual passes:
1. Keyboard-only navigation: Tab through every interactive element; verify focus is always visible; verify no traps; verify all modals and overlays are operable and dismissable.
2. Screen reader + keyboard: NVDA + Chrome (Windows primary); VoiceOver + Safari (macOS/iOS); JAWS + Chrome/Edge (enterprise). Verify every control's role, name, and state are announced correctly; verify live regions fire at the right moment.
3. Zoom to 200% and 400%: verify layout reflows without overlap or truncation.
4. Reduced-motion: enable OS "Reduce Motion" setting; verify all non-essential animations cease.
5. High-contrast mode: Windows High Contrast mode overrides CSS color; verify UI remains operable (no invisible text or borders).
6. Colorblind simulation: run every game screen through Color Oracle for Deuteranopia, Protanopia, and Tritanopia; verify all essential information remains distinguishable.

**Include disabled players in playtesting.** AbleGamers Includification: "Include some people with impairments amongst play-testing participants" (Intermediate); "Include every relevant category of impairment in representative numbers based on demographic of target audience" (Advanced). Simulation tools cannot substitute for authentic user testing.

### 8. Legal and standards drivers

| Standard / Law | Scope | Key requirement | Penalty / consequence |
|---|---|---|---|
| WCAG 2.1 / 2.2 AA | Global de facto | 78 (2.1) / 87 (2.2) success criteria across POUR | Basis for all regulations below |
| EN 301 549 (EU) | All digital products/services in EU | WCAG 2.2 AA mandatory from June 28, 2025 (European Accessibility Act) | Fines up to €1M; product bans |
| CVAA (US, 2010) | Advanced communication services in games | Any in-game text, voice, or video chat must be accessible | Fines up to ~$144,000/violation, ~$1.4M/act cap |
| ADA / Section 508 (US) | Government-contracted software, places of public accommodation | WCAG 2.0 AA minimum; courts increasingly apply 2.1 | Litigation, DOJ enforcement |
| Xbox Accessibility Guidelines | Microsoft platform certification | 21 guidelines across motor, vision, hearing, cognitive, speech | Required for Xbox/PC Game Pass titles |

The CVAA (21st Century Communications and Video Accessibility Act) is specifically relevant to games: as of December 31, 2018, any video game communication functionality released from 2019 onward must be accessible to people with disabilities. This covers in-game text chat, voice chat, and video communication — not gameplay mechanics in general, but the communication layer is often tightly integrated with game UI.

---

## Concrete examples & references

- **Grounded (Xbox Game Studios)**: Reference implementation cited repeatedly in Xbox Accessibility Guidelines. Missing-ingredients alert uses red color + warning triangle shape + text label "Missing ingredients" — three simultaneous channels, any two of which serve CVD or low-literacy players. Damage indicators use red screen halo + audio grunt + controller haptics. XAG 103.

- **Forza Horizon 4 (Playground Games)**: CVD presets (Deuteranopia, Protanopia, Tritanopia) plus High Contrast Mode. Mini-map route line rendered in multiple color options. Documented in XAG 103 as a positive example of colorblind mode.

- **Call of Duty: Black Ops Cold War (Treyarch)**: Free per-role color assignment for mini-map team icons, allowing players to choose exactly the colors that work for their specific CVD type rather than guessing from presets. XAG 103.

- **Assassin's Creed Valhalla (Ubisoft)**: "Odin's Sight" provides both on-screen glowing visual indicator and spatial audio cue for interactable objects simultaneously — serving both deaf and blind players from a single design decision. XAG 103.

- **Killer Instinct (Iron Galaxy / Xbox)**: Spatial audio stereo-panned for attack events, allowing blind players to track character and enemy positions by sound alone. Advanced hearing accessibility. GAG Vision / Advanced.

- **Chart.js (open source)**: Documents the reference canvas accessibility pattern — `<canvas>` with `<table>` fallback inside the element tags, plus ARIA annotations on the canvas element itself. https://www.chartjs.org/docs/latest/general/accessibility.html

- **Paul Jadam canvas ARIA demos**: Demonstrates `role="img"` + `aria-label` on `<canvas>`, and the proxy-element pattern for interactive canvas elements with live focus states. https://pauljadam.com/demos/canvas.html

- **W3C C39 technique** (prefers-reduced-motion): The canonical CSS technique for honoring OS reduced-motion preference: `@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }` with selective re-enabling for essential animations. https://www.w3.org/WAI/WCAG22/Techniques/css/C39

- **AbleGamers Includification**: 48-page illustrated guide covering Motor, Hearing, Vision, and Cognitive disabilities across three tiers (Easy, Intermediate, Advanced). Includes printable checklists and developer exercises. https://accessible.games/includification/

- **Game Accessibility Guidelines** (gameaccessibilityguidelines.com): Collaborative reference from studios, specialists, and academics. Six categories (Motor, Cognitive, Vision, Hearing, Speech, General) × three levels (Basic, Intermediate, Advanced). Excel checklist download available. https://gameaccessibilityguidelines.com/full-list/

- **Xbox Accessibility Guidelines** (Microsoft Learn): 21 guidelines (XAG 101–121) with real game screenshots, video examples, and player impact tables. Particularly XAG 101 (text), XAG 102 (contrast), XAG 103 (multisensory cues), XAG 104 (subtitles/captions), XAG 107 (input remapping). https://learn.microsoft.com/en-us/gaming/accessibility/guidelines

- **MDN ARIA documentation**: Canonical reference for all ARIA roles, states, and properties with browser and AT compatibility tables. https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA

- **Smashing Magazine — Closed Captions and Subtitles UX** (2023): Detailed UX design guide for caption formatting, speaker labeling, line length, timing, and positioning. https://www.smashingmagazine.com/2023/01/closed-captions-subtitles-ux/

- **HTML-in-Canvas API** (Chrome 2026 proposal): Proposes rendering live DOM inside WebGL scenes with preserved keyboard navigation and screen reader semantics. Would significantly reduce the DOM-overlay burden. https://byteiota.com/html-in-canvas-api-draw-live-dom-inside-webgl-chrome-2026/


---

## Design implications & transferable principles

**1. POUR is a design filter, not a compliance checklist.**
Apply POUR as a question at each design review: Can a user perceive this? Can they operate it without a mouse? Will they understand it? Will their AT be able to parse it? Treating WCAG as a post-hoc audit catches issues late and expensively; treating POUR as a design constraint catches them at whiteboard stage.

**2. Never rely on a single sensory channel for critical information.**
Any critical game state (you are being attacked, the ingredient is missing, the door is locked) must be expressed through at least two simultaneous channels — typically: visual shape/icon + text label, or audio + visual indicator. Color alone, sound alone, and motion alone each fail a meaningful portion of the audience. The multisensory design pattern benefits all users in degraded environments (bright sunlight, loud room, small screen).

**3. Colorblind-safe design starts with luminance contrast, not palette selection.**
A palette with 4.5:1 luminance contrast between every meaningfully distinct pair of elements is safer than any pre-built "colorblind palette" applied without contrast verification. Use CVD simulation tools to validate, but gate on actual contrast ratios. Where meaning is encoded only in hue (enemy red vs. ally green), add a redundant shape or label.

**4. Input remapping is a multiplier — plan for it architecturally.**
The input system must decouple logical actions from physical inputs from day one. If actions are hardcoded to specific buttons, remapping requires restructuring the entire input layer. Design: action map → binding map → hardware input. Full remapping plus "hold-to-toggle" for all held inputs addresses the broadest motor-accessibility spectrum without requiring bespoke one-handed modes.

**5. Reduced-motion is a first-class rendering mode, not an afterthought.**
Every animation and camera behavior added to a project must be categorized as essential (carries information) or decorative. Decorative animations are suppressed entirely under `prefers-reduced-motion: reduce`; essential animations are replaced with a static or cross-fade alternative. Build this into the animation system architecture rather than patching it at release. An in-game toggle for camera shake, background particle effects, and screen flash should be in the settings menu alongside volume sliders.

**6. Use semantic HTML and native controls wherever they exist; reserve ARIA for the gaps.**
The "first rule of ARIA" is: don't use ARIA if a native HTML element handles the semantics. A `<button>` is keyboard-focusable, activatable, and announced correctly by all screen readers; a `<div role="button">` requires manually adding `tabindex`, keyboard event handlers, and hope. Design systems that wrap native controls behind correctly-annotated components are cheaper to maintain and more robustly accessible than fully custom ARIA implementations.

**7. Canvas and WebGL require a parallel accessible DOM — plan for it as a distinct surface.**
Treat the canvas layer and the accessible DOM layer as separate engineering concerns with a defined synchronization protocol. The DOM layer should be driven by the same game state store that drives the canvas renderer; they should not diverge. Define a clear interface: which game entities have accessible representations, what their roles are, and which state changes trigger live-region announcements. Retroactively adding an accessible layer to a canvas game after launch is significantly more expensive than building the synchronization protocol into the state architecture from the start.

**8. All accessibility settings must persist across sessions.**
Accessibility configurations are not preferences in the sense of cosmetic choices — they are requirements for usability. Every accessibility setting (font size, caption state, color preset, motion toggle, remapped controls) must be saved immediately and restored on next launch without requiring re-configuration. Game Accessibility Guidelines (Basic): "Ensure that all settings are saved/remembered."

**9. Automate 30–40% of checks; manually test the rest with AT.**
Automated tools (axe-core, Lighthouse) are efficient for catching structural issues — missing labels, contrast failures, missing `lang` attributes, keyboard traps detectable by DOM analysis. They cannot assess whether a live region fires at the right moment, whether a focus order is logical, or whether a screen reader announcement is meaningful. A testing matrix that combines automated CI gates with quarterly manual AT passes (NVDA + Chrome, VoiceOver + Safari) catches what automation misses.

**10. Communicate accessibility features clearly before and during the game.**
Players with disabilities cannot know whether a game is playable for them until they can access that information. Publish an accessibility feature list on the product page, on packaging, and in the first-run experience. Apple's Accessibility Nutrition Labels (App Store, 2025–2026) formalize this for iOS. Game Accessibility Guidelines (Basic): "Provide details of accessibility features in-game" and "on packaging and/or website." Enable subtitles and any essential accessibility defaults on first launch, before any unskippable audio or video plays.

---

## Open questions to resolve per project

- Which WCAG conformance level is the legal target for the deployment markets? (EU requires 2.2 AA from mid-2025; US ADA case law is converging on 2.1 AA; specific platforms like Xbox enforce their own superset guidelines.)
- Does the application include advanced communication services (text/voice/video chat)? If yes, US CVAA compliance is mandatory and requires documented consultation with disabled users.
- Is any UI rendered to a canvas or WebGL surface? If yes, which game entities require accessible DOM representations, and what is the state-synchronization protocol between the render layer and the accessible DOM layer?
- What is the full input-method matrix (keyboard, mouse, gamepad, touch, switch access, eye tracking)? Which are required vs. supplementary? Full remapping architecture must be planned before control bindings are implemented.
- Is there any content that flashes more than three times per second? If yes, it must be removed or gated behind a photosensitivity warning with an opt-in.
- What is the minimum font size in the default game UI, and is every text element using relative units (rem/em)? Audit required before UI lock.
- Are captions enabled by default or at minimum toggleable before any audio plays? What custom caption options (size, color, background, speaker labels) are in scope?
- Has the color palette been validated against 4.5:1 contrast ratios for all text/UI pairs, and against CVD simulation for the three primary types? Who owns this validation in the design pipeline?
- Is there a plan to include players with disabilities in formal playtesting? Which disability categories map to the game's risk areas (motor for action games, cognitive for complex strategy, vision for HUD-heavy games)?

---

## Sources

1. https://www.w3.org/TR/WCAG22/ — W3C, "Web Content Accessibility Guidelines (WCAG) 2.2," October 2023
2. https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA — MDN Web Docs, "ARIA – Accessible Rich Internet Applications"
3. https://gameaccessibilityguidelines.com/full-list/ — Game Accessibility Guidelines, "Full list" (collaborative, studios + academics)
4. https://accessible.games/includification/ — AbleGamers Foundation, "Includification: A Practical Guide to Game Accessibility"
5. https://learn.microsoft.com/en-us/gaming/accessibility/guidelines — Microsoft, "Xbox Accessibility Guidelines" (XAG 101–121)
6. https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/103 — Microsoft, "XAG 103: Additional channels for visual and audio cues"
7. https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/104 — Microsoft, "XAG 104: Subtitles and captions"
8. https://www.w3.org/WAI/WCAG22/Techniques/css/C39 — W3C WAI, "C39: Using the CSS prefers-reduced-motion query to prevent motion"
9. https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion — MDN, "prefers-reduced-motion CSS media feature"
10. https://webaim.org/resources/contrastchecker/ — WebAIM, "Contrast Checker"
11. https://www.chartjs.org/docs/latest/general/accessibility.html — Chart.js, "Accessibility" (canvas fallback and ARIA reference implementation)
12. https://pauljadam.com/demos/canvas.html — Paul Jadam, "HTML Canvas Accessibility" (ARIA role=img, proxy-element demos)
13. https://www.smashingmagazine.com/2023/01/closed-captions-subtitles-ux/ — Smashing Magazine, "Designing for Accessibility: Best Practices for Closed Captioning and Subtitles UX," 2023
14. https://ablegamers.org/cvaa/ — AbleGamers, "What is the CVAA" (US 21st Century Communications and Video Accessibility Act scope for games)
