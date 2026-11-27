# Plan 023: The database module is split by domain, with behavior unchanged

> **Executor instructions**: Read `plans/000-conventions.md` first. Follow this
> plan step by step and run every verification. On a STOP condition, stop and
> report.
>
> **Drift check (run first)**: `git diff --stat 1a307d9..HEAD -- server/`. Many plans changed it, so work from the live code.

## Status

- **Priority**: P3
- **Effort**: L
- **Risk**: MED (pure move, but a large one)
- **Depends on**: all other server plans merged (it moves code they edit), and 011 (integration tests)
- **Category**: tech-debt
- **Planned at**: commit `1a307d9`, 2026-11-27

## Why this matters

`server/playerMysqlDatabase.js` is about 2,700 lines. It is the highest-churn
server file, and it's misnamed: it talks to Postgres. Schema, users, rounds,
leaderboard, replays, challenges, seasons, shop and progress all live in one
file, so every change risks merge conflicts and reviewers read huge diffs.
`useGameScreenController.js` (about 1,830 lines) has the same problem on the
client, but splitting a React hook carries more behavior risk. It is **not**
part of this plan.

## Design

- Create `server/db/` modules by domain: `schema.js` (`initializeSchema`,
  `verifySchema`, `addColumnIfMissing`), `users.js`, `progress.js`, `rounds.js`
  (`completeUserRound` and helpers), `leaderboard.js`, `replays.js`,
  `challenges.js`, `seasons.js` and `sessions.js` (if plan 013 landed). Shared
  helpers go in `server/db/shared.js`.
- Keep `server/playerMysqlDatabase.js` as a **re-export barrel**
  (`export * from "./db/users.js"`, and so on), so every importer keeps working.
  Add a comment saying the file name is historical. Don't rename importers in
  this plan.
- **Move code verbatim.** No logic changes, no renames, no reformatting.
  Import cycles between domains must be avoided. If `rounds.js` needs
  `progress.js`'s `buildProgressRecord`, import it directly.
- The slicing tests read `server/playerMysqlDatabase.js` as text and cut
  functions out by marker. Point each one at the new file that holds its
  function. Marker strings stay the same, because the code is verbatim.

## Scope

**In scope**: `server/playerMysqlDatabase.js`, `server/db/*.js` (new), the slicing tests (paths only).
**Out of scope**: any behavior change, `pgPool.js`, `pgCompat.js`, client code, `useGameScreenController.js`.

## Steps

1. Map every top-level declaration in the file to a target module
   (`grep -n "^export \|^async function \|^function \|^const " server/playerMysqlDatabase.js`).
   Put the map in NOTES.
2. Move one domain at a time. After each move run `npm run test:unit` and
   `npm run test:integration`. Commit per domain so a bisect is possible.
3. Final barrel. **Verify**: `wc -l server/playerMysqlDatabase.js` is under 40,
   `npm run lint` exits 0, and `npm test` and `npm run test:integration` pass.
4. Behavior check:
   `git diff improve/integration --stat -- server | tail -1`. Insertions and
   deletions should be within about 5% of each other (a pure move). Explain any gap.

## Done criteria

- [ ] All exports are still available from `server/playerMysqlDatabase.js` (`node -e "import('./server/playerMysqlDatabase.js').then(m=>console.log(Object.keys(m).length))"` gives the same count as before, recorded in NOTES)
- [ ] All tests pass
- [ ] Committed (one commit per domain) on `advisor/023-split-largest-modules`

## STOP conditions

- A move needs a logic change to break a cycle.
- The export count differs.

## Maintenance notes

Splitting `useGameScreenController.js` should be its own plan, with
characterization tests first. Renaming the barrel to `server/db/index.js` is a
follow-up once importers are updated.
