# ClickAway UI/UX Master Implementation Roadmap

Audit date: 2026-07-11  
Scope: planning only; no production implementation included

## 1. Executive Diagnosis

ClickAway is not a shallow prototype. The live audit confirmed a sound, unusually feature-rich game underneath the presentation: Practice/Casual/Ranked modes, three training drills, deterministic server-verified rounds, buildcraft loadouts, six powers, placements and division changes, staged rewards, lifetime statistics, achievements, cosmetics, seasons, ghost duels, and persistent accounts. The production build succeeds and all 56 existing tests pass. The roadmap therefore preserves and reveals these systems instead of replacing them with invented substitutes.

The main gap is authored experience. ClickAway currently uses one dark-blue, rounded, bordered surface grammar for almost everything. At 1440 px the Profile becomes a grid of stat cards, History resolves to a table, Ladder resolves to a table plus filters, Help becomes nested instructional cards, and Duels opens with a form. Even strong pages such as Cosmetic Armory retain a web-store grid. This makes systems legible, but gives every system similar visual weight and makes the product feel assembled from UI components rather than directed as a game.

The live game is the strongest route, but it still frames score, time, status, arena, and powers as adjacent dashboard widgets. Hits have visual feedback and streak atmosphere, yet there is no audio or haptic layer, limited anticipation in the countdown, no decisive low-time or Ranked broadcast treatment, and no single momentum focal point. The results sequence is thoughtfully split into promotion, rewards, and summary, but the summary returns to a data panel. On a 390 x 844 viewport, the three-row navigation consumes about 196 px; active gameplay stacks HUD blocks and power cards; the fixed-height, overflow-hidden result flow visibly clips its top and bottom. These are structural problems, not cosmetic polish issues.

Identity is still provisional. `Navbar.jsx` calls the brand asset a logo placeholder, the catalog mixes polished rank crests with novelty raster objects, the visual tokens contain only a small generic blue/teal foundation, and terminology varies among Ladder/Leaderboard, Rank/Rating/MMR/RR, and Challenges/Duels. There is no shared sound language, settings surface, authored loading entrance, or route-specific environmental composition.

Accessibility has a better base than the visuals imply: global focus rings, native controls in most places, ARIA-labelled dialogs, reduced-motion handling, and useful loading/error/empty states already exist. Remaining risks include a `div[role="button"]` hotbar interaction that omits Space behavior, hover-dependent player details, noisy live regions during rapid score changes, color-heavy state communication, mobile clipping, and no game-specific readability/control preferences. Accessibility should be designed into the arena, not appended after animation work.

Technical UX risks visible during the audit are a 180 kB CSS build with a 4,433-line `game.css`, duplicated/global breakpoint ownership, a 507 kB minified entry chunk warning, no browser-level UI or visual regression tests, and a current lint failure in `useGameScreenController.js` for a synchronous state update inside an effect. These are not reasons to reduce ambition; they identify where visual work could drift or regress without bounded foundations.

### System-wide causes

- One surface recipe is doing too many jobs: background, container, card, control, modal, stat, and selection.
- Navigation exposes eight destinations at equal weight and does not recompose for mobile or live play.
- Page architecture starts from data sections instead of a player fantasy, decision, or emotional moment.
- Rank, mode, streak, reward, and cosmetic identity exist as data but are not consistently expressed through shape, composition, motion, and sound.
- Feedback is mostly local animation; there is no coordinated presentation timeline spanning anticipation, action, release, and reward.
- Responsive rules primarily stack desktop blocks, especially in the shell, HUD, powers, Profile, and result overlay.
- Page-specific CSS has outgrown the small shared token layer, inviting visual drift and repeated fixes.

### What is already strong and must remain

- Server-authoritative deterministic scoring, geometry validation, reward calculations, and Ranked tokens.
- Practice/Casual/Ranked rule differences, drills, warm-up recommendation, PB pace, and session summary.
- Three saved builds, passive modules, power hotbar, persisted active build, and Armory walkthrough.
- Placements, RR, promotion/demotion protection, rank icons, seasons, around-me Ladder view, replays, and ghost duels.
- Staged Game Over flow, XP animation, promotion reveal, achievement evaluation, lifetime/loadout stats, purchase/equip persistence, and auth security.
- Existing keyboard focus treatment, reduced-motion support, form validation, and explicit loading/error/empty states.

## 2. ClickAway UI/UX North Star

### Recommended direction: Precision Arena Broadcast

The central fantasy is: **I am a precision competitor entering a reactive arena, building visible momentum one perfect hit at a time.** The product should feel like a compact esport broadcast fused with a tactile arcade cabinet—not a sci-fi operating system and not a casino.

The emotional arc is composed and anticipatory before play, nearly silent and sharply focused at round start, increasingly electric during a streak, tense at low time, then cleanly released through a paced result and reward ceremony. Ranked adds ritual and stakes; Practice feels like a training range; Casual feels fast and generous.

The visual direction uses deep ink environments, high-contrast bone-white type, a restrained electric-cyan identity accent, and mode/rank accents used as lighting rather than card fills. A distinctive pointer/impact motif becomes the brand signature: offset rings, clipped corners, fine trajectory lines, calibrated tick marks, and concentric impact ripples. Large typography, negative space, and environmental lighting replace most nested rectangles. Rank crests, targets, avatars, and equipped cosmetics become hero objects. The type system pairs a compact authored display face for moments and scores with a highly readable UI face; it must be self-hosted or reliably bundled.

Interaction direction is decisive and controller-like: one dominant action per view, spatial selection where appropriate, immediate press feedback, explicit locked/owned/equipped states, and short routes back to Play. Hover enriches but never carries required information. Motion communicates state and causality, not decoration. Sound is sparse and layered: soft navigation ticks, distinct hit/miss transients, escalating streak layers, power-ready signatures, a low-time pulse, and reward/rank stingers. Every cue has visual and reduced-motion/sound-off equivalents.

Immersion never overrides readability. During play, targets, timer, score, and powers always win contrast. Outside play, the shell may carry identity and progression. ClickAway should never resemble a SaaS KPI dashboard, admin table, generic glass-card gallery, neon casino, loot-box storefront, or military HUD pasted over every page.

## 3. Design and Experience Principles

1. **The target is the protagonist.** Around play, composition, motion, sound, and cosmetics all support target acquisition rather than competing with it.
2. **One moment, one hierarchy.** Every screen declares one primary decision or emotional event; secondary information progressively reveals instead of receiving equal cards.
3. **Momentum must be felt before it is read.** Streak, pressure, improvement, and rewards change the arena and feedback language, then reinforce that change with numbers.
4. **Modes are places, not difficulty labels.** Practice, Casual, and Ranked receive distinct atmosphere, copy, stakes, entrance, and result tone while sharing one system.
5. **Player identity beats analytics.** Rank, build, cosmetics, signature achievements, and personal records lead; raw metrics support them.
6. **Every state is authored.** Loading, empty, locked, unaffordable, error, placement, promotion, demotion protection, and reduced-motion states belong to the game world.
7. **Responsive means recomposed.** Mobile gets a compact shell, condensed HUD, action sheets, and scan-first lists—not vertically stacked desktop panels.
8. **Feedback remains optional and legible.** Color is never the only signal; motion, sound, haptics, and screen effects can be independently reduced without hiding game state.

## 4. Master Improvement List

Priority uses P0 (foundation/blocker), P1 (major), P2 (supporting), and P3 (optional/experimental). Confidence reflects evidence from both source and the running application.

### Essential foundational improvements

**UI-01 — Authored visual foundation.** Current problem: the 50-line token layer and generic blue rounded surfaces cannot express mode, rank, pressure, or hierarchy. Proposed improvement: define bundled display/UI typography, semantic color and lighting roles, shape families, depth levels, impact motifs, mode/rank themes, icon rules, and cosmetic-readability constraints. Why/result: every later screen shares a recognizable studio-authored language and needs fewer local inventions. Affected: all routes; `src/styles/tokens.css`, `base.css`, `app.css`, `animations.css`, `public/`. Dependencies: none. Risks: contrast regressions and premature page migration. Priority P0; confidence high.

**UI-02 — Purpose-based primitives and state kit.** Current problem: `card`, `cardWide`, pills, and page-specific panels encode visual sameness; loading/error/empty states vary. Proposed: build semantic primitives for stage, command strip, inset detail, stat readout, action, tabs, modal/sheet, skeleton, empty/error, progress, badge, and tooltip with complete interaction states. Why/result: pages stop nesting anonymous cards and agents can migrate consistently. Affected: shared components and every page CSS; especially `Layout.jsx`, `InfoStrip.jsx`, `TierBadge.jsx`, `src/styles/layout.css`. Dependencies: UI-01. Risks: a generic component library if primitives are not tied to moments. P0; high.

**UI-03 — Game-native shell and navigation.** Current problem: seven equal nav pills plus Profile dominate desktop and form three rows on mobile; the shell does not prioritize Play or player status. Proposed: a compact desktop command rail with dominant Play, grouped Collection/Competition items, identity/reward cluster, contextual back behavior, and a four-destination mobile dock plus More sheet; collapse the shell during rounds. Why/result: faster orientation and materially more arena space. Affected: `Navbar.jsx`, `Layout.jsx`, `PlayerHoverCard.jsx`, `layout.css`, route metadata in `App.jsx`. Dependencies: UI-01/02. Risks: discoverability and active-route conflicts. P0; high.

**UI-04 — Feedback, motion, sound, and preference framework.** Current problem: motion exists but is locally authored; no sound/haptic layer or player settings exist. Proposed: shared motion durations/eases, event feedback service, small original/licensed sound set, optional vibration, volume/mute/reduced-flash/screen-shake controls, persistence, and non-audio equivalents. Why/result: a coherent tactile game feel without forcing intensity. Affected: `MotionConfig` in `App.jsx`, `animations.css`, game controller/components, new preference hook/service and settings sheet. Dependencies: UI-01/02. Risks: autoplay restrictions, fatigue, asset licensing. P0; medium-high.

### Major player-facing improvements

**UI-05 — Branded arrival and authentication.** Current problem: session restore is a generic bordered “Checking session” card; Login/Sign Up are forms floating in empty space. Proposed: an arena-attract composition with logo lockup, concise fantasy, ambient target demonstration, branded session transition, and focused accessible auth panel. Why/result: the first three seconds communicate a real game. Affected: `App.jsx`, `LoginPage.jsx`, `SignupPage.jsx`, `AuthInputField.jsx`, `forms.css`, `Navbar.jsx`. Dependencies: UI-01–03. Risks: ambient effects obscuring form/error states. P1; high.

**UI-06 — Arena lobby and mode selection.** Current problem: Ready is a centered modal carousel over a blurred game, with stats in three mini cards and Practice drills expanding the panel. Proposed: make `/game` a full arena lobby with a mode spotlight, spatial mode rail, immediate stakes/reward summary, recent best/goal, build strip, and one primary Start action; Practice drills become a compact training drawer. Why/result: entering play feels like choosing an arena, not configuring a dialog. Affected: `ReadyOverlay.jsx`, `GamePage.jsx`, controller ready props, `gameModesConfig.js`, `drillConfig.js`, `game.css`. Dependencies: UI-01–04. Risks: overloading first-time players; preserve selection persistence. P1; high.

**UI-07 — Ranked preflight, placements, and stakes.** Current problem: Ranked is described mostly through generic mode copy; placement count, next division, demotion protection, and potential outcome are scattered. Proposed: a Ranked-specific preflight layer showing crest, placement track or current RR, protection, expected stakes range, build readiness, warm-up suggestion, and clear “Ranked affects rating” confirmation without friction. Why/result: Ranked feels consequential and trustworthy. Affected: `ReadyOverlay.jsx`, `rankUtils.js`, `trainingRecommendations.js`, `GamePage.jsx`, `Help` rank content. Dependencies: UI-06. Risks: implying a guaranteed RR result; use ranges/copy carefully. P1; high.

**UI-08 — Arena entrance and countdown ritual.** Current problem: countdown is a small centered `3` card on a mostly empty blurred arena. Proposed: center target calibration, mode-colored arena reveal, 3–2–1–GO typography, progressive sound/tick feedback, input lock explanation, and instant reduced-motion version with equivalent timing. Why/result: players arrive focused and the first target spawn feels intentional. Affected: `CountdownOverlay.jsx`, `GameArena.jsx`, game controller phase transition, `game.css`, feedback framework. Dependencies: UI-04/06. Risks: added latency or disorientation. P1; high.

**UI-09 — Competitive HUD hierarchy.** Current problem: score and time are two bordered panels; mode/rank/build metadata compete with live information and mobile stacks them. Proposed: peripheral score/timer anchors, central momentum/streak channel, compact build/power context, PB/ghost delta, low-time states, and a condensed mobile HUD. Why/result: critical information is readable without looking away from the target. Affected: `GameHud.jsx`, `GameStatusRow.jsx`, `GamePage.jsx`, `game.css`. Dependencies: UI-01–04. Risks: breaking arena geometry when HUD height changes. P1; high.

**UI-10 — Hit, miss, target, and streak feel.** Current problem: feedback particles, shake, and atmosphere exist, but impacts remain visually similar and have no sound/haptic escalation. Proposed: contact ripple at pointer, score impulse, miss locus and streak-break cue, milestone callouts, target spawn anticipation, combo-layer lighting/sound, and strict effect budgets. Why/result: accuracy and momentum become physically satisfying while misses stay instructive. Affected: `ClickFeedbackLayer.jsx`, `MovingButton.jsx`, controller hit/miss callbacks, `GameArena.jsx`, `animations.css`, `game.css`. Dependencies: UI-04/09. Risks: visual noise, input latency, photosensitivity. P1; high.

**UI-11 — Power hotbar comprehension and activation.** Current problem: three power cards are dense, stack vertically on mobile, and use a partial custom button semantic; charging/ready/active causality is weak. Proposed: compact hotbar slots with radial/segmented charge, distinct ready signature, target-aware activation feedback, duration/consumption state, keyboard/touch parity, and a short first-use coach. Why/result: powers feel earned and strategically usable without stealing attention. Affected: `PowerupTray.jsx`, build glyphs, controller power presentation, `GameHud.jsx`, `game.css`. Dependencies: UI-04/09. Risks: changing perceived timing; preserve engine events. P1; high.

**UI-12 — Low-time, Ranked pressure, and ghost duel broadcast.** Current problem: timer color/pulse and a text-heavy ghost banner carry high-stakes states. Proposed: arena-edge countdown, restrained pressure vignette, final-five cadence, side-by-side ghost pace marker, lead-change cue, and Ranked-specific conclusion beat. Why/result: tension and rivalry are felt peripherally. Affected: `GameHud.jsx`, controller PB/ghost state, `replayUtils.js`, `GamePage.jsx`, `game.css`. Dependencies: UI-04/09/10. Risks: anxiety and obscured targets; preferences must disable pressure effects. P1; high.

**UI-13 — Responsive and accessible gameplay modes.** Current problem: mobile retains the full shell, stacks powers, shrinks arena height, and clips results; game accessibility lacks dedicated preferences. Proposed: round-time shell collapse, landscape/portrait compositions, bottom-sheet ready/results, compact hotbar, safe-area support, touch target rules, font scaling, high-contrast target outline, reduced-flash/shake, sound-independent cues, and keyboard semantics. Why/result: supported small screens become intentional and all feedback remains perceivable. Affected: `Layout.jsx`, `GamePage.jsx`, every game component, `layout.css`, `game.css`, `PowerupTray.jsx`. Dependencies: UI-03/04/06/09–12. Risks: geometry/server coordinate parity and viewport resize. P0; high.

**UI-14 — Round conclusion and performance reveal.** Current problem: the round jumps into modal stages and ends on a performance table; Practice results visibly clip on mobile. Proposed: freeze-and-release conclusion, score hero, one authored performance verdict, personal-best/clean-run moment, then expandable details and decisive Rematch/Change Mode actions. Why/result: the emotional peak lands before statistics and replay is immediate. Affected: `GameOverFlow.jsx`, `GameOverOverlay.jsx`, motion hooks, `game.css`. Dependencies: UI-04/09/10/13. Risks: delaying replay; provide skip/continue and reduced-motion behavior. P1; high.

**UI-15 — Rewards and level progression ceremony.** Current problem: XP, coins, and RR are animated but still presented as rows in a modal; unlock previews are absent. Proposed: sequential reward tally with coin/XP trajectories, level-crossing celebration, next unlock preview, session total, and skippable pacing. Why/result: progression feels earned and creates anticipation for the next round. Affected: `RewardsModal.jsx`, progression utilities, catalog/buildcraft unlock data, `game.css`. Dependencies: UI-04/14. Risks: inaccurate unlock promises and animation length. P1; high.

**UI-16 — Placement, promotion, demotion, and protection ceremonies.** Current problem: promotion and final placement have a modal, but demotion/protection/near-threshold states lack equivalent clarity and rank language varies. Proposed: one Ranked outcome sequence with crest transition, RR track movement, placement stamp, promotion/demotion/protection variants, threshold explanation, and consistent RR terminology. Why/result: rank movement is legible, fair, and memorable. Affected: `PromotionModal.jsx`, `RewardsModal.jsx`, `rankUtils.js`, rank assets, `TierBadge.jsx`, result CSS. Dependencies: UI-07/14/15. Risks: edge cases across placement and top rank. P1; high.

**UI-17 — Achievement and session-goal delivery.** Current problem: achievements mainly live in Profile and the result only hints at the nearest one; no unlock ceremony or persistent session objective layer exists. Proposed: queue achievement unlock toasts/ceremonies after core rewards, show one active session goal in lobby/HUD, record progress without interruption, and link to the gallery. Why/result: short- and long-term motivation becomes visible during the loop. Affected: `useAchievementSync.js`, achievement evaluation/list, Game Over flow, Ready/HUD, achievement components. Dependencies: UI-06/14/15. Risks: toast spam and double-awards; queue and deduplicate. P1; medium-high.

### Supporting player journeys

**UI-18 — Player identity profile.** Current problem: Profile opens with useful identity/rank but becomes a ten-card KPI report; achievement showcase is buried. Proposed: a player banner/card with equipped cosmetics, rank crest, signature build, featured achievements, record strip, career milestones, and secondary expandable analytics. Why/result: players see a character/competitor identity they can own and potentially share. Affected: `ProfilePage.jsx`, profile/achievement CSS, avatar styling, rank utilities. Dependencies: UI-01/02/16/17. Risks: missing data for new players; authored empty identity states. P1; high.

**UI-19 — Achievement gallery and showcase.** Current problem: categories/carousel are embedded at the bottom of Profile and repeated tiles dominate. Proposed: a focused gallery or profile subview with category constellation, chain progress, hidden achievement treatment, completion moments, featured-slot selection, and accessible list fallback. Why/result: achievements become a discoverable collection rather than a checklist. Affected: `AchievementsCarousel.jsx`, `AchievementTile.jsx`, `ProgressBar.jsx`, achievement list/evaluation, Profile route/state, achievement CSS. Dependencies: UI-02/17/18. Risks: route expansion and carousel accessibility. P2; high.

**UI-20 — Cosmetic armory, preview, purchase, and equip.** Current problem: the shop is visually stronger but still a 27-item product grid; live preview, ownership, affordability, and equip compete in every card. Proposed: category-stage layout with large interactive arena/avatar preview, collection rail, comparison drawer, focused purchase confirmation, unlock reveal, equip handoff, and readability warning/check. Why/result: buying feels like unlocking game identity and players understand the in-game effect before spending. Affected: `ShopPage.jsx`, shop components/CSS, `shopCatalog.js`, `shopUtils.js`, shop actions/celebration. Dependencies: UI-01/02/04. Risks: raster asset quality and preserving transactional behavior. P1; high.

**UI-21 — Armory build workshop.** Current problem: Armory is custom and functionally rich, but dense accordions, saved-build rail, walkthrough controls, and review panels compete; it has no visible page heading in the audited state. Proposed: retain the four-step workshop but give each step one working canvas, persistent build silhouette, clearer effect tradeoffs, mode impact preview, semantic headings, and compact mobile stepper. Why/result: buildcraft becomes ClickAway's distinctive strategic layer instead of a configuration panel. Affected: `ArmoryScreen.jsx`, shared Armory components/controller/walkthrough, buildcraft presentation/constants, `armory.css`. Dependencies: UI-01–03/11. Risks: persisted URL/walkthrough state and simultaneous edits. P1; high.

**UI-22 — Performance journal and round inspection.** Current problem: History leads with three highlights then a dense desktop table; mobile stacks but does not transform the information model. Proposed: personal-record timeline, recent trend strip, mode/build filters, scan-first round cards on small screens, and an inspect drawer with reaction, RR, rewards, build, and replay/challenge action. Why/result: players learn what improved and can act on a notable round. Affected: `HistoryPage.jsx`, history builders/utilities/constants, API pagination, `history.css`, `tables.css`. Dependencies: UI-01/02. Risks: old records with missing metrics. P2; high.

**UI-23 — Seasonal Ladder and nearby rivals.** Current problem: Ladder still reads as season card + controls + statistics table; player hover details are mouse-centric. Proposed: season header with reward horizon, podium, persistent personal position, nearby rival band, promotion-distance cues, board filters in a compact command strip, inspect drawer, and list/card mobile presentation. Why/result: competition gains faces, movement, and a reason to return. Affected: `LeaderboardPage.jsx`, leaderboard insights copy, `PlayerHoverCard.jsx`, season/rank utilities, `layout.css`/`tables.css`. Dependencies: UI-01–03/16. Risks: sparse leaderboards and misleading “promotion zone” language. P1; high.

**UI-24 — Ghost duel challenge journey.** Current problem: Duels opens as a form and an empty message; replay prerequisites are expressed through a disabled-looking CTA. Proposed: rival inbox first, challenge composer sheet launched from History/Ladder/Profile, replay card preview, incoming stake/target summary, accept/decline ceremony, duel entrance, and result/rematch handoff. Why/result: asynchronous competition becomes understandable and socially motivating. Affected: `ChallengesPage.jsx`, `HistoryPage.jsx`, `LeaderboardPage.jsx`, replay API/utils, ghost HUD/game query flow, shared modal/sheet. Dependencies: UI-02/12/14/22/23. Risks: challenge status races and empty replay inventory. P2; medium-high.

**UI-25 — Progressive onboarding and field guide.** Current problem: Help is comprehensive but card-heavy and detached from moments; first-session guidance spans Armory and Game but does not teach powers/rank through contextual practice. Proposed: a three-minute first-run path (Practice hit/miss, power, Casual reward), contextual “why” prompts, skippable Armory introduction, Ranked education at eligibility, and a searchable game-native Field Guide with deep links. Why/result: new players learn by doing and returning players can resolve rules quickly. Affected: build/game onboarding constants/hooks, `ReadyOverlay.jsx`, Armory walkthrough, `HelpPage.jsx`, structured help content/components/CSS. Dependencies: UI-05/06/08/11/15/21. Risks: stale progress states and over-tutorialization. P1; high.

### Final polish and optional improvements

**UI-26 — Cross-route responsive, accessibility, and resilient states.** Current problem: each route owns partial breakpoints; fixed/internal scrolling, hover content, generic route fallback, and inconsistent states create edge-case failures. Proposed: breakpoint and safe-area matrix, zoom/large-text pass, keyboard/focus/dialog audit, color/forced-colors checks, mobile state recomposition, route-specific skeleton/empty/error scenes, offline/API recovery, and browser-level tests. Why/result: the authored experience survives real devices and failure states. Affected: all pages/components/styles/tests, especially `Layout.jsx`, route fallback, tables and overlays. Dependencies: page missions UI-05–25. Risks: broad scope; execute as a finite matrix, not redesign. P0; high.

**UI-27 — Performance and presentation reliability.** Current problem: large CSS/entry bundles, route font dependency, lint failure, image variability, and no visual regression baseline can create jank or drift. Proposed: route/vendor chunk review, asset sizing/formats, font bundling/preload, CSS ownership cleanup, render-profile hot paths, animation performance budgets, lint closeout, and screenshot/a11y smoke tests for critical states. Why/result: faster, stable first paint and dependable 60 fps feedback. Affected: Vite config, `App.jsx` lazy boundaries, styles/assets, game controller, tests. Dependencies: UI-01/02 and implemented page missions. Risks: premature refactors; measure before changing. P1; high.

**UI-28 — Optional identity extensions.** Current problem: identity and rivalry currently stop inside the app. Proposed: after the core roadmap, evaluate shareable player cards/round recaps, rotating session contracts, and season-end recap/reward scenes using existing stats and cosmetics. Why/result: organic replay goals and social expression. Affected: Profile/History/Ladder and new export/goal services. Dependencies: UI-17–24/27. Risks: privacy, moderation, notification fatigue, and scope expansion. P3; medium. These experiments must not delay known foundational work.

## 5. Implementation Phases

### Phase 1 — Visual and interaction foundation

Goal: create the one authored language every agent must use. Contains UX-01 through UX-04. UX-01 is sequentially first; UX-02 follows its semantic decisions; UX-03 and UX-04 can then run in parallel with coordination around `Layout.jsx`, `App.jsx`, and global styles. After this phase, unchanged pages may still be dashboard-like, but typography, hierarchy primitives, shell, preferences, and feedback rules make future migrations coherent.

### Phase 2 — Arrival and game entry

Goal: make the first seconds and the decision to play feel game-native. Contains UX-05 through UX-08. UX-05 can run beside UX-06; UX-07 follows the lobby model; UX-08 follows the finalized ready-to-play transition. UX-06–08 all touch game overlays/CSS and should be sequential unless file ownership is explicitly partitioned. After this phase, a visitor enters a branded arena, understands the three modes, sees Ranked stakes, and begins with anticipation.

### Phase 3 — Active competition

Goal: make every live second readable, tactile, and responsive. Contains UX-09 through UX-13. UX-09 establishes HUD geometry; UX-10 and UX-11 can then run in parallel; UX-12 integrates their pressure language; UX-13 validates/recomposes the full system. These missions overlap in `game.css` and controller props, so parallel agents require strict file boundaries or staged rebases. After this phase, desktop and supported mobile play feel like the same authored competitive game.

### Phase 4 — Results, rank, and motivation

Goal: turn the end of a round into a paced emotional and progression loop. Contains UX-14 through UX-17. UX-14 defines the conclusion spine; UX-15 and UX-16 can be developed in parallel in separate modal files, then integrated; UX-17 follows to avoid reward/achievement competition. After this phase, performance, XP, coins, rank, records, and achievement progress arrive in a clear, satisfying order.

### Phase 5 — Player identity and build economy

Goal: make ownership, builds, and progression visible outside a round. Contains UX-18 through UX-21. Profile/achievement missions are sequential; Shop and Armory can run parallel because their route trees and CSS are separate, coordinating only on shared primitives and the settings/sheet system. After this phase, players look like competitors with a collection and a strategic build, not accounts with KPIs.

### Phase 6 — Competition and reflection

Goal: turn stored data and async systems into reasons to improve and return. Contains UX-22 through UX-24. History and Ladder can run in parallel; Duels follows because it launches from both and rejoins the game/result flow. After this phase, notable rounds create replays, rivals, and actionable performance stories.

### Phase 7 — Onboarding, resilience, and integration

Goal: teach the finished experience, harden it, and remove drift. Contains UX-25 through UX-28, with UX-28 remaining optional. UX-25 follows the screens it teaches; UX-26 executes the defined device/state matrix; UX-27 measures and removes reliability regressions; UX-29, defined in section 10, is the final bounded integration review. After this phase, the game is cohesive from first load through long-term competition and remains usable across supported inputs and failures.

## 6. Detailed Implementation Missions

### UX-01: Establish the Precision Arena Visual Foundation

**Mission objective:** encode the selected art direction as stable semantic tokens and reference examples, without migrating full pages.

**Why this mission exists / player-facing result:** current blue surfaces cannot differentiate hierarchy, modes, ranks, or pressure. Players will later experience one recognizable pointer/impact language, readable type, and purposeful color rather than generic glass cards.

**Scope:** define bundled display/UI font stacks and loading behavior; semantic environment/ink/accent/status/mode/rank tokens; three depth levels; corner/line/impact motifs; spacing and type scales; focus/selection/disabled rules; shadow/glow budgets; target/cosmetic contrast rules; and a development-only reference route or documented fixture if the repository convention permits. Add token aliases so legacy CSS can migrate gradually.

**Explicitly out of scope:** route redesigns, navigation restructuring, new audio, or wholesale deletion of legacy selectors.

**Relevant repository areas:** `src/styles/tokens.css`, `base.css`, `app.css`, `animations.css`, `public/ranks/`, `public/pointerimage.png`, catalog assets, `TierBadge.jsx`.

**Existing functionality to preserve:** current theme classes, rank icon mapping, focus visibility, and reduced-motion behavior.

**UX/visual requirements:** Practice teal, Casual cyan, Ranked warm-gold/red pressure, and ranks remain distinguishable without recoloring whole screens; display type is reserved for scores/titles; body copy meets contrast; backgrounds provide composition without lowering target clarity.

**Interaction states:** specify default, hover, focus-visible, pressed, selected, disabled, locked, success, warning, error, and loading tokens.

**Motion and feedback:** token definitions only—durations, easing, distance, glow and flash ceilings; reduced-motion resolves to opacity/state changes.

**Responsive/accessibility requirements:** fluid type uses guarded `clamp`; 200% zoom remains legible; status and rank mappings include icon/text/shape equivalents; no color-only distinction.

**Dependencies:** none. **Parallelization:** do not run with other global-style foundation edits; asset inventory can occur in parallel.

**Acceptance criteria:** semantic tokens are documented and exercised in one reference; fonts load locally with fallbacks; contrast samples pass WCAG AA for normal UI text; existing routes compile without forced full migration; no legacy theme class breaks.

**Regression checks / definition of done:** build, focus ring, all rank/mode themes, target visibility, and reduced motion are checked. Stop once the foundation and reference are stable; do not restyle pages.

### UX-02: Build the Purpose-Based UI Primitive Kit

**Mission objective:** provide reusable components/styles that express hierarchy and complete states without another generic card system.

**Why / result:** agents currently create local panels for every page. Players will encounter consistent actions, dialogs, progress, selections, and resilient states while major content is allowed to breathe without borders.

**Scope:** implement primitives for stage/scene, command strip, inset detail, stat readout, action button/link, tabs/segmented control, badge, progress meter, tooltip/popover, modal, mobile sheet, skeleton, empty scene, and error/retry scene; include usage docs/fixture; expose semantic variants, not arbitrary colors.

**Out of scope:** migrating whole routes; changing business logic; replacing specialized game target, Armory choices, or achievement tile.

**Repository areas:** `src/components/`, `Layout.jsx`, `InfoStrip.jsx`, `TierBadge.jsx`, `src/styles/layout.css`, `components/tables.css`, `components/forms.css`.

**Preserve:** native button/link semantics, toast behavior, existing form validation, and route lazy loading.

**UX/visual:** one primary action per group; borderless scene is default, inset panels are secondary; modals and sheets share focus/escape/restore behavior; destructive and irreversible actions are explicit.

**States:** all required base states plus empty, loading, retrying, success, owned/equipped, affordable/unaffordable and locked variants where applicable.

**Motion/feedback:** press response under 120 ms; modal/sheet causally enters from trigger context; no bounce by default; reduced motion is instant or short fade.

**Responsive/accessibility:** modal becomes sheet only when content benefits; 44 px touch targets; tabs support arrow keys; tooltips are nonessential and work on focus; dialogs trap focus and restore it.

**Dependencies:** UX-01. **Parallelization:** isolated from page migrations; conflicts with UX-03 on shared layout primitives.

**Acceptance:** fixture demonstrates every state; keyboard and screen-reader labels work; no primitive requires nested anonymous cards; tests cover dialog/tab basics; build and lint pass for touched files.

**Regression/DoD:** auth fields, toasts, links styled as buttons, disabled actions, and lazy fallback remain functional. Stop before migrating a production route beyond a minimal proving use.

### UX-03: Recompose the Application Shell and Navigation

**Mission objective:** prioritize Play and player identity while reclaiming mobile and live-game space.

**Why / result:** eight equal destinations form a dashboard rail and three mobile rows. Players get a clear Play anchor, grouped destinations, persistent identity/rewards, and a compact mobile dock/More sheet.

**Scope:** define route metadata; create desktop shell with Play, Collection (Armory/Shop/Profile), Competition (Ladder/Duels/History), and Help/Settings access; surface avatar/rank/coins/level compactly; add mobile bottom dock with Play, Armory, Ladder, Profile and More; collapse or hide shell during countdown/playing; retain contextual route transition and back behavior.

**Out of scope:** redesigning destination contents, changing auth protection, or adding new progression data.

**Areas:** `Navbar.jsx`, `Layout.jsx`, `PlayerHoverCard.jsx`, `App.jsx`, `useBodyClass.js`, `layout.css`, game-route CSS.

**Preserve:** all routes, active-state accuracy, auth-aware guest links, Profile access, Toaster, route lazy loading, and Armory/Game body classes.

**UX/visual:** Play is unmistakable; More never hides the current active destination; profile hover becomes click/focus popover and is not required for data; terminology follows the glossary in section 11.

**States:** active, hover/focus/pressed, menu open, notification/pending duel, offline/loading identity, guest, and live-round collapsed.

**Motion:** shell collapse is brief and does not move arena after countdown begins; mobile sheet follows UX-02; reduced motion changes layout without travel.

**Responsive/accessibility:** test 320, 390, 768, 1024 and 1440 widths; safe-area padding; no horizontal clip; logical tab order; current page announcement; Escape closes More.

**Dependencies:** UX-01/02. **Parallelization:** can run with UX-04; avoid simultaneous edits to `Layout.jsx` from UX-05 or UX-13.

**Acceptance:** every route reachable in at most two actions; mobile shell occupies at most one top identity row plus bottom dock; round shell collapses without geometry shift; no hover-only content; deep links retain active state.

**Regression/DoD:** login/signup nav, logout redirect, route animations, game/Armory fixed layouts and toasts verified. Stop at shell/navigation; do not redesign pages.

### UX-04: Create Motion, Sound, Haptic, and Feedback Preferences

**Mission objective:** establish one event-driven feedback language and user-controlled intensity.

**Why / result:** local animation exists but lacks a coordinated sound or preference layer. Players receive consistent, optional cues for navigation, hits, misses, streaks, powers, time, rewards, and ranks.

**Scope:** add preference state/persistence for master/SFX volume, mute, motion, screen shake, flashes, and haptics; implement an audio unlock/preload service; map event names to visual/audio/haptic cues; add a compact Settings sheet; provide original/licensed assets with attribution; prevent duplicate event firing.

**Out of scope:** composing music, voiceover, remapping game balance, or styling each event's final page-specific animation.

**Areas:** `App.jsx` MotionConfig, new `src/app` preference hook/context, new feedback service, `Layout.jsx`, `animations.css`, game controller callbacks, public audio assets.

**Preserve:** browser autoplay compliance, existing motion components, reduced-motion media query, deterministic engine, and click input latency.

**UX/visual:** default mix is restrained; hit/miss are unmistakable; streak layers add rather than simply get louder; all critical audio has visible equivalents.

**States:** audio locked/unlocked, asset loading/failure, muted, reduced, default, high feedback, haptics unavailable, settings dirty/saved.

**Motion/feedback:** no cue blocks input; cap simultaneous voices; stop/cancel cues on route/phase exit; reduced flash avoids white/full-screen pulses.

**Responsive/accessibility:** Settings is keyboard-operable and a mobile sheet; labels expose current values; respect OS reduced motion and never auto-enable vibration.

**Dependencies:** UX-01/02. **Parallelization:** can run with UX-03/05; coordinates event names with UX-08–17.

**Acceptance:** preferences survive reload; sound starts only after user activation; mute/reduced settings affect every test cue; missing audio fails silently; event service test prevents duplicates; settings accessible from shell and pause/ready contexts.

**Regression/DoD:** route changes, rapid hits, rematches and background-tab return do not leak audio or timers. Stop at framework, preferences, and representative cues.

### UX-05: Redesign Branded Arrival, Session Restore, Login, and Signup

**Mission objective:** make authentication feel like entering the arena while keeping forms excellent.

**Why / result:** the current generic session card and empty auth page undersell the game. Visitors see the fantasy, brand, and a controlled target demonstration before account work.

**Scope:** replace session fallback with branded logo/arena calibration state; compose guest page with authored environment, concise value proposition, ambient noninteractive target trail, and focused auth panel; preserve login/signup validation, show/hide password, submitting, API error, and cross-link; add route-specific document titles.

**Out of scope:** social login, password reset/backend auth changes, marketing site, or onboarding after successful signup.

**Areas:** `App.jsx` session screen, `LoginPage.jsx`, `SignupPage.jsx`, `AuthInputField.jsx`, `forms.css`, guest shell in `Navbar.jsx`, `index.html`/route title helper.

**Preserve:** httpOnly cookie flow, `/api/auth/me`, redirects, validation rules, autocomplete, disabled submit, and error announcements.

**UX/visual:** form remains the strongest focus; demo cannot be mistaken for playable input; signup copy previews “first round in under a minute”; returning login copy remains concise.

**States:** session checking/success/failure, empty, field focus/valid/invalid, password visible, submitting, server error, rate limit, offline.

**Motion:** ambient effect is slow and pauses under reduced motion; successful auth transitions into lobby rather than flashing a blank route.

**Responsive/accessibility:** single-column form first on mobile; background hidden at 200% zoom; errors remain adjacent and announced; no placeholder-only labels.

**Dependencies:** UX-01–03; UX-04 for optional tick. **Parallelization:** can run with UX-06 if `Layout.jsx` ownership is agreed.

**Acceptance:** first contentful state is branded; form works at 320 px/200% zoom; all current validation tests remain; keyboard-only login/signup works; session failure offers a usable recovery.

**Regression/DoD:** direct `/login`, `/signup`, authenticated redirect, refresh restoration, incorrect credentials, slow API and logout checked. Stop at arrival/auth.

### UX-06: Transform Ready Into the Arena Lobby

**Mission objective:** turn mode selection into a full game-entry scene with a single clear decision.

**Why / result:** the current modal carousel communicates rules but feels like configuration. Players see three distinct arena identities, their active build, recent target, rewards/stakes, and a dominant Start.

**Scope:** recompose Ready as a responsive lobby layer; mode rail/cards support direct selection plus arrows; selected mode controls background lighting and copy; show duration, miss rule, rewards, personal best/recent outcome, active build and relevant goal; move drills into a Practice drawer; preserve session summary, warm-up recommendation, onboarding copy, Armory and Help links.

**Out of scope:** changing mode tuning, build editing, Ranked outcome algorithm, or countdown.

**Areas:** `ReadyOverlay.jsx`, `GamePage.jsx`, controller ready props, `gameModesConfig.js`, `drillConfig.js`, `trainingRecommendations.js`, `game.css`.

**Preserve:** selected mode persistence, three modes, drill PBs, first-session statuses, active loadout, keyboard left/right/Enter/Escape, and auto-start ghost duel behavior.

**UX/visual:** mode selection is visible without cycling; only selected mode expands; Practice/casual/ranked atmospheres follow foundation; build is a readiness strip, not a second editor.

**States:** selected/unselected, locked if future eligibility requires, loading stats, no PB, recommended drill, onboarding step, keyboard focus, ghost challenge entry.

**Motion:** background crossfade and spatial selection under 250 ms; no target-like moving decorative controls; reduced motion uses instant color/state switch.

**Responsive/accessibility:** desktop three-choice rail, tablet compact rail, mobile vertical/segmented selector plus sheet; Start remains visible without trapping content; dialog/scene labelled and focus managed.

**Dependencies:** UX-01–04. **Parallelization:** conflicts with UX-07/08/25 in `ReadyOverlay.jsx`; schedule sequentially.

**Acceptance:** a player can compare all modes without carousel guesswork; rewards/stakes and build are readable; Practice drawer selects all drills; keyboard flow reaches Start; 390 x 844 has no clipping.

**Regression/DoD:** mode persistence, drills, warm-up suggestion, onboarding, Armory/Help, ghost auto-start and start payload checked. Stop before Ranked-specific detail/countdown.

### UX-07: Add Ranked Preflight and Placement Stakes

**Mission objective:** make Ranked eligibility, placement, current division, protection, and stakes trustworthy before Start.

**Why / result:** Ranked currently differs mainly through copy. Players understand exactly what is at risk, what remains in placement, and whether a warm-up is recommended.

**Scope:** add Ranked-only preflight within lobby: crest/state headline, placement pips or RR track, next division distance, demotion protection matches, recent trend, build snapshot, warm-up shortcut, and transparent statement that performance determines RR; define unranked, placement 1–5, revealed, promotion-near, protected, top-rank states.

**Out of scope:** changing rank math, adding queue/matchmaking, or guaranteeing projected RR.

**Areas:** `ReadyOverlay.jsx`, controller rank props, `rankUtils.js`, `trainingRecommendations.js`, `TierBadge.jsx`, rank assets, Help rank content.

**Preserve:** five-match placement algorithm, Gold III reveal cap, RR divisions, protection logic, selected Ranked mode, warm-up suggestion conditions.

**UX/visual:** rank crest is hero; status uses track/pips and text; “rating” internals are not exposed inconsistently; Start Ranked is explicit and not a fear dialog.

**States:** never played, placement progress, reveal pending, visible division, near promotion, protected, top rank, unavailable data/error.

**Motion/feedback:** subtle crest/track acknowledgement; no fake matchmaking animation; reduced mode static.

**Responsive/accessibility:** details collapse to labelled disclosure on mobile; progress has semantic value text; icons have accessible names where meaningful.

**Dependencies:** UX-06. **Parallelization:** do not overlap UX-06 or UX-16 rank terminology; Help copy can be prepared in parallel.

**Acceptance:** every rank state has fixture/test data; no copy promises a fixed delta; warm-up goes to Practice without losing Ranked intent; protection and placement remaining are clear.

**Regression/DoD:** unranked/placement/revealed/top-rank render, rank utilities tests, Start payload and return from warm-up checked. Stop before post-round rank ceremony.

### UX-08: Direct the Arena Entrance and Countdown

**Mission objective:** create a focused, latency-free transition from lobby to first target.

**Why / result:** a tiny countdown card wastes the moment. Players center attention, hear/see timing, and understand when input becomes live.

**Scope:** reveal arena environment, place calibration reticle at first spawn region, stage mode/build label briefly, present 3–2–1–GO with timing cues, lock accidental arena input, announce countdown accessibly without excessive speech, and transition precisely into Playing; add network/token wait state for Ranked before countdown.

**Out of scope:** changing countdown duration, spawn RNG/geometry, target feedback after play begins, or matchmaking.

**Areas:** `CountdownOverlay.jsx`, `GameArena.jsx`, `GamePage.jsx`, `useGameScreenController.js` start/token flow, round overlay motion hooks, `game.css`.

**Preserve:** three-second count, server round token/seed, ghost auto-start, center-first target positioning, and phase enum.

**UX/visual:** no bordered card; digits occupy the arena focal plane; mode light rises over three beats; GO clears immediately enough to avoid covering target.

**States:** waiting for Ranked token, token error/retry/cancel, 3/2/1/GO, reduced motion, tab hidden/resumed.

**Motion/feedback:** countdown ticks and GO cue from UX-04; animation duration follows state, never drives it; reduced mode retains exact timing with simple digit replacement.

**Responsive/accessibility:** reticle and digits remain centered in actual arena bounds; safe-area aware; live region does not announce background labels repeatedly.

**Dependencies:** UX-04/06/07. **Parallelization:** controller changes conflict with UX-09–12; overlay visual can be isolated.

**Acceptance:** first target appears exactly when input activates; no click leaks through; Ranked wait is explicit; ghost and normal starts behave identically; reduced-motion timing is equal.

**Regression/DoD:** Practice/Casual/Ranked, token failure, rapid rematch, mobile rotation, background tab and ghost challenge start tested. Stop once Playing begins.

### UX-09: Rebuild the Competitive HUD Hierarchy

**Mission objective:** make score, time, momentum, PB/ghost pace, and essential context readable peripherally.

**Why / result:** framed score/time panels resemble dashboard widgets and stack poorly. Players keep eyes near the target while still sensing time and momentum.

**Scope:** establish HUD layout contract and arena geometry budget; implement score anchor, timer/radial edge state, central streak/combo channel, PB/ghost delta, compact mode/build identity, Practice end action, and drill goal; add condensed/mobile and ghost variants.

**Out of scope:** hit particles, power hotbar internals, low-time effects, or result layout.

**Areas:** `GameHud.jsx`, `GameStatusRow.jsx`, `GamePage.jsx`, controller HUD props, `game.css`, geometry-related viewport calculations only if required.

**Preserve:** score/time values, untimed “No Limit”, streak/combo/best, PB pace calculation, rank/build labels, ghost score data, drill goal and End Practice.

**UX/visual:** score and time are highest contrast; metadata is quieter; streak lives near the arena edge; no opaque block resembles a KPI card; numeric width is stable.

**States:** untimed, normal time, final five, final three, combo milestones, ahead/behind PB, ghost ahead/behind, drill complete, paused/background if supported.

**Motion:** number changes use small impulse without layout shift; no continuously breathing score below meaningful streak; reduced mode updates instantly.

**Responsive/accessibility:** desktop peripheral anchors; mobile single compact top strip or corners; text equivalents for arrows/colors; live announcements throttled to milestones, not every hit.

**Dependencies:** UX-01–04/08. **Parallelization:** define geometry before UX-10/11; conflicts in `game.css` with UX-13.

**Acceptance:** target arena retains intended minimum dimensions; all variants fit 390 x 844 without stacked KPI blocks; rapid updates cause no layout shift; screen reader is not flooded.

**Regression/DoD:** every mode, ghost, drill, PB absent/present and practice end tested. Stop at HUD; do not implement impact or pressure effects.

### UX-10: Author Hit, Miss, Target Spawn, and Streak Feedback

**Mission objective:** make the core click loop precise, satisfying, and increasingly energetic.

**Why / result:** existing click text/shake/atmosphere is useful but not differentiated enough. Players immediately understand contact, score consequence, streak loss, and milestone momentum.

**Scope:** add pointer-local impact ring and score impulse; distinguish hit, absorbed miss, regular miss and streak break; add target spawn/relocation anticipation within a strict time budget; create milestone events (5/10/20/etc.) and atmosphere tiers; integrate event sound/haptic; pool transient effects for performance.

**Out of scope:** score math, target positions/sizes, power effects, low-time layer, or cosmetic art redesign.

**Areas:** `ClickFeedbackLayer.jsx`, `MovingButton.jsx`, `GameArena.jsx`, controller hit/miss/presentation callbacks, `gameMath.js`, `animations.css`, `game.css`.

**Preserve:** deterministic event timestamps/coordinates, stop propagation, miss penalties, guard behavior, target skin images/scales, streak tiers, and click latency.

**UX/visual:** hit locus is exact; miss indicates clicked locus without shaming; streak break is singular; feedback never covers the next target; novelty skins retain a clear hit outline.

**States:** hit, miss, guard absorb, combo surge hit, PB milestone, streak tier transition, min-size target, cosmetic image load failure.

**Motion/feedback:** input response begins within one frame; cap flashes/shake; haptics are short and optional; reduced motion uses color/shape/text, reduced flash uses outline only.

**Responsive/accessibility:** effect scale follows arena not viewport; target maintains accessible name; high-contrast outline preference; avoid live-announcing every click.

**Dependencies:** UX-04/09. **Parallelization:** can run with UX-11 if controller ownership is split; conflicts with UX-12 atmosphere CSS.

**Acceptance:** all event types are visually distinguishable in fixtures; 60 fps under rapid synthetic hits on target devices; next target remains unobscured; preferences fully suppress optional effects.

**Regression/DoD:** engine parity tests, geometry validation, all skins/themes, guard/combo surge, touch/keyboard activation checked. Stop at core hit loop.

### UX-11: Rebuild Power Charging, Readiness, and Activation Feedback

**Mission objective:** make powers glanceable and usable without attention theft.

**Why / result:** current power cards are verbose and stack on mobile; custom semantics are incomplete. Players see slot, charge, availability and active duration at a glance, then receive causal arena feedback.

**Scope:** replace custom `div` controls with semantic buttons; compact slot glyph/label and charge ring/segments; implement ready/charged-count/active/duration/consumed/locked states; add first-ready and first-use coach; provide keyboard 1–3, Enter/Space and touch feedback; map each existing power to a distinct arena/HUD response.

**Out of scope:** changing power balance, unlock levels, loadout composition, or engine event schema.

**Areas:** `PowerupTray.jsx`, buildcraft glyph icons/constants/presentation, controller power presentation, `GameHud.jsx`, `game.css`, feedback service.

**Preserve:** six power IDs/effects, earned charges, active durations, duplicate restrictions, keys 1–3, deterministic engine submission, guard and combo surge rules.

**UX/visual:** slots share geometry but powers differ by glyph and effect signature; “ready” does not rely on pulsing/color; active duration or remaining hits is explicit.

**States:** charging, ready, multiple charges, active timed, active hit-count, unavailable, locked, key focus, attempted while unavailable.

**Motion/feedback:** one ready flourish, not infinite distraction; activation travels from slot to affected timer/target/streak; reduced mode uses state swap and text.

**Responsive/accessibility:** desktop horizontal hotbar; mobile bottom compact three-slot bar, not vertical cards; 44 px targets; `aria-keyshortcuts`, disabled semantics and polite ready announcement.

**Dependencies:** UX-04/09. **Parallelization:** can run beside UX-10 with controller partition; coordinate with UX-21.

**Acceptance:** every power communicates charge and active result; Space/Enter/touch/1–3 work; unavailable activation cannot fire; mobile hotbar leaves arena height intact.

**Regression/DoD:** power engine tests, all build slots, charge carry/reset, rematch, guard and combo duration checked. Stop before Armory editing.

### UX-12: Add Low-Time, Ranked Pressure, and Ghost Duel Broadcast

**Mission objective:** express urgency and rivalry around the arena edge without compromising acquisition.

**Why / result:** current timer color and text ghost banner underplay high stakes. Players sense final seconds and lead changes without reading a paragraph.

**Scope:** final-five edge/timer progression; final-three cadence; Ranked pressure treatment; ghost target score and pace marker integrated into HUD; lead-change and finish-line cue; ghost identity compactly shown; preference-aware intensity.

**Out of scope:** ghost API/status flow, score calculation, challenge creation, or result/rematch screens.

**Areas:** `GameHud.jsx`, controller time/ghost/PB state, `replayUtils.js`, `GamePage.jsx`, `game.css`, feedback service.

**Preserve:** ghost score replay parity, target score, username, timed mode durations, Practice untimed behavior, existing PB pace logic.

**UX/visual:** pressure originates from perimeter; never place opaque vignette or text over possible target positions; ghost is a pace trace, not a second moving target.

**States:** ahead, tied, behind, lead change, ghost data late/error, final five/three/one, Ranked vs Casual, pressure disabled.

**Motion/feedback:** cadence aligns to timer state; no constant screen shake; lead change fires once per crossing with debounce; reduced/flash settings honored.

**Responsive/accessibility:** text delta available; sound-independent countdown; mobile uses compact delta; color-independent ahead/behind arrows and labels.

**Dependencies:** UX-04/09/10. **Parallelization:** conflicts with HUD and atmosphere CSS; schedule after UX-09/10.

**Acceptance:** target contrast remains above constraint in every theme; lead-change cue is debounced; Practice has no false urgency; preferences disable pressure independently.

**Regression/DoD:** normal/ghost rounds, replay loading error, PB with no ghost, all timed modes and tab throttling checked. Stop at live-round broadcast.

### UX-13: Recompose Gameplay for Mobile, Touch, Keyboard, and Accessibility

**Mission objective:** make the completed play loop intentional across supported viewports and input/preferences.

**Why / result:** the audited mobile game retains a large shell, stacks HUD/powers, and clips result content. Players receive a compact round layout with maximal arena and reliable controls.

**Scope:** define supported portrait/landscape matrices; collapse shell on countdown/play; allocate HUD/arena/hotbar with safe areas; create mobile ready/result sheets with independent scrolling; handle rotation/resize without invalid geometry; add target contrast, reduced flash/shake, text scaling, touch-action, pointer type and keyboard semantics; throttle live regions; document any unsupported viewport with graceful guidance.

**Out of scope:** redesigning content of lobby/HUD/feedback/powers/results already owned by prior missions or promising phone parity if product decides against it.

**Areas:** `Layout.jsx`, `GamePage.jsx`, every `features/game/components` file, controller arena dimensions, `layout.css`, `game.css`, `base.css`.

**Preserve:** server geometry validation, seeded positions, all phase transitions, powers, drills, ghost, result stages, settings and rematch.

**UX/visual:** arena is the largest region; portrait HUD is one compact layer; hotbar remains reachable; result header/actions cannot be clipped; rotation never silently ends a round.

**States:** 320/390 portrait, 667/844 landscape heights, tablet, virtual keyboard, safe-area inset, 200% zoom outside active play, reduced settings, coarse pointer.

**Motion/feedback:** layout transition only outside live input; reduced motion prevents travel; orientation change offers a clear resume/continue state if recalibration is needed.

**Responsive/accessibility:** native buttons, logical focus, minimum target sizes, forced-color fallback, screen reader phase announcements and sound-independent feedback.

**Dependencies:** UX-03/04/06/08–12/14 shell contract. **Parallelization:** final integration for Phase 3; do not run beside game CSS missions.

**Acceptance:** no horizontal overflow or clipped actions at test matrix; arena minimum is documented; coordinate tests pass after resize; Power hotbar does not stack; keyboard and touch complete Practice.

**Regression/DoD:** screenshot tests for ready/countdown/play/result at 390 x 844 and desktop, geometry/engine tests, reduced settings, zoom and focus pass. Stop at gameplay surfaces.

### UX-14: Direct the Round Conclusion and Performance Reveal

**Mission objective:** land the round emotionally, then reveal useful performance and replay actions.

**Why / result:** the current staged flow is good architecture but the summary becomes a table and clips on mobile. Players first feel the result, understand one verdict, then choose Rematch or Change Mode.

**Scope:** add brief input freeze/release; establish result flow state machine and skip behavior; create score hero, mode verdict, PB/clean-run highlight, one actionable performance insight, compact build signature, expandable full metrics, and persistent primary/secondary actions; Practice omits rewards but still provides drill/PB feedback.

**Out of scope:** XP/coins animation, rank ceremony, achievement unlock, history redesign, or changing computed metrics.

**Areas:** `GameOverFlow.jsx`, `GameOverOverlay.jsx`, overlay motion hooks, controller round-end timing, buildcraft presentation, `game.css`.

**Preserve:** score/hits/misses/accuracy/streak/reaction, nearest achievement data, Practice no-reward note, View History, rematch/change mode handlers, PB confetti preference.

**UX/visual:** score is singular focal point; verdict copy derives from real metrics; details are secondary; actions remain visible; no nested bordered table as the first result.

**States:** Practice/drill, Casual, Ranked handoff, PB, clean run, no hits/reaction data, ghost win/loss, reduced motion, viewport overflow.

**Motion/feedback:** freeze under 300 ms, skippable score settle, no confetti under reduced motion; result animation never blocks action longer than defined budget.

**Responsive/accessibility:** overlay owns scroll; heading and actions never clip; initial focus and escape policy explicit; score/verdict announced once.

**Dependencies:** UX-04/09/10/13. **Parallelization:** establishes spine before UX-15–17; conflicts with those in `GameOverFlow.jsx`.

**Acceptance:** every mode reaches a complete result; zero-stat Practice fits 390 x 844 with scroll and visible action; skip works; insight never contradicts metrics; rematch is one action.

**Regression/DoD:** all result variants, PB, no reaction, ghost, rapid rematch, History link, reduced motion and focus restoration checked. Stop before reward/rank stages.

### UX-15: Stage Rewards, XP, Coins, and Unlock Anticipation

**Mission objective:** turn earned progression into a short, skippable ceremony with a reason to play again.

**Why / result:** the current XP animation is robust but rewards still read as rows. Players see earnings travel into persistent progress, understand level crossing, and preview the next meaningful unlock.

**Scope:** sequence XP, level bar, coins, and session totals; preserve multi-level animation; add next level/build/power/cosmetic unlock preview from authoritative data; add skip/fast-forward; support no-coin/no-XP variants and handoff to summary.

**Out of scope:** rank movement, achievement unlocks, new economy values, or granting rewards client-side.

**Areas:** `RewardsModal.jsx`, `progressionUtils.js`, `roundRewards.js`, `buildcraft.js`, `shopCatalog.js`, result CSS.

**Preserve:** server reward values, existing XP plan, level calculations, coin counts, placement rows until UX-16 migration, focus behavior and continue action.

**UX/visual:** rewards animate toward recognizable persistent destinations; level-up interrupts once with a clear unlock; do not simulate unlocks unsupported by catalog/build data.

**States:** XP only, coins only, both, zero, one/multiple levels, no next unlock, skipped, reduced motion, data mismatch.

**Motion/feedback:** total ceremony target 1.5–3 seconds and immediately skippable; sound layers remain subtle; reduced motion renders final values and one status announcement.

**Responsive/accessibility:** one-column tally on mobile; progress exposes current/max text; focus reaches Skip/Continue; announcements summarize rather than narrate counting.

**Dependencies:** UX-04/14. **Parallelization:** can run beside UX-16 in `RewardsModal` only after component boundaries are split.

**Acceptance:** displayed final values exactly equal authoritative response; multi-level and skipped states converge; next unlock is accurate; Practice bypasses ceremony.

**Regression/DoD:** reward math tests, level edges, rematch before animation completes, refresh persistence and focus checked. Stop at XP/coins/unlock preview.

### UX-16: Unify Placement, Promotion, Demotion, and Protection Outcomes

**Mission objective:** give every Ranked outcome a clear, consistent ceremony and explanation.

**Why / result:** promotion/reveal exist, but demotion and protection are not equally authored and terms vary. Players see exactly where RR moved and why their visible rank did or did not change.

**Scope:** define Ranked outcome model; build placement progress/reveal, RR gain/loss, promotion, demotion, protected loss, unchanged, and top-rank variants; animate crest/track from previous to projected; include concise reason/threshold and then continue to other rewards.

**Out of scope:** rank algorithm, placement cap, protection rules, seasonal leaderboard rank, or matchmaking.

**Areas:** `PromotionModal.jsx`, `RewardsModal.jsx`, `GameOverFlow.jsx`, `rankUtils.js`, `TierBadge.jsx`, rank assets and result CSS.

**Preserve:** `previousRankProgress`, `projectedRankProgress`, applied delta, five placements, reveal cap, protection match count, and top rank math.

**UX/visual:** crest transition is the hero; RR is always labelled RR; global ladder position is not confused with division; losses are factual rather than punitive.

**States:** first placement, mid-placement, final reveal, gain/loss, promotion, demotion, protected floor, top rank, zero delta, missing icon.

**Motion/feedback:** meaningful stinger per reveal/promotion, restrained loss cue, reduced mode swaps with text; Continue is always available.

**Responsive/accessibility:** before/after and delta are fully textual; crest images decorative when adjacent label exists; modal scrolls at small heights.

**Dependencies:** UX-07/14/15 terminology. **Parallelization:** conflicts with result flow and rank portions of Profile/Ladder; finalize outcome contract first.

**Acceptance:** fixtures cover every state; RR endpoints match utilities; no MMR/RR ambiguity in player copy; protection explicitly explains prevented demotion.

**Regression/DoD:** all rank utility tests and edge fixtures pass; rapid continue, reduced motion, missing asset and top rank checked. Stop before season rewards.

### UX-17: Deliver Achievement Unlocks and Session Goals

**Mission objective:** connect moment-to-moment play to short and long progression without interrupting focus.

**Why / result:** achievements are buried and nearest-progress hints are passive. Players notice earned mastery and always have one relevant next objective.

**Scope:** create deduplicated unlock queue after rank/rewards; ceremony/toast tiers for standard, category master and master-of-masters; add one session goal chosen from existing achievement/drill/lifetime data; show it in lobby and only milestone progress in HUD/results; deep-link to gallery.

**Out of scope:** changing achievement thresholds, adding daily backend resets, battle pass, or reward currency for achievements.

**Areas:** `useAchievementSync.js`, achievement list/evaluation/components, `ReadyOverlay.jsx`, `GameHud.jsx`, `GameOverFlow.jsx`, player state persistence.

**Preserve:** persisted IDs, evaluation rules, master achievements, nearest-progress logic, and durable lifetime stats.

**UX/visual:** standard unlocks are compact; master unlocks receive more ceremony; session goal is specific, attainable and never implies a reward that does not exist.

**States:** progress, unlocked, multiple queued, already persisted, hidden if introduced, no eligible goal, sync error.

**Motion/feedback:** queue never overlaps rank/reward focus; reduced mode shows ordered summaries; HUD updates only at meaningful thresholds.

**Responsive/accessibility:** queued notifications are reviewable; announcements do not interrupt countdown/play; progress has text values.

**Dependencies:** UX-06/14–16. **Parallelization:** achievement gallery can start after data contract; conflicts with result flow.

**Acceptance:** no duplicate ceremony across reload/rematch; unlock order is deterministic; goal progress matches stats; standard queue can be skipped/reviewed.

**Regression/DoD:** fresh/legacy IDs, multiple unlocks, master chain, sync failure and Practice goal tested. Stop before changing achievement browsing.

### UX-18: Reframe Profile Around Player Identity

**Mission objective:** turn Profile from a KPI report into an ownable competitor identity.

**Why / result:** identity/rank are promising, then ten equal stat cards take over. Players see equipped look, crest, signature build, featured mastery, records and career story first.

**Scope:** create banner/player-card composition; hero avatar/cosmetics/rank/title; level and next milestone; signature active/best build; three featured achievements; record strip; career milestones and secondary expandable performance detail; relocate Logout to account menu; author new-player states.

**Out of scope:** public profile API, image upload, social follows, or changing stats.

**Areas:** `ProfilePage.jsx`, `profile.css`, achievement components/CSS, avatar styling, rank/lifetime/loadout utilities, shell profile menu.

**Preserve:** all current data, achievement categories, level/rank progress, build stats, equipped profile image and logout.

**UX/visual:** player object and crest dominate; no more than one primary framed hero plus restrained readouts; rank theme acts as light/motif; raw analytics live below/disclosure.

**States:** new player, unranked, placement, ranked, no build stats, missing avatar, complete achievement category, loading unavailable data.

**Motion/feedback:** subtle banner entrance and milestone emphasis; no looping crest animation; reduced static.

**Responsive/accessibility:** mobile becomes identity header + swipe-free vertical sections; featured items are keyboard reachable; avatar alt policy avoids redundant announcements.

**Dependencies:** UX-01–03/16/17. **Parallelization:** can run with Shop/Armory; UX-19 follows to avoid achievement conflicts.

**Acceptance:** identity, rank, build and three records appear before analytics; all existing metrics remain reachable; new-player view contains actions to Play/Armory.

**Regression/DoD:** every rank state, no history, loadout stats, achievement filters, avatar failure and logout checked. Stop before dedicated gallery/share export.

### UX-19: Create the Achievement Gallery and Showcase

**Mission objective:** make mastery discoverable, navigable, and displayable.

**Why / result:** a carousel at Profile's bottom feels like a checklist and creates empty placeholders. Players understand categories/chains, choose showcase items, and see meaningful completion.

**Scope:** create Profile subview or nested route; category overview/constellation, chain progression, unlocked/recent/in-progress filters, standard list/grid toggle if needed, hidden treatment policy, featured slot selection stored using an agreed persistence path, and accessible details drawer.

**Out of scope:** new achievement rules/rewards, social comparison, or deleting the compact Profile showcase.

**Areas:** achievement carousel/tile/progress components, `achievementsList.js`, evaluation, Profile routing/state, `achievements.css`, API/player state if showcase persistence is approved.

**Preserve:** category/master structure, progress math, persisted unlocks and current artwork/glyph mappings until replaced.

**UX/visual:** categories have distinct motif, not card colors; chains read spatially; locked items disclose requirements unless intentionally hidden; placeholders are eliminated.

**States:** locked, progress, unlocked, newly unlocked, featured, complete category, hidden, empty filter, persistence error.

**Motion/feedback:** filter/chain transitions are restrained; featuring gives immediate confirmation; reduced mode static.

**Responsive/accessibility:** list fallback; tabs/filters keyboard-operable; drawer focus-managed; progress and hidden labels screen-reader clear.

**Dependencies:** UX-02/17/18. **Parallelization:** do not overlap Profile achievement edits; backend persistence can be separate after decision.

**Acceptance:** all achievements reachable without carousel-only controls; feature/unfeature state explicit; master chains are understandable; no blank filler tiles.

**Regression/DoD:** all categories, master unlocks, zero/100% progress, keyboard and reload persistence checked. Stop at gallery/showcase.

### UX-20: Transform Shop Into a Cosmetic Preview and Unlock Experience

**Mission objective:** make browsing, purchasing, and equipping feel like customizing the arena.

**Why / result:** the current store is polished but grid-led. Players preview a cosmetic in context, understand affordability/ownership, and feel an unlock before equipping.

**Scope:** category stage with live target/arena/avatar preview; compact collection rail; item detail/comparison drawer; owned/equipped/locked/affordable states; purchase confirmation showing balance; success reveal and Equip Now/Keep Current; filters for owned/affordable; readability check/warning for target skins/themes.

**Out of scope:** prices/catalog balance, real money, rarity unless catalog semantics are approved, or changing server transaction rules.

**Areas:** `ShopPage.jsx`, all shop components/CSS, `shopCatalog.js`, `shopUtils.js`, `useShopActions.js`, celebration helper, asset files.

**Preserve:** 27 current items/categories, ownership, one equipped per type, server purchase/equip, toasts/error handling, preview effect classes/scales.

**UX/visual:** selected cosmetic is hero; thumbnails are collection objects not product cards; coin balance/price and resulting balance are clear; no misleading rarity.

**States:** default, selected, owned, equipped, affordable, unaffordable, buying, purchase failed/succeeded, equipping, image failure, filter empty.

**Motion/feedback:** preview swaps quickly; purchase reveal skippable; equip applies to preview immediately but persists authoritatively; reduced mode static reveal.

**Responsive/accessibility:** desktop stage + rail; mobile sticky preview and bottom detail sheet; item selection and confirmation keyboard/focus accessible; cosmetics cannot erase target outline.

**Dependencies:** UX-01/02/04. **Parallelization:** safe beside Profile/Armory; conflicts only with shared shop action primitives.

**Acceptance:** every item previews before purchase; resulting balance accurate; double-submit prevented; owned/equipped unambiguous; 390 px flow does not require scanning 27 full cards.

**Regression/DoD:** all categories/items, buy/equip/error, insufficient funds, image failure, persistence reload and gameplay readability checked. Stop at existing catalog.

### UX-21: Refine Armory Into a Focused Build Workshop

**Mission objective:** preserve the unique four-step buildcraft system while reducing density and configuration-panel feel.

**Why / result:** Armory is already custom but presents four large step containers and a dense rail. Players tune one decision at a time, understand tradeoffs, and review mode impact before returning to Play.

**Scope:** semantic page/title; compact saved-build selector; persistent build silhouette; one expanded workspace for Slot, Passive Stack, Hotbar or Review; clearer locked/taken states and before/after effect explanations; mode impact preview; mobile stepper and save/status feedback; update walkthrough spotlight geometry.

**Out of scope:** new modules/powers, balance/unlock levels, more loadout slots, or changing instant persistence.

**Areas:** `ArmoryScreen.jsx`, shared UI, controller, URL/walkthrough hooks/constants/geometry, buildcraft/presentation, `armory.css`.

**Preserve:** three saved builds, names, active slot, reset, unique powers, locks, four URL steps, walkthrough statuses, instant save, Review and Back to Game.

**UX/visual:** active build reads as a machine/loadout, not a form; tradeoffs pair benefit/cost; inactive steps summarize; review compares modes without metric-card overload.

**States:** active/inactive slot, editing/saved/error, locked, taken elsewhere, selected, reset confirmation, walkthrough, review, no stats.

**Motion/feedback:** workspace transition follows step direction; save confirmation quiet; reduced mode no spatial slide.

**Responsive/accessibility:** semantic h1/h2; mobile stepper and drawer keep actions visible; locked reason announced; walkthrough trap/focus/skip correct.

**Dependencies:** UX-01–03/11. **Parallelization:** safe beside Shop; conflicts with UX-25 walkthrough edits.

**Acceptance:** only one work step dominates; all effects/tradeoffs remain discoverable; mobile completes create/name/modules/powers/review; URL deep links and saves remain.

**Regression/DoD:** walkthrough tests, all slots, duplicate/locked power logic, reset, mode preview, reload persistence and Back to Game checked. Stop before new build progression.

### UX-22: Turn History Into a Performance Journal

**Mission objective:** help players identify improvement and act on notable rounds.

**Why / result:** the current highlight/table view reports data but does not create a story, especially on mobile. Players scan records/trends, filter context, inspect a round, and challenge or replay when possible.

**Scope:** hero trend/record summary; mode/build/time filters; desktop compact log plus mobile round cards; inspect drawer with full metrics, RR, rewards, reaction, build and markers; links to replay/challenge where data exists; retain pagination and authored old-record missing states.

**Out of scope:** new analytics backend beyond existing fields, data visualization requiring invented samples, or changing retention/pagination.

**Areas:** `HistoryPage.jsx`, history snapshot/table helpers/constants/utils, API client, `history.css`, `tables.css`, replay/challenge integration.

**Preserve:** server pagination, all logged fields, latest/record markers, trend math, loading-more error and empty first-round CTA.

**UX/visual:** records/timeline lead; table is a dense desktop tool, not the page identity; round tone shows mode/result without relying on row color.

**States:** empty, loading, partial old data, filtered empty, load-more/error, inspected, replay available/unavailable, rank-positive/negative/neutral.

**Motion/feedback:** drawer uses shared motion; filter changes preserve context; reduced static.

**Responsive/accessibility:** mobile no horizontal data table; semantic table remains desktop; filters labelled; drawer focus restored; all values have units.

**Dependencies:** UX-01/02; UX-24 for final challenge action can follow. **Parallelization:** safe with Ladder; coordinate shared player/round drawer primitives.

**Acceptance:** one tap/click opens full round; filters are reversible; old missing metrics are honest; pagination remains; mobile cards expose core facts and inspect action.

**Regression/DoD:** zero/10/100+ histories, old records, rank markers, error/retry, mobile/desktop and API pagination checked. Stop before advanced charts.

### UX-23: Recast Ladder as a Seasonal Rivalry Space

**Mission objective:** make competition about season, personal position and nearby people rather than a sortable spreadsheet.

**Why / result:** current controls/table are capable but administrative and hover details exclude touch. Players see their position, next rival, season horizon/reward tier and the podium immediately.

**Scope:** season hero/reward horizon; top-three podium; persistent personal standing; nearby rival band with RR gaps; compact board/search/view controls; accessible player inspect drawer; mobile ranked list; movement indicators only when authoritative prior data exists; retain pagination/around-me/error/skeleton.

**Out of scope:** changing leaderboard API/ranking, fake movement, live matchmaking, or public messaging.

**Areas:** `LeaderboardPage.jsx`, insights copy, `PlayerHoverCard.jsx`, rank/season utilities, `layout.css`, `tables.css`, API client.

**Preserve:** five boards, sorting, search, top/around-me, season data, reward tier calculation, self rank, sparse/no-player and error handling.

**UX/visual:** podium and player position dominate; rank crests and names have hierarchy; global # and division/RR are labelled distinctly; row inspect works click/focus/touch.

**States:** unranked, placement, visible/not in window, #1/top three, around me, sparse, search empty, loading/error, no reaction data.

**Motion/feedback:** podium/position enters once; sorting does not animate rows excessively; reduced mode static.

**Responsive/accessibility:** mobile cards/lists, no six-column squeeze; sortable headers retain `aria-sort`; inspect drawer focus-managed; podium reading order logical.

**Dependencies:** UX-01–03/16. **Parallelization:** safe with History; conflicts with UX-24 challenge launch additions.

**Acceptance:** self and next rival found quickly; all boards still usable; no hover-only data; season reward tier explanation accurate; mobile avoids horizontal table.

**Regression/DoD:** all boards/sorts/search/views, unranked/placement/self missing, sparse/error/loading and player inspect checked. Stop before social challenge composition.

### UX-24: Build the End-to-End Ghost Duel Journey

**Mission objective:** make challenge discovery, composition, acceptance, play and result one understandable loop.

**Why / result:** the current Duels route is form-first and empty without replay inventory. Players encounter an inbox/rival opportunity, choose a meaningful replay in context, and re-enter a duel/rematch naturally.

**Scope:** inbox with incoming priority and sent/history tabs; composer sheet launched from History/Ladder/Profile/Duels; replay preview card; recipient validation/status; accept/decline feedback; duel entrance summary; existing query-based ghost game handoff; duel-specific win/loss/rematch/result action; strong no-replay path to Ranked.

**Out of scope:** real-time multiplayer, chat, wagers, notifications outside app, or replay engine changes.

**Areas:** `ChallengesPage.jsx`, History/Ladder/Profile actions, API client/replay utils, `GamePage.jsx` query flow, ghost HUD, result flow, shared sheet/status primitives.

**Preserve:** challenge statuses/API, replay ownership/limit, optional message, accept/decline/play handlers, seed/event parity, target score, error handling.

**UX/visual:** incoming duel shows rival, score to beat, mode/build/date and one Accept/Play action; composer starts from selected rival/round when invoked contextually.

**States:** no replays, no challenges, incoming, accepted, declined, expired, completed, sent, loading/error, replay missing, ghost load failure, win/loss/tie.

**Motion/feedback:** invitation acceptance and arena entrance are short; no fake live-opponent presence; reduced mode static.

**Responsive/accessibility:** inbox cards, sheet composer, labelled status, no form hidden behind disabled CTA; result actions reachable on mobile.

**Dependencies:** UX-02/12/14/22/23. **Parallelization:** follow History/Ladder; avoid simultaneous edits to their action surfaces and `GameOverFlow`.

**Acceptance:** player can create from a round or rival, accept, play, understand target, finish and rematch/return; no-replay state has direct Ranked CTA; stale errors recover.

**Regression/DoD:** every status, missing replay/user, duplicate submit, query deep link, ghost failure, result and mobile checked. Stop at asynchronous 1v-ghost duels.

### UX-25: Replace Documentation-First Teaching With Progressive Onboarding

**Mission objective:** teach the finished game through a short first-run sequence and contextual guidance, with Help as a searchable fallback.

**Why / result:** current Help is thorough but detached and first-session logic does not fully teach power/reward/rank moments. New players complete a guided Practice, use one power, finish Casual, and know where to go next without a long tutorial.

**Scope:** extend onboarding state model; three-minute skippable route through target hit, miss consequence, streak/power, Casual reward and optional Armory; contextual prompts shown once; eligibility-time Ranked explainer; transform Help into Field Guide with search, anchored topic navigation, concise diagrams/flows and deep links back to relevant screens.

**Out of scope:** changing game rules, forced tutorial completion, video production, or adding a support ticket system.

**Areas:** `buildWalkthrough.js`, `gameOnboarding.js`, build walkthrough constants/hooks/overlay, Ready/HUD/result hooks, `HelpPage.jsx`, structured Help content/components/CSS.

**Preserve:** existing walkthrough statuses for legacy users, skip/dismiss/manual restart, current Help factual content, Armory walkthrough, mode/drill behavior.

**UX/visual:** teach one action at a time in context; prompts never cover target/power/action; “why” copy is optional; Field Guide uses diagrams and progressive disclosure instead of equal cards.

**States:** brand-new, resumed mid-step, skipped, completed, legacy dismissed, manual replay, wrong mode, offline persistence failure, Ranked not yet encountered.

**Motion/feedback:** coach prompts anchor without chasing moving target; reduced mode static; completion acknowledgement brief.

**Responsive/accessibility:** prompts reposition safely; screen-reader instructions do not depend on spatial language; Field Guide search/anchors keyboard accessible; no forced timing.

**Dependencies:** UX-05/06/08/11/15/21. **Parallelization:** schedule after Ready/Armory; Help visual work can start with finalized content architecture.

**Acceptance:** a new account can finish/skip/resume; no step deadlocks if user navigates away; legacy state normalizes; factual Help matches code constants; deep links work.

**Regression/DoD:** all onboarding status tests, wrong-route/mode, reload, skip/restart, mobile, keyboard and reduced motion checked. Stop before daily missions.

### UX-26: Execute the Responsive, Accessibility, and Resilient-State Matrix

**Mission objective:** verify and repair the implemented screens across devices, inputs, zoom, preferences, loading, empty and failure conditions.

**Why / result:** scattered breakpoints and one-off states invite late regressions. Players receive an authored experience even with small screens, large text, keyboard, slow API, empty accounts or errors.

**Scope:** test/fix routes at 320, 390, 768, 1024, 1440 and short laptop heights; portrait/landscape where supported; 200% zoom; keyboard and focus order; screen-reader landmarks/names/live regions; contrast and forced colors; reduced motion/flash/shake/audio; slow loading, empty, validation, API error/retry, offline and asset failure; add automated browser smoke/a11y/screenshot coverage.

**Out of scope:** new visual direction, feature redesign, or unsupported assistive gameplay promises not agreed in section 11.

**Areas:** all `src/pages`, shared/game/feature components, all CSS, `Layout.jsx`, route fallback, test configuration and new browser tests.

**Preserve:** all business logic, URLs, persistence, engine geometry and phase flows.

**UX/visual:** fixes follow existing primitives and page mission intent; no new local style language; each failure offers recovery or clear next action.

**States:** the complete matrix above, including new/unranked/no-history/no-replay/no-coins and malformed/missing legacy data.

**Motion/feedback:** verify preference combinations and background-tab behavior; no essential status depends on sound/motion.

**Responsive/accessibility:** this is the mission's core; record supported matrix and intentional exceptions.

**Dependencies:** UX-05–25 substantially complete. **Parallelization:** audits may be partitioned by route, but fixes touching shared CSS/shell/game must be serialized.

**Acceptance:** no critical axe-equivalent violations; no horizontal overflow/clipped primary actions; keyboard completes auth, navigation, shop, Armory and Practice; failure states recover; screenshot baselines cover critical scenes.

**Regression/DoD:** run build, unit/browser suites and manual matrix; triage every finding as fixed, explicitly accepted, or separately filed. Stop when matrix is closed—not when pages receive new features.

### UX-27: Harden Loading, Asset, CSS, and Runtime Performance

**Mission objective:** deliver stable first paint and feedback performance while reducing visual drift risk.

**Why / result:** the audit found a 507 kB entry warning, 180 kB CSS, 4,433-line game stylesheet, current lint failure, external font loading and no visual regression harness. Players see faster, less janky transitions and reliable round feedback.

**Scope:** measure route/startup and live-round performance; bundle/self-host fonts and critical preload; review vendor/manual chunks and lazy boundaries; optimize/rationalize raster assets; extract CSS ownership and remove verified duplicates/deprecated rules; fix touched lint baseline including game effect state update; pool transient game effects; enforce animation/layout-shift budgets; add performance marks and CI build/lint/unit/browser commands.

**Out of scope:** architecture rewrite, backend performance unrelated to visible UX, or deleting selectors without coverage.

**Areas:** `vite.config.js`, `App.jsx`, `main.jsx`, `public/`, all styles, game controller/effects, package scripts/tests.

**Preserve:** route behavior, deterministic engine, all themes/skins, animation preference outcomes and lazy pages.

**UX/visual:** no flash of fallback layout; logo/critical arena assets load first; route skeleton matches destination; image failures use authored fallback.

**States:** cold/warm cache, slow network, chunk error, font failure, asset failure, rapid route changes, rapid hits, background tab.

**Motion/feedback:** target stable 60 fps on agreed baseline hardware; no effect forces repeated layout; audio/effect cleanup on unmount.

**Responsive/accessibility:** performance improvements cannot remove semantic content or reduced variants; low-power preference may reduce ambient effects.

**Dependencies:** UX-01/02 and page migrations; measure early, perform cleanup late. **Parallelization:** measurement can run anytime; CSS cleanup conflicts with every visual mission.

**Acceptance:** budgets and measurements documented; build has no unexplained chunk warning or approved exception; lint/build/tests pass; no visual regression; critical assets/fonts are locally reliable.

**Regression/DoD:** cold load, each lazy route, 60-second synthetic round, rapid navigation, offline chunk failure and screenshot suite checked. Stop at measured budget, not speculative refactoring.

### UX-28: Prototype Optional Share, Contract, and Season-Recap Extensions

**Mission objective:** evaluate retention/social extensions only after the core experience is stable.

**Why / result:** existing stats, replays, cosmetics and season data can support expression, but premature additions would distract from core quality. Validated prototypes may let players share identity/results and pursue rotating goals.

**Scope:** create non-production or feature-flag prototypes for (a) privacy-safe shareable player/round card, (b) three rotating session contracts derived from existing stat events, and (c) season-end recap/reward preview; user-test comprehension and motivation; specify persistence/API needs before implementation approval.

**Out of scope:** shipping all concepts, social posting APIs, notifications, monetization, or inventing rewards without economy approval.

**Areas:** Profile, History, Ladder, lifetime stats/season utilities, cosmetic renderer, feature-flag/prototype space.

**Preserve:** privacy, accurate stats, existing achievement/session goal language and season reward logic.

**UX/visual:** exports use player-selected identity and never expose user ID/private history; contracts are goals, not chores; recap is factual.

**States:** insufficient data, private/no-share, completed/expired contract, season active/ended, export failure.

**Motion/feedback:** prototype only; final motion follows UX-04.

**Responsive/accessibility:** export content has text alternative; prototypes work on mobile and do not depend on drag.

**Dependencies:** UX-17–24/27. **Parallelization:** safely isolated behind flags after core roadmap.

**Acceptance:** each concept has tested prototype, user finding, data contract, privacy review and go/no-go recommendation; no production path exposed unintentionally.

**Regression/DoD:** verify flags off produce zero UI/data changes. Stop with evidence and decision, not an unbounded feature build.

## 7. Dependency and Conflict Map

### Dependency spine

```text
UX-01 → UX-02 → UX-03
   └────→ UX-04

UX-01..04 → UX-05
UX-01..04 → UX-06 → UX-07 → UX-08
UX-08 → UX-09 → UX-10/UX-11 → UX-12 → UX-13
UX-09/10/13 → UX-14 → UX-15/UX-16 → UX-17

UX-16/17 → UX-18 → UX-19
UX-01/02/04 → UX-20
UX-01..03/11 → UX-21
UX-01/02 → UX-22
UX-01..03/16 → UX-23
UX-12/14/22/23 → UX-24

UX-05/06/08/11/15/21 → UX-25
UX-05..25 → UX-26 → UX-27 → UX-29
UX-17..24/27 → UX-28 (optional)
```

### Safe parallel groups

- After UX-02: UX-03 shell and UX-04 feedback framework, with ownership split between layout and services/preferences.
- Phase 2: UX-05 Auth can run beside UX-06 Lobby if `Layout.jsx` is owned by UX-05 only after shell merge.
- Phase 3: UX-10 impact and UX-11 powers can run together if controller callbacks and CSS sections are preassigned.
- Phase 4: UX-15 rewards and UX-16 rank outcome can run together only after `GameOverFlow` contracts are extracted and each agent owns a separate modal.
- Phase 5: UX-18 Profile, UX-20 Shop and UX-21 Armory are route-isolated; UX-19 follows Profile.
- Phase 6: UX-22 History and UX-23 Ladder are safe in parallel; UX-24 follows their contextual actions.
- UX-27 measurement/asset inventory may run read-only beside page work; its CSS deletion and bundle changes wait until migrations settle.

### High-conflict pairs

| Missions | Shared risk area | Rule |
|---|---|---|
| UX-01 / UX-02 / any page migration | global tokens, base and layout CSS | merge foundations first |
| UX-03 / UX-05 / UX-13 | `Layout.jsx`, `Navbar.jsx`, viewport/body behavior | serialize shell changes |
| UX-06 / UX-07 / UX-25 | `ReadyOverlay.jsx`, onboarding copy/state | serialize in that order |
| UX-08–13 | controller props, `GamePage.jsx`, `game.css` | use staged ownership; UX-13 last |
| UX-14–17 / UX-24 | `GameOverFlow.jsx` and result overlays | establish flow contract in UX-14, then separate child files |
| UX-18 / UX-19 | Profile achievement composition and CSS | UX-18 first |
| UX-21 / UX-25 | Armory walkthrough hooks, constants and overlay | UX-21 first |
| UX-22 / UX-23 / UX-24 | contextual challenge triggers/drawers | History/Ladder first, Duels integrates after |
| UX-26 / all page missions | broad responsive/shared fixes | audit after feature merges |
| UX-27 / all CSS missions | stylesheet ownership and deletion | cleanup last |

### Shared contracts to freeze at checkpoints

- After Phase 1: tokens, primitive APIs, route metadata, breakpoints, preference keys, feedback event names.
- After Phase 2: Ready data contract, Ranked terminology, phase transition and countdown timing.
- After Phase 3: HUD/arena/hotbar geometry, live-region policy, effect budgets, mobile support matrix.
- After Phase 4: result state machine, reward/rank/achievement ordering, skip behavior.
- After Phase 6: player/round inspect drawer shape and challenge-launch context.

## 8. Recommended Execution Order

### Recommended first mission

Start with **UX-01: Establish the Precision Arena Visual Foundation**. Every visible problem currently invites a local styling fix; without semantic type, color, shape, depth, mode/rank and effect constraints, separate agents will create several incompatible versions of “more game-like.” UX-01 is bounded, testable and prevents the most expensive future rework.

### Ordered batches

1. UX-01.
2. UX-02.
3. UX-03 and UX-04 in coordinated parallel.
4. UX-05 and UX-06 in coordinated parallel.
5. UX-07, then UX-08.
6. UX-09.
7. UX-10 and UX-11 in controlled parallel.
8. UX-12, then UX-13.
9. UX-14.
10. UX-15 and UX-16 in controlled parallel, then UX-17.
11. UX-18, UX-20 and UX-21 in parallel; then UX-19.
12. UX-22 and UX-23 in parallel; then UX-24.
13. UX-25.
14. UX-26.
15. UX-27.
16. UX-29 final integration.
17. UX-28 only after a go/no-go review.

### Checkpoint reviews

- **Foundation review after UX-04:** compare the reference kit, shell and preferences at 390/768/1440; reject primitives that recreate a generic card library.
- **Entry review after UX-08:** test first visitor, returning player, Practice drill and each Ranked placement state; confirm “start a round” remains fast.
- **Game-feel review after UX-13:** blinded desktop/mobile sessions with audio on/off, reduced preferences and different cosmetics; verify target clarity and geometry.
- **Reward-loop review after UX-17:** test Practice, Casual level-up, placement reveal, promotion, protected loss, PB and multiple achievement unlocks; check pacing/skip.
- **Identity/economy review after UX-21:** verify Profile, gallery, Shop and Armory feel related but not templated; confirm purchases/build saves persist.
- **Competition review after UX-24:** follow a notable round through History → challenge → ghost duel → result; verify sparse/new-player cases.
- **Release review after UX-27:** run the full device/state/performance matrix before UX-29.

## 9. Highest-Impact Missions

1. **UX-03 — Shell and navigation:** immediately removes the dashboard rail and fixes the largest mobile-space problem.
2. **UX-06 — Arena lobby:** transforms the first authenticated view and core decision to play.
3. **UX-09 — Competitive HUD:** changes every live round and improves peripheral clarity.
4. **UX-10 — Hit/miss/streak feedback:** improves the most repeated action in the product.
5. **UX-13 — Responsive/accessibility gameplay:** fixes visible mobile clipping and protects the core loop across inputs/preferences.
6. **UX-14 — Round conclusion:** turns the emotional peak from a statistics panel into a game result.
7. **UX-15/UX-16 — Rewards and rank ceremonies:** make progression and competitive stakes memorable and trustworthy.
8. **UX-20 — Cosmetic preview/unlock:** converts a competent product grid into an ownership fantasy.
9. **UX-21 — Armory workshop:** sharpens the project's most distinctive strategic feature.
10. **UX-23 — Seasonal Ladder:** changes competition from a spreadsheet into rivals and position.

## 10. Final Integration and Review Mission

### UX-29: Final Cohesion, Drift, and Release Review

**Mission objective:** resolve cross-screen visual/interaction drift and verified regressions without redesigning or inventing features.

**Why / player-facing result:** surgical missions can leave duplicated CSS, inconsistent terms, uneven responsive behavior and broken transitions. Players receive one coherent game from session check through duel results.

**Scope:** inventory every implemented screen/state against UX-01–04 contracts; fix visual hierarchy drift, duplicate components/CSS, inconsistent terminology, route/overlay transitions, shell states, mobile overflow, focus/announcement defects, preference leaks, asset fallbacks and known dashboard-like remnants; run end-to-end journeys and the release matrix; document accepted exceptions.

**Explicitly out of scope:** postponed roadmap items, new mechanics/content, broad architecture rewrite, balance changes, optional UX-28 concepts, or using “integration” to implement missing page missions.

**Relevant areas:** all changed frontend files, shared styles/primitives, route metadata, preference/feedback services, browser tests; backend only if a regression proves an API contract mismatch.

**Functionality to preserve:** every source-of-truth system named in the Executive Diagnosis, server authority, URLs, persistence and completed mission acceptance criteria.

**UX/visual requirements:** one terminology glossary; one primary action hierarchy; rank/mode/feedback language consistent; remaining borders justify hierarchy; no page reverts to KPI grid/table-first identity unless a dense table is explicitly the secondary tool.

**States:** all critical default/loading/empty/error/locked/owned/equipped/placement/promotion/demotion/offline/preference states.

**Motion/feedback:** event cues fire once, transition directions are consistent, no broken exit/entry chain, and every reduced setting works globally.

**Responsive/accessibility:** rerun UX-26 matrix; zero clipped primary actions; no hover-only required information; focus and announcements work across nested dialogs/sheets.

**Dependencies:** UX-01–27 complete or explicitly deferred. **Parallelization:** audit may be divided, but shared fixes require one integrator; do not run page feature agents simultaneously.

**Acceptance criteria:** build/lint/unit/browser/a11y/visual suites pass; critical journeys pass manually; CSS/component duplicate report closed; terminology scan clean; no unexplained horizontal overflow, stale placeholder branding, broken transition, or critical dashboard pattern remains; all exceptions recorded with owner.

**Regression checks:** signup/login/restore/logout; first-run onboarding; all modes/drills/powers; every Ranked state; rewards/achievements; Profile/gallery; Shop buy/equip; Armory save/reset; History pagination/inspect; Ladder filters; challenge create/accept/play/result; responsive/preference/error states.

**Definition of done:** release checklist and exception log are signed off. Stop after integration fixes and verification; do not pull UX-28 or future ideas into release scope.

## 11. Unresolved Questions and Recommended Assumptions

1. **Mobile product promise.** Question: is competitive play officially supported on phones or only responsive viewing? **Assumption:** support touch play at 390 x 844 and modern landscape phones, document 320 px as functional minimum, and preserve server geometry parity. If Ranked mobile is intentionally unsupported, say so before UX-13 and offer Practice/Casual rather than a broken layout.
2. **Brand asset authority.** Question: is `pointerimage.png` intended as the final logo? **Assumption:** treat the pointer/impact idea as direction but commission/produce a final vector lockup and favicon during UX-01; do not upscale the current placeholder raster.
3. **Audio asset/licensing budget.** Question: may the project ship custom/licensed SFX? **Assumption:** yes, with a small attributable original/royalty-cleared set, sound off controls and no background music in the first pass.
4. **Terminology.** Question: which terms are canonical? **Assumption:** navigation destination is **Ladder**; page title may be **Season Ladder**; division currency is **RR**; internal `rankMmr`/MMR remains code-only; **Global rank** means `#position`; navigation is **Duels**, with “challenge” used as the invitation verb/object.
5. **Season reward reality.** Question: does the backend grant season-end rewards? **Assumption:** show “reward tier” only as status/preview until authoritative settlement exists; never imply a granted cosmetic/currency.
6. **Achievement showcase persistence.** Question: can featured achievements be added to player persistence? **Assumption:** use persisted selection only after an explicit API/schema slice; otherwise keep a local prototype and do not claim a public profile.
7. **Profile visibility/sharing.** Question: are profiles private, public, or inspect-only through Ladder? **Assumption:** keep Profile private and player inspect minimal until privacy/moderation rules exist; shareable exports remain UX-28 feature-flagged.
8. **New session goals/contracts.** Question: should goals grant rewards? **Assumption:** UX-17 session goal is motivational progress using existing achievement/drill data and grants nothing new; rotating rewarded contracts remain optional UX-28.
9. **Cosmetic rarity.** Question: is rarity part of the economy? **Assumption:** no. Use category, ownership and price without fabricated rarity labels.
10. **Cosmetic target readability.** Question: may players disable another player's cosmetics in future competition? **Assumption:** current solo/ghost game always enforces a semantic target outline and contrast floor; cosmetics never alter hitbox/geometry. Add a “competitive clarity” override preference if tests show a theme fails.
11. **Gamepad support.** Question: is physical controller support intended? **Assumption:** icons may feel controller-like, but UX-13 guarantees pointer/touch/keyboard semantics only. Do not advertise gamepad support without an input design and tests.
12. **Data for trends/movement.** Question: are prior Ladder positions and long-term series authoritative? **Assumption:** do not show movement arrows or trend charts from inferred/sparse client history; only show current RR gaps and existing recent-round trends until backend snapshots exist.
13. **Armory eligibility timing.** Question: should modules unlock beyond current levels? **Assumption:** preserve all current unlock levels and balance; improve presentation only. Progression rebalance is a separate product/design exercise.
14. **Browser/test baseline.** Question: which browsers/devices define release? **Assumption:** latest Chrome/Edge/Firefox/Safari desktop plus current iOS Safari/Android Chrome at 390 px, with automated Chromium smoke and manual cross-browser checkpoint.
15. **Existing quality baseline.** The audit found 56 passing tests and a passing build, but one lint error and a bundle-size warning. **Assumption:** no mission is complete if it adds errors; UX-27 closes the known lint failure and either resolves or explicitly budgets the bundle warning.

The repository and running application remain the source of truth. If any assumption changes, update the affected mission's scope and acceptance criteria before assigning it; do not allow individual agents to invent a conflicting visual direction.
