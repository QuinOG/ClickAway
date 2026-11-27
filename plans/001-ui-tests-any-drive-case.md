# Plan 001: UI tests pass no matter how the drive letter is cased

> **Executor instructions**: Read `plans/000-conventions.md` first. Follow this
> plan step by step and run every verification. On a STOP condition, stop and
> report.
>
> **Drift check (run first)**: `git diff --stat 1a307d9..HEAD -- vitest.config.js tests/uiTestSetup.js package.json`

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `1a307d9`, 2026-11-27

## Why this matters

On Windows, when the shell's working directory is `c:\Users\Quinlan\Clickaway`
(lowercase `c`), `npm run test:ui` fails all 52 files with
`Vitest failed to find the current suite` at `tests/uiTestSetup.js:4`. From
`C:\Users\Quinlan\Clickaway` all 390 tests pass. The editor host (T3 Code)
opens the project with the lowercase path, so every agent and the developer
see a fully red UI suite that is not real. Vitest ends up loading two copies of
its runner module because the two paths differ only by case.

## Current state

- `vitest.config.js`:

```js
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.jsx"],
    setupFiles: ["./tests/uiTestSetup.js"],
    clearMocks: true,
    restoreMocks: true,
  },
})
```

- `tests/uiTestSetup.js:1-4` imports `afterEach` from `"vitest"` and calls it.
- `package.json` script: `"test:ui": "vitest run --config vitest.config.js"`.
- Vitest version: 4.1.12.
- Another agent reported that `npm run test:ui -- --no-cache --configLoader runner`
  passed from this machine. That is a lead, not a verified fix.

## Scope

**In scope**: `vitest.config.js`, `package.json` (the `test:ui` script only),
and, if option C is chosen, a new `scripts/run-vitest.mjs`.

**Out of scope**: every test file, `tests/uiTestSetup.js` (except to revert
experiments), other scripts in `package.json`.

## Steps

### Step 1: Reproduce the failure

From Git Bash, which keeps the lowercase path:
`cd /c/Users/Quinlan/<your worktree path> && npx vitest run --config vitest.config.js tests/gameHud.test.jsx`

Your worktree may not be under `c:\`. To reproduce, run from PowerShell:
`Set-Location ('c' + (Get-Location).Path.Substring(1)); npx vitest run --config vitest.config.js tests/gameHud.test.jsx`

**Verify**: output contains `Vitest failed to find the current suite`. If the
test passes from the lowercase path, STOP and report: the bug can't be
reproduced in your environment.

### Step 2: Pick the smallest fix that works

Try in this order. Keep the first one that passes Step 3 and undo the rest.

- **A.** Add `--configLoader runner` to the `test:ui` script.
- **B.** In `vitest.config.js`, set `root` to the config file's directory with
  the drive letter uppercased:

```js
import { fileURLToPath } from "node:url"
const configDir = fileURLToPath(new URL(".", import.meta.url))
// Windows paths that differ only in drive-letter case make Vitest load two
// copies of its runner, so every suite fails to register. Normalize the case.
const root = process.platform === "win32" ? configDir.charAt(0).toUpperCase() + configDir.slice(1) : configDir
```

  Pass it as `root` and `test.root`.
- **C.** Add `scripts/run-vitest.mjs`. It spawns `vitest run --config vitest.config.js`
  (forwarding extra args) with `cwd` set to the process cwd with an uppercased
  drive letter and `stdio: "inherit"`, and exits with the child's exit code.
  Point `test:ui` at `node scripts/run-vitest.mjs`.

Add a one-line comment saying why the fix exists.

### Step 3: Verify both casings

Run the full UI suite once from the lowercase path (PowerShell trick from
Step 1, then `npm run test:ui`) and once from the uppercase path.

**Verify**: both runs print `Test Files  52 passed`.

### Step 4: Check nothing else broke

**Verify**: `npm run lint` exits 0, and `npm run test:unit` prints `ℹ fail 0`.

## Test plan

No new test files. The proof is Step 3: the full suite passes from both path casings.

## Done criteria

- [ ] UI suite passes (52 files) from both lowercase and uppercase drive paths
- [ ] `npm run lint` exits 0
- [ ] `git diff --stat` shows only in-scope files
- [ ] Committed on `advisor/001-ui-tests-any-drive-case`

## STOP conditions

- Step 1 does not reproduce the failure.
- None of A, B or C makes Step 3 pass.
- A fix needs changes to test files.

## Maintenance notes

If Vitest fixes drive-letter normalization upstream, this workaround can go.
A reviewer should confirm the macOS and Linux behavior is unchanged: the
uppercase step only runs on win32.
