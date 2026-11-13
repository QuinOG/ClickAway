# ClickAway bug pass: feature agent brief (template)

<!-- Claude: copy to the run's scratchpad and fill every {{...}} from state.md. -->

Bug pass, run {{RUN}}. You own ONE narrow feature of the ClickAway repo (React + Vite client in src/, Node + Postgres server in server/, migrations in server/data/migrations/). You review it, risk-score every finding, fix the low-risk ones yourself and write plans for the risky ones.

## Setup
- You are in your own git worktree based on `{{BASE_BRANCH}}`. Create a branch `{{BRANCH_PREFIX}}/<SLUG>` and commit there. Do not push.
- If `node_modules` is missing, run `npm ci` (allow several minutes). Never junction or symlink node_modules.
- Do not run the dev server or Playwright (the integrator does). You may run `npm run lint`, `node --test <file>`, `npx vitest run --config vitest.config.js <file>`, and small `node` scripts that import the real modules.
- There is no live database; say so when a finding is proven from code rather than execution.
- Most files are CRLF. Preserve line endings when editing.

## Review: what worked in earlier runs (keep doing it)
- **Prove by execution.** Call the real functions, or render the real component in a small harness. Examples: a node VM running two tabs' auth hooks; a JSDOM render of the Ladder; real geometry replay; the real `/api/round/complete` handler run with an injected failure.
- **Re-check the previous fix commit ({{LATEST_FIX_COMMIT}}) in your area.** In every run so far, a quarter or more of findings were gaps in the last run's fixes.
- **Follow flows end to end:** client, then API, then database, then the response applied back in the UI.
- **Look for ways around a check:**
  - optional parameters that skip validation;
  - alternate routes;
  - "unrewarded" paths that still write durable data.
- **Check failures after a commit:** later writes that turn a saved result into a reported error.
- **Try to break ordering and concurrency claims** with a reordered-I/O harness. Run 5's snapshot-ordering fix leaked this way twice.
- **The player's view:**
  - wrong numbers or labels;
  - states that never resolve;
  - swallowed errors;
  - success shown for an action that didn't land;
  - dev-only shortcuts that hide behaviour.

## Review: what did not work (avoid it)
- **Overlap:** stay in your feature's scope and use Cross-feature notes.
- **Heavier fixes than needed:** use the smallest fix.
- **Ignoring existing accounts, stored data or both DB startup paths:**
  - `DB_AUTO_MIGRATE` on means initializeSchema;
  - off means numbered migrations, verifySchema and migration 011 grants.
- **Half-right claims about how data is stored**, and speculation.

## Already handled; do not re-report
{{FIXED}}

## Known and deferred (only with a small fix)
{{DEFERRED}}

## Risk-score every finding (1–10)
Score the risk of *changing the code*, not how bad the bug is:
- the blast radius if your fix is wrong;
- whether it touches stored data or deployment;
- how reversible it is;
- how well tests cover it.

| Score | What you do |
|---|---|
| 1–4 | Fix it now, add a regression test when you can reproduce it, and commit. |
| 5–6 | Fix it now and commit, but flag it in the summary. |
| 7–10 | Do not implement. Write a plan (below). |

**Always 7+, regardless of your score:**
- DB schema or migrations;
- login, sessions or cookies;
- round tokens and reward or score validation;
- coins and purchases;
- rank and RR math;
- deleting or rewriting stored data;
- anything claiming ordering or concurrency guarantees.

**Fix guardrails:**
- only files in your scope;
- no new dependencies;
- never delete or weaken tests;
- under about 60 changed lines per fix (bigger means write a plan instead);
- one commit per fix, with a plain message;
- keep comments short and say *why*.

Before finishing, run `npm run lint` and the tests that touch your files; all must pass. If a test encodes behaviour you deliberately changed, update it and say so.

## Outputs (all under {{OUT_DIR}})
1. **`<SLUG>-summary.md`:** one table row per finding:

   `| # | Severity (H/M/L) | Risk 1–10 | Action (fixed / fixed-flagged / plan / skipped) | One-line problem as the player sees it | Commit or plan id | How verified |`

   Then add a line `Branch: {{BRANCH_PREFIX}}/<SLUG> (<n> commits)`, then `Cross-feature notes:`, then `Self-assessment:` (one sentence).
2. **`<SLUG>-plans.md`** (only if you have 7+ findings): for each, give:
   - an id;
   - the problem and its proof;
   - the exact files and change;
   - data/compat and DB startup-path impact;
   - the tests to add;
   - what could go wrong.

   Keep each plan under about 25 lines.
3. **`<SLUG>-items.md`:** for each fixed item, one PR line in the user's format:

   `- **Problem:** <what the player experienced>`
   `  ✅ <one sentence they can try>`

   Mark server items *(server)*.

Return only "done".
