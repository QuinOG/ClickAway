---
name: clickaway-bug-pass
description: Run a ClickAway bug pass. Sol agents each take one narrow feature (three at a time). Each one reviews its feature, risk-scores every finding, fixes low-risk items itself, and writes plans for high-risk ones. A Sol challenger attacks the plans, Claude approves them, and a Sol integrator implements and merges everything into one plain-language PR. Each run ends by improving this skill. Use when the user asks for a bug pass, a review round, "Sol review each feature", or another round of fixes.
---

# ClickAway bug pass

Find and fix real bugs feature by feature, with most of the work done by Sol (Codex `gpt-6.1-sol`).

**Claude's job is small on purpose (user, 2026-11-14).** ChatGPT usage is plentiful and Claude is ahead of its weekly pace. Claude:
- delegates;
- reads one summary table per run;
- reviews and approves high-risk fix plans;
- does a final check before pushing;
- updates this skill.

Claude does not read full reports or write routine fixes. The aim is about 90% of the quality for a fraction of Claude's usage, with Claude's judgement kept for risky changes.

Before launching, restate in 3–4 lines:
- the features in this run;
- the reasoning level;
- the risk thresholds;
- that the run ends with a PR update and a skill update.

## Files
- `reviewer-brief.md`: what every feature agent reads (review rules, the risk rubric, fix guardrails, outputs). Copy it to the scratchpad each run, filling the `{{...}}` blocks from `state.md`.
- `integrator-brief.md`: for the Sol agent that merges the feature branches, implements approved plans, verifies and drafts the PR.
- `challenger-brief.md`: for the Sol agent that tries to break the high-risk plans before Claude sees them.
- `features.md`: the feature catalogue (scopes) and yield history.
- `state.md`: what is fixed (by commit), what is deferred and why, and the open PR.
- `learning.md`: the run log, risk-score calibration, cost and lessons.

## Risk rules (the heart of the delegation)
Every finding gets a change-risk score from 1 to 10, covering:
- the blast radius if the fix is wrong;
- whether it touches stored data or deployments;
- how reversible it is;
- the test coverage.

| Score | What happens |
|---|---|
| 1–4 | The feature agent fixes it right away, with a regression test where reproducible, and lists it as one line in its summary. |
| 5–6 | The feature agent fixes it and flags it in its summary. Claude skims the flagged list and opens a diff only if a line looks off. |
| 7–10 | The feature agent writes a fix plan and does not implement it. The plan goes to a challenger, then to Claude for approval, then to the integrator. |

**Always 7+, whatever the score:**
- DB schema or migrations;
- login, sessions or cookies;
- round tokens and reward or score validation;
- coins and purchases;
- rank and RR math;
- anything deleting or rewriting stored data;
- any change claiming an ordering or concurrency guarantee.

These are where the high-severity bugs and Claude's own leaked fixes came from.

**Fix guardrails for agents:**
- only files in the feature's scope;
- no new dependencies;
- never delete or weaken a test;
- each fix under about 60 changed lines, otherwise escalate to a plan;
- lint and tests must pass.

## Pacing and usage (user, 2026-11-14)
Usage limits are per 5-hour window. Spread a run across the window rather than spending it in the first hour; a run taking about 5× longer is fine.
- **Meter:** `node .claude/tools/usage-meter.mjs` (add `--json` for agents). Codex numbers are exact; Claude numbers are estimates from `usage-budget.json`. Resets don't need recalibration. If the Claude estimate is off by more than about 15 points from the usage page, re-read the page and update the budgets and the two reset anchors (`claudeSessionResetAt`, `claudeWeeklyResetAt`).
  - Codex numbers are exact: the 5-hour and weekly used % from Codex's own logs.
  - Claude numbers are estimated from transcript token counts against `.claude/tools/usage-budget.json`. Calibrate it from one reading of the Claude usage page: budget = logged tokens ÷ the page's %.
- **Pacing gate:** run the meter before launching each agent. If the window's used % is more than about 10 points above the % of the window elapsed, don't launch; wait (ScheduleWakeup for long gaps), then check again. Same for the weekly window.
- **Token-saving rules** (each should keep 70–80% of earlier runs' quality; learning.md tracks yield per agent, and loosens a rule if quality drops below that):
  - About 6 features per run, chosen by recent high/medium yield and code changed since the last run. Low-yield features rotate in every other run. A feature that missed review goes first.
  - High reasoning only for risky features (round saving, live round, login, duels). Display-heavy ones (History, Ladder, Profile, Help/menus, Armory tools) use medium.
  - At most 4 findings per feature agent, one pass, risk-ordered.
  - No challenger when there are 3 or fewer plans; Claude reviews them directly.
  - At most 2 feature agents at a time.

## Defaults (see learning.md for the evidence)
- **Agents:** Codex `gpt-6.1-sol` with `reasoningEffort: "high"`.
  - Feature agents: `role: "implementation"`, `isolation: "worktree"`, one per feature.
  - Challenger: `role: "review"`.
  - Integrator: `role: "implementation"`, in the shared checkout.
- **Batch size:** at most 2 feature agents at once, and only while the pacing gate allows it.
- **Paired review:** dropped for now. A second agent fixing the same feature would conflict, and the challenger now covers the riskiest changes.
- **Claude usage:**
  - Claude reads summaries and plans, never full reports, unless a summary line is unclear.
  - Claude doesn't run the browser capture or test suites itself; the integrator does.
  - Claude runs one final `git log`/`git diff --stat` check before pushing.
- **Usage limits:** if an agent fails with a usage limit, stop launching for that provider. Finish with what is in, list unreviewed features in the PR and state.md, and tell the user the reset time.

## Run
1. **Prepare.**
   - Make scratchpad `bugpassN/`.
   - Write `bugpassN/brief.md` from `reviewer-brief.md`, filling `{{RUN}}`, `{{BASE_BRANCH}}`, `{{FIXED}}`, `{{DEFERRED}}`, `{{LATEST_FIX_COMMIT}}`, `{{OUT_DIR}}` and `{{BRANCH_PREFIX}}` from state.md.
   - Record the start time.
2. **Feature agents.** Launch per features.md (the feature that missed the last run goes first). Each gets:
   ```
   First read and follow <bugpassN/brief.md> exactly.
   FEATURE: <name and one-line description>
   Scope: <files>
   SLUG = <feature-slug>
   Return only "done".
   ```
   End the turn; completions wake you. On each completion, launch the next feature. Don't read the outputs yet.
3. **Collect.** When all agents are done, read only each `bugpassN/<slug>-summary.md` (a table of every finding with its score and action). Note which branches have commits.
4. **Plans.** Concatenate the `bugpassN/<slug>-plans.md` files into `bugpassN/plans.md`. Launch the challenger with `challenger-brief.md`. It writes `bugpassN/plans-challenged.md`, giving each plan a verdict of keep, revise (with the revision) or drop, plus a reason.
5. **Approve.** Claude reads `plans-challenged.md` only. Approve, edit or drop each plan, and write the decisions to `bugpassN/plans-approved.md`. This is where Claude's judgement goes: data compatibility, both DB startup paths, migrations, and auth or ordering claims.
6. **Integrate.** Launch the integrator with `integrator-brief.md`. It:
   - merges the feature branches into a run branch off the PR branch;
   - implements the approved plans;
   - runs lint, unit, UI, build and the browser capture (any SKIPPED step is a failure);
   - writes `bugpassN/pr-items.md` in the PR format below;
   - reports in `bugpassN/integration.md`.
7. **Final check (Claude).**
   - Read `integration.md`.
   - Skim `git diff --stat` and the risk 5–6 lines.
   - Open diffs only where something looks off.
   - Fast-forward the PR branch, push, update the PR description from `pr-items.md`, and link the PR.
8. **Improve this skill** (always). Have the integrator draft the learning.md row and the features.md yields in `integration.md`, then Claude edits and commits:
   - **Run log:** findings, auto-fixed (1–4, 5–6), plans (approved, revised, dropped), regressions of the previous run's fixes, high-severity count, and agent times.
   - **Risk calibration:** if this run's reviewers find a regression caused by a previous auto-fix scored 1–6, record the score it had. Two such misses in an area add that area to the always-7+ list or lower the auto-fix ceiling (e.g. 1–3). Several clean runs can raise it.
   - **Lessons:** add 1–3 lessons and fold them into reviewer-brief.md; keep it under about 150 lines.
   - **state.md:** record fixed items with their commit, and update Deferred.

## PR description format (the user's rule)
- Plain, non-technical and concise.
- Sorted by feature, using the features.md names as headings.
- Each item is **Problem:** one sentence on what the player or operator experienced, then ✅ one sentence the user can try. Don't restate the problem as a solution.
- Prefix later rounds with R2, R3, and so on. Mark items that need the real database with *(server)*.
- Put "Not fixed yet" under each feature, with the reason. Put any **Before deploying** step at the very top.
- End with the 🤖 Generated with Claude Code line.
- Keep everything on the one open PR (state.md): the user deletes branches after merging, which auto-closed stacked PRs twice.

## Stop rules
- One run per user request. Updating this skill does not authorize another run.
- If a run's accepted findings are all low severity, tell the user the feature set looks clean and recommend pausing or switching to the deferred list.
