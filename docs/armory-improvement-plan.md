# Armory Improvement Plan — "The Workshop"

Date: 2026-07-11
Scope: planning only — no implementation in this document.
Relationship to other docs: this plan **supersedes and expands UX-21** ("Refine Armory Into a Focused Build Workshop") in `clickaway-ui-ux-master-roadmap.md`. UX-21 was a presentation-only refinement; this plan treats the Armory as a first-class game pillar and includes new content, new systems, and a full visual re-authoring. It inherits the roadmap's north star ("Precision Arena Broadcast") and its constraint that immersion never overrides readability. Phase 12 conflicts with UX-25 (onboarding) — whichever ships first owns the walkthrough files.

---

## Part 1 — Full Passover: Current State Audit

### 1.1 Architecture map

| Layer | Files | Notes |
| --- | --- | --- |
| Route/page | `src/pages/ArmoryPage.jsx` | Thin wrapper: controller → screen. Clean. |
| Controller | `src/features/armory/hooks/useArmoryScreenController.js` (414 lines) | All state: local loadout mirror, step/lane/hotbar selection, name draft, walkthrough state + spotlight measurement. |
| View | `src/features/armory/components/ArmoryScreen.jsx` (518 lines) | Rail + four accordion step cards (Slot, Passives, Hotbar, Review). Receives ~50 props from controller. |
| Shared UI | `ArmorySharedUiComponents.jsx` | Rail step button, slot rail button, step card, choice card, detail panel, hotbar button, review mode button, inline SVG glyphs. |
| Walkthrough | `ArmoryWalkthroughOverlay.jsx`, `armoryConstants.js` (9 steps), `constants/buildWalkthrough.js`, spotlight math in `armoryUtils.js` | Auto-starts on first visit, edits the real slot, hands off to Ready via `PRACTICE_PENDING`. |
| URL state | `useArmoryUrlState.js` | `?step=`, `?lane=`, `?powerSlot=` deep links; deliberately skipped during first-run walkthrough. |
| Data model | `src/constants/buildcraft.js` | 3 fixed slots, 3 module lanes × 3 options, 6 powers, starter loadouts, normalization, `buildRoundRules` (mode + modules → round rules), server-side snapshot clamping. |
| Presentation | `src/constants/buildcraftPresentation.js` | Derives identity (Balanced/Control/Pressure/Utility), strengths/tradeoffs, 5 summary stats, difficulty tag, hand-written per-option copy. |
| Game integration | `useGameScreenController.js`, `src/game/engine/roundEngine.js`, `roundGeometry.js` | `buildRoundRules` feeds the deterministic, server-verified engine; power `effectType`s execute in the engine; round-start loadout snapshot recorded into history. |
| Server | `server/playerMysqlDatabase.js` (`user_loadout_stats`), `normalizeLoadoutSnapshotForLevel` | Per-build stats (rounds, ranked wins, best score/streak, hits/misses) rebuilt from round history; forged snapshots clamped to unlocked content. |
| Styles | `src/styles/components/armory.css` (1,051 lines) | Page-scoped; shares the global dark-blue card grammar. |
| Tests | `tests/buildcraft.test.js`, `tests/roundEngine.test.js`, walkthrough coverage in `tests/gameOnboarding.test.js`, `tests/routeMetadata.test.js` | Data model and engine are well covered; the screen itself is not. |

### 1.2 What is genuinely strong (preserve at all costs)

- **The buildcraft model is real game design.** Modules have honest tradeoffs (`buildRoundRules` composes them into round rules), powers have distinct effect types, and the whole thing is deterministic and server-verified. Nothing here is cosmetic fakery.
- **Instant persistence with server clamping.** Every change saves immediately; `normalizeLoadoutSnapshotForLevel` prevents forged unlocks. No save-button anxiety, no exploit surface.
- **The presentation layer** (`buildcraftPresentation.js`) already translates numbers into feel: identity labels, plain-language strengths/tradeoffs, "best in" guidance, exact-value chips behind a toggle. This is the right editorial instinct — it just needs a stage worthy of it.
- **Walkthrough quality.** Spotlight geometry, real-slot editing, auto/manual sources, status handoff to Ready. Better than most shipped games' tutorials.
- **URL deep-link state** and the Ready ↔ Armory loop (`View in Armory` with a "New" badge).

### 1.3 Where it falls short (the case for this plan)

1. **It reads as a settings panel.** Four accordion form-cards in a bordered dashboard shell (`cardWide`), a sidebar of buttons, labeled inputs, chip rows, and metric cards. The roadmap's own diagnosis applies fully: legible, but assembled from UI components rather than directed as a game.
2. **The build has no body.** The most important object — the thing you're building — never appears. There is no visual of the target you'll click, no equipped skin, no physical hotbar. Identity exists only as a small glyph and a word ("Pressure").
3. **Review is a readout, not an experience.** The Review step shows heuristic chips and a detail table. You cannot *feel* a build without leaving the page and starting a round.
4. **Content is shallow relative to the frame.** 9 modules (all unlock at level 1) and 6 powers (only 3 gated: levels 4/7/11). The four-step workshop ceremony wraps roughly a dozen meaningful choices. Progression through the Armory effectively ends at level 11.
5. **Telemetry never comes home.** The server tracks per-build stats (`user_loadout_stats`) but they surface only on the Profile page. The Armory — the one place you'd act on "Glass Cannon wins 62% of your Ranked rounds" — never sees them.
6. **No comparison.** Three bays exist but can't be compared; there's no baseline-vs-build delta view, no bay-vs-bay view, no mode matrix.
7. **Dead code.** `ArmoryModeMatrix.jsx` and `ArmoryModeStrip.jsx` are exported but never imported anywhere. (The matrix idea is worth reviving in Phase 8; the files as-is are cruft.)
8. **No sound, no ceremony.** Equipping a module, activating a bay, unlocking a power — all silent, all instant, all identical.
9. **Prop-drilling stress.** `ArmoryScreen` takes ~50 props from the controller. Fine today, hostile to the growth this plan requires.

### 1.4 Integration points every phase must respect

- `buildRoundRules(mode, loadout)` is the single contract between Armory and the game engine. New content extends `buildcraft.js`; new power behaviors need handlers in `roundEngine.js` **and** server verification parity, plus `normalizeLoadoutSnapshotForLevel` awareness.
- `onLoadoutStateChange` → `App.jsx` → server. The Armory never owns persistence.
- Walkthrough statuses (`buildWalkthrough.js`) gate the Ready badge and first-run behavior — legacy users' statuses must keep meaning something.
- Round history stores a loadout snapshot per round; per-build stats are rebuilt from it server-side.

---

## Part 2 — North Star: What the Armory Becomes

**Fantasy:** *I walk into my workshop between matches. My build sits on the bench in front of me — the actual target I'll be clicking, wearing its skin, its three module cores glowing in their housings, its three keyed tools racked below. I swap a part and watch the machine change. I test it on the range without leaving the room. I check its service record. When I'm ready, I take it to the arena.*

Design commitments (extending "Precision Arena Broadcast" into this room):

1. **The build is a hero object, not a form state.** One large, live, centered rendering of the target — equipped skin, module glyphs docked around it, hotbar racked beneath — that visibly reacts to every choice.
2. **Parts are physical.** Modules and powers are drafted from a gallery and *installed* — they travel to their housing, seat with motion and sound. Locked parts sit visible behind glass with their unlock condition, not hidden.
3. **Consequences are felt, then read.** Hovering a part previews its delta on the machine and the readouts *before* you commit. The Test Range lets you feel a build in 10 seconds. Exact numbers remain one calm toggle away — never deleted, never leading.
4. **The room has weather.** Identity (Control/Pressure/Utility/Balanced) drives the room's lighting, not a chip's border color. A Pressure build makes the workshop feel faster.
5. **The Armory is where progression lives.** Unlocks are revealed here, ceremoniously. The unlock wall makes "what's next" a destination. Post-round build reports pull players back with something to act on.
6. **Never a dashboard.** No bordered card grids, no KPI tiles, no form-with-sidebar. Stat tiles become instrument readouts; tables become service records; the accordion dies.

Anti-goals: no loot boxes, no paid parts, no stat-stick inflation that invalidates aim skill, no sci-fi HUD noise over readability, and no breaking of the deterministic engine's server verification.

---

## Part 3 — Implementation Phases

Fourteen small phases of deliberately equal weight. Each is independently shippable, ends in a working game, and includes its own regression guard. Order within a stage matters; stages are sequential. Cost and calendar time are explicitly not constraints.

```
STAGE A — Foundation        Phases 1–2   (clear the bench, build the room)
STAGE B — The Machine       Phases 3–6   (hero object and the three editors)
STAGE C — Depth             Phases 7–10  (test range, comparison, telemetry, content)
STAGE D — Soul & Hardening  Phases 11–14 (ceremony, onboarding, sound, QA)
```

---

### Phase 1 — Clear the Bench (foundation & guardrails)

**Goal:** make the codebase safe to grow before anything visual changes.

**Ships:**
- Delete dead `ArmoryModeMatrix.jsx` and `ArmoryModeStrip.jsx` (concept archived in this doc for Phase 8).
- Split the 50-prop controller→screen contract into grouped objects (`slotApi`, `passiveApi`, `hotbarApi`, `reviewApi`, `walkthroughApi`) or an ArmoryContext, so later phases add capability without prop explosions.
- Extract armory-scoped design tokens (spacing, tones per lane/identity, radii, motion durations) to the top of `armory.css`; audit the 1,051 lines and remove rules orphaned by the dead components.
- Screen-level test baseline: render tests for the four steps, module select, power select with duplicate/locked logic, rename commit, reset, URL deep links. These tests are the safety net for every following phase.

**Touches:** `useArmoryScreenController.js`, `ArmoryScreen.jsx`, `armory.css`, deletions, new `tests/armoryScreen.test.jsx`.

**Done when:** zero behavior change is observable; all existing tests plus the new baseline pass; controller exports grouped APIs.

**Don't break:** walkthrough statuses, URL params, instant save, duplicate-power blocking.

---

### Phase 2 — Build the Room (scene shell & atmosphere)

**Goal:** replace the dashboard shell with an authored environment before any interior redesign.

**Ships:**
- Retire `pageCenter` + `cardWide` framing for this route. The Armory becomes a full-bleed scene: deep-ink backdrop with a subtle workbench composition (vignette, faint calibrated tick marks, a light source above the future machine position), semantic `h1`, no outer border-card.
- Identity-driven lighting system: a CSS custom-property "weather" layer (`--armory-key-light`, `--armory-ambient`) that shifts hue/intensity with the active build's identity. Wired now to the existing identity value; consumed by everything built later.
- Authored route entrance: a short settle-in transition (lights come up) with a reduced-motion instant variant.
- Layout skeleton for the final composition: left bay wall (Phase 4), center stage (Phase 3), right instrument column (Phases 5–6 editors dock here). Existing accordion content temporarily occupies the center/right regions unchanged.

**Touches:** `ArmoryScreen.jsx` (outer structure only), `armory.css`, `Layout.jsx`/body-class if the route needs shell suppression parity with `/game`.

**Done when:** the route no longer reads as a card page; lighting responds to switching active build identity; all Phase 1 tests still pass; walkthrough spotlight still measures correctly against the new shell.

**Don't break:** spotlight geometry (`measureSpotlightRect` uses the shell ref — re-anchor it), mobile scroll, focus order.

---

### Phase 3 — The Machine (hero build object)

**Goal:** give the build a body. This is the emotional center of the entire plan.

**Ships:**
- A large live rendering of the actual target at center stage: equipped button skin (from shop `effectClass`/`imageSrc`), sized proportionally to the build's computed `initialButtonSize` for the selected mode, idle animation matching identity (Control breathes slowly; Pressure ticks fast).
- Three module housings docked around the target (tempo/streak/power positions), each showing its installed module's glyph and label; empty/default modules read as neutral plates.
- The racked hotbar beneath: three keyed tool slots mirroring the in-game tray's visual language (reuse `PowerupTray` idioms so the round feels continuous with the workshop).
- A nameplate under the machine (build name + identity tag) — display only in this phase.
- The machine re-renders reactively from `activePresentation`/`roundRules` — any change made in the (still-old) editors visibly alters size, glyphs, rack contents.

**Touches:** new `ArmoryMachine.jsx` (+ subcomponents), `ArmoryScreen.jsx`, `armory.css`; reads `buildLoadoutPresentation` and shop-equipped skin via props from App.

**Done when:** the current build is recognizable at a glance without reading any text; equipping a different tempo core visibly changes the target's size on the bench; skin equipped in Shop appears here.

**Don't break:** performance (idle animation must be compositor-only), reduced-motion (static machine), existing editors' function.

---

### Phase 4 — The Bay Wall (saved-build system rework)

**Goal:** turn the three saved-loadout buttons into physical build bays and remove the "slot step" form.

**Ships:**
- Left bay wall: three bays, each a miniature of its machine (mini target + module glyph trio + identity light), with nameplate and an ACTIVE lamp. Selecting a bay rolls that machine onto the center stage (directional transition; reduced-motion: crossfade).
- Inline nameplate editing on the machine itself (click the plate → edit in place), replacing the "Build name" form field. Same 24-char normalization and commit rules.
- **Copy to bay:** duplicate the current build into another bay (overwrites after confirm). New capability; pure client-side data, no schema change.
- Reset moves behind a two-step confirm styled as a workshop action ("Strip this build to factory spec").
- The four-step accordion officially dies: the "Slot" step's remaining content (status chips, snapshot grid) is absorbed by the machine and bays. `ARMORY_STEPS`/URL `?step=slot` map to the default stage view for deep-link compatibility.

**Touches:** `ArmoryScreen.jsx`, new `ArmoryBayWall.jsx`, controller (copy/confirm state), `armoryConstants.js`, `useArmoryUrlState.js` (step aliasing), `armory.css`, walkthrough step targets (temporary re-anchor; full rewrite is Phase 12).

**Done when:** switching bays feels like swapping machines, not selecting a radio button; rename, copy, reset, activate all persist through reload; old `?step=` links still land somewhere sensible.

**Don't break:** `normalizeLoadoutState` (still exactly 3 fixed IDs), Ready overlay's active-build display, walkthrough completability.

---

### Phase 5 — The Parts Gallery (passive module editor rework)

**Goal:** rebuild module selection as drafting physical parts, with pre-commit consequence preview.

**Ships:**
- Opening a module housing on the machine (or its lane in the instrument column) slides in the parts gallery for that lane: module cards as machined parts — lane-toned material, glyph, name, one-line feel description. Selected part sits visibly *installed*; locked parts sit behind glass with "Unlocks at Level N".
- **Hover/focus preview (the keystone):** previewing a part shows its effect *before commit* — the machine's target ghost-resizes, and the instrument readouts (Aim Window, Shrink Pace, Combo Ramp, Miss Cost, Power Tempo — reusing `summaryStats`) show current→previewed deltas with direction arrows. Touch: first tap previews, second installs.
- Install action: the part travels to its housing and seats (motion + Phase 13 sound hook). The detail panel content (`youGet`/`youGiveUp`/`bestIn` + exact chips) becomes the gallery's inspection footer, not a separate dashboard panel.
- Instrument column readouts restyled as calibrated instruments (needle/segment displays) — the metric-card grid dies.

**Touches:** new `ArmoryPartsGallery.jsx`, `ArmoryInstruments.jsx`, controller (preview state — pure derived `buildLoadoutPresentation` on a hypothetical loadout, never persisted), `armory.css`.

**Done when:** a player can answer "what happens if I take Overdrive?" without equipping it; installing feels physical; every fact from the old detail panel remains discoverable.

**Don't break:** unlock gating, `handleSelectModule` persistence path, `?lane=` deep links, keyboard operability of the gallery (roving focus, Enter installs).

---

### Phase 6 — The Tool Rack (hotbar editor rework)

**Goal:** the same physicality for powers, plus cadence made visible.

**Ships:**
- Selecting a rack slot (key 1/2/3) opens the power gallery: power cards with glyph, feel line, and states — installed, **racked on another key** (shown with its key number, one action to swap keys rather than a dead disabled state), locked behind glass with level.
- Same preview-before-commit pattern: previewing a power shows its cadence on the **cadence timeline** — a horizontal streak ruler (streak 1…20) with markers where each racked tool charges, recomputed with `powerupAwardMultiplier` and starting charges. This replaces the "Every N streak" text as the primary cadence display.
- **Key swapping:** drag between rack slots on desktop; explicit "swap with key N" action everywhere (keyboard/touch parity). Removes the current dead-end where a power "On key 2" is simply disabled.
- Install motion: tool slides into its keyed slot on the machine's rack.

**Touches:** `ArmoryPartsGallery.jsx` (power mode), new `ArmoryCadenceTimeline.jsx`, controller (swap handler — reorders `powerupIds`), `armory.css`.

**Done when:** a player can see *when* their tools arrive during a round, not just how often; swapping keys 1↔3 takes one action; duplicate blocking is now a swap affordance rather than a disabled card.

**Don't break:** exactly-3-unique-powers invariant, engine's `slotIndex`/`slotKey` mapping, `?powerSlot=` deep links.

---

### Phase 7 — The Test Range (playable build preview)

**Goal:** the single biggest "significant part of the game" feature — feel a build without leaving the Armory.

**Ships:**
- A range mode: the center stage clears and runs a **10-second live sample** using the real engine (`buildRoundRules` for the selected mode + current build) — real shrink, movement, combo pacing, miss penalties, and powered hotbar keys, rendered with the actual `MovingButton`/arena feedback components.
- Range results are ephemeral and explicitly unrewarded: a short readout (hits, best streak, charges earned) with "no XP, no coins, no rank — this is the range" framing. **Nothing** is written to history, lifetime stats, or the server.
- Mode selector integrated (Practice/Casual/Ranked rules) — this absorbs the Review step's mode row.
- Entry/exit is fast and repeatable ("Run it again" is one key). DEV `g`-style early exit works here too.
- The old Review step's remaining content (strengths/tradeoffs, exact values toggle) moves to a slide-out **spec sheet** available from the machine; `?step=review` deep-links to the range.

**Touches:** new `ArmoryTestRange.jsx` + a range-scoped slice of the round loop (extract a reusable mini-round hook from `useGameScreenController` internals or compose `roundEngine` directly — decision point for implementation), `ArmoryScreen.jsx`, `armory.css`, `armoryConstants.js`/URL mapping.

**Done when:** tune → test → retune loops in under 15 seconds; range rounds provably never touch persistence or server verification; the accordion's last remnant is gone.

**Don't break:** the real game's round state (no shared mutable state with `/game`), server round-verification assumptions (range sends nothing), reduced-motion behavior inside the range.

---

### Phase 8 — The Compare Bench (analysis without dashboards)

**Goal:** answer "which build, for which mode?" — reviving the dead mode-matrix concept in the new visual language.

**Ships:**
- **Bay vs. bay compare:** summon a second bay's machine as a translucent "ghost" beside the active one; instruments show paired needles (active vs. ghost) per readout; strengths/tradeoffs render as a two-column spec sheet in plain language.
- **Mode matrix, reborn:** one view showing the active build's five readouts across all three modes simultaneously — styled as a range-card/manifest (etched plate, not a data table), since `buildLoadoutPresentation` is already mode-parameterized.
- Delta framing is always vs. mode baseline (what the mode gives everyone) so module contributions stay honest.
- Compare is reachable from any bay (long-press/context "Compare with active").

**Touches:** new `ArmoryCompareBench.jsx`, `ArmoryModeManifest.jsx`, instruments component (paired mode), controller (compare selection state), `armory.css`.

**Done when:** "is Safe Hands or All-Rounder better for Ranked?" is answerable in one screen without reading numbers; nothing in the view resembles a KPI table.

**Don't break:** presentation derivation purity (no persisted compare state), performance with 6 simultaneous presentations (3 bays × modes are memoized already — extend the pattern).

---

### Phase 9 — Field Data (telemetry comes home)

**Goal:** close the loop between rounds played and the workshop.

**Ships:**
- **Service record per bay:** surface existing `user_loadout_stats` (rounds, ranked rounds/wins, best score, best streak, hit/miss accuracy) inside the Armory — an etched service plate on each bay and a fuller record in the machine's spec sheet. Empty state authored ("No field data yet — take it to the arena").
- **Build report hook:** after a round, Game Over gains a quiet "Workshop notes" line for the used build (e.g., "Best streak with Glass Cannon so far" / "3rd Ranked win in a row on this build") with a link into the Armory focused on that bay. Data derived from the round result + loadout stats already returned by the server; no new endpoints expected — verify `loadoutStats` freshness post-round and add a fetch-refresh if stale.
- **Advisory, not prescriptive:** one contextual workshop suggestion max (e.g., "You miss 2.1× more with Overdrive in Ranked — Anchor is on the wall"), phrased as an observation, dismissible, never modal.
- Name-change history handling: service records key on `loadoutId` (stable), display current name.

**Touches:** `ArmoryScreen.jsx`/bays/spec sheet, `App.jsx` prop plumb of `loadoutStats` into ArmoryPage, Game Over overlay (one line + link), possibly a small selector util in `src/utils/`, `armory.css`.

**Done when:** a player standing in the Armory can see how each build actually performs; the post-round note appears only when it has something true to say.

**Don't break:** Game Over pacing (the note must not delay the staged reveal), Profile's existing use of the same stats, guest/no-data states.

---

### Phase 10 — New Parts (content expansion)

**Goal:** give the workshop enough real content to justify its ceremony, spread across the whole leveling curve. This is a game-design phase as much as an engineering one.

**Ships:**
- **Module wave:** 2 new options per lane (9 → 15 total), each with an honest tradeoff and a distinct feel, gated across levels (~5, 9, 13, 17, 21, 25 range) so every few levels opens a workshop visit. Examples to be balanced in design review: tempo "Pendulum" (size oscillates — larger average, less predictable), streak "Crescendo" (combo multiplier caps higher but resets fully on miss), rig "Twin Feed" (key 1 charges twice as often; keys 2–3 slower).
- **Power wave:** 3 new powers (6 → 9), levels ~14, 18, 22. Candidates: "Echo" (repeat your last power's effect at half strength), "Slow Field" (2s of slowed movement), "Overclock" (5s of +50% score, misses cost double).
- Every addition lands in the full stack: `buildcraft.js` definitions → `roundEngine.js` deterministic handlers → **server verification parity** → `normalizeLoadoutSnapshotForLevel` clamping → presentation copy (`buildcraftPresentation.js`) → glyphs (`loadoutBuildcraftGlyphIcons.jsx`) → gallery/locked states (already generic from Phases 5–6) → engine tests per effect.
- Balance guardrails documented per part: no part may raise expected Ranked score >20% over Balanced in simulation; sim harness script added to `tests/` for tuning.

**Touches:** `buildcraft.js`, `roundEngine.js`, `roundGeometry.js` (if movement-affecting), server verification module, `buildcraftPresentation.js`, glyph icons, `tests/buildcraft.test.js`, `tests/roundEngine.test.js`, new `tests/buildBalanceSim.test.js`.

**Done when:** deterministic tests cover every new effect client and server side; a level-30 account has had a reason to open the Armory at least six more times than today; no new part is strictly dominant in sim.

**Don't break:** replay/ghost determinism (new effects must be seed-stable), old snapshots (missing new fields normalize cleanly), level clamping.

---

### Phase 11 — The Unlock Wall & Ceremonies

**Goal:** make progression *happen in* the Armory rather than merely be checked against it.

**Ships:**
- **Unlock wall:** a dedicated composition showing every module and power in the game — owned parts lit, locked parts silhouetted behind glass with level requirements — so "what's next" is a browsable destination, not a disabled card discovered by accident.
- **Unlock ceremony:** when a level-up crosses an unlock threshold, the next Armory visit opens with a short authored reveal — the case opens, the part is lit and named, one-tap "install now" into the active build or "rack it". Queued if multiple; skippable; runs once per part (persisted seen-state via existing storage/progress patterns).
- "New part" badging propagates outward: the nav's Armory entry and Ready's "View in Armory" link reuse the existing badge mechanism for unseen unlocks (extending `shouldShowArmoryOnboardingBadge`-style logic).
- **Blueprint codes:** export/import a build as a compact shareable string (modules + powers + name). Import validates against `normalizeLoadoutState` (locked parts fall back with a clear "requires Level N" note). Client-only; no server sharing infrastructure in this phase.

**Touches:** new `ArmoryUnlockWall.jsx`, `ArmoryUnlockCeremony.jsx`, unseen-unlock state (storage constant + App plumb), `Navbar`/Ready badge wiring, blueprint encode/decode util + tests, `armory.css`.

**Done when:** leveling past an unlock threshold reliably produces a moment; a friend can paste your blueprint and get your build (or the closest legal version of it).

**Don't break:** walkthrough badge semantics for legacy statuses, level-clamp security (imports are just requests — normalization still rules), reduced-motion ceremony variant.

---

### Phase 12 — Re-Onboarding (walkthrough & guidance rewrite)

**Goal:** re-author the first-run and help experience for the workshop the previous 11 phases built. (Coordinates with roadmap UX-25 — this phase owns the armory walkthrough files.)

**Ships:**
- Full rewrite of `WALKTHROUGH_STEPS` for the new spatial layout: welcome → the machine → one module install (with preview) → one rack choice → the test range (replacing the static review step as the finale — "feel it, then take it to Ready"). Fewer, stronger steps.
- Spotlight geometry updated for the scene layout (Phase 2's shell re-anchor made this possible; this phase makes it authored — spotlights follow the moving machine parts correctly).
- Contextual first-touch tips (shown once each): first bay switch, first locked part inspection, first compare, first blueprint. Stored alongside walkthrough status.
- Help/Field Guide armory section rewritten to match reality, with deep links using the URL state (`?step=`, `?lane=`) that earlier phases preserved.
- Legacy status migration: users with completed/dismissed old walkthroughs are never re-prompted; `PRACTICE_PENDING` handoff to Ready keeps working.

**Touches:** `armoryConstants.js`, `ArmoryWalkthroughOverlay.jsx`, `useArmoryWalkthrough.js`, `buildWalkthrough.js`, `helpPageStructuredContent.js`, `tests/gameOnboarding.test.js`.

**Done when:** a brand-new account reaches "I tested a build I changed myself" inside 90 seconds; every old walkthrough status value still behaves sensibly.

**Don't break:** auto-start conditions, skip/restart, URL-state suppression during first run, Ready badge.

---

### Phase 13 — Voice of the Workshop (sound, haptics, motion polish)

**Goal:** the sensory layer that separates "well-backed indie studio" from "styled web app". (Slots into the roadmap's global sound direction; the Armory gets its own instrument family.)

**Ships:**
- Audio identity, sparse and mechanical: part hover (faint tick), install (seat/clunk per lane tone), bay activation (power-up hum), test range start (the game's countdown language, quieter), unlock ceremony (single warm stinger), blueprint copy (stamp). All routed through the game's audio/feedback preference system (`FeedbackPreferencesContext`) with a global mute respected.
- Haptics on supporting devices for install/activate (via the existing feedback framework if present; otherwise `navigator.vibrate` guarded).
- Motion pass: unify all Phase 3–11 transitions onto the token durations/easings from Phase 1; ensure every animation has a reduced-motion equivalent that preserves *information* (deltas still shown, just not traveled).
- Idle life: subtle machine idle loops per identity, light flicker on the unlock wall — all compositor-only, all pausable.

**Touches:** new armory audio asset set + a small `armorySound.js` util, `FeedbackPreferencesContext` wiring, `armory.css` motion tokens sweep, component-level hooks added in Phases 3–11 get real implementations.

**Done when:** with sound on, the workshop has a recognizable voice; with sound off and reduced motion on, nothing is lost but flavor; no audio plays before first user interaction (autoplay policies).

**Don't break:** performance (no layout-thrashing animations), user feedback preferences, test determinism (sound side-effect free in tests).

---

### Phase 14 — Certification (accessibility, responsive, QA hardening)

**Goal:** ship-quality pass over everything Stages A–D built.

**Ships:**
- **Mobile composition:** the scene recomposes rather than stacks — machine on top, bay wall as a horizontal shelf, galleries as bottom sheets, test range full-screen, compare bench as swipe-between. No horizontal overflow, no clipped actions, thumb-reachable install/activate.
- **Keyboard & screen reader certification:** full keyboard route through bays → housings → gallery → install → range; locked/taken/preview states announced (aria-live for readout deltas debounced); walkthrough focus trap verified; semantic heading tree.
- **Visual regression baselines** for the key scenes (stage, gallery open, range, compare, unlock wall, ceremony) in both motion modes.
- **Performance budget:** armory route chunk audited (it's already lazy-loaded); machine + instruments hold 60fps on mid-tier hardware; CSS audit brings `armory.css` back under control post-expansion (target: no dead selectors, tokenized values only).
- Full regression sweep of the guard list below.

**Touches:** all armory files (fixes only), test infra, CI baselines.

**Done when:** no critical accessibility violations; all breakpoints authored; baselines green; the guard list passes end to end.

**Don't break (master guard list, verified here and in every prior phase):**
- Three saved builds normalize, persist, and survive reload and re-login.
- Duplicate-power invariant and level clamping (client and server).
- `buildRoundRules` output consumed by the engine is byte-identical for unchanged builds (replays/ghosts stay valid).
- Walkthrough: auto-start, skip, restart, `PRACTICE_PENDING` → Ready handoff.
- URL deep links (`?step`/`?lane`/`?powerSlot`) resolve, including legacy `slot`/`review` aliases.
- Ready overlay build display, Game Over workshop note, Profile loadout stats.
- Test range writes nothing anywhere.

---

## Part 4 — Sequencing Notes & Open Questions

**Dependency spine:** 1 → 2 → 3 are strictly sequential. 4, 5, 6 all depend on 3 but not on each other (parallelizable). 7 depends on 5–6 (previews established) and on engine familiarity. 8–9 depend on 3–4. 10 is independent of visuals (can start any time after 1, in parallel with Stage B, by a separate contributor — it's engine/server work). 11 depends on 10 (needs parts to unlock) and 5–6 (gallery lock states). 12 depends on everything player-facing (3–11). 13–14 are last.

**Open questions to resolve before the relevant phase (not blockers today):**
1. *Phase 7:* extract a reusable round-loop hook from `useGameScreenController` vs. compose `roundEngine` directly for the range? Recommendation: direct engine composition — the game controller is 1,400+ lines and carries persistence concerns the range must not inherit.
2. *Phase 10:* final part list and numbers are a design-review deliverable; the examples above are placeholders with the right *shape* (honest tradeoffs, level spread).
3. *Phase 10:* do new movement-affecting powers (Slow Field) need `roundGeometry.js` changes that touch server verification of positions? Audit before committing to that power.
4. *Phase 11:* blueprint codes are client-only here; server-hosted build sharing (browse popular builds) is a natural follow-up but out of scope.
5. *More than 3 bays* (e.g., unlock bays 4–5 at high level) is deliberately excluded — `LOADOUT_ID_LIST` is load-bearing across client, server tables, and history snapshots. Revisit only after Phase 14.

**What this plan explicitly preserves untouched:** deterministic server-verified scoring, instant persistence semantics, the 3-bay data model, all current unlock levels for existing parts, and the plain-language-first / exact-numbers-behind-a-toggle editorial rule.
