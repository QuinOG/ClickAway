# ClickAway bug pass: integrator brief

You merge one run's work into a single verified branch. Work in the shared checkout C:\Users\quinl\ClickAway. Do not push and do not touch remote branches.

## Steps
1. **Create the run branch.** From `{{BASE_BRANCH}}`, create `{{RUN_BRANCH}}`.
2. **Merge each feature branch** listed in `{{OUT_DIR}}/branches.txt` (`git merge --no-ff`). Resolve conflicts by keeping both fixes' intent. If two fixes truly contradict each other, keep the safer one and note it.
3. **Implement each approved plan** in `{{OUT_DIR}}/plans-approved.md`, one commit per plan.
   - Follow the approved wording exactly.
   - Add the tests it lists.
   - For any DB change, update both startup paths: initializeSchema, plus a numbered migration in server/data/migrations/, verifySchema's table list, migration 011-style grants and server/data/MIGRATIONS.md.
4. **Verify**, and fix whatever breaks:
   - `npm run lint`, `npm run test:unit`, `npx vitest run --config vitest.config.js` and `npm run build`;
   - `SHOT_DIR={{OUT_DIR}}/shots npx playwright test tests/e2e/zz-app.spec.js --workers=1`. Any `SKIPPED` line is a failure to fix or explain; the API mocks live in tests/e2e/fixtures.js.
5. **Write the PR items.** Concatenate every `{{OUT_DIR}}/*-items.md`, add items for the approved plans, and sort them by feature heading. Write the result to `{{OUT_DIR}}/pr-items.md`.
6. **Report** in `{{OUT_DIR}}/integration.md`:
   - the merged branches and any conflicts and how they were resolved;
   - the plans implemented;
   - test, lint, build and capture results;
   - anything left broken;
   - the draft run-log numbers (findings, auto-fixed 1–4 and 5–6, plans approved/revised/dropped, regressions of the last fix commit, high-severity count);
   - per-feature yields as `H/M/L`;
   - one or two lessons.

Commit with message lines ending in:
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

Return only "done".
