# ClickAway bug pass: reviewer brief (template)

<!-- Claude: copy to the run's scratchpad, set RUN, and fill the two {{...}} blocks from state.md. -->

Bug pass, run {{RUN}}. You review ONE narrow feature of the ClickAway repo (C:\Users\quinl\ClickAway, branch {{BRANCH}}; React + Vite client in src/, Node + Postgres server in server/, migrations in server/data/migrations/). Read-only: do not edit any file except your report. Do not run the dev server or Playwright. You may run `npx vitest run --config vitest.config.js <file>`, `node --test <file>`, `npm run lint`, or small `node` scripts that import the real modules to prove a finding. All tests and lint currently pass. There is no live database, so say so when a finding is proven from the code rather than by execution.

Your feature is deliberately narrow. Go deep on it. Anything outside it goes in Cross-feature notes, not in your list.

## What worked in earlier runs (keep doing it)
- **Proof by execution.** The strongest findings called the real functions, or rendered the real component in a small harness:
  - a node VM ran two tabs' auth hooks to prove the account-switch bug;
  - a JSDOM render of the Ladder proved "Low to high" only sorted one page;
  - running the real `/api/round/complete` handler with an injected replay failure proved a saved round reported as lost.
- **Re-checking the previous run's fixes.** In runs 2 and 3, a quarter to a third of findings were gaps in the previous run's fixes.
- **Following a flow end to end:** client, then API, then database, then the response applied back in the UI.
- **Looking for ways around a check**, not just whether the check exists. Examples:
  - leaving out an optional parameter skipped hit-geometry checks;
  - a route other than the main one completed duels;
  - an "unrewarded" path still wrote durable stats.
- **Checking failure paths after a commit.** Writes that run after a transaction commits can fail and turn a saved result into a reported error.
- **The player's view:**
  - wrong numbers or labels;
  - states that never resolve;
  - swallowed errors;
  - success messages shown when the action didn't land.
- **A Verified-by line and an honest effort size** on every item, plus Cross-feature notes.
- **Short, solid reports.** Two to four proven items beat ten guesses.

## What did not work (avoid it)
- **Overlap with neighbouring features:** stay in your lane and use Cross-feature notes.
- **Heavier fixes than needed:** propose the smallest fix that closes the problem, and say what it costs.
- **Ignoring existing accounts and stored data**, and both database startup paths:
  - `DB_AUTO_MIGRATE` on, through initializeSchema;
  - off, through numbered migrations, verifySchema and migration 011's runtime-role grants.

  A fix that would lock out existing users is not a fix.
- **Half-right claims about how data is stored:** check the whole path before stating it.
- **Speculation:** skip anything you could not confirm.

## Already handled; do not re-report
{{FIXED_FROM_STATE_MD}}

## Known and deferred (report only with a *small* fix)
{{DEFERRED_FROM_STATE_MD}}

## Re-check the previous run's fixes in your area
The latest fix commit ({{LATEST_FIX_COMMIT}}) is new and untested against a real database. Look for:
- regressions;
- a legitimate flow now refused;
- responses dropped that should apply;
- SQL that is invalid in Postgres;
- migration or permission gaps;
- UI states that are never cleared.

## Report format
Write your report to the REPORT path as a numbered list, most severe first, at most 10 items:

`N. [bug|behaviour|redundant|regression] [high|med|low] [effort S|M|L] file:line. Problem (what the player or operator experiences): … | Fix (smallest that works; note any data/compat impact): … | Why it matters: … | Verified by: <script output, test run, or the code path read end to end; say "no live DB" where relevant>`

Then add `Cross-feature notes:` with one line each, or "none".

On the last line, add: `Self-assessment: <one sentence on how confident you are and what you did not get to>`.

Return only "done".
