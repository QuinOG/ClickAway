# Moonshot Improvement Reconnaissance

Date: 2026-07-10 (product direction answers folded in same day — see final section)
Scope: full repository inspection (frontend `src/`, backend `server/`, schema, tests, docs). No code was modified.

## Product Snapshot

ClickAway is a full-stack solo reaction/clicking game: React 19 + Vite frontend, Express 5 API, MySQL persistence. Players play Practice/Casual/Ranked rounds against a shrinking, relocating button; earn coins/XP/MMR; buy cosmetics; configure "buildcraft" loadouts (passive modules + active powerups); and track progress via profile, history, achievements, and a top-25 leaderboard.

The architecture is unusually mature in places (httpOnly-cookie JWT sessions, server-side round re-simulation from an event stream, transactional shop purchases, self-migrating schema) and prototype-grade in others (client-only gameplay modifiers the server ignores, a 100-round history blob feeding all stats, a duplicated mid-flight Armory refactor).

---

## Ranked Moonshot Opportunities

### 1. Unified Deterministic Round Engine (server understands loadouts, powerups, and geometry)

- **Current implementation:** The client simulates rounds with full buildcraft rules — `buildRoundRules()` in `src/constants/buildcraft.js` merges Tempo Core / Streak Lens / Power Rig effects (`scoreMultiplier`, `comboStep`, `missPenalty`, size/shrink) into the live mode, and `useGameScreenController.js` implements six active powerups (`time_boost`, `guard_charge`, `combo_surge`, etc.). The server independently re-simulates the round in `simulateRound()` (`server/roundRewards.js`) from a bare `{type, t}` hit/miss event stream using only the base mode from `getDifficultyById(modeId)`.
- **Primary weakness:** The two simulations compute different games. Server-authoritative score/coins/XP/RR ignore every loadout modifier: `scoreMultiplier` is never applied, `combo_surge`'s +4 virtual streak is invisible, `guard_charge`-absorbed misses still reset the server streak and deduct penalty, and Power-Rig-modified `comboStep` diverges the combo math. The in-round HUD and `GameOverOverlay` show one score; the persisted history/leaderboard entry silently records another. The entire buildcraft system is therefore cosmetic at the persistence layer.
- **Moonshot version:** One shared, deterministic round engine consumed by both client and server. The event stream is enriched (powerup activations, loadout snapshot, seeded RNG for button positions/sizes); the server replays the identical simulation and verifies rather than approximates. This makes every displayed number authoritative, makes builds strategically real, and yields a canonical, replayable round artifact.
- **User/business impact:** Eliminates the most trust-destroying class of bug in a progression game (rewards not matching what you saw). Converts buildcraft from "feel" into a real meta, which is the game's main differentiation vector.
- **Architectural implications:** Extract simulation from `useGameScreenController.js` into a pure shared module (the repo already shares `rankUtils.js`/`progressionUtils.js` across client/server, so the pattern exists). Extend `POST /api/round/complete` payload and `round_history` (loadout columns already exist and are unpopulated).
- **Evidence:** `server/roundRewards.js` (`simulateRound` uses raw mode only); `src/features/game/hooks/useGameScreenController.js` lines ~510–700 (`scoreMultiplier`, `COMBO_SURGE_STREAK_BONUS`, `guardActiveUntilMs`); `src/constants/buildcraft.js` (`buildRoundRules`); `src/app/usePlayerProgressionUpdates.js` (submits only `{ modeId, events }`).
- **Risks/dependencies:** Requires careful determinism (no `Date.now()`/`Math.random()` inside the engine); anti-cheat rules must be re-derived per-loadout (max plausible score changes with modules).
- **Priority:** **Highest.** Foundation for opportunities 2, 5, and 6.

### 2. Buildcraft as a Real Progression Meta

- **Current implementation:** Three loadout slots persisted to `user_loadouts`; six powerups gated at levels 4/7/11; all passive modules unlocked at level 1 (`unlockLevel: 1` throughout `PASSIVE_MODULES`). Effects apply client-side only (see #1). No per-build statistics anywhere.
- **Primary weakness:** The game's most original system has almost no progression arc, no persisted consequences, and no feedback loop — players cannot see whether a build performs better, and unlock scaffolding sits unused.
- **Moonshot version:** A full build meta: staged unlocks and rarity tiers for modules, per-build round stats and win-rate analytics (columns `loadout_id`/`tempo_core_id`/… in `round_history` are already defined but never written), build-specific personal bests, suggested builds per mode, and balance telemetry.
- **User/business impact:** Creates the mid/long-term retention loop the game currently lacks; XP levels currently gate almost nothing after level 11.
- **Architectural implications:** Depends on #1 for server-side effect validity; requires populating the dormant loadout columns in `round_history` and aggregate queries.
- **Evidence:** `src/constants/buildcraft.js` (`PASSIVE_MODULES` all `unlockLevel: 1`); `server/data/clickaway.sql` `round_history.loadout_`* columns; explorer confirmed `loadoutSnapshot` is passed to `onRoundComplete` client-side but dropped before submission.
- **Risks/dependencies:** Balance work; depends on #1.
- **Priority:** High (second wave, immediately after #1).

### 3. Lifetime Stats Foundation (kill the 100-round blob)

- **Current implementation:** `POST /api/round/complete` keeps only the last 100 rounds (`slice(0, 100)` in `server/index.js`). Everything downstream — profile stats, history insights, achievement metrics, career reaction stats — is client-computed from that truncated array. Reaction metrics (`avgReactionMs`/`bestReactionMs`) are computed client-side but never sent to the server, even though `round_history.avg_reaction_ms`/`best_reaction_ms` columns exist. A dead client constant `MAX_HISTORY_ENTRIES = 50` and unused `appendHistoryEntry()` add confusion.
- **Primary weakness:** Career-scale features are built on a window that forgets. Achievements like `career-rounds-250` can only ever be satisfied via previously-persisted unlocks or luck; "total coins earned" is really "coins earned in the last 100 rounds"; profile reaction stats go blank after a session reload.
- **Moonshot version:** Server-owned lifetime aggregates (per-user counters and per-mode rollups updated transactionally at round completion), unbounded round history with paginated retrieval, persisted reaction and loadout metadata, and rich analytics: trends over months, percentile comparisons, per-mode breakdowns, session summaries.
- **User/business impact:** Every stats surface (Profile, History, Achievements, Leaderboard hover cards) becomes truthful and durable. This is the difference between a demo and a game people invest hundreds of rounds in.
- **Architectural implications:** New aggregate table(s) or counters on `users`; `GET /api/history?page=` endpoint; achievements re-pointed at counters instead of history scans; client stops receiving the full history blob in every auth response.
- **Evidence:** `server/index.js` (`nextRoundHistory = [...].slice(0, 100)`, `historyEntry` omits reaction fields); `src/utils/historyUtils.js` (`buildCareerReactionStats`); `src/game/achievements/evaluateAchievements.js` (`buildAchievementStats` from `roundHistory`); `src/constants/historyConstants.js` (dead `MAX_HISTORY_ENTRIES`).
- **Risks/dependencies:** Migration/backfill of existing users' aggregates from their retained 100 rounds; independent of #1 but shares the round-completion write path.
- **Priority:** High — co-equal second wave with #2, and a prerequisite for #4's richer boards.

### 4. Leaderboard → Living Competitive Ladder

- **Current implementation:** `GET /api/leaderboard` returns a fixed top-25 by MMR (`findLeaderboardRows({ limit: 25 })` in `server/playerMysqlDatabase.js`). The client "sorts" by re-ordering those same 25 rows. A player outside the top 25 gets a heuristic "Closest to You" panel computed from the visible rows' minimum MMR (`NearMeSection` in `src/pages/LeaderboardPage.jsx`), not their actual rank. No pagination, no time windows, no seasons, no per-mode or per-stat boards, no server-computed self-rank.
- **Primary weakness:** For everyone below rank 25 — i.e., almost all players as the game grows — the leaderboard shows nothing about them. The core competitive surface is a static snapshot.
- **Moonshot version:** Full ladder with server-side rank for every player (`RANK() OVER` on the existing `idx_users_mmr_id` index), windowed "players around you" queries, pagination/search, weekly/seasonal resets with reward tracks, and per-stat boards (best score, streak, accuracy, reaction) backed by #3's aggregates.
- **User/business impact:** Ranked mode's payoff becomes visible to every player, not the top 25. Seasons create recurring re-engagement.
- **Architectural implications:** Query work plus a `seasons` concept touching `users.mmr` lifecycle and `rankedState`; the client page needs a modest rework (it already has skeletons, sorting, standing panels to build on).
- **Evidence:** `server/index.js` `/api/leaderboard` route; `server/playerMysqlDatabase.js` `findLeaderboardRows`; `src/pages/LeaderboardPage.jsx` (`VISIBLE_LEADERBOARD_LIMIT = 25`, `nearMeData` heuristic).
- **Risks/dependencies:** Seasonal MMR resets interact with placement logic in `src/utils/rankUtils.js`; benefits from #3.
- **Priority:** High (raised — see product direction section: with a real playerbase intended, seasons are also the natural chassis for monetizable reward tracks).

### 5. Asynchronous Multiplayer: Ghost Duels and Challenges

- **Current implementation:** None. The game is entirely solo; the only inter-player surface is the leaderboard table.
- **Primary weakness:** A skill-expression game with rankings but no way to directly compete is leaving its core motivation loop unfinished.
- **Moonshot version:** The event stream from #1 doubles as a replay format. Store notable rounds and let players race a "ghost" of a rival's round (their score ticking up in real time on the same seed-generated button sequence), send direct challenges, and spectate top leaderboard rounds. No real-time netcode needed — this is all async replay of validated event logs.
- **User/business impact:** Transforms the product category from "aim trainer with stats" to "competitive game," the single largest differentiation jump available.
- **Architectural implications:** Requires #1 (deterministic seeded simulation) as its literal data format; a `round_replays` store; challenge/inbox endpoints; ghost-rendering layer in `GameArena.jsx`.
- **Evidence:** absence of any social/multiplayer code path in `server/index.js` route list and `src/App.jsx` route tree; event stream already exists (`roundEventsRef` in `useGameScreenController.js`).
- **Risks/dependencies:** Hard dependency on #1; moderation/abuse surface for challenges.
- **Priority:** High (raised — multiplayer is confirmed product intent; still strictly sequenced after #1, which is its data format).

### 6. Ranked Integrity: Verifiable Rounds Instead of Heuristics

- **Current implementation:** Anti-cheat is three heuristics in `simulateRound()`: minimum 80ms between clicks (`MIN_CLICK_INTERVAL_MS`), a per-mode max event count, and an elapsed-time cap (`maxTimeBufferSeconds`). Button positions/sizes are generated client-side with unseeded randomness, so the server cannot verify that any "hit" was geometrically possible.
- **Primary weakness:** A trivially scriptable client can submit a perfect legal-looking event stream (hits every 85ms for the full round) and climb the ranked ladder. For a game whose headline feature is Ranked, integrity is nearly absent.
- **Moonshot version:** Server-issued round tokens with a deterministic RNG seed; the client's button trajectory derives from the seed; submissions include click coordinates; the server replays geometry and rejects impossible hits, plus statistical anomaly screens (reaction-time distributions, inhuman consistency) and rate limits on `round/complete`.
- **User/business impact:** Leaderboard and ranks stay meaningful — a prerequisite for #4 and #5 mattering at all once there are real users.
- **Architectural implications:** Largely the same shared-engine work as #1 (seeded determinism), plus a round-start handshake endpoint.
- **Evidence:** `server/roundRewards.js` (heuristics); `src/features/game/hooks/useGameScreenController.js` (`randomizeButtonPosition` uses local randomness); no round-start endpoint in `server/index.js`.
- **Risks/dependencies:** False positives on legitimate fast players; piggybacks on #1.
- **Priority:** High, bundled with #1's engine work (raised — a real playerbase with monetization makes ladder integrity non-negotiable).

### 7. Progress Sync: From Snapshot Blob to Intentional State Machine

- **Current implementation:** `src/App.jsx` maintains `progressSnapshotRef` (a full client snapshot of coins/XP/MMR/history/loadouts), a manually chained `persistQueueRef` promise queue, and a `sessionEpochRef` guard, pushing whole-snapshot payloads to `PUT /api/progress` — which then discards most fields (`normalizeProgressPayload` accepts only cosmetics/loadouts/mode/walkthrough). `useAchievementSync` persists achievement IDs the server recomputes and ignores. `useShopActions.hasFullProgressPayload()` falls back to optimistic client-side coin deduction on incomplete responses.
- **Primary weakness:** A hand-rolled, epoch-guarded, full-snapshot sync pipeline where the server accepts ~6 of the ~13 fields sent. It works, but it's the app's most fragile and hardest-to-extend seam — every new persisted field must thread through snapshot refs, normalizers, and merge logic on both sides.
- **Moonshot version:** Server-owned state with narrow intent endpoints (equip, select-mode, save-loadout — several already exist), a thin client cache keyed by server responses, offline queueing with retry, and multi-tab consistency. Delete the snapshot/queue machinery from `App.jsx`.
- **User/business impact:** Fewer lost-progress edge cases and "Couldn't save your progress" toasts; dramatically faster feature development for everything above.
- **Architectural implications:** Refactor of `App.jsx`, `useAppPlayerState.js`, `useShopActions.js`; API additions are small since intent endpoints mostly exist.
- **Evidence:** `src/App.jsx` (`persistProgress`, `sessionEpochRef`, `progressSnapshotRef`); `server/index.js` (`normalizeProgressPayload`); `src/app/useAchievementSync.js` (persists ignored IDs); `src/app/useShopActions.js` (optimistic fallback).
- **Risks/dependencies:** Pure refactor risk; touches every page's props.
- **Priority:** Medium — high architectural leverage, low direct user visibility.

### 8. Armory Convergence and First-Session Experience

- **Current implementation:** The live `/armory` route renders `src/pages/ArmoryPage.jsx` (~1,300 lines, monolithic) while a completed refactor — `src/features/armory/components/ArmoryScreen.jsx` + `useArmoryScreenController.js` + shared components — sits unused. Walkthrough step definitions are duplicated in `armoryConstants.js`, `walkthroughSteps.js`, and inline in `ArmoryPage.jsx`.
- **Primary weakness:** A mid-flight refactor frozen in duplication: any Armory change must be made twice or silently diverges. The walkthrough (the game's only onboarding) is welded to the legacy monolith.
- **Moonshot version:** Complete the migration to `ArmoryScreen`, delete the monolith, single-source the walkthrough, then extend onboarding beyond the Armory into a first-session flow (guided first Practice round → first Casual round → first build edit) driven by the existing `buildWalkthrough` persistence.
- **User/business impact:** New-player conversion is the top of every other funnel; today onboarding covers only build configuration, not the game itself.
- **Architectural implications:** Mostly deletion plus route swap in `src/App.jsx`; walkthrough state model (`src/constants/buildWalkthrough.js`, `users.build_walkthrough_status`) generalizes to multi-flow onboarding.
- **Evidence:** `src/App.jsx` lazy-loads `pages/ArmoryPage.jsx`; parallel tree under `src/features/armory/`; triplicated `WALKTHROUGH_STEPS`.
- **Risks/dependencies:** Verifying the refactored screen reaches feature parity before deleting the monolith.
- **Priority:** Medium.

### 9. Practice Mode → Training Suite

- **Current implementation:** Practice is Casual with the timer, rewards, and penalties turned off (`easy` in `src/constants/gameModesConfig.js`). No goals, drills, or feedback beyond the standard game-over stats.
- **Primary weakness:** The mode explicitly designed for improvement gives the player no structure for improving — no target-size drills, no reaction-time benchmarks, no session goals, no comparison to their ranked performance.
- **Moonshot version:** An aim-trainer-grade training suite: focused drills (small-target, streak-hold, reaction-only), per-drill personal bests and percentile feedback, warm-up routines suggested before Ranked, and reaction analytics tied into #3's lifetime stats.
- **User/business impact:** Deepens the skill loop and gives lapsed-ranked players a low-stakes re-entry point; strong differentiation versus generic clicker games.
- **Architectural implications:** New drill configs extend the data-driven `DIFFICULTIES` pattern cleanly; needs #3 for meaningful benchmarks.
- **Evidence:** `src/constants/gameModesConfig.js` (`easy` mode flags); no drill/goal code anywhere in `src/features/game/`.
- **Risks/dependencies:** Scope creep; benefits from #1 (engine variants) and #3 (stats).
- **Priority:** Lower — valuable, but after the foundations.

---

## Strongest Candidate: #1 — Unified Deterministic Round Engine

### Why first

Every other high-value opportunity either depends on it or is undermined without it:

- **Correctness now:** Players are already being shown scores and reward previews the server then silently recomputes differently whenever a loadout or powerup is involved. That is the single worst kind of bug for a progression game — invisible, systemic, and trust-eroding.
- **It rescues the flagship feature:** Buildcraft (#2) is the product's most distinctive system, and today its effects evaporate at the persistence boundary.
- **It is the enabling substrate:** ghost duels/replays (#5) need a deterministic, replayable event format; verifiable anti-cheat (#6) needs seeded geometry; per-build analytics (#2) need the server to understand builds. One engine unlocks all three.
- **The codebase is already halfway there:** the server re-simulates from events, and `rankUtils.js`/`progressionUtils.js`/`buildcraft.js` are already imported by both client and server. This is a completion of an existing architectural bet, not a rewrite against the grain.

### What the transformed experience accomplishes

The number on the game-over screen is the number in your history, on your profile, and on the leaderboard — always. Builds visibly change persisted outcomes, so choosing between a Streak Stabilizer and a Momentum lens becomes a real decision with measurable results. Every completed round becomes a portable, verifiable artifact that can later be replayed, raced against, or audited.

### Affected areas

- `src/features/game/hooks/useGameScreenController.js` — extract scoring/streak/powerup resolution into the shared engine; the hook keeps only presentation state (shake, feedback, overlays, timers-as-UI).
- New shared module (e.g. `src/game/engine/`) — pure, deterministic round simulation consuming `(seed, mode, loadout, events)`.
- `server/roundRewards.js` — `simulateRound` replaced by the shared engine; validation limits become loadout-aware.
- `server/index.js` `/api/round/complete` — accepts enriched payload (loadout snapshot, powerup activation events, seed/round token); populates the dormant `round_history.loadout_`* and reaction columns.
- `src/app/usePlayerProgressionUpdates.js` — submit the enriched payload it already receives and currently drops.
- `server/playerMysqlDatabase.js` — write/read the newly populated columns.

### Pre-implementation investigation

1. **Divergence inventory:** enumerate every client-side rule not in `simulateRound` (score multiplier, combo surge, guard, Power Rig charge cadence, `comboStep`/`missPenalty` overrides) and define its canonical event representation.
2. **Determinism audit of the controller:** find all `Math.random()`, `Date.now()`, and `performance.now()` uses that leak into scoring-relevant state; decide the seedable RNG and timebase.
3. **Powerup event semantics:** decide whether activations are client-reported events the server validates against charge rules, or server-granted at simulation time (the former preserves current feel).
4. **Validation envelope per loadout:** recompute max-plausible score/event ceilings as functions of the build, replacing the flat per-mode caps.
5. **Compatibility window:** how old clients' bare `{modeId, events}` submissions are handled during rollout (dual-accept vs forced refresh).
6. **Test baseline:** extend `tests/buildcraft.test.js` and add engine golden-file tests (fixed seed + event log → exact expected outcome) before any swap.

### Independently verifiable slices

1. **Extract the pure engine** from `useGameScreenController` with zero behavior change; client consumes it; golden-file tests lock its outputs. (Verify: existing gameplay identical; tests pass.)
2. **Server adopts the engine for base modes** — replace `simulateRound` internals with the shared engine, still ignoring loadouts. (Verify: identical results on a corpus of recorded event streams.)
3. **Enrich the submission payload** — send loadout snapshot + reaction metrics; persist them into the existing dormant columns; History/Profile display them. (Verify: DB rows populated; profile reaction stats survive reload.)
4. **Server applies passive modules** — loadout-aware scoring server-side; client and server totals now match for passive-only builds. (Verify: end-to-end equality assertion in an integration test.)
5. **Powerup activation events** — add activation events with server-side charge-legality validation; full parity for active powerups. (Verify: guard/surge rounds persist the same score the overlay showed.)
6. **Seeded round tokens** — server issues seed at round start; button geometry derives from it; groundwork for replays and geometric validation. (Verify: same seed + events reproduce the identical round in a headless replay.)

---

## Product Direction (answers received 2026-07-10)

The three open questions were answered by the owner:

1. **Multiplayer: in scope.** ClickAway is intended to have a real playerbase and should feel multiplayer, not solo.
2. **Monetization: desired.** Real-playerbase growth with monetization routes is the goal.
3. **Armory refactor destination: unknown to the owner.** No recorded intent for where the `ArmoryScreen` cutover was headed.

### Consequences for the ranking

The top candidate does not change — it gets stronger. A real playerbase with money involved makes the deterministic engine (#1) mandatory rather than merely foundational: multiplayer (#5) needs it as the replay/ghost data format, and monetized competition is indefensible without verifiable rounds (#6). Three priorities were raised in place above: **#4 Leaderboard/seasons → High**, **#5 Async multiplayer → High**, **#6 Ranked integrity → High**.

### Monetization readiness notes

The repo already contains the correct monetization substrate, which shapes where money can safely attach:

- **Cosmetics are the natural storefront.** The shop is cosmetic-only, server-priced, and transactionally validated (`server/playerStateStore.js`, `server/serverShopCatalogIdMappings.js`) — the right foundation for premium cosmetics or a premium currency alongside coins. Keeping buildcraft (gameplay-affecting) out of paid paths avoids pay-to-win in a skill game.
- **Seasons (#4) are the recurring-revenue chassis.** A seasonal ladder with a free/premium reward track is the standard model for this genre and reuses the existing rank/placement machinery in `src/utils/rankUtils.js`.
- **Prerequisites before charging money:** account durability (#3 lifetime stats — paying users must never see stats vanish past 100 rounds), ladder integrity (#6), and an email/recovery story for accounts (current auth is username+password only, `server/auth.js` — no recovery path exists; this becomes a hard requirement once purchases are attached to accounts).

### Revised sequencing

1. **Wave 1 — Engine + integrity (#1, #6):** shared deterministic simulation, enriched submissions, seeded round tokens. Everything else stands on this.
2. **Wave 2 — Durable identity (#3, #2):** lifetime aggregates, unbounded history, per-build stats, achievement counters. Makes accounts worth investing in.
3. **Wave 3 — Competition + social (#4, #5):** full ladder with seasons, then ghost duels/challenges built on the replay format from Wave 1. This wave is where the "multiplayer feel" lands and where a season pass becomes sellable.
4. **Ongoing/parallel — #7 (sync refactor), #8 (armory convergence), #9 (training suite)** as capacity allows; #8's onboarding half rises in importance the moment user acquisition starts.

### Armory refactor disposition (question 3)

Since the original destination is unknown, the recommendation is to treat the refactored tree as the destination: `src/features/armory/` (`ArmoryScreen.jsx` + `useArmoryScreenController.js` + shared components) matches the structure every other feature uses (`src/features/game/`, `src/features/shop/`, `src/features/history/`), while the live `src/pages/ArmoryPage.jsx` monolith matches nothing else in the codebase. Before cutover, diff the two implementations for feature parity (walkthrough behavior, URL state via `useArmoryUrlState.js`, level gating) — then swap the route in `src/App.jsx` and delete the monolith and the duplicated walkthrough step definitions.