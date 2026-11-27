# Plan 016: `GET /api/replays` returns replay summaries without the full click stream

> **Executor instructions**: Read `plans/000-conventions.md` first. Follow this
> plan step by step and run every verification. On a STOP condition, stop and
> report.
>
> **Drift check (run first)**: `git diff --stat 1a307d9..HEAD -- server/playerMysqlDatabase.js src/pages/ChallengesPage.jsx src/services`

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `1a307d9`, 2026-11-27

## Why this matters

`findUserReplays` (`server/playerMysqlDatabase.js:2395-2422`) selects
`events_json` and `loadout_snapshot_json` for up to 25 replays. A replay can hold
hundreds of click events. The list is used by `src/pages/ChallengesPage.jsx`
(lines 146-179 and 448-474) to pick a run to send as a duel. It shows id, mode,
score and visibility. The full replay with events is fetched separately by id
(`GET /api/replays/:replayId`) when someone races it.

## Current state

```js
export async function findUserReplays(userId, { limit = 10 } = {}) {
  const normalizedLimit = Math.max(1, Math.min(25, Math.floor(Number(limit) || 10)))
  const [rows] = await pool.query(
    `SELECT id, user_id AS userId, username, mode_id AS modeId, seed,
       events_json AS eventsJson, loadout_snapshot_json AS loadoutSnapshotJson,
       score, hits, misses, best_streak AS bestStreak, visibility, played_at AS playedAt
     FROM round_replays
     WHERE user_id = ?
       AND loadout_snapshot_json->>'arenaWidth' IS NOT NULL
       AND loadout_snapshot_json->>'arenaHeight' IS NOT NULL
     ORDER BY played_at DESC, id DESC
     LIMIT ?`,
    [userId, normalizedLimit]
  )
  return rows.map(mapReplayRow).filter(Boolean)
}
```

## Steps

### Step 1: Find every consumer of the list

Search the client:
`grep -rn "getReplays\|/api/replays\b\|fetchReplays\|replays\b" src --include=*.js --include=*.jsx | grep -v test`.
Trace each caller of the list endpoint and record which replay fields it reads.

**Verify**: write the list in your NOTES. **If any caller reads `events`,
`seed` or the loadout snapshot from list items** (for example a personal ghost
race that uses list data directly), STOP and report.

### Step 2: Summary query

Add a `mapReplaySummaryRow(row)` that returns `{ id, userId, username, modeId, score, hits, misses, bestStreak, visibility, playedAt }`.
Match `mapReplayRow`'s field normalization (read it). Select only those
columns, and use it in `findUserReplays`. Keep the `WHERE` filter. It also
gates "raceable" replays. If `mapReplayRow` filters out rows using
event-derived checks (for example `isRaceableReplay` needs events), keep an
equivalent check in SQL, or keep selecting the one JSON field it needs. Explain in NOTES.

### Step 3: Tests

Add or update a test that the list items have no `events` key. Find the
existing replay database test (`grep -ln findUserReplays tests`) and follow
its pattern. If plan 011's `tests/integration` exists, add a case there.

**Verify**: `npm run test:unit` → `ℹ fail 0`, and the UI suite passes.

## Scope

**In scope**: `server/playerMysqlDatabase.js` (`findUserReplays` and the new mapper), tests.
**Out of scope**: `GET /api/replays/:replayId`, ChallengesPage behavior.

## Done criteria

- [ ] The list response contains no `events` (test)
- [ ] `npm run lint` and `npm test` exit 0
- [ ] Only in-scope files changed. Committed on `advisor/016-lean-replay-list`

## STOP conditions

- A client caller needs events from the list (Step 1).

## Maintenance notes

Any future feature that needs events must fetch the replay by id.
