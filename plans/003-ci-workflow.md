# Plan 003: Every push and pull request runs lint, tests and build in GitHub Actions

> **Executor instructions**: Read `plans/000-conventions.md` first. Follow this
> plan step by step and run every verification. On a STOP condition, stop and
> report.
>
> **Drift check (run first)**: `git diff --stat 1a307d9..HEAD -- .github package.json playwright.config.js`

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: 001 (UI tests reliable), 002 (browser tests side-effect free)
- **Category**: dx
- **Planned at**: commit `1a307d9`, 2026-11-27

## Why this matters

There is no `.github/` directory. Railway (`railway.json:5`) runs only
`npm run build` on deploy, so a commit that breaks the 687 unit and UI tests
deploys as long as Vite can bundle it. The backlog lists "CI pipeline" as P0
(`docs/perfect-app-backlog.md` §4). A GitHub Actions workflow gives each PR a
red or green check.

## Current state

- `package.json` scripts: `lint`, `test` (`test:unit && test:ui`), `test:browser`
  (Playwright, starts `npm run dev` on port 4173 via `playwright.config.js` webServer),
  `build`. `playwright.config.js` already switches on `process.env.CI`
  (retries 2, workers 1, `github` reporter, `forbidOnly`).
- Node 22 is the deploy runtime (`nixpacks.toml`: `nodejs_22`).
- The server needs `JWT_SECRET` and `SUPABASE_DB_URL` at import time, but no CI
  job starts the server. Unit tests read server source as text, and the
  browser tests mock the API (`tests/e2e/fixtures.js`). Confirm that no test
  imports `server/index.js` or `server/db/pgPool.js` directly:
  `grep -ln "from \"../server/index.js\"\|server/db/pgPool" tests -r`.
  If any does, it needs those env vars set to dummy values in CI.

## Revision 2 (2026-11-27, after plans 002 and 011 landed)

- `npm run test:integration` now exists (PGlite, no external database). Add
  `- run: npm run test:integration` to the `checks` job after `npm test`.
- Plan 002's executor found that **12 browser tests already fail at `1a307d9`**:
  the 320px header wordmark, Armory install and factory reset, the leaderboard
  and duel error states, and 9 `visual-cohesion` snapshots. Snapshots made on
  Windows don't match Linux rendering either. So the `browser` job must not
  block. Add `continue-on-error: true` to the `browser` job, with a comment
  naming these known failures. Don't try to fix them in this plan.
- Step 3's local check now includes `npm run test:integration`.

## Scope

**In scope**: `.github/workflows/ci.yml` (create).
**Out of scope**: `railway.json`, all source and tests. Don't change behavior to make CI pass. If something fails only in CI, STOP and report.

## Steps

### Step 1: Write the workflow

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build

  browser:
    runs-on: ubuntu-latest
    needs: checks
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:browser
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

Add placeholder env vars only if Step 0's grep found a direct import. Use
obviously fake values such as `JWT_SECRET: ci-only-not-a-secret`. Never use
real secrets.

### Step 2: Validate the YAML

**Verify**: `node -e "const y=require('fs').readFileSync('.github/workflows/ci.yml','utf8');if(!/jobs:/.test(y))process.exit(1)"` exits 0. If `npx --yes yaml-lint` or `actionlint` is available, run it. Otherwise inspect the indentation by eye and say which in NOTES.

### Step 3: Prove the commands pass locally in CI order

**Verify**: `npm ci && npm run lint && npm test && npm run build` exits 0. Run the UI tests from an uppercase path if plan 001 has not landed.

## Done criteria

- [ ] `.github/workflows/ci.yml` exists with the two jobs above
- [ ] Local run of lint, test and build exits 0
- [ ] Only that file is added. Committed on `advisor/003-ci-workflow`

## STOP conditions

- `npm run test:browser` still runs `zz-*` capture specs (`npx playwright test --list | grep -c zz-` is not 0). Plan 002 has not landed.
- Any test needs a real database or network service.

## Maintenance notes

**Operator action:** after merge, mark the `checks` job as required in the
GitHub branch protection for `main`. Keep `browser` informational until it is
stable for a week. If the CI run is slow, cache Playwright browsers.
