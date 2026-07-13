# Database Migrations

**`initializeSchema()` in `server/playerMysqlDatabase.js` is the authoritative migration
system.** It runs on every server boot, creates every table with `CREATE TABLE IF NOT
EXISTS`, and adds any missing column with `information_schema`-checked `ALTER TABLE`
statements. Pointing the app at a brand-new, empty database is enough — no manual SQL
needs to be run first or after a deploy.

`server/data/clickaway.sql` and the numbered files below are historical snapshots kept
for reference only. They are not run automatically, they are not required, and they can
drift from the live schema (defaults, constraints, and seed data have already diverged
in places). Do not treat them as the source of truth — read `initializeSchema()` instead.

`server/data/migrations/` contains the incremental patches that existed before
`initializeSchema()` grew the ability to add missing columns itself. They are superseded
by that self-migrating logic and are kept only as a historical record.

## Applied Status Ledger

Last reviewed: `2026-04-05`

| Migration | Purpose | Local | Staging | Production | Reversible |
| --- | --- | --- | --- | --- | --- |
| `001_add_round_reaction_metrics.sql` | Add `round_history.avg_reaction_ms` and `round_history.best_reaction_ms` | Unverified | Unknown / not tracked | Unknown / not tracked | Manual only. Safe to reverse with `ALTER TABLE ... DROP COLUMN` only after confirming no dependent code or data needs remain. |
| `003_add_ranked_state.sql` | Add ranked-system versioning, placement tracking, and demotion protection columns to `users` | Unverified | Unknown / not tracked | Unknown / not tracked | Manual only. Safe to reverse with `ALTER TABLE ... DROP COLUMN` only after confirming ranked placement data is no longer needed. |
| `004_add_build_walkthrough_status.sql` | Add `users.build_walkthrough_status` so first-time Armory onboarding is synced per account | Unverified | Unknown / not tracked | Unknown / not tracked | Manual only. Safe to reverse with `ALTER TABLE ... DROP COLUMN` only after confirming walkthrough progress is no longer needed. |
| `008_add_seen_unlock_part_ids.sql` | Add `users.seen_unlock_part_ids_json` so the Armory unlock ceremony plays once per part per account | Unverified | Unknown / not tracked | Unknown / not tracked | Manual only. Safe to reverse with `ALTER TABLE ... DROP COLUMN` only after confirming ceremony seen-state is no longer needed. |

## Notes

- Fresh databases created from `clickaway.sql` already include the reaction metric
  columns, so `001_add_round_reaction_metrics.sql` is only for older databases.
- The repo does not currently track migration application in the database itself.
  Update this file when a migration is applied in a real environment.
