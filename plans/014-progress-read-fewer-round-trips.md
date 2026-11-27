# Plan 014: A progress read makes fewer sequential database round trips

> **Executor instructions**: Read `plans/000-conventions.md` first. Follow this
> plan step by step and run every verification. On a STOP condition, stop and
> report.
>
> **Drift check (run first)**: `git diff --stat 1a307d9..HEAD -- server/playerMysqlDatabase.js src/app/progressResponseGuard.js`

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED (the shape of every progress payload)
- **Depends on**: 011 (integration tests to catch regressions), 005 (touches the same module)
- **Category**: perf
- **Planned at**: commit `1a307d9`, 2026-11-27

## Why this matters

`buildProgressRecord` (`server/playerMysqlDatabase.js`, about lines 1192-1300)
awaits about 11 queries one after another: the user row, collection, loadouts,
history, achievements, round count, lifetime stats backfill, weekly count,
today's XP round, daily goals and loadout stats. Each one is a network round
trip to Supabase. This runs on every round completion, shop action and settings
save, and after login. The client also schedules a trailing `/api/auth/me`
refresh after mutations (`src/app/progressResponseGuard.js`, about lines 128-149),
which runs the whole thing again.

## Design

- **Measure first.** Add a temporary timing wrapper in a test or script (not in
  production code) that counts queries per `buildProgressRecord` call against
  PGlite. Record the before number in NOTES.
- **Parallelize independent reads.** When `executor` is the **pool** (not a
  transaction connection), independent queries can run concurrently with
  `Promise.all`. A single `pg` client can't run queries concurrently. When
  `executor` is a transaction connection, keep them sequential. Detect this
  explicitly with a parameter, not with duck typing.
  `backfillLifetimeStatsFromHistory` may write. Keep it sequential, and STOP if
  it writes on the pool path in a way that races.
- **Combine trivial counts.** `getRoundHistoryCount`, `getWeeklyRoundCount`
  and `hasXpRoundToday` all scan `round_history` for one user. Replace them with
  one query using `COUNT(*)`, `COUNT(*) FILTER (WHERE played_at >= <week start>)`
  and `bool_or(<today condition>)`. Copy the exact week and day boundary
  expressions from the existing functions.
- **Client trailing refresh.** Read `progressResponseGuard.js`. If the
  mutation response already contains `progress`, skip the trailing
  `/api/auth/me` for that mutation. Keep the refresh when the response lacks
  `progress`. If the trailing refresh exists to reconcile out-of-order
  responses (read the comments), STOP and report instead of changing it.
- Output must be **deep-equal** before and after. Add an integration test that
  seeds a user with history, achievements, loadouts and daily goals, captures
  `buildProgressRecord` output on the old code (save the JSON fixture in the
  test), and compares after the change. Normalize timestamps.

## Revision 2 (2026-11-27)

The first executor found that the trailing `/api/auth/me` refresh is
intentional. `src/app/progressResponseGuard.js:125` explains that response
delivery order and database snapshot order can differ. **Drop the client part
entirely.** Don't touch `progressResponseGuard.js`, and skip Step 4. Do Steps
1, 2, 3 and 5 on the server only. The STOP condition about the trailing
refresh no longer applies.

## Scope

**In scope**: `server/playerMysqlDatabase.js` (`buildProgressRecord` and the
three count helpers), `src/app/progressResponseGuard.js`, and tests (integration
deep-equal test, plus a UI or unit test for the guard).

**Out of scope**: the payload shape, other queries.

## Steps

1. Characterization test and query count, on the unchanged code. **Verify**: `npm run test:integration` passes, and the count is in NOTES.
2. Combine the counts. **Verify**: characterization test passes.
3. Parallelize on the pool path. **Verify**: characterization test passes. Record the new query count and the wall time against PGlite in NOTES.
4. Client trailing refresh. **Verify**: the existing guard tests pass (`grep -ln progressResponseGuard tests`), plus a new case.
5. **Verify**: `npm run lint`, `npm test` and `npm run test:integration` exit 0.

## Done criteria

- [ ] Output deep-equals the pre-change fixture
- [ ] Fewer sequential round trips (numbers in NOTES)
- [ ] Committed on `advisor/014-progress-read-fewer-round-trips`

## STOP conditions

- `buildProgressRecord` is called inside transactions in most paths, so parallelism gains nothing. Then do only step 2 and report.
- The trailing refresh exists for a reason the code comments state.

## Maintenance notes

PGlite is in-process, so timings there understate the gain. The real saving is
in network round trips to Supabase.
