# Plan 004: The reaction leaderboard uses reaction times the server derives from the round's events

> **Executor instructions**: Read `plans/000-conventions.md` first. Follow this
> plan step by step and run every verification. On a STOP condition, stop and
> report.
>
> **Drift check (run first)**: `git diff --stat 1a307d9..HEAD -- server/index.js server/roundRewards.js src/game/engine/roundEngine.js server/playerMysqlDatabase.js`

## Status

- **Priority**: P1
- **Effort**: S–M
- **Risk**: MED (touches round completion, the money path)
- **Depends on**: none
- **Category**: security (fair play)
- **Planned at**: commit `1a307d9`, 2026-11-27

## Why this matters

The Ladder page has a "Reaction" board (`src/pages/LeaderboardPage.jsx:50`)
ranked by `user_lifetime_stats.best_reaction_ms`. That value comes straight
from the request body of `POST /api/round/complete`. The server only clamps it
to 0–60000 ms. Any signed-in player can send `bestReactionMs: 0` and take
first place. A comment in `server/index.js` claims these values are
"display-only… never fed into rewards or rank", but the ladder does rank by
them. After this plan, the server computes reaction times from the submitted
event stream. That stream is already geometry-checked by `simulateRound`, so
reaction times become as trustworthy as score.

## Current state

- `server/index.js:627-638`:

```js
// Reaction metrics are client-measured (they depend on button spawn times the
// server cannot reconstruct yet), so they are display-only stats: sanitized to
// plausible bounds and never fed into rewards or rank.
const MAX_REACTION_MS = 60_000
const ROUND_SUBMIT_CLOCK_SLACK_MS = 5_000

function sanitizeReactionMs(value) {
  if (value === null || value === undefined || value === "") return null
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.min(MAX_REACTION_MS, Math.round(n))
}
```

- `server/index.js:798-800` (inside `/api/round/complete`):

```js
    const { hits, misses, score, bestStreak, bullseyes, goldHits } = simulation
    const avgReactionMs = hits > 0 ? sanitizeReactionMs(request.body?.avgReactionMs) : null
    const bestReactionMs = hits > 0 ? sanitizeReactionMs(request.body?.bestReactionMs) : null
```

  These go into `historyEntry` and then into `completeUserRound`, which updates
  `user_lifetime_stats.best_reaction_ms`, `total_reaction_ms` and
  `reaction_rounds` (`server/playerMysqlDatabase.js` around lines 925-951 and 1085-1111).
- Client measurement (`src/features/game/hooks/useGameScreenController.js:1025-1028`):
  reaction = `performance.now()` at the click minus `buttonSpawnedAtRef.current`.
  The spawn ref is set at line 456 when the target appears or moves, and reset
  to 0 at 584, 655 and 1047.
- `simulateRound` (`server/roundRewards.js:137-194`) validates the events and
  replays them with `replayRoundEvents` (`src/game/engine/roundEngine.js:222`).
  It returns `{ valid, hits, misses, score, bestStreak, bullseyes, goldHits, loadoutSnapshot, roundEndMs }`.
  Events are `{ type, t, ... }` objects with `t` in ms since round start, and
  clicks are at least `MIN_CLICK_INTERVAL_MS` apart (`server/roundRewards.js:56`).
- Ladder query filter: `server/playerMysqlDatabase.js:1679-1681`
  (`AND ls.best_reaction_ms IS NOT NULL`).

## Design

Server reaction time for hit *i* = `t(hit i) − t(the event that last spawned or
moved the target)`. In this game the target moves after every hit, and appears
at `t = 0`. A miss does not move it. Confirm this in
`src/game/engine/roundEngine.js`. If misses or powerups also move the target,
use whatever event the engine treats as moving it. The engine replay is the
source of truth, so put the calculation inside the replay summary (or right
beside it in `simulateRound`) and drive it from the same events.

- Return `avgReactionMs` (rounded mean) and `bestReactionMs` (minimum) from
  `simulateRound`, or `null` for both when `hits === 0`.
- `/api/round/complete` uses the simulation's values and ignores the request
  body's `avgReactionMs` and `bestReactionMs`. Keep accepting the fields
  without error, so older clients still work.
- Lifetime stats count reaction only when the round counts toward stats.
  `completeUserRound` already gets `countsTowardStats: Boolean(roundTokenId)`.
  Check that reaction aggregates follow that flag. If they don't, make them.
- Existing `best_reaction_ms` values in `user_lifetime_stats` were
  client-supplied and can't be trusted. There is no run-once mechanism for data
  fixes (a first executor confirmed this), so **don't reset data**. Instead,
  add a new column `user_lifetime_stats.verified_best_reaction_ms int DEFAULT NULL`
  with `addColumnIfMissing` (same style as the reaction columns at about line 246).
  `completeUserRound` writes the server-derived best to both `best_reaction_ms`
  (for Profile display continuity) and `verified_best_reaction_ms`, but only
  when the round counts toward stats. The Reaction ladder
  (`readRankedLeaderboardRows`, its `reactionFilter` and
  `buildLeaderboardOrderClause` for the reaction board, and the
  `bestReactionMs` value it returns) switches to `verified_best_reaction_ms`.
  The board starts empty and fills as players play. Add an entry to
  `server/data/MIGRATIONS.md`. Leave `round_history` rows untouched.
- Update the comment above `sanitizeReactionMs`. Delete `sanitizeReactionMs`
  if nothing uses it any more.

## Scope

**In scope**: `server/index.js`, `server/roundRewards.js`,
`src/game/engine/roundEngine.js` (summary only), `server/playerMysqlDatabase.js`
(the reset step and the reaction aggregate update only), `server/data/MIGRATIONS.md`
(one entry), new test `tests/serverReactionTimes.test.js`, and the slicing tests
listed in `000-conventions.md` if their `ctx` needs updating.

**Out of scope**: the client measurement and its display, the leaderboard UI,
rewards, rank math.

## Steps

### Step 1: Add reaction metrics to the replay summary

**Verify**: `npm run test:unit` → `ℹ fail 0`.

### Step 2: Write `tests/serverReactionTimes.test.js` (model on `tests/bullseye.test.js` or another `simulateRound` test, `grep -ln simulateRound tests`)

Cases:
1. A stream with three hits at known times gives the expected mean and minimum.
2. Zero hits gives `null` for both.
3. Misses between hits don't reset the timer, or do if the engine says misses move the target. Assert whichever the engine does.
4. The route ignores the client values. Add a case to `tests/roundCompletionRoute.test.js` where the body says `bestReactionMs: 0` and the saved history entry has the simulation's value.

**Verify**: `node --test tests/serverReactionTimes.test.js tests/roundCompletionRoute.test.js` → all pass.

### Step 3: Switch the route to the server values, and gate lifetime aggregates on `countsTowardStats`

**Verify**: `npm run test:unit` → `ℹ fail 0`.

### Step 4: Add the one-time reset of lifetime reaction aggregates and a `MIGRATIONS.md` entry

**Verify**: `grep -n "best_reaction_ms" server/playerMysqlDatabase.js` shows the reset statement, and `npm run lint` exits 0.

### Step 5: Full check

**Verify**: `npm test` exits 0.

## Done criteria

- [ ] `grep -n "request.body?.bestReactionMs\|request.body?.avgReactionMs" server/index.js` returns nothing
- [ ] New test file passes, and the route test proves client values are ignored
- [ ] `npm run lint` and `npm test` exit 0
- [ ] Only in-scope files changed. Committed on `advisor/004-server-derived-reaction-times`

## STOP conditions

- The engine replay has no single event that marks a target spawn or move, so
  reaction can't be derived without guessing.
- There is no run-once mechanism for data fixes in `initializeSchema()`.
- The change requires changing the client request shape.

## Maintenance notes

Server reaction times measure event timestamps, not paint time. They will read
a few ms higher than the old client value. That's fine, and the same for
everyone. A scripted client that fabricates a valid event stream can still post
fast times. Plausibility checks are a separate backlog item
(`docs/perfect-app-backlog.md` §2).
