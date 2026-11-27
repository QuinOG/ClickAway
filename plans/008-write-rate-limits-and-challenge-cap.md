# Plan 008: Every write route is rate limited, and a player can't flood another player's duel inbox

> **Executor instructions**: Read `plans/000-conventions.md` first. Follow this
> plan step by step and run every verification. On a STOP condition, stop and
> report.
>
> **Drift check (run first)**: `git diff --stat 1a307d9..HEAD -- server/app.js server/index.js server/playerMysqlDatabase.js src/app/usePendingDuelCount.js`
> Routes live in `server/app.js` after plan 011. If that file doesn't exist, STOP.

## Status

- **Priority**: P1
- **Effort**: S–M
- **Risk**: MED (limits that are too tight block real players)
- **Depends on**: 011
- **Category**: security
- **Planned at**: commit `1a307d9`, 2026-11-27

## Why this matters

Only signup and login (`authRateLimiter`, 20 per 15 min) and
`/api/round/start|complete` (`roundRateLimiter`, 120 per 5 min) are rate
limited. `POST /api/challenges`, `POST /api/challenges/:id/respond`,
`POST /api/shop/purchase`, `POST /api/shop/equip`, `PUT /api/progress`
and `GET /api/leaderboard` (an expensive window query) have no limit. Challenge
creation also has no cap on open challenges. One account can create thousands
of pending duels against one opponent, and
`findChallengesForUser` (about line 2572) returns every pending or accepted
challenge to the client, including on each navigation through
`src/app/usePendingDuelCount.js:17`.

## Design

- Rate limiters, created inside `createApp` next to the existing ones and
  keyed by the authenticated user id:
  `keyGenerator: (request) => String(request.auth?.userId ?? request.ip)`.
  Put the limiter **after** `requireAuth` in the route's middleware list, so
  `request.auth` is set. express-rate-limit v8 may warn about a custom key
  generator and IPv6. If it does, use its `ipKeyGenerator` helper for the IP
  fallback.
  - `writeRateLimiter`: 60 per minute, on shop purchase and equip, progress and challenge respond.
  - `challengeCreateLimiter`: 10 per 10 minutes, on `POST /api/challenges`.
  - `leaderboardRateLimiter`: 60 per minute, on `GET /api/leaderboard`.
  - All use `standardHeaders: true, legacyHeaders: false` and the same JSON message shape as the existing limiters.
- Open-challenge cap: before `createChallenge`, count challenges where
  challenger = user and opponent = target and status is pending or accepted.
  If there are 3 or more, return 409
  `{ error: "You already have open duels with this player. Wait for them to finish." }`.
  Also cap a challenger's total open challenges at 20 with a similar message.
  Add a db function `countOpenChallenges({ challengerUserId, opponentUserId })`
  that returns `{ withOpponent, total }`.
- `findChallengesForUser`: add `LIMIT 100` per role, ordered newest first. Read
  the current query, keep its ordering, and make sure "pending for me" items are
  never cut off by "sent" items. If the query is a single UNION, apply the
  limit per branch.

## Revision 2 (2026-11-27). Replaces the `findChallengesForUser` limit.

The first executor stopped, and was right to. The Duels page
(`src/pages/ChallengesPage.jsx`, about line 390) renders every returned row, and
the nav badge (`src/app/usePendingDuelCount.js:17`) counts pending incoming
rows. A list limit could hide duels the player must act on. Sender caps alone
also let many different senders flood one recipient. So:

- **Don't** limit `findChallengesForUser`. Leave it unchanged.
- Keep the three rate limiters and both sender caps (3 open per opponent, 20 open total).
- Add a **recipient cap**. If the opponent already has 50 or more *pending
  incoming* challenges, return 409
  `{ error: "This player has too many open duels right now. Try again later." }`.
  Extend `countOpenChallenges` to also return `opponentPendingIncoming`.
- Tests: add a case where the opponent has 50 pending incoming challenges → a new challenge returns 409.
- Integration tests are discovered by glob (`tests/integration/*.test.js`). There is no `index.js` entry any more.
- `server/app.js` already has the 010, 009 and 007 changes on `improve/integration`. Fast-forward first.

## Scope

**In scope**: `server/app.js`, `server/playerMysqlDatabase.js` (challenge
functions only), `tests/integration/rateLimits.test.js` and
`tests/integration/challengeCap.test.js` (create), and the slicing tests if their
mocked `app.post` signature needs another limiter argument.

**Out of scope**: client UI, limits on auth and round routes, other routes.

## Steps

1. Add the limiters. Integration test: 61 `PUT /api/progress` calls in a minute → the 61st returns 429. **Verify**: `npm run test:integration` passes.
2. Open-challenge cap and per-role list limit. Tests: the 4th challenge to the same opponent returns 409. 21 open challenges to different opponents → the 21st returns 409. **Verify**: passes.
3. **Verify**: `npm run lint`, `npm test` and `npm run test:integration` exit 0.

## Done criteria

- [ ] `grep -c "RateLimiter" server/app.js` shows the three new limiters in use
- [ ] Cap tests pass
- [ ] Only in-scope files changed. Committed on `advisor/008-write-rate-limits-and-challenge-cap`

## STOP conditions

- `createApp` doesn't exist.
- The challenge list query can't be limited without changing what the Duels page shows. Report the query.

## Maintenance notes

The in-memory limiter store resets on restart and isn't shared across
instances. If Railway scales beyond one instance, move to a shared store.
