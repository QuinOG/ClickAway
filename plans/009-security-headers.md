# Plan 009: The server sends standard security headers

> **Executor instructions**: Read `plans/000-conventions.md` first. Follow this
> plan step by step and run every verification. On a STOP condition, stop and
> report.
>
> **Drift check (run first)**: `git diff --stat 1a307d9..HEAD -- server/app.js server/index.js index.html package.json`
> Routes and middleware live in `server/app.js` after plan 011. If it's missing, STOP.

## Status

- **Priority**: P1
- **Effort**: S–M
- **Risk**: MED (a CSP that's too strict blanks the app)
- **Depends on**: 011
- **Category**: security
- **Planned at**: commit `1a307d9`, 2026-11-27

## Why this matters

The app sends no Content-Security-Policy, frame restrictions,
`X-Content-Type-Options`, `Referrer-Policy` or HSTS, and Express advertises
itself with `X-Powered-By`. The session is an httpOnly cookie, so the main
risks are clickjacking (the app can be framed) and script injection having no
second line of defense. The backlog lists this as P0 (`docs/perfect-app-backlog.md` §2).

## Design

Don't add `helmet`. A small hand-written middleware keeps the dependency list
short, matching the repo's choice to hand-roll the cookie parser
(`server/auth.js:22-24` explains that choice). Add `server/securityHeaders.js`
exporting `securityHeaders({ isProduction })`, and use it right after `cors` in
`createApp`. Also call `app.disable("x-powered-by")`.

Headers:
- `Content-Security-Policy`: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`.
  Before you commit, check the policy against the built app:
  - `grep -rn "https://" index.html src --include=*.jsx --include=*.js --include=*.css | grep -v test`
    for external origins (fonts are self-hosted through `@fontsource`).
  - Look for inline `<script>` in `index.html`.
  - Look for `style=` attributes or motion's inline styles. `'unsafe-inline'` for
    style covers those.
  - Check `canvas-confetti`, which may use a worker. If it creates a worker from
    a blob, add `worker-src 'self' blob:`.
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security: max-age=15552000; includeSubDomains`, only when `isProduction`.

## Scope

**In scope**: `server/securityHeaders.js` (create), `server/app.js`,
`tests/securityHeaders.test.js` (unit, create), and an integration test case.

**Out of scope**: the client code. If the CSP needs a client change, STOP.

## Steps

1. Write the middleware and unit tests: all headers are set, HSTS appears only in production, and `X-Powered-By` is absent through the integration app. **Verify**: tests pass.
2. Validate the CSP against the real build. Run `npm run build`, then start
   the server with PGlite env and `dist/` present (`NODE_ENV=production` is not
   needed). Load `/login` with Playwright (`npx playwright` is installed), and
   collect `page.on("console")` messages containing "Content Security Policy".
   Then do the same on `/game` after signing up through the UI, or with
   `fixtures.js` patterns. **Verify**: zero CSP violation messages. Put the
   script in `tests/integration/cspSmoke.mjs` and run it with node, not as part
   of `npm test`.
3. **Verify**: `npm run lint`, `npm test` and `npm run test:integration` exit 0.

## Done criteria

- [ ] Header unit tests pass
- [ ] The CSP smoke script reports 0 violations on `/login` and `/game`
- [ ] `X-Powered-By` is absent (test)
- [ ] Only in-scope files changed. Committed on `advisor/009-security-headers`

## STOP conditions

- The app needs `'unsafe-eval'` or an external script origin.
- The smoke check can't run in your environment. Then the header unit tests must still pass, and say plainly that the CSP is unverified.

## Maintenance notes

Adding any third-party script, font or analytics later needs a CSP update. If
the app is ever embedded (for example on itch.io), `frame-ancestors` must change.
