# Plan 007: `/api/health` reports database reachability, and the server shuts down cleanly on SIGTERM

> **Executor instructions**: Read `plans/000-conventions.md` first. Follow this
> plan step by step and run every verification. On a STOP condition, stop and
> report.
>
> **Drift check (run first)**: `git diff --stat 1a307d9..HEAD -- server/index.js server/app.js server/db/pgPool.js`
> Plan 011 moved the routes into `server/app.js` (`createApp`), and
> `server/index.js` now only starts the server. Work against that layout. If
> `server/app.js` does not exist, STOP (011 has not landed).

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: 011
- **Category**: ops / correctness
- **Planned at**: commit `1a307d9`, 2026-11-27

## Why this matters

`app.get("/api/health", ...)` always returns `{ ok: true }`, even when
Postgres is unreachable, so a broken deploy looks healthy. There is also no
SIGTERM handler. Railway sends SIGTERM on redeploy, and the process dies
mid-request. A round save in flight is rolled back by Postgres, but the player
sees a network error. Graceful shutdown stops accepting connections, lets
in-flight requests finish (up to 10 s), then closes the pool.

## Design

- `/api/health` stays a cheap liveness check (`{ ok: true }`, 200). Add
  `GET /api/health/ready`, which runs `SELECT 1` through the pool with a 2 s
  timeout (`Promise.race`). It returns 200 `{ ok: true, database: "up" }`, or 503
  `{ ok: false, database: "down" }`. Never include error details or the
  connection string in the response. Log the error server-side.
- `server/index.js`: keep the `http.Server` returned by `app.listen`. On
  `SIGTERM` and `SIGINT`: log once, call `server.close()`, wait for it or 10 s,
  then `await pool.end()`, then `process.exit(0)`. Guard against double signals.
  Export the pool's `end` from `pgPool.js` if it isn't reachable (it already has
  `end: () => pool.end()`).
- `railway.json`: add `"healthcheckPath": "/api/health/ready"` under `deploy`.

## Scope

**In scope**: `server/app.js`, `server/index.js`, `railway.json`, tests (`tests/integration/health.test.js`).
**Out of scope**: other routes, pool configuration.

## Steps

1. Add the ready route. Integration test: with PGlite up, it returns 200 and
   `database: "up"`. Then stop the PGlite socket server (or point a fresh app
   at a closed port) and check that it returns 503 with no error text in the
   body. **Verify**: `npm run test:integration` passes.
2. Graceful shutdown. Test by spawning `node server/index.js` with
   `DB_SSL_MODE=disable`, a PGlite URL from the helper, `PORT=0` or a free
   port, and a dummy `JWT_SECRET`. Wait for the "listening" log, send
   `SIGTERM` (`child.kill("SIGTERM")`; on Windows, where real signals are
   limited, use `child.kill()` and accept exit code 0 or null), and assert it
   exits within 12 s. **Verify**: the test passes. On Windows, report the
   observed behavior if the signal can't be delivered.
3. Add `healthcheckPath` to `railway.json`. **Verify**: `node -e "JSON.parse(require('fs').readFileSync('railway.json','utf8'))"` exits 0.
4. **Verify**: `npm run lint` and `npm test` exit 0.

## Done criteria

- [ ] `/api/health/ready` returns 200 when the database is up and 503 when it is down (tests)
- [ ] The SIGTERM handler is present and tested
- [ ] `railway.json` has `healthcheckPath`
- [ ] Only in-scope files changed. Committed on `advisor/007-health-check-and-shutdown`

## STOP conditions

- `server/app.js` doesn't exist.
- The ready check needs a different pool than the app's.

## Maintenance notes

**Operator:** Railway uses `healthcheckPath` during deploys. A deploy now fails
if the database is unreachable at start, which is the intent.
