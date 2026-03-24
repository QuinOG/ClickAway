# DB TO-DO

Prioritized backlog based on the current MySQL schema file, backend DB access layer, backend-to-app mapping code, and frontend consumers. No changes were made to the DB layer as part of this audit.

Current baseline notes:
- The only schema source found is [`server/data/clickaway (3).sql`](/c:/Users/Quinlan/Clickaway/server/data/clickaway%20(3).sql).
- No migration framework or versioned migration files were found.
- The main DB access and mapping paths are [`server/db.js`](/c:/Users/Quinlan/Clickaway/server/db.js), [`server/playerStateStore.js`](/c:/Users/Quinlan/Clickaway/server/playerStateStore.js), and [`server/shopItemMap.js`](/c:/Users/Quinlan/Clickaway/server/shopItemMap.js).

## 1. Prevent stale full-state progress overwrites
Priority: High

Affected: `server/index.js` (`PUT /api/progress`), `server/db.js` (`saveUserProgress`), `src/App.jsx` (`persistProgress`), tables `users`, `user_collection`, `round_history`, `user_achievement_progress`

Issue: The frontend sends large progress snapshots, while shop purchase/equip operations update overlapping state through separate endpoints. A delayed `/api/progress` request can overwrite newer DB state with stale coins, inventory, equipment, history, or achievements because the server currently re-saves the merged full model.

Prompt:
```text
Refactor the progress sync path so stale client snapshots cannot overwrite newer database state. Update `src/App.jsx`, `server/index.js`, and `server/db.js` so `/api/progress` supports field-aware partial updates and leaves omitted fields untouched end-to-end. Preserve the current response shape for callers, keep existing app behavior, and adapt mapping/helpers instead of forcing broad frontend rewrites.
```

## 2. Stop deleting and reinserting all progress rows on save
Priority: High

Affected: `server/db.js` (`syncUserCollection`, `syncRoundHistory`, `syncUnlockedAchievements`), tables `user_collection`, `round_history`, `user_achievement_progress`

Issue: Saving progress currently deletes and recreates entire collections, history, and unlocked-achievement sets. That is heavier than necessary, resets row identity, rewrites `unlocked_at`, and increases the blast radius of every progress save.

Prompt:
```text
Refactor `server/db.js` so progress persistence no longer deletes and reinserts every `user_collection`, `round_history`, and `user_achievement_progress` row on each save. Use targeted diff, append, or upsert logic instead. Preserve existing API behavior, keep current caller contracts stable, and avoid changing unrelated gameplay logic.
```

## 3. Add a real migration baseline and versioned migration flow
Priority: High

Affected: `server/data/clickaway (3).sql`, project scripts/docs, any new migration runner location

Issue: The project has a schema dump but no repeatable migration/versioning strategy. That makes schema changes, environment setup, roll-forward fixes, and rename work much harder to audit and apply safely.

Prompt:
```text
Introduce a minimal versioned migration workflow for the MySQL schema. Convert the current schema dump into a baseline migration, add a small migration runner or documented execution flow, and wire it into project scripts or docs as needed. Keep runtime DB access unchanged in this task except where required to support repeatable schema setup.
```

## 4. Rename legacy `profile_theme` DB terminology to `profile_image`
Priority: High

Affected: `server/data/clickaway (3).sql` (`current_profile_theme_id`, `user_collection.item_type` check), `server/shopItemMap.js`, `server/db.js`

Issue: The frontend and catalog use `profile_image`, but the backend and schema still use `profile_theme` naming in key places. The mismatch is currently papered over by custom mapping logic, which makes the schema and code harder to follow and easier to break.

Prompt:
```text
Perform an incremental rename from `profile_theme` to `profile_image` across the MySQL schema, seed SQL, and backend mapping layer. Update `server/shopItemMap.js` and `server/db.js` accordingly, preserve current app behavior, and add a short compatibility shim only if it is needed to avoid breaking existing callers during the transition.
```

## 5. Add automated drift checks for achievement IDs and shop item IDs
Priority: High

Affected: `server/data/clickaway (3).sql`, `server/shopItemMap.js`, `src/constants/shopCatalog.js`, `src/game/achievements/achievementsList.js`

Issue: Shop IDs and achievement IDs are manually synchronized across SQL seed data, backend maps, and frontend definitions. The current setup works, but drift would be easy to introduce and hard to catch early.

Prompt:
```text
Add a lightweight validation script or test that compares the seeded IDs in `server/data/clickaway (3).sql` against `server/shopItemMap.js`, `src/constants/shopCatalog.js`, and `src/game/achievements/achievementsList.js`. Fail loudly on missing or extra IDs, keep runtime behavior unchanged, and expose the check through an npm script.
```

## 6. Make `selectedModeId` a truthful part of the persisted model
Priority: Medium

Affected: `server/index.js`, `server/db.js`, `src/App.jsx`, `src/app/useAppPlayerState.js`, schema for `users` or a new preference field/table

Issue: The backend accepts `selectedModeId` in the progress payload, but it is not stored in MySQL and is always rebuilt as the default value. That is a contract mismatch between the app model and the DB-backed model.

Prompt:
```text
Make `selectedModeId` round-trip correctly through the backend and database. Prefer a minimal persistence change over removing the field, update the schema plus `server/index.js` and `server/db.js`, and adapt the frontend session/app-state mapping so callers keep working without behavioral regressions.
```

## 7. Stop formatting history display labels in the DB mapper
Priority: Medium

Affected: `server/db.js` (`buildHistoryEntry`, date formatting helpers), `src/utils/historyUtils.js`, history/profile/leaderboard consumers

Issue: The server currently formats human-readable `playedAt` strings like `Today` and `Yesterday`. That mixes presentation into the DB mapping layer and can produce timezone/locale mismatches between server and client.

Prompt:
```text
Refactor round-history mapping so the backend returns canonical timestamp data and the frontend owns human-readable date formatting. Preserve current UI behavior by updating frontend history helpers to derive display labels locally, keep `playedAtIso` stable, and avoid breaking existing pages during the transition.
```

## 8. Add DB-level constraints for nonnegative progression values
Priority: Medium

Affected: `server/data/clickaway (3).sql`, tables `users` and `round_history`, relevant write paths in `server/db.js` and `server/playerStateStore.js`

Issue: Application code clamps negative values for many numeric fields, but the schema does not enforce those invariants. Invalid negative values could still be written through future code paths, manual SQL, or migration mistakes.

Prompt:
```text
Add MySQL-level constraints for nonnegative progression fields in `users` and `round_history`, including coins, XP, MMR, hits, misses, streak, and reward totals where appropriate. Update backend writes only as needed so valid data still saves cleanly, and keep the change incremental without redesigning the schema.
```

## 9. Store user role explicitly instead of inferring it from username
Priority: Medium

Affected: `server/data/clickaway (3).sql` (`users`), `server/db.js` (`mapUserRow`, `createUser`), `server/index.js` (`seedAdminAccount`, auth payload building)

Issue: The backend currently derives `role` by comparing the username to `ADMIN_USERNAME`. That makes role assignment environment-dependent and keeps authorization state out of the schema entirely.

Prompt:
```text
Add an explicit `role` column to `users` with a constrained value set, migrate existing users so the configured admin stays admin, and update `server/db.js` plus `server/index.js` to read and write the stored role instead of inferring it from the username. Preserve current signup/login behavior.
```

## 10. Replace the mock leaderboard with a DB-backed read path
Priority: Medium

Affected: `server/db.js`, `server/index.js`, `src/services/api.js`, `src/pages/LeaderboardPage.jsx`, `src/features/leaderboard/leaderboardData.js`, tables `users` and `round_history`

Issue: The leaderboard UI is still backed by mock rows plus local-player stats. Persisted MMR and ranked history are already in MySQL, but there is no read API that turns that data into an app-facing leaderboard shape.

Prompt:
```text
Implement a read-only `/api/leaderboard` endpoint backed by MySQL and replace `MOCK_LEADERBOARD` usage with the API response. Build the query from persisted `users` and ranked `round_history` data, add only the indexes needed for the query, and preserve the current page behavior and row shape as closely as possible.
```

## 11. Consolidate overlapping player-state and progress DTO mappings
Priority: Medium

Affected: `server/db.js`, `server/playerStateStore.js`, `src/app/useAppPlayerState.js`

Issue: The backend exposes overlapping but different shapes for auth/progress responses and shop/player-state responses, and the frontend keeps separate adapters for them. That duplication increases the chance of silent shape drift.

Prompt:
```text
Consolidate the backend-to-frontend player DTO mapping so auth, progress, and shop endpoints share one clear contract or one explicit adapter layer. Update `server/db.js`, `server/playerStateStore.js`, and `src/app/useAppPlayerState.js`, preserve current app behavior, and adapt mapping layers instead of breaking existing callers.
```

## 12. Remove leftover SQLite references from the database stack
Priority: Low

Affected: `package.json`, `package-lock.json`, any DB setup docs that mention or imply alternative runtimes

Issue: The runtime database layer is MySQL-only, but `better-sqlite3` is still listed as a dependency even though no SQLite usage was found in the codebase. That makes the DB stack look less settled than it is.

Prompt:
```text
Remove unused SQLite dependencies and clean up any related DB setup/docs so the project clearly presents MySQL as the supported runtime database. Do not change runtime behavior or the current MySQL connection flow.
```
