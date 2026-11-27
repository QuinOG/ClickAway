# Plan 013: Logging out revokes the session on the server, and players can log out of all devices

> **Executor instructions**: Read `plans/000-conventions.md` first. Follow this
> plan step by step and run every verification. On a STOP condition, stop and
> report.
>
> **Drift check (run first)**: `git diff --stat 1a307d9..HEAD -- server/auth.js server/app.js server/index.js server/playerMysqlDatabase.js src/app src/components/Navbar.jsx`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED (auth path, and every request is affected)
- **Depends on**: 011
- **Category**: security
- **Planned at**: commit `1a307d9`, 2026-11-27

## Why this matters

Sessions are 7-day JWTs in an httpOnly cookie (`server/auth.js:4-21`).
`POST /api/auth/logout` only clears the cookie. A copied token keeps working
for up to 7 days. There is no way to end other sessions, and a password change
(when it is added) couldn't invalidate old ones. The backlog lists
server-side revocation as P0 and "log out of all devices" as P1
(`docs/perfect-app-backlog.md` §1).

## Current state

- `signAuthToken({ id, username, role }, jwtSecret)` signs `{ sub, username, role }` with `expiresIn: "7d"`.
- `requireAuth` (server) verifies the JWT and sets `request.auth = { userId, username, role }`.
  It does no database lookup. Most routes then call `findUserById` themselves.
- The logout route clears the cookie and returns.

## Design

- Table `user_sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL, revoked_at timestamptz NULL)`,
  with an index on `user_id`. If `gen_random_uuid()` isn't available in PGlite
  or Postgres, generate the id with `crypto.randomUUID()` in JS instead.
- Login and signup: insert a session row (`expires_at` = now + 7 days) and put
  its id in the JWT as `sid`.
- `requireAuth`: after verifying the JWT, if the payload has `sid`, check
  `SELECT 1 FROM user_sessions WHERE id = ? AND user_id = ? AND revoked_at IS NULL AND expires_at > now()`.
  If no row comes back, return 401 `"Session has ended. Please log in again."` and
  clear the cookie. **Tokens without `sid`** (issued before this change):
  accept them until they expire, so nobody is logged out by the deploy. Add a
  comment saying this fallback can be removed 7 days after deploy.
  `requireAuth` becomes async. Make sure Express 5 handles the rejection, or
  wrap it in try/catch and return 500 through `handleRouteError`.
- Logout: set `revoked_at = now()` for the cookie's `sid` (if any), then clear the cookie.
- New `POST /api/auth/logout-all` (requireAuth): revoke all of the user's sessions and clear the cookie.
- Prune: when a session is created, delete that user's rows that expired more than 7 days ago.
- Client: add a "Log out of all devices" action next to the existing logout
  control. Find it with `grep -rn "logout" src --include=*.jsx -il`. Use the
  same component and styling as the existing logout entry, call the new
  endpoint, then run the same local sign-out flow as logout.

## Scope

**In scope**: `server/auth.js`, `server/app.js`, `server/playerMysqlDatabase.js`
(session functions, schema), `server/data/MIGRATIONS.md`, the client auth
service and logout UI (the files that grep finds), and tests:
`tests/integration/sessions.test.js` plus unit tests for `signAuthToken` carrying `sid`.

**Out of scope**: password change, account recovery, cookie attributes.

## Steps

1. Schema and session db functions. **Verify**: `npm run test:unit` → `ℹ fail 0`.
2. Issue `sid` at login and signup, and check it in `requireAuth`. Integration tests:
   - Log in, log out, then reuse the old cookie → 401.
   - Two logins (two cookies), then `logout-all` from one → both return 401.
   - A legacy token without `sid` (signed directly with `signAuthToken`'s old shape) → still 200.
   **Verify**: `npm run test:integration` passes.
3. Client "Log out of all devices". UI test: clicking it calls the endpoint and ends at the login page. **Verify**: UI suite passes.
4. **Verify**: `npm run lint`, `npm test` and `npm run test:integration` exit 0.

## Done criteria

- [ ] A revoked or logged-out session returns 401 (integration tests)
- [ ] Legacy tokens still work until they expire (test)
- [ ] Committed on `advisor/013-session-revocation`

## STOP conditions

- Making `requireAuth` async breaks the slicing tests in ways that need assertion changes.
- The per-request lookup can't share the pool without a new connection per request.

## Maintenance notes

This adds one indexed query per authenticated request. When a password change
is added later, it should call the revoke-all function.
