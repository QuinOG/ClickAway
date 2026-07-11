# Wave 4 — Parallel Improvements (#7, #8, #9)

Date: 2026-07-11
Parent plan: `docs/improvement-reconnaissance.md`
Prerequisites: Waves 1–3 foundations (engine, lifetime stats, ladder/challenges) are in place.

Wave 4 items are architecturally independent of each other and can ship in any order, though **#8 (Armory)** has the highest user-acquisition leverage once growth starts.

---

## Scope Overview

| # | Opportunity | Status | Priority within wave |
|---|-------------|--------|----------------------|
| 7 | Progress sync refactor | **Done** | `useProgressSync` + narrow `pickProgressIntent` payloads |
| 8 | Armory convergence + first-session onboarding | **Done** | Armory cutover + 3-step onboarding (Armory → Practice → Casual) |
| 9 | Practice → training suite | **Done** | 3 drills, persisted bests, warm-up suggestions, in-round goal HUD |

---

## #7 — Progress Sync: Snapshot Blob → Intent Endpoints

### Current state (2026-07-11)

- Intent-only sync via `src/app/useProgressSync.js` and `src/app/progressIntent.js`.
- `App.jsx` no longer maintains `progressSnapshotRef` or full-snapshot PUT payloads.
- Achievements update locally only; server recomputes on save/round complete.
- Shop purchase/equip always applies authoritative `session.progress`.

### Target state

Server-owned state with narrow intent endpoints. Client holds a thin cache keyed by server responses. Delete snapshot/queue machinery from `App.jsx`.

### Implementation slices

1. ✅ **Audit persisted fields** — intent fields: loadouts, walkthrough, selected mode.
2. ✅ **Remove dead PUT fields** — client sends only `pickProgressIntent` fields.
3. ✅ **Delete achievement client-push** — `useAchievementSync` no longer calls PUT.
4. ✅ **Simplify shop path** — removed optimistic coin/equip fallback.
5. ✅ **Delete machinery** — `useProgressSync` replaces snapshot refs in `App.jsx`.

### Verification

- Multi-tab equip/loadout changes don't clobber each other.
- Shop purchase with slow network never shows incorrect coin balance after response.
- No field sent in PUT that the server discards.

### Affected files

- `src/App.jsx`, `src/app/useAppPlayerState.js`, `src/app/useAchievementSync.js`, `src/app/useShopActions.js`
- `server/index.js` (`normalizeProgressPayload`)

---

## #8 — Armory Convergence + First-Session Onboarding

### Current state (2026-07-11)

- Live route: `src/pages/ArmoryPage.jsx` — thin wrapper over `ArmoryScreen` + `useArmoryScreenController`.
- Walkthrough steps single-sourced in `src/features/armory/armoryConstants.js`.
- URL state synced via `useArmoryUrlState` (`?step=`, `?lane=`, `?powerSlot=`).
- Onboarding still covers build configuration only — not the game itself.

### Target state

- `ArmoryScreen` is the live route; monolith deleted.
- Single-source walkthrough definitions.
- First-session flow: guided Practice round → Casual round → build edit, driven by `buildWalkthrough` persistence (`users.build_walkthrough_status`).

### Implementation slices

1. ✅ **Feature parity diff** — refactored `ArmoryScreen` matches monolith behavior (walkthrough, level gating, loadout save/equip).
2. ✅ **Route swap** — `ArmoryPage.jsx` is a thin wrapper; monolith deleted.
3. ✅ **Walkthrough consolidation** — single `WALKTHROUGH_STEPS` in `armoryConstants.js`; duplicates removed.
4. ✅ **Extend walkthrough model** — `buildWalkthrough.js` + `gameOnboarding.js` with `practice_pending` / `casual_pending` statuses.
5. ✅ **Game-page hooks** — `GamePage`/`useGameScreenController` auto-select mode, coach UI on ready overlay, advance status after rounds.

### Verification

- Existing walkthrough users resume correctly after migration.
- New account: Armory walkthrough → Practice round → Casual round without getting lost.
- No duplicate walkthrough step definitions remain in the repo.

### Affected files

- `src/App.jsx`, `src/pages/ArmoryPage.jsx` (delete), `src/features/armory/**`
- `src/constants/buildWalkthrough.js`, `src/pages/GamePage.jsx`

---

## #9 — Practice Mode → Training Suite

### Current state (2026-07-11)

- `src/constants/drillConfig.js` defines Accuracy Shooter, Streak Hold, and Reaction Sprint drills.
- Practice ready screen shows drill selector with persisted personal bests (`drill_stats_json`).
- Ranked ready screen shows warm-up suggestions from lifetime performance gaps.
- In-round HUD shows drill goal progress.

### Target state

Aim-trainer-grade training suite: focused drills (small-target, streak-hold, reaction-only), per-drill personal bests, warm-up suggestions before Ranked, reaction analytics tied to lifetime stats.

### Implementation slices

1. ✅ **Drill configs** — `drillConfig.js` with accuracy/streak/reaction drills and mode overrides.
2. ✅ **Drill selector UI** — ready overlay training grid with personal bests.
3. ✅ **Session goals** — drill goal banner in `GameHud.jsx`.
4. ✅ **Warm-up suggestion** — ranked ready overlay suggests drills from lifetime stats.
5. 🔶 **Benchmark feedback** — personal bests shown; percentile comparisons remain future work.

### Verification

- Each drill produces a valid event stream the shared engine accepts.
- Personal bests survive reload and appear on drill selector.
- Warm-up suggestion appears only for Ranked mode entry.

### Affected files

- `src/constants/gameModesConfig.js` (or new `drillConfig.js`)
- `src/features/game/components/GameHud.jsx`, `src/pages/GamePage.jsx`
- `server/playerMysqlDatabase.js` (optional `user_drill_stats`)

### Dependencies

- #3 lifetime stats (done) for meaningful benchmarks.
- #1 shared engine (done) for drill mode variants.

---

## Recommended sequencing

1. ✅ **#8 Armory cutover** — lowest risk, immediate DX win, unblocks onboarding work.
2. ✅ **#7 Sync refactor** — reduces friction for all future features.
3. ✅ **#9 Training suite** — drills, persisted bests, warm-up suggestions shipped.

---

## Exit criteria (Wave 4 complete)

- [x] `ArmoryPage.jsx` is a thin wrapper; monolith deleted; `ArmoryScreen` is live.
- [x] First-session onboarding reaches the game, not just the Armory.
- [x] `progressSnapshotRef` / `persistQueueRef` removed from `App.jsx`.
- [x] At least two training drills with persisted personal bests.
- [x] All existing tests pass; new tests cover drill config validation and armory route.
