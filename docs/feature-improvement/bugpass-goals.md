# Bug pass: daily goals

Scope: daily goals (server award in `completeUserRound`, progress snapshot), the Results additions (goal rows, next-round line, Now affordable, tally) and the lobby goals list. The pass was cut short by the usage limit. Lint, unit (216), vitest (287) and build passed after the fixes. The Playwright layout specs (`zz-device-audit`, `lobby-modes-fit`) were started but not finished, so they are unverified.

| id | risk | severity | status | finding |
|----|------|----------|--------|---------|
| G1 | 7 | low | plan | The lobby goals snapshot reads the UTC day and today's rounds in two separate statements outside a transaction, so a read that straddles midnight pairs yesterday's goals with today's (empty) rounds. |
| G2 | 3 | medium | fixed | After a round that earned no XP (all misses), Results said one more round like it would finish a "Play N rounds" goal, but rounds with no XP never count. |
| G3 | 3 | low | fixed | When the post-save progress read failed, Results could name the goal the round had just finished as still one round away. |
| G4 | 1 | low | fixed | The Results tally said "1 hits", "1 misses" and "1 bullseyes". |

Checked and found sound: payment happens once under the user-row lock with the round token claim, the round is stored at the transaction's `now()` so a save that crosses midnight is checked and stored on the same day, Practice and unverified rounds earn no XP and so pay no goals, goal text and coins come from the same `DAILY_GOAL_REWARDS` the server credits, the countdown uses epoch time (no timezone issue), and Now affordable skips owned, built-in and free items (the shop has no level locks).

## Plan G1: one clock for the goals snapshot (risk 7, DB query)

1. In `getTodaysDailyGoalRounds` (server/playerMysqlDatabase.js), read the day key once, then filter rows by explicit bounds built from that key (`played_at >= ?::timestamptz AND played_at < ?::timestamptz` with `${dayKey}T00:00:00Z` and the next day), not by a second `now()`.
2. Keep `TODAY_UTC_WINDOW` for `hasXpRoundToday`; inside `completeUserRound` both forms give the same day because the transaction's `now()` is fixed.
3. Test: a pg-mock test where the clock query returns day D and the row query receives D's bounds; run the existing daily goals and daily bonus tests.
4. Impact today is small: the client shows the "New goals are ready" note until the next read, because `resetsAt` has already passed.
