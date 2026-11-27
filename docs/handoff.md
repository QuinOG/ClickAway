# Handoff: improve run (2026-11-27)

**Status:** finished. 22 of 23 plans are merged into the local branch
`improve/integration` (tip `3b2d4a9`). Plan 022 (route-scoped CSS) is BLOCKED.
`plans/README.md` has the per-plan status.

**Verified on `improve/integration`:** lint, build, 29 integration tests, 324
unit tests, 419 UI tests. Twelve browser tests failed before this run started
and still fail. They are not covered by any plan.

**Open decisions for the owner:**
- Merge or PR `improve/integration` into `main`.
- Plan 022: drop it, or do the CSS override cleanup first.
- Ranked forfeits during placement earn the zero-round placement points (2). Should they score 0 instead?
- Whether the RSI skill should save raw captures to `raw/`, and which cleanup option to use for the existing screenshots (see `docs/ui-polish/README.md`).

**Operator actions after merge:**
- Set `DB_SSL_MODE=verify` and `DB_SSL_CA`, and remove `sslmode` from `SUPABASE_DB_URL`.
- Run the SQL in `server/data/MIGRATIONS.md` if `DB_AUTO_MIGRATE=false`.
- Mark the CI `checks` job as required.
- Railway now health-checks `/api/health/ready`.
- Remove the legacy-token fallback in `requireAuth` 7 days after deploy.
