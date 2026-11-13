---
name: clickaway-bug-pass
description: Run a ClickAway bug pass. Sol reviewers each take one narrow feature (at most three at a time) and report proven bugs, unintended behaviour and redundant code. Claude triages, fixes, verifies and publishes one plain-language PR. Each run ends by improving this skill from what the reviewers got right and wrong. Use when the user asks for a bug pass, a review round, "Sol review each feature", or another round of fixes.
---

# ClickAway bug pass

Find and fix real bugs feature by feature, with reviewers whose instructions get better every run. Sol (gpt-6.1-sol) reviews; Claude triages, fixes, verifies and publishes. A reviewer never edits code.

Before launching, restate in 3–4 lines:
- the features in this run;
- the reasoning level;
- the batch size;
- that the run ends with a PR update and a skill update.

## Files
- `reviewer-brief.md`: the shared brief every reviewer reads. Copy it to the scratchpad for each run, and fill in "Already handled" from `state.md`.
- `features.md`: the feature catalogue (narrow scopes, file lists) and each feature's yield history.
- `state.md`: what is fixed (by commit), what is deferred and why, and the open PR. This is the single source for the brief's "do not re-report" lists.
- `learning.md`: the run log, measured reviewer cost and yield, and the lessons that changed this skill.

## Defaults (see learning.md for the evidence)
- **Reviewer:** Codex `gpt-6.1-sol` via `delegate_task`, `role: "review"`, `reasoningEffort: "high"`. High cost about 25% more wall time than medium in the A/B test, and it found the only high-severity bug. See learning.md.
- **Riskiest feature of the run:** also run a medium reviewer on it in parallel, with the same brief and scope. In the A/B test, medium and high found largely different bugs, and the union beat either one alone.
- **Batch size:** at most 3 reviewers running at once. Start the next one as soon as one finishes; don't wait for the whole wave.
- **Scope:** one narrow feature per reviewer (features.md). Twelve narrow features beat six broad ones: deeper findings and fewer half-right claims.
- **Usage:** the user is not very concerned, but it is a factor. Skip features whose last two runs found nothing, unless their code has changed since.

## Run
1. **Prepare.**
   - Make a scratchpad folder `bugpassN/`.
   - Write `bugpassN/brief.md` from `reviewer-brief.md`. Fill its "Already handled" and "Deferred" sections from `state.md`, and its "What worked / didn't" sections from the latest lessons in `learning.md`.
   - Record the start time (`date -u`).
2. **Launch** reviewers per `features.md`, each with:
   ```
   First read and follow <bugpassN/brief.md> exactly.
   FEATURE: <name and one-line description>
   Scope: <files>
   REPORT = <bugpassN/<feature>.md>
   Return only "done".
   ```
   End your turn; completions wake you. As each finishes, read its report and launch the next feature.
3. **Measure.** For each finished reviewer, call `t3_thread_read` (view activity, limit 1). Record `startedAt`, `completedAt` and `itemCount` from `recentRuns` and `thread` into learning.md. Token counts are not exposed for child runs; use wall time and step count as the cost proxy.
4. **Triage**, item by item. Fix it if it is:
   - real (confirm in the code; reproduce pure functions with a small node script);
   - not already fixed (`git log -p` on main and the PR branch);
   - worth its effort.

   Skip it, with a stated reason, if fixing would break existing accounts or data. Example: enforcing the password limit at login would lock out older accounts. Move anything big or speculative to `state.md` → Deferred. Several reviewers reporting one root cause is one fix. Write down each skip and its reason; they go in the PR's "Not fixed yet".
5. **Fix**, on a short-lived local branch off the PR branch, then fast-forward the PR branch.
   - Edit CRLF files in binary-safe Python (most of the repo is CRLF; a few files had cp1252 bytes).
   - Avoid brittle `sed` on multi-line JSX.
   - Every DB change needs both startup paths: `initializeSchema` (when `DB_AUTO_MIGRATE` is on), plus a numbered migration in `server/data/migrations/`, `REQUIRED_DATABASE_TABLES` and runtime-role grants. Record pending migrations in `server/data/MIGRATIONS.md`.
   - Keep comments short and say why.
6. **Verify:**
   - `npm run lint`, `npm run test:unit`, `npx vitest run --config vitest.config.js`, `npm run build`;
   - a browser smoke test, `SHOT_DIR=<scratch> npx playwright test tests/e2e/zz-app.spec.js --workers=1`, then look at 1–2 changed screens;
   - re-run the reviewer's reproduction script against the fix.

   If a test fails because it encodes old behaviour, update the test and say so in the PR. Server code can't run against the real database locally (Supabase), so mark those PR checks *(server)*.
7. **Publish.**
   - Commit with the Co-Authored-By line from the session's attribution reminder.
   - Push to the open PR (state.md). Don't open a stacked PR: the user deletes branches after merging, and that auto-closed two stacked PRs.
   - Update the PR description (format below), and link the PR.
8. **Improve this skill** (always; this is part of the run, not optional):
   - **learning.md:** add a run-log row (features, effort, reviewer times and steps, findings, accepted, rejected, regressions of the previous run's fixes, high-severity count).
   - **Yield:** update each feature's history in features.md. Split features that keep yielding, and merge or rest those that yield nothing twice in a row.
   - **Lessons:** add 1–3 lessons. What made a finding fast to act on? What was wrong, duplicated, unprovable or too big? What did every reviewer miss that a fix or test later exposed?
   - **Brief:** fold those lessons into reviewer-brief.md's worked / didn't-work sections. Delete advice that no longer earns its place; keep the brief under about 120 lines.
   - **Defaults:** if the evidence across runs says so, change the reasoning level, batch size or paired-review rule, and log why.
   - **state.md:** add this run's fixed items with their commit, and update Deferred.

## PR description format (the user's rule)
- Plain, non-technical, concise.
- Sorted by feature, using the features.md names as headings.
- Each item is **Problem:** one sentence on what the player or operator experienced, then ✅ one sentence the user can try to check the fix. Don't restate the problem as a "solution".
- Prefix items from later rounds with R2, R3 and so on.
- Mark items that need the real database with *(server)*.
- Put "Not fixed yet" under each feature, with the reason when it isn't obvious.
- Put any **Before deploying** step at the very top (for example, migrations to run).
- End with the 🤖 Generated with Claude Code line.

## Stop rules
- One run per user request. Updating this skill does not authorize another run.
- If a run's accepted findings are all low severity and nothing was high or medium, tell the user the feature set looks clean and recommend pausing or switching to the deferred list.
