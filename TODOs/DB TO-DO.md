# DB TO-DO

Prioritized backlog based on the current MySQL schema file, backend DB access layer, backend-to-app mapping code, and frontend consumers. The ideas below are intentionally smaller and easier to understand for an entry-level development class. No changes were made to the DB layer as part of this audit.

Current baseline notes:
- The main schema source found is `server/data/clickaway.sql`.
- No migration framework or versioned migration files were found.
- The main DB access and mapping paths are `server/db.js`, `server/playerStateStore.js`, and `server/shopItemMap.js`.

## 1. Rename legacy `profile_theme` DB terminology to `profile_image`
Priority: High

Affected: `server/data/clickaway.sql` (`current_profile_theme_id`, `user_collection.item_type` check), `server/shopItemMap.js`, `server/db.js`

Issue: The frontend mostly says `profile_image`, but the schema still says `profile_theme` in a few important places. Matching the names would make the project easier for students to follow.

Prompt:
```text
Perform a small rename from `profile_theme` to `profile_image` across the MySQL schema and backend mapping layer. Update the schema, `server/shopItemMap.js`, and `server/db.js`, preserve current app behavior, and keep the change focused on naming clarity.
```

## 2. Store user role directly in the `users` table
Priority: High

Affected: `server/data/clickaway.sql` (`users`), `server/db.js`, `server/index.js`

Issue: Right now the admin role is inferred from the username. Storing role in the database would be easier to explain and safer to maintain.

Prompt:
```text
Add a simple `role` column to the `users` table and update the backend to read and write that stored role instead of inferring it from the username. Preserve the current admin seed flow and keep normal player behavior the same.
```

## 3. Add `created_at` to the `users` table
Priority: High

Affected: `server/data/clickaway.sql`, `server/db.js`

Issue: A created-at timestamp is a small but useful addition for debugging, admin tools, and future profile features.

Prompt:
```text
Add a `created_at` timestamp column to the `users` table with a sensible default. Update inserts and row mapping only as needed, keep current auth behavior unchanged, and avoid unrelated schema changes.
```

## 4. Add `updated_at` to the `users` table
Priority: Medium

Affected: `server/data/clickaway.sql`, `server/db.js`

Issue: An updated-at timestamp makes it easier to see when a player's stored state last changed.

Prompt:
```text
Add an `updated_at` timestamp column to the `users` table and update backend write paths so it changes when user progress or equipment changes. Keep the change incremental and preserve current API behavior.
```

## 5. Make `selectedModeId` a real persisted field
Priority: Medium

Affected: `server/index.js`, `server/db.js`, `src/App.jsx`, `src/app/useAppPlayerState.js`, schema for `users` or a new small preference field

Issue: The app sends `selectedModeId`, but the database-backed model does not really store it. That mismatch is confusing for students reading the full stack.

Prompt:
```text
Make `selectedModeId` persist end-to-end through the backend and database. Prefer a minimal schema change, keep the current frontend behavior working, and avoid a broader settings-system rewrite.
```

## 6. Add DB-level checks for nonnegative progression values
Priority: Medium

Affected: `server/data/clickaway.sql`, tables `users` and `round_history`, relevant write paths in `server/db.js`

Issue: The app code often assumes coins, XP, MMR, hits, and misses will not go below zero. Adding DB checks would make that rule clearer.

Prompt:
```text
Add MySQL-level checks for nonnegative progression values in `users` and `round_history`. Update backend writes only if needed so valid data still saves cleanly, and keep the schema change small and focused.
```

## 7. Stop formatting history display labels in the DB mapper
Priority: Medium

Affected: `server/db.js`, `src/utils/historyUtils.js`, history/profile consumers

Issue: Human-readable labels like `Today` and `Yesterday` are easier to manage on the frontend than inside the DB mapping layer.

Prompt:
```text
Refactor round-history mapping so the backend returns canonical timestamp data and the frontend formats display labels locally. Preserve the current visible behavior and keep the change focused on date formatting responsibilities.
```

## 8. Add a real migration baseline from `clickaway.sql`
Priority: Medium

Affected: `server/data/clickaway.sql`, project scripts/docs, any new migration folder

Issue: The project has one schema file, but not a simple migration story that students can follow step by step.

Prompt:
```text
Create a minimal migration baseline using the current `server/data/clickaway.sql` schema. Add a simple folder or naming pattern for future SQL changes, document how to apply the baseline locally, and keep runtime DB behavior unchanged.
```

## 9. Add a local reset or seed script for the database
Priority: Medium

Affected: `server/data/clickaway.sql`, `package.json`, `README.md` or setup docs

Issue: Students benefit from having one obvious way to rebuild their local database after schema changes.

Prompt:
```text
Add one simple documented script or command flow for resetting and reloading the local MySQL database from `server/data/clickaway.sql`. Keep it safe for local development and avoid changing runtime code unless needed for setup.
```

## 10. Add automated drift checks for achievement IDs and shop item IDs
Priority: Medium

Affected: `server/data/clickaway.sql`, `server/shopItemMap.js`, `src/constants/shopCatalog.js`, `src/game/achievements/evaluateAchievements.js`

Issue: The same IDs appear in SQL, backend code, and frontend code. A small check script would help students catch mismatches early.

Prompt:
```text
Add a lightweight validation script that compares seeded shop and achievement ids across the SQL file, backend mapping code, and frontend definitions. Fail loudly on missing or extra ids, keep runtime behavior unchanged, and expose the check through an npm script.
```

## 11. Stop deleting and reinserting all progress rows on save
Priority: Medium

Affected: `server/db.js`, tables `user_collection`, `round_history`, `user_achievement_progress`

Issue: Rewriting every related row on each save is easy to understand at first, but it is heavier than necessary and makes later improvements harder.

Prompt:
```text
Refactor progress persistence so it no longer deletes and reinserts every collection, history, and achievement row on each save. Use smaller inserts, updates, or upserts where possible, preserve current API behavior, and keep the change focused on the save path.
```

## 12. Remove leftover SQLite references from the database stack
Priority: Low

Affected: `package.json`, `package-lock.json`, any DB setup docs that mention or imply SQLite

Issue: The project uses MySQL, so leftover SQLite references make the stack look more confusing than it really is.

Prompt:
```text
Remove unused SQLite dependencies and clean up related setup notes so the project clearly presents MySQL as the supported database. Do not change runtime MySQL behavior.
```
