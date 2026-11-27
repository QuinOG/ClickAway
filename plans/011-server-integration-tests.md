# Plan 011: The server can be imported in tests, and key routes are tested against a real Postgres

> **Executor instructions**: Read `plans/000-conventions.md` first. Follow this
> plan step by step and run every verification. On a STOP condition, stop and
> report.
>
> **Drift check (run first)**: `git diff --stat 1a307d9..HEAD -- server/index.js server/db package.json tests`
> Plan 006 (merged on `improve/integration`) added `server/db/databaseSsl.js`
> and `DB_SSL_MODE`. Plan 004 may have changed round completion. Re-read the live code.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED (restructures the server entry point)
- **Depends on**: 006
- **Category**: tests
- **Planned at**: commit `1a307d9`, 2026-11-27

## Why this matters

`server/index.js` builds the Express app at module top level, throws at import
when `JWT_SECRET` is missing, and calls `startServer()` (schema init, admin
seed, `listen`) as a side effect. `server/db/pgPool.js` throws at import
without `SUPABASE_DB_URL`. So no test can import the server. Seven tests read
the source as text and run sliced pieces in `vm` with mocked queries (listed
in `000-conventions.md`). Nothing checks real SQL, transactions, constraints,
cookies through the middleware, or rate limits. Plans 005, 008, 012, 013 and 014
change persistence and need that safety net. Docker is not installed on the dev
machine, so the plan uses PGlite (Postgres compiled to WASM) with its socket
server, and `pg` connects to it like a normal Postgres.

## Current state

- `server/index.js`: imports at the top, `const app = express()` at about line 61,
  middleware and routes, then at the end:

```js
async function startServer() {
  if (DB_AUTO_MIGRATE) {
    await initializeSchema()
  } else {
    await verifySchema()
  }
  await seedAdminAccount()
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Auth server listening on http://0.0.0.0:${PORT}`)
  })
}

startServer().catch((error) => {
  console.error("Server failed to start:", error)
  process.exit(1)
})
```

- `package.json`: `"server": "node server/index.js"`. Railway and Nixpacks start
  with `node server/index.js` (`railway.json`, `nixpacks.toml`).
- `server/db/pgPool.js` reads `SUPABASE_DB_URL` and builds the pool at import.
  `DB_SSL_MODE=disable` turns TLS off (plan 006).

## Design

1. **Split entry and app.** Create `server/app.js` that exports
   `createApp({ jwtSecret, clientOrigin, ... })`, or reads the same env vars
   inside the function. Move the app construction, middleware, rate limiters
   and every route there, unchanged. `server/index.js` becomes a thin entry:
   load dotenv, check `JWT_SECRET`, call `createApp()`, run the existing
   `startServer` steps. Keep `node server/index.js` working with identical behavior.
   Rate limiters must be created inside `createApp` so each test app gets fresh counters.
2. **Update the slicing tests.** They read `server/index.js` as text. Point them
   at `server/app.js`, and keep their marker strings working. Don't weaken any
   assertion. Where a test becomes redundant with a new integration test, you
   may leave it. Don't delete tests in this plan.
3. **Test database.** Add devDependencies `@electric-sql/pglite` and
   `@electric-sql/pglite-socket`, the latest versions that are at least two
   weeks old. Write `tests/integration/testDatabase.js`. It starts PGlite
   in memory, serves it on a free localhost port with `PGLiteSocketServer`, sets
   `process.env.SUPABASE_DB_URL = "postgres://postgres@127.0.0.1:<port>/postgres"`
   and `DB_SSL_MODE = "disable"`, and has a `stop()`. pgPool reads env at
   import, so the env must be set **before** dynamically importing `server/app.js`.
4. **Integration tests** in `tests/integration/*.test.js`, run with
   `node --test` through a new script `"test:integration": "node --test tests/integration/"`.
   Not part of `npm test` yet, because the WASM start is slow. Plan 003's CI can
   add it later. Use `fetch` against `app.listen(0)`. Cover:
   - signup sets an httpOnly cookie, and `/api/auth/me` with that cookie returns the user
   - logout clears the cookie
   - `PUT /api/progress` ignores `coins` in the body
   - `POST /api/round/start` for ranked returns a token, and `/api/round/complete`
     with a minimal valid event stream saves one history row. Find a valid
     stream in an existing test, `grep -ln "simulateRound" tests`. Submitting the
     same token again returns 409.
   - the auth rate limiter returns 429 on the 21st login attempt
   - `initializeSchema()` runs twice without error (idempotent)

## Scope

**In scope**: `server/index.js`, `server/app.js` (create), `package.json`
(devDependencies and one script), `package-lock.json`, `tests/integration/**` (create),
the seven slicing tests (marker or path updates only).

**Out of scope**: route behavior, SQL, `server/db/pgPool.js` (unless PGlite needs
a pool option, in which case STOP and report), Railway config.

## Steps

### Step 1: Extract `createApp` into `server/app.js`. `server/index.js` keeps startup.

**Verify**: `npm run test:unit` → `ℹ fail 0` (after updating slicing-test paths).
`JWT_SECRET=x SUPABASE_DB_URL=postgres://u@127.0.0.1:1/db DB_SSL_MODE=disable node -e "import('./server/app.js').then(m=>console.log(typeof m.createApp))"` prints `function`.

### Step 2: Add PGlite and the test database helper

Write a smoke test that runs `SELECT 1` through the server's own pool (`server/db/pgPool.js`).

**Verify**: `node --test tests/integration/` passes the smoke test.

### Step 3: Integration tests from the Design list

**Verify**: `npm run test:integration` → all pass. Paste the summary lines.

### Step 4: Full check

**Verify**: `npm run lint` and `npm test` exit 0. `node server/index.js` with no env still exits with the `Missing JWT_SECRET` error. Run with a 5 s timeout and check stderr.

## Done criteria

- [ ] `server/app.js` exports `createApp`, and `server/index.js` contains no route definitions (`grep -c "app\.\(get\|post\|put\)(" server/index.js` → 0)
- [ ] `npm run test:integration` passes with at least 6 tests against PGlite
- [ ] `npm run lint` and `npm test` exit 0
- [ ] Only in-scope files changed. Committed on `advisor/011-server-integration-tests`

## STOP conditions

- PGlite rejects part of `initializeSchema()`'s SQL (for example an unsupported
  extension). Report the statement. Don't change the schema.
- `pg` cannot connect to `pglite-socket` (protocol mismatch).
- Making the server importable requires changing route behavior.

## Maintenance notes

Later plans (005, 007, 008, 009, 012, 013, 014) add their integration tests here.
PGlite is single-connection: tests that need two concurrent transactions
(deadlock or race checks) won't be faithful. Note that in those tests.
