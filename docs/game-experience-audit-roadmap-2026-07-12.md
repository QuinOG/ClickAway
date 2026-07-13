# ClickAway Game Experience Audit and Implementation Roadmap

Date: 2026-07-12

## Product north star

ClickAway should feel like a live precision-sport broadcast: the arena is the center of gravity, every supporting screen is part of the same competitive world, and the next meaningful action is identifiable by silhouette, color, position, and motion before the player reads a label.

The governing test for every phase is: **can the player understand this without reading?** If not, the interface needs a stronger visual cue rather than more copy.

## Audit method

This audit covers the current React route tree, shared shell and component system, all page-level JSX and CSS, existing UI-foundation documents, automated UI tests, and live renders at 1440x1000 and 390x844 using the local API and populated player data. It evaluates both steady states and lazy-loading states.

## Executive diagnosis

ClickAway already has a credible game foundation. The brand mark, dark precision-sport palette, local type families, Phosphor icon system, animated arena lobby, buildcraft Armory, cosmetic preview stage, progression feedback, reduced-motion support, mobile dock, and gameplay overlays are stronger than a conventional web app.

The product still feels like a website when the player leaves the core Play/Armory/Shop loop. Four patterns cause most of that drift:

1. Utility routes revert to a large centered card with a heading, paragraph, controls, and rows.
2. Data is presented as labeled boxes or tables instead of diagrams, trajectories, crests, rival positions, and outcome shapes.
3. Route identity is mostly a text heading and active nav border; the world behind each screen does not visibly change.
4. Loading, empty, and onboarding states often explain the absence of content instead of staging the next action visually.

## Comprehensive UI/UX audit

### Visual identity

**Strong:** The ClickAway mark, crosshair motif, beveled corners, cyan edge lighting, dark navy field, and mode/rank colors form a recognizable precision-arena identity. Shop preview art and rank crests create collectible value.

**Website drift:** The same navy card treatment is used for unrelated purposes. Leaderboard, History, Profile, Challenges, and Help can be mistaken for themed dashboard pages because their primary silhouette is still a rounded rectangle containing copy and controls. Large areas of desktop space become passive black margins instead of atmosphere or contextual telemetry.

**Required direction:** Give each route a recognizable scene signature while preserving the shared brand: Play/arena reticle, Armory machinery, Shop holographic inventory, Ladder vertical ascent, Duels opposed target lines, History replay trail, Profile crest, and Help calibration grid.

### Information hierarchy

**Strong:** The Play lobby has a clear main action; Shop makes coins, collection completion, and equipped cosmetics prominent; Profile gives rank a distinct showcase.

**Website drift:** Utility pages often begin with title + explanatory sentence. Challenges makes a form more prominent than the duel fantasy. History gives three similarly weighted highlight blocks and then a table. Leaderboard gives season, filters, personal standing, and table nearly equal visual weight. Profile's nine summary cards require label-by-label reading.

**Required direction:** Every screen needs one dominant visual answer to “where am I / how am I doing?”, one visually distinct next action, and no more than two secondary information bands above the fold.

### Navigation

**Strong:** Desktop grouping is coherent; the Play action is distinct; the mobile dock keeps the four highest-frequency destinations persistent; active states use both icon weight and shape.

**Website drift:** Desktop navigation is dense enough to resemble a SaaS toolbar at 1000–1240px. Group labels and nine text destinations compete with player identity. On mobile, a destination opened from More replaces the More label/icon, which preserves orientation but can hide the path back to the rest of the menu. Route transitions do not visibly carry the player between spaces.

**Required direction:** Preserve the reliable dock but make desktop navigation feel like a compact command deck: stronger icon silhouettes, less persistent copy, contextual route title, and a short scene transition that establishes place.

### Screen layouts

**Play:** The lobby is polished but still asks the player to read mode descriptions and a six-field briefing. Mode differences should be expressed through duration rings, risk shapes, and reward/stakes color before details.

**Armory:** Strongest bespoke screen. Machine, bays, parts, test range, walkthrough, and unlock ceremony feel game-native. The first-load unlock queue can block inspection for a long time when many parts are unseen; batch presentation needs stronger cadence and a clear collection summary.

**Shop:** Strong visual inventory and preview. The route still uses a generic outer card, category rows can become long, and purchase readiness is communicated through small badges/copy. Inspect/equip/purchase should read as a visual state machine.

**Profile:** Strong identity/rank top section. Below it, “Player Summary” is a dashboard grid. Build performance and achievements are valuable but visually disconnected from the identity story.

**Ladder:** Personal standing and rank badge are useful. The season banner is a horizontal information panel, the ladder climax is a conventional sortable table, and the top three have no podium/rival treatment.

**Duels:** Largest game-feel gap. The page is a standard form: username input, replay select, message input, submit button. The core fantasy—challenging a rival's ghost—is not visible. Empty state is text only.

**History:** Highlights are better than a raw log, but the page still culminates in a dense table. There is no visual performance trajectory, replay strip, hit/miss signature, or expandable round card.

**Help:** Documentation-first. It is a help center containing tables, lists, anchors, and FAQ blocks. This is the clearest remaining “website” route and should become a visual field guide with interactive diagrams and contextual deep links.

**Auth:** Desktop composition establishes the brand well. The 390px audit revealed guest-shell overflow/clipping when served under the audit origin: navigation and form actions can extend beyond the viewport. The mobile version also removes the right-side arena demonstration without replacing it with a compact visual proof of play.

### Typography

**Strong:** Sora and Space Grotesk establish a modern, legible voice. Score and rank numerals have appropriate weight. Uppercase micro-labels create a broadcast/telemetry tone.

**Website drift:** Large utility-route headings share a generic scale and position. Numerous 10–12px uppercase labels require close reading, especially on mobile. Some numeric grids give the labels and values similar spatial treatment instead of turning values into instantly recognizable instruments.

**Required direction:** Reserve display scale for outcomes and calls to action, use compact labels only as accessible support, and pair key numbers with rings, bars, trails, or icons.

### Color system

**Strong:** Cyan, mint, amber, and rank tones are well tokenized. Practice/Casual/Ranked have distinct cues and target contrast is documented.

**Website drift:** Cyan becomes the default meaning for focus, selection, progression, links, and decoration. Utility screens rely heavily on blue-on-blue. Success, risk, rivalry, owned/equipped, and actionable-ready states are not always distinguishable at a glance.

**Required direction:** Keep cyan as brand/interaction energy; assign stable semantic color + shape pairs to ready, equipped, reward, risk, locked, rival, positive trend, and negative trend. Never rely on hue alone.

### Iconography

**Strong:** The mature Phosphor set is installed and consistently used in navigation and several game systems. Brand and rank assets are recognizable.

**Website drift:** Page bodies remain largely icon-light. Mode cards, history summaries, challenge creation, stat grids, and help sections often depend on labels. Some important states are tiny pills rather than meaningful silhouettes.

**Required direction:** Introduce large route glyphs, stat instrument icons, replay/rival diagrams, and consistent state emblems. Keep text labels for accessibility and precision.

### White space and density

**Strong:** Core overlays have good breathing room. Mobile pages generally stack cleanly with a persistent dock.

**Website drift:** Desktop pages place dense content inside a 900–1100px rectangle surrounded by unused black space. Inside those rectangles, filters, badges, cards, and copy can become tightly packed. The result is simultaneously sparse and dense rather than cinematic.

**Required direction:** Use the full stage for atmosphere and route identity, then concentrate actionable content into clear command zones. Prefer fewer, larger visual groups over many small bordered boxes.

### Motion design and animation

**Strong:** The codebase contains a real motion system, route transitions, countdown/game-over choreography, feedback events, confetti, target feedback, and reduced-motion controls. Motion is most effective during gameplay and reward moments.

**Website drift:** Utility routes are mostly static. Lazy routes display a tiny centered “Loading…” label on an empty field, which reads as an unfinished web app. Filters, sorting, and empty states rarely use spatial continuity. Route identity does not animate in.

**Required direction:** Add brief scene establishment, skeletons shaped like the destination, number/ring interpolation, list reordering continuity, and restrained ambient motion. Motion must communicate state change, not decorate every surface.

### Player feedback

**Strong:** Hit/miss, streak, power readiness, countdown, rewards, promotion, purchases, unlocks, toasts, audio/haptic preferences, and reduced motion are already covered.

**Website drift:** Sending a duel, changing ladder views, inspecting history, and switching profile achievement categories provide limited game-like response. The generic toaster is visually detached from the action source.

**Required direction:** Use inline action confirmation, source-to-destination motion, rivalry pulses, replay selection previews, and clear state transformation. Toasts remain backup announcements.

### Responsiveness and mobile experience

**Strong:** Authenticated 390x844 renders are generally usable. The game lobby becomes a compact three-mode rail, bottom actions are thumb-reachable, cards stack, and the dock remains visible.

**Gaps:** Guest auth can clip horizontally; dense desktop navigation compresses before switching to the dock; Help/UI-kit reference content can overflow; mobile History is a long vertical read; Profile places the large rank block before most actionable content; shop category navigation consumes a large scroll distance; safe-area behavior needs device testing beyond emulation.

**Required direction:** Fix overflow at the token/layout level, use mobile-first visual summaries, horizontal snap rails only where position is obvious, keep primary actions above the dock, and verify 320/360/390/430 widths plus landscape.

### Desktop experience

**Strong:** The 1440px layout is stable and all primary routes fit the shell without horizontal overflow.

**Gaps:** The desktop shell resembles a compact admin toolbar, pages are often an isolated central card, and large monitors do not gain richer context. Hover affordances exist but are not consistently paired with click/focus discovery.

**Required direction:** Use wide-screen space for contextual visualization, opponent/season/replay side rails, and atmosphere—not simply wider text or margins.

### Accessibility and usability

**Strong:** Semantic buttons/links, labeled dialogs, focus restoration, keyboard tabs, ARIA live regions, reduced motion, focus-visible styles, and text alternatives are already meaningful strengths.

**Gaps:** Small uppercase telemetry can fall below comfortable mobile readability; some state cues remain color-heavy; hover/focus player details are not obviously discoverable; rapid live regions need continued restraint; high-contrast and non-audio feedback should be verified with actual settings combinations.

**Required direction:** Every color cue gets an icon/shape; hit targets remain at least 44px on touch; visual instruments retain accessible names and numeric text; new motion honors the existing preference system; game-critical signals receive contrast and motion-reduced equivalents.

### Consistency and component architecture

**Strong:** Purpose-based UI primitives, tokens, route metadata, a shared overlay contract, and feature folders already exist.

**Website drift:** Legacy `.pageCenter`, `.card`, `.cardWide`, `.table`, `primaryButton`, and `secondaryButton` patterns coexist with Stage/Scene and bespoke game surfaces. CSS is large and route-specific, increasing visual drift and breakpoint conflicts.

**Required direction:** Introduce a small set of game-native page primitives—`RouteScene`, `CommandHeader`, `VisualStat`, `StateEmblem`, `ActionDock`, `ReplayCard`—and migrate incrementally. Do not rewrite stable gameplay systems.

### Performance and resilience

**Strong:** Route-level lazy loading, local fonts, AVIF use, deterministic game engine, skeleton components, and separated feedback preferences are good foundations.

**Gaps:** The lazy fallback is not a skeleton; game and Armory stylesheets are very large; many legacy PNG assets remain; route CSS can be difficult to prune; some first renders depend on several API/image states before feeling complete.

**Required direction:** Destination-shaped loading scenes, prefetch likely routes from idle time, explicit image dimensions/decoding, asset modernization where it is visually lossless, and CSS ownership cleanup after visual migration.

## Prioritized implementation roadmap

The phases below are intentionally small and independently testable. Workstreams may run in parallel only after their shared contracts are frozen.

### Workstream A — Shared scene language

#### Phase A1 — Route scene contract

- **Objective:** Make every route feel like a place in the ClickAway world.
- **Improvements included:** Add route scene metadata (glyph, accent, atmosphere, status cue); create reusable scene backdrop and command-header primitives; establish semantic shape/color tokens for ready, reward, risk, rival, locked, and equipped.
- **User-facing impact:** Players recognize the current destination and its purpose before reading the title.
- **Dependencies:** Existing route metadata and UI tokens.
- **Completion point:** All authenticated non-live routes render through the new scene shell with no behavior changes.

#### Phase A2 — Game-native loading and route transition

- **Objective:** Eliminate blank fields and the tiny “Loading…” web fallback.
- **Improvements included:** Destination-shaped skeletons, animated calibration reticle, route glyph transition, content reveal choreography, reduced-motion equivalent.
- **User-facing impact:** Navigation feels continuous and intentional even on a cold load.
- **Dependencies:** A1.
- **Completion point:** Every lazy route has a recognizable loading composition at desktop and mobile sizes.

#### Phase A3 — Responsive and accessibility hardening

- **Objective:** Guarantee clarity and control across small screens and input modes.
- **Improvements included:** Fix guest-shell overflow; normalize minimum widths; 44px touch targets; safe-area spacing; shape companions for color states; readable telemetry floor; keyboard/focus regression coverage.
- **User-facing impact:** No clipped action, hidden destination, or color-only critical state.
- **Dependencies:** A1 tokens; may proceed alongside A2.
- **Completion point:** 320/360/390/430px portrait and 667px landscape pass overflow and interaction checks; existing accessibility tests pass.

### Workstream B — Arena comprehension and moment-to-moment feel

#### Phase B1 — Visual mode selection

- **Objective:** Let players compare Practice, Casual, and Ranked without reading descriptions.
- **Improvements included:** Duration rings, stakes emblems, reward pips, pressure silhouettes, stronger selected-mode stage, compact build readiness, contextual tooltips for exact rules.
- **User-facing impact:** Mode, risk, duration, and reward model are legible in one glance.
- **Dependencies:** A1.
- **Completion point:** Each mode is identifiable with labels visually suppressed in a review fixture; keyboard and touch selection remain intact.

#### Phase B2 — HUD glance test

- **Objective:** Keep live attention on the target while conveying score, time, streak, power readiness, and ghost pressure.
- **Improvements included:** Validate peripheral score/timer anchors; stronger low-time shape/motion; power-ready edge pulse; ghost delta trajectory; compact mobile hierarchy.
- **User-facing impact:** Critical round state is understandable in one-second peripheral glances.
- **Dependencies:** B1 mode cues; existing feedback preferences.
- **Completion point:** Practice/Casual/Ranked/ghost rounds pass desktop and mobile visual-state captures, including reduced motion.

#### Phase B3 — Outcome and reward continuity

- **Objective:** Make the end of a round feel like a payoff rather than a modal report.
- **Improvements included:** Score lock-in animation, hit/miss signature, personal-best comparison, reward flight into persistent balances, rank movement path, one obvious next action.
- **User-facing impact:** Players instantly understand performance, gains, and what to do next.
- **Dependencies:** B2; existing reward/promotion overlays.
- **Completion point:** Every round outcome has a staged reveal and accessible static fallback without changing reward logic.

### Workstream C — Competition and reflection

#### Phase C1 — Duel command center

- **Objective:** Replace the challenge form with a visible rival-versus-replay fantasy.
- **Improvements included:** Three-step duel composer (rival, replay, launch), opposed crest/reticle stage, replay preview cards, incoming/outgoing radar, duel-status emblems, visual empty state.
- **User-facing impact:** Sending and answering a ghost duel feels like initiating a match, not submitting a form.
- **Dependencies:** A1; existing replay/challenge APIs.
- **Completion point:** Create, accept, decline, launch, completed, loading, error, and empty states are visually distinct and independently testable.

#### Phase C2 — Seasonal ladder stage

- **Objective:** Turn standings into rivalry and ascent.
- **Improvements included:** Top-three podium/crests, vertical season path, pinned player marker, nearby-rival band, icon-led board switching, table retained only as detailed view.
- **User-facing impact:** Rank position, next rival, and season progress are visible immediately.
- **Dependencies:** A1; can run parallel with C1.
- **Completion point:** Top, around-me, search, sparse-player, and unranked states all show a clear player position and next target.

#### Phase C3 — Replay journal

- **Objective:** Make History a visual record of improvement.
- **Improvements included:** Performance trajectory sparkline, outcome glyphs, expandable replay cards, hit/miss and reaction signatures, filter chips, detailed table demoted to optional view.
- **User-facing impact:** Players spot improvement, slumps, best runs, and ranked movement without scanning columns.
- **Dependencies:** A1; existing history snapshot builders.
- **Completion point:** Last-five trend and each round's mode/result/quality are recognizable without opening the detail view.

### Workstream D — Identity, collection, and learning

#### Phase D1 — Player identity cockpit

- **Objective:** Replace summary-card reading with a coherent player story.
- **Improvements included:** Crest + level orbit, three core instrument stats, form trajectory, build signature, achievement constellation, contextual actions.
- **User-facing impact:** Identity, rank, progress, strengths, and next milestone read as one composition.
- **Dependencies:** A1; can run parallel with C workstream.
- **Completion point:** Above the fold answers who the player is, current rank, progress, strongest trait, and nearest goal.

#### Phase D2 — Collection state machine polish

- **Objective:** Make Shop and Armory acquisition/equip flows unmistakable.
- **Improvements included:** Consistent locked/ready/owned/equipped emblems, inspect-to-purchase spatial continuity, collection completion ring, unlock batching, clearer test-range readiness.
- **User-facing impact:** Players always know what they own, can afford, have equipped, and can try.
- **Dependencies:** A1; stable shop/armory logic.
- **Completion point:** Every item/part state is recognizable by shape and position without badge text.

#### Phase D3 — Visual field guide and contextual teaching

- **Objective:** Replace documentation-first Help with visual, task-based learning.
- **Improvements included:** Interactive round-flow diagram, controls illustration, mode/rank/build cards, searchable deep links, contextual “show me” links into Play/Armory, progressive disclosure for exact rules.
- **User-facing impact:** New players learn by recognizing and trying systems instead of reading a manual.
- **Dependencies:** B1 and D2 visual language.
- **Completion point:** First round, modes, scoring, powers, builds, rank, and economy each have a visual explainer and direct action.

#### Phase D4 — Arrival and account flow refinement

- **Objective:** Make first contact cinematic, fast, and mobile-safe.
- **Improvements included:** Compact mobile arena demonstration, benefit icons, password visibility feedback, overflow fix, arrival/session calibration continuity, form-state motion with reduced-motion fallback.
- **User-facing impact:** Account entry feels like entering the game and never clips on small screens.
- **Dependencies:** A1 and A3.
- **Completion point:** Login/signup/session restore pass desktop/mobile/keyboard/error/loading checks.

### Workstream E — Integration and release quality

#### Phase E1 — Feedback cohesion

- **Objective:** Make every action response feel sourced from the object that changed.
- **Improvements included:** Inline confirmations, badge/number interpolation, action-source pulses, spatial reward movement, restrained toast usage, sound/haptic hooks for new states.
- **User-facing impact:** Players never wonder whether an action registered or what changed.
- **Dependencies:** B–D surface phases.
- **Completion point:** Navigation, selection, purchase, equip, duel, filter, achievement, error, and retry each have visible feedback and preference-aware alternatives.

#### Phase E2 — Performance and asset pass

- **Objective:** Preserve polish on low-end mobile and cold loads.
- **Improvements included:** Idle route prefetch, image dimensions and async decoding, lossless modern formats where appropriate, CSS ownership cleanup, animation compositor audit, skeleton timing tuning.
- **User-facing impact:** Faster perceived entry, stable layouts, and smooth motion.
- **Dependencies:** Major visual migrations complete.
- **Completion point:** Production build succeeds; no layout shift from known imagery; no avoidable long main-thread animations; route chunks load with branded fallback.

#### Phase E3 — Final cohesion matrix

- **Objective:** Verify the product as one game across all states.
- **Improvements included:** Cross-route visual drift review; 320–1440px captures; keyboard/touch/pointer checks; reduced-motion/audio/haptic setting combinations; loading/error/empty/sparse/overflow scenarios; gameplay regression suite.
- **User-facing impact:** A consistent, reliable experience rather than isolated polished screens.
- **Dependencies:** All prior phases.
- **Completion point:** Build, lint, unit, UI, and visual state matrix pass with no critical regressions.

## Dependency map and safe parallelism

The shared spine is **A1 → A2/A3 → surface workstreams → E1 → E2 → E3**.

After A1 freezes the scene and state contracts:

- B1, C1, C2, C3, D1, and D4 can proceed independently.
- B2 depends on B1; B3 depends on B2.
- D2 can run independently but should finish before D3.
- D3 depends on the visual language created by B1 and D2.
- E1 follows the relevant surface, while E2 should wait until CSS and asset churn settles.

High-conflict areas are `layout.css`, route metadata, global tokens, mobile dock safe-area rules, and shared action primitives. Changes in those files should be serialized through Workstream A.

## Immediate execution batch

The first implementation batch will deliver the highest systemic improvement with low gameplay risk:

1. A1 route scene contract.
2. A2 branded loading/transition.
3. A3 guest/mobile overflow and shared interaction hardening.
4. C1 Duel command center, the weakest current route.
5. C3 visual History trajectory and round cards.
6. E3 verification for the changed surfaces.

This batch has a clean completion point: every route has a stronger game-world scene, cold navigation no longer looks unfinished, the confirmed mobile clipping is removed, and the two most web-like competition routes become visual-first experiences without altering game economy or server behavior.

## Implementation status — 2026-07-12

Completed in the first execution pass:

- **A1:** Route scene contract, per-route atmosphere, semantic scene accents, and icon-led command header.
- **A2:** Destination-shaped calibration loader and route-aware loading copy.
- **A3:** Guest/mobile width hardening, compact mobile arena proof, touch-safe account layout, and shape-backed states on changed surfaces.
- **C1:** Duel command center with rival lock, visual replay rail, opposed reticle stage, launch feedback, radar empty/loading/error states, and redesigned duel cards.
- **C2:** Seasonal ladder command header and top-three podium/player-to-beat stage.
- **C3:** Score trajectory, mode-shaped plot points, wider replay journal, and mobile round cards replacing the dense table at small widths.
- **D3:** Icon-led field guide, visual round loop, direct lobby action, and exact-reference layer.
- **D4:** Mobile-safe arrival composition with a compact Practice/Casual/Ranked trajectory.
- **E3 (changed-surface gate):** Desktop and 390x844 rendered review; full lint, unit, UI, and production build pass.

The remaining roadmap phases are intentionally preserved as independent future increments rather than folded into this batch.
