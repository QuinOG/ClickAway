# Shared conventions for every plan in this folder

Every plan file `plans/NNN-*.md` assumes you have read this file. It holds the
facts that are the same for all plans, so each plan stays focused.

## The project

ClickAway is a click-timing game. Frontend: React 19, React Router 7, Vite 7,
Axios, plain CSS with custom properties. Backend: Express 5 in `server/`,
`jsonwebtoken` httpOnly-cookie sessions, `bcryptjs`, `express-rate-limit`.
Database: PostgreSQL on Supabase through `pg`. `server/db/pgPool.js` wraps
`pg` in a mysql2-style API (`pool.query(sql, params)` returns `[rows]`,
`connection.execute(...)` returns `[{ affectedRows }]`, `?` placeholders are
rewritten to `$1, $2...` by `server/db/pgCompat.js`). The database module is
still named `server/playerMysqlDatabase.js` even though it talks to Postgres.
Deploy: Railway via Nixpacks (`railway.json`, `nixpacks.toml`), Node 22.
Express serves `dist/` in production.

## Commands (verified at commit 1a307d9)

| Purpose | Command | Expected on success |
|---|---|---|
| Install (fresh worktree) | `npm ci` | exit 0 |
| Lint | `npm run lint` | exit 0, no output after the header |
| Unit tests (node:test, `tests/*.test.js`) | `npm run test:unit` | `ℹ fail 0` (297 pass at baseline) |
| UI tests (vitest + jsdom, `tests/*.test.jsx`) | `npm run test:ui` | `Test Files  52 passed` (390 tests at baseline) |
| Both | `npm test` | exit 0 |
| Build | `npm run build` | exit 0 |
| Browser tests | `npm run test:browser` | needs Playwright browsers; run only if a plan says so |

**Windows gotcha:** if the working directory path starts with a lowercase
drive letter (`c:\...`), every vitest file fails with "Vitest failed to find
the current suite". Run the UI tests from an uppercase path
(PowerShell: `Set-Location 'C:\...'`) until plan 001 lands.

## Fragile tests that slice server source

These tests read `server/index.js` or `server/playerMysqlDatabase.js` as text,
cut out a route or function between two marker strings with
`source.indexOf(...)`, and run it with `vm`:
`tests/duelPrivateReplay.test.js`, `tests/duelStartIdentity.test.js`,
`tests/roundCompletionRoute.test.js`, `tests/serverErrorHandler.test.js`,
`tests/serverValidationRegression.test.js`, `tests/signupDurability.test.js`,
`tests/usernameLimit.test.js`.

If your change moves or renames a marker string they use (for example
`app.post("/api/round/complete"` or `export async function completeUserRound(`),
or adds a new free variable inside a sliced block, these tests break. You MAY
update the marker strings or add the new identifier to the test's `ctx`
object so the test still checks the same behavior. You may NOT weaken their
assertions. Say so in your report.

## Code style

- ES modules, no semicolons, double quotes, 2-space indent. Match
  `server/index.js` and `server/roundToken.js`.
- Comments explain *why*, in plain sentences, above the code
  (see `server/index.js:62-67`).
- Server route shape (copy it):

```js
app.post("/api/thing", requireAuth, async (request, response) => {
  const user = await findUserById(request.auth.userId)
  if (!user) {
    response.status(401).json({ error: "Session is no longer valid." })
    return
  }
  try {
    // ...
    response.json({ ... })
  } catch (error) {
    handleRouteError(error, response)
  }
})
```

- Unit tests: `node:test` + `node:assert/strict`, file `tests/<name>.test.js`
  (exemplar: `tests/authValidation.test.js`). UI tests: vitest + Testing
  Library, file `tests/<name>.test.jsx` (exemplar: `tests/gameHud.test.jsx`).

## Git workflow

- You work in an isolated git worktree. **First command:**
  `git merge --ff-only improve/integration` if that branch exists
  (`git rev-parse --verify improve/integration`). It holds earlier approved
  plans. If the fast-forward fails, STOP and report.
- Then create your branch: `git switch -c advisor/NNN-<slug>`. If that name
  already exists (an earlier attempt, held by another worktree), use
  `advisor/NNN-<slug>-r2` (or `-r3`, and so on) instead. That is not a STOP condition.
- Commit message style used in this repo (plain language, two parts):

```
1.) Problem: <what was wrong, in plain words>. 2.) Solution: <what changed>.
```

- Commit when the done criteria pass. Do not push. Do not open a PR. Do not
  edit `plans/README.md` (the reviewer maintains it).

## Report format (reply with exactly this)

```
STATUS: COMPLETE | STOPPED
BRANCH: advisor/NNN-<slug> at <short sha>
STEPS: per step, done/skipped + the verification command and its result
STOPPED BECAUSE: (only if STOPPED) which STOP condition, what you saw
FILES CHANGED: list
NOTES: deviations, judgment calls, anything the reviewer must know
```

Only report what a tool result in your session shows. If a check failed or
was skipped, say so.
