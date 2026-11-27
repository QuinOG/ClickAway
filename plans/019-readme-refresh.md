# Plan 019: The README matches how the project works now

> **Executor instructions**: Read `plans/000-conventions.md` first. Follow this
> plan step by step and run every verification. On a STOP condition, stop and
> report.
>
> **Drift check**: none needed. This plan runs last and documents the current state.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: every other plan merged on `improve/integration`
- **Category**: docs
- **Planned at**: commit `1a307d9`, 2026-11-27

## Why this matters

The README is wrong in places (audit findings at `1a307d9`):

- About line 82, it says the API defaults to an absolute localhost URL.
  `src/services/clickAwayHttpApiClient.js:3` defaults to `/api`.
- About lines 110-120, the scripts table omits `test`, `test:unit`, `test:ui`,
  `test:browser` and `test:release`.
- About line 269, it says achievements are evaluated in the frontend. The
  server recomputes them (`server/playerMysqlDatabase.js`, about line 2094).

The improvement plans also added `test:integration`, `test:capture`,
`DB_SSL_MODE`/`DB_SSL_CA`, `/api/health/ready`, session revocation, ranked
forfeits and CI.

## Steps

1. Read `README.md` fully, plus `package.json` scripts, `.env.example`,
   `git log --oneline improve/integration ^1a307d9`, and each `plans/NNN-*.md`
   whose row is DONE in `plans/README.md`.
2. Fix the three errors above. Check each against the code before changing it.
   If a line is already correct, leave it.
3. Update the scripts table so it lists every `package.json` script, each with one line.
4. Add or refresh sections, each short:
   - Environment variables (every var in `.env.example`, with the purpose only, never values)
   - Testing (unit, UI, integration on PGlite, browser, capture scripts)
   - Health checks
   - "Ranked rules: leaving a started ranked round counts as a loss"
5. Keep the README's existing tone and heading style. Use sentence-case
   headings, plain words, and no emoji.

**Verify**: `node -e "const s=require('./package.json').scripts;const r=require('fs').readFileSync('README.md','utf8');const miss=Object.keys(s).filter(k=>!r.includes(k));console.log(miss);process.exit(miss.length?1:0)"` prints `[]`.
`grep -n "localhost:4000/api" README.md` shows no line that claims it is the default.

## Scope

**In scope**: `README.md` only.

## Done criteria

- [ ] Every script is documented (command above)
- [ ] The three stated errors are fixed
- [ ] Committed on `advisor/019-readme-refresh`

## STOP conditions

- None specific. If a plan's behavior is unclear from its code, document only what you can see in the code.
