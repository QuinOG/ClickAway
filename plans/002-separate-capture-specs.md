# Plan 002: `npm run test:browser` runs only regression tests, not screenshot capture scripts

> **Executor instructions**: Read `plans/000-conventions.md` first. Follow this
> plan step by step and run every verification. On a STOP condition, stop and
> report.
>
> **Drift check (run first)**: `git diff --stat 1a307d9..HEAD -- playwright.config.js package.json tests/e2e .claude/skills`

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests / dx
- **Planned at**: commit `1a307d9`, 2026-11-27

## Why this matters

`playwright.config.js` sets `testDir: "./tests/e2e"`, so Playwright runs every
spec there. 27 of the 42 files are `zz-*.spec.js` capture scripts. They take
before and after screenshots for design review, and some write into `docs/`
(for example `tests/e2e/zz-round-complete.spec.js:58`) or use
machine-specific paths (`tests/e2e/zz-council-armory.spec.js:7`). So
`npm run test:browser`, and with it `npm run test:release`, rewrites
tracked files and depends on local setup. Plan 003 wants the browser tests as
a CI gate, which needs this fixed first.

## Current state

- `playwright.config.js:7`: `testDir: "./tests/e2e",`. The rest of the config
  sets the webServer (`npm run dev` on port 4173), snapshots and devices.
- Regression specs in `tests/e2e` (keep running by default):
  `armory-fits-screen`, `cleanup`, `history-chart-fits`, `ladder-phone-controls`,
  `lobby-modes-fit`, `phone-text-fits`, `profile-fix-list`, `profile-text-fits`,
  `release-matrix`, `skin-assets`, `visual-cohesion` (all `.spec.js`). Helpers:
  `fixtures.js`, `mock-app.mjs`, `device-audit.js`.
- Capture specs: every `tests/e2e/zz-*.spec.js` (27 files).
- Project skills that run capture specs by path, and so depend on their
  location: `.claude/skills/clickaway-rsi/SKILL.md`,
  `.claude/skills/clickaway-feature-rsi/SKILL.md`,
  `.claude/skills/clickaway-bug-pass/integrator-brief.md`. **Do not move the
  files.** That would break these skills.

## Scope

**In scope**: `playwright.config.js`, `package.json` (add one script), `scripts/run-capture.mjs` (create), and the
three skill files above (only to replace a raw `npx playwright test tests/e2e/zz-...`
invocation with the new capture command, if one exists). Keep any env prefix
such as `SHOT_DIR=...` in front of the new command. Also check the long lines
`clickaway-feature-rsi/SKILL.md:48,50` and `clickaway-rsi/SKILL.md:156`. Leave
lines that run non-`zz` specs (for example `release-matrix`) alone.
Also `tests/e2e/skin-assets.spec.js` (revision 2, see Step 1b).

**Out of scope**: the contents of any other spec, `fixtures.js`, every file under `docs/`.

**Revision 2 (2026-11-27).** The first executor found that
`tests/e2e/skin-assets.spec.js:19` calls `page.screenshot` with no guard. It
writes `docs/feature-improvement/shots/round-complete/${SKIN_PHASE || 'after'}-default-skin${width===390?'-phone':''}.png`
(both files are tracked). Lines 20-21 already write only when `SKIN_PHASE=after`.
Other non-`zz` specs gate their `docs/` writes behind env vars
(`CLIPPING_SHOTS`, `LOBBY_SHOTS`, `PROFILE_SHOTS`), so match that.

## Steps

### Step 1: Ignore capture specs by default

In `playwright.config.js` add:

```js
// zz-* specs are design-review capture scripts. They write screenshots into
// docs/ and need local setup, so they run only via `npm run test:capture`.
const includeCaptureSpecs = process.env.PLAYWRIGHT_CAPTURE === "1"
```

and in `defineConfig({...})`: `testIgnore: includeCaptureSpecs ? [] : ["**/zz-*.spec.js"],`

**Verify**: `npx playwright test --list | grep -c "zz-"` prints `0`.
`npx playwright test --list | tail -1` shows a non-zero total.

### Step 1b: Gate the unguarded screenshot in `skin-assets.spec.js`

Wrap the line 19 `page.screenshot(...)` so it runs only when `SKIN_PHASE` is
set (`if (process.env.SKIN_PHASE) { ... }`). Keep every assertion in the spec
unchanged.

**Verify**: `grep -n "screenshot" tests/e2e/skin-assets.spec.js` shows each call inside a `SKIN_PHASE` condition.

### Step 2: Add a capture script

Setting an env var inline is not portable between cmd and POSIX shells, and
`cross-env` is not installed. Do not add a dependency. Create
`scripts/run-capture.mjs` (in scope):

```js
// Runs Playwright with the zz-* capture specs included (see playwright.config.js).
import { spawnSync } from "node:child_process"

const result = spawnSync("npx", ["playwright", "test", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, PLAYWRIGHT_CAPTURE: "1" },
})
process.exit(result.status ?? 1)
```

Then add the `package.json` script `"test:capture": "node scripts/run-capture.mjs"`.

**Verify**: `npm run test:capture -- --list | grep -c "zz-"` prints a number ≥ 27.

### Step 3: Point skill docs at the new command

`grep -n "playwright test" .claude/skills/clickaway-rsi/SKILL.md .claude/skills/clickaway-feature-rsi/SKILL.md .claude/skills/clickaway-bug-pass/integrator-brief.md`.
Where a line runs a `zz-*` spec through `npx playwright test <path>`, change
it to `npm run test:capture -- <path>`. Leave every other line alone.

**Verify**: `grep -n "npx playwright test tests/e2e/zz-" .claude/skills -r` returns nothing.

### Step 4: Run the regression browser suite once

`npx playwright install chromium` if browsers are missing, then `npm run test:browser`.

**Verify**: it finishes and `git status --porcelain docs/` prints nothing
(no tracked docs were rewritten). Failing regression specs are allowed only
if they also fail at `1a307d9`. Check by running the same spec on a
`git stash` of your change, and list any in NOTES.

## Test plan

No new tests. The `--list` checks and the clean `docs/` status are the proof.

## Done criteria

- [ ] `npx playwright test --list` lists no `zz-` specs
- [ ] `npm run test:capture -- --list` lists all 27
- [ ] `npm run test:browser` leaves `git status --porcelain docs/` empty
- [ ] `npm run lint` exits 0
- [ ] Only in-scope files changed. Committed on `advisor/002-separate-capture-specs`

## STOP conditions

- A non-`zz` spec writes into `docs/`. Report which one, and don't fix it.
- Playwright cannot start its web server in your environment. Report and skip Step 4.

## Maintenance notes

New capture scripts must keep the `zz-` prefix to stay out of the default run.
Plan 003 (CI) relies on `npm run test:browser` being side-effect free.
