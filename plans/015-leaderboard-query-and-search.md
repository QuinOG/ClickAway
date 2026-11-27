# Plan 015: Ladder search treats `%` and `_` literally, and each page request computes the ranking once

> **Executor instructions**: Read `plans/000-conventions.md` first. Follow this
> plan step by step and run every verification. On a STOP condition, stop and
> report.
>
> **Drift check (run first)**: `git diff --stat 1a307d9..HEAD -- server/playerMysqlDatabase.js`
> Plan 004 (merged) switched the reaction board to `verified_best_reaction_ms`.
> Re-read `readRankedLeaderboardRows` before editing.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW–MED
- **Depends on**: 004
- **Category**: bug / perf
- **Planned at**: commit `1a307d9`, 2026-11-27

## Why this matters

1. `readRankedLeaderboardRows` (`server/playerMysqlDatabase.js`, about line 1663)
   searches with `WHERE LOWER(username) LIKE ?` and the parameter
   `` `%${normalizedSearch}%` `` (about line 1723). A search for `_` or `%` matches
   every player, because those are LIKE wildcards. Usernames can contain `_`.
2. The function builds a CTE (`ranked_players`, then `ranked_ladder` with
   `RANK() OVER (...)`, then `filtered_ladder`), and runs it in 2–3 separate
   queries per request: the self-rank lookup (about line 1726), the page rows,
   and a `COUNT(*)`. Each one recomputes the window function over every ranked
   player. The page rows and the count can come from one query with
   `COUNT(*) OVER ()`.

## Design

- Escape LIKE input: replace `\` with `\\`, `%` with `\%` and `_` with `\_`,
  and use `LIKE ? ESCAPE '\'`. Put this in a small exported helper,
  `escapeLikePattern(text)`, next to `normalizePaginationLimit`.
- Merge each "rows" query with its following count query: add
  `COUNT(*) OVER () AS totalCount` to the row select, and read `totalCount`
  from the first row. When the page is empty, run the count query as a
  fallback, so a page past the end still reports the real total. Strip
  `totalCount` from returned rows before mapping, or make sure the mapper ignores it.
- Keep the self-rank query as it is (it's a different filter). The result
  shape the route returns must not change.

## Scope

**In scope**: `server/playerMysqlDatabase.js` (only `readRankedLeaderboardRows`
and the new helper), a new test `tests/leaderboardSearch.test.js`, and
`tests/integration/` if plan 011 has landed (add a case there).

**Out of scope**: `LeaderboardPage.jsx`, the route in `server/index.js` or
`server/app.js`, ranking order clauses.

## Steps

### Step 1: `escapeLikePattern` and its unit tests

Cases: `"a_b"` → `"a\\_b"`, `"100%"` → `"100\\%"`, a backslash is doubled, plain text is unchanged.

**Verify**: `node --test tests/leaderboardSearch.test.js` passes.

### Step 2: Use it with `ESCAPE '\'`

In the JS string, write the SQL as `ESCAPE '\\'` so Postgres receives `ESCAPE '\'`.

### Step 3: Merge the row and count queries, with the empty-page fallback

**Verify**: `npm run test:unit` → `ℹ fail 0`. If `tests/integration` exists,
`npm run test:integration` passes, and add a case there: players `a_b` and
`axb`, a search for `_` returns only `a_b`.

### Step 4: Full check

**Verify**: `npm run lint` and `npm test` exit 0.

## Done criteria

- [ ] Search escaping is tested
- [ ] `grep -c "COUNT(\*) OVER ()" server/playerMysqlDatabase.js` ≥ 1
- [ ] `npm run lint` and `npm test` exit 0
- [ ] Only in-scope files changed. Committed on `advisor/015-leaderboard-query-and-search`

## STOP conditions

- Existing tests assert the exact number of queries the leaderboard makes, and the change breaks them in ways that need weakening.

## Maintenance notes

If leaderboard traffic grows, the next step is caching the ranked ladder for a
few seconds. That's out of scope here.
