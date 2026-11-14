# Feature catalogue

One reviewer per feature. "Yield" lists accepted findings per run (high/med/low). Split a feature that keeps yielding high-severity findings; rest one that yields nothing two runs in a row (unless its code changed).

| Feature | Scope (files) | Yield by run |
|---|---|---|
| **Live round** | `src/features/game/hooks/useGameScreenController.js` (live-round parts), `src/features/game/components/` (HUD, arena, feedback), `src/game/engine/` (roundEngine, roundGeometry), `src/constants/gameConstants.js`, `src/constants/buildcraft.js` (power-ups, buildRoundRules) | r3: 2H 1M · r5: 3M |
| **Round saving and rewards** | requestRoundStart/submitRound in `src/services/clickAwayHttpApiClient.js`, round start/submit and roundSave parts of the controller, `src/app/usePlayerProgressionUpdates.js`, `src/app/progressResponseGuard.js`, `server/roundRewards.js`, `server/roundToken.js`, `/api/round/*` in `server/index.js`, completeUserRound and stats/achievements in `server/playerMysqlDatabase.js`, migration 012, `src/utils/rankUtils.js`, `src/utils/roundRewards.js`, `src/utils/lifetimeStatsUtils.js` | r3: 1H 2M 1L · r4: 1H 3M · r5: 1H 3M (paired) |
| **Lobby and Results** | `src/features/game/components/roundOverlays/`, lobby components, `src/pages/GamePage.jsx`, the controller's phase/overlay props, `src/constants/gameModesConfig.js`, drills | r3: 1H 2M · r5: 2M |
| **Armory builds** | `src/features/armory/` (bays, parts, power-up keys, bench, swap report), `src/features/buildcraft/`, `src/pages/ArmoryPage.jsx`, `src/constants/buildcraft*.js`, `src/app/useProgressSync.js`, PUT `/api/progress`, the loadout parts of the DB | r3: 2M 1L · r5: 1M 2L |
| **Armory tools** | Spec Sheet, Compare, Unlock Wall, Test Range (`ArmoryTestRange.jsx`, `useArmoryRangeRound`), walkthrough, unlock ceremony, `src/utils/unlockWallUtils.js`, `armorySpecRatings.js`, `armoryExactMetrics.js` | r3: 3M · r5: 2M 1L |
| **Shop** | `src/features/shop/`, `src/pages/ShopPage.jsx`, `src/app/useShopActions.js`, `src/utils/shopUtils.js`, `server/playerStateStore.js`, `server/serverShopCatalogIdMappings.js`, purchase/equip endpoints and collection code | r3: 1H 1M · r5: 2M |
| **Login and session** | `src/pages/LoginPage.jsx`, `src/pages/SignupPage.jsx`, `src/components/auth/`, `src/app/useAuthSession.js`, auth parts of the API client, `server/auth.js`, `server/validation.js`, auth endpoints, requireAuth, rate limiters | r3: 1H 2M · r5: 1H 2M |
| **Profile and achievements** | `src/pages/ProfilePage.jsx`, `src/components/achievements/`, `src/components/ShellIdentityPass.jsx`, `src/game/achievements/`, `src/app/useAchievementSync.js`, achievement persistence | r3: 2M 1L · r5: 1M 1L |
| **Ladder** | `src/pages/LeaderboardPage.jsx`, `src/features/leaderboard/`, `src/components/PlayerHoverCard.jsx`, `src/utils/rankUtils.js` (display), `src/utils/seasonUtils.js`, leaderboard/season endpoints and queries | r3: 3M 1L · r5: 1M 2L |
| **Duels** | `src/pages/ChallengesPage.jsx`, the ghost/challenge parts of `src/features/game/`, GamePage duel routing, challenge/replay endpoints, `/api/round/start` challenge branch, challenge/replay DB functions | r3: 1H 1M 1L · r5: 2M |
| **History** | `src/pages/HistoryPage.jsx`, `src/features/history/`, `src/utils/historyUtils.js`, `src/utils/gameModeLabelsAndRankedFilters.js`, `/api/history`, history mapping | r3: 3M · r5: 2M 1L (+1 deferred) |
| **Help, menus and settings** | `src/pages/HelpPage.jsx`, `src/features/help/`, `src/components/Navbar.jsx`, shell/settings components, `src/app/` (except auth, sync, round and shop hooks), `src/App.jsx`, `src/main.jsx`, feedback preferences and service | r3: 2M 2L · r5: not reviewed (usage limit) |

Runs 1–2 used six broad features (round loop, Armory, Shop, Login/Profile, Ladder/Duels, History/Help/menus) at medium reasoning. Run 1 found 46 (37 accepted), run 2 found 17 (16 accepted).
