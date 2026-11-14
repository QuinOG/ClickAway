# ClickAway bug pass: plan challenger brief

You review high-risk fix plans before Claude approves them. Read-only: do not edit repo files. Work in C:\Users\quinl\ClickAway on branch `{{BASE_BRANCH}}`.

Input: `{{OUT_DIR}}/plans.md` (plans from several feature agents). For each plan:
- **Confirm the problem is real.** Re-run or extend its proof with a small node script on the real modules, where possible.
- **Try to break the fix.** Look for:
  - reordered I/O and concurrent requests;
  - existing accounts and stored data;
  - both DB startup paths (initializeSchema vs numbered migrations, verifySchema and migration 011 grants);
  - a client and server running different versions during a deploy;
  - ways around the new check.
- **Prefer a smaller fix** when it closes the same hole.
- **Flag plans that collide** with each other (same files or functions).

Write `{{OUT_DIR}}/plans-challenged.md`. For each plan:

`### <id>: keep | revise | drop`

Then 3–8 lines covering:
- why;
- the revised change if revising;
- the tests that must accompany it;
- any deploy step (migration, environment variable).

End with a one-line ordering note if plans depend on each other. Return only "done".
