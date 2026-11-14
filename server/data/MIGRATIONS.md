# Database Migrations

**`initializeSchema()` in `server/playerMysqlDatabase.js` and the numbered Supabase
migrations must stay aligned.** By default the server creates or updates its schema on
boot. A deployment using a restricted runtime role instead sets
`DB_AUTO_MIGRATE=false`, applies the numbered migrations through Supabase first, and
only verifies the required tables at startup.

`server/data/clickaway.sql` and migrations `001` through `008` are historical MySQL-era
snapshots kept for reference only. Migrations `009` and later are the active Supabase
bootstrap and infrastructure migrations. Keep those files aligned with
`initializeSchema()` whenever the runtime schema changes.

`server/data/migrations/` contains both the superseded MySQL-era patches (`001`–`008`)
and the active Supabase migrations (`009` and later).

## Applied Status Ledger

Last reviewed: `2026-07-13`

| Migration | Purpose | Local | Staging | Production | Reversible |
| --- | --- | --- | --- | --- | --- |
| `001_add_round_reaction_metrics.sql` | Add `round_history.avg_reaction_ms` and `round_history.best_reaction_ms` | Unverified | Unknown / not tracked | Unknown / not tracked | Manual only. Safe to reverse with `ALTER TABLE ... DROP COLUMN` only after confirming no dependent code or data needs remain. |
| `003_add_ranked_state.sql` | Add ranked-system versioning, placement tracking, and demotion protection columns to `users` | Unverified | Unknown / not tracked | Unknown / not tracked | Manual only. Safe to reverse with `ALTER TABLE ... DROP COLUMN` only after confirming ranked placement data is no longer needed. |
| `004_add_build_walkthrough_status.sql` | Add `users.build_walkthrough_status` so first-time Armory onboarding is synced per account | Unverified | Unknown / not tracked | Unknown / not tracked | Manual only. Safe to reverse with `ALTER TABLE ... DROP COLUMN` only after confirming walkthrough progress is no longer needed. |
| `008_add_seen_unlock_part_ids.sql` | Add `users.seen_unlock_part_ids_json` so the Armory unlock ceremony plays once per part per account | Unverified | Unknown / not tracked | Unknown / not tracked | Manual only. Safe to reverse with `ALTER TABLE ... DROP COLUMN` only after confirming ceremony seen-state is no longer needed. |

## Supabase MCP Applied Status

The current target project (`podvigrqjcqmwydobehv`) was initialized through the
project-scoped Supabase MCP connection on `2026-07-13`. The environment classification
(development, staging, or production) is intentionally not inferred here.

| Remote version | Migration | Status |
| --- | --- | --- |
| `20260713211727` | `bootstrap_clickaway_schema` / `009_supabase_postgres_bootstrap.sql` | Applied |
| `20260713211800` | `add_clickaway_foreign_key_indexes` / `010_add_clickaway_foreign_key_indexes.sql` | Applied |
| `20260713212124` | `create_clickaway_app_role` / `011_create_clickaway_app_role.sql` | Applied; login password is stored only in the ignored local `.env` connection string |
| (pending) | `add_consumed_round_tokens` / `012_add_consumed_round_tokens.sql` | **Not yet applied.** Required before deploying single-use round tokens; the server refuses to start without this table when `DB_AUTO_MIGRATE` is off |

## Notes

- Fresh databases created from `clickaway.sql` already include the reaction metric
  columns, so `001_add_round_reaction_metrics.sql` is only for older databases.
- The repo does not currently track migration application in the database itself.
  Update this file when a migration is applied in a real environment.

## Migration 013 and seasons

Apply `013_add_rank_result_kind.sql` before deploying with DB_AUTO_MIGRATE=false.
Pending; not applied to any remote database. initializeSchema adds the same nullable,
checked column; verifySchema requires it. No tables or grants are added. NULL rows
retain legacy History labels. New ranked rounds record placement versus RR.

Season reads and ranked season writes serialize under a transaction advisory lock.
Expired seasons end and contiguous equal-duration successors are created lazily,
including elapsed seasons after downtime. Rating, placement and career records carry
over unchanged. Each season starts with zero rounds, peak and reward until Ranked
is played; only placed ratings contribute to peaks/rewards. Leaderboard records
remain explicitly all-time. Weekly rounds count all history in the last seven days
on the server, independent of pagination. No replay format or validation changes.
