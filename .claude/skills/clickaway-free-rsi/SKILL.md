---
name: clickaway-free-rsi
description: Improve ClickAway reliability and backend documentation with a free DeepSeek worker, focused Claude review, and evidence-based improvements to future worker instructions and task selection. Use for bounded free-model maintenance batches alongside concurrent UI polish; not for the visual council or UI redesign.
---

# ClickAway Free RSI

Deliver useful, verified maintenance while reducing Claude's work. Improve task routing and worker instructions from observed outcomes. Optimization means less reviewer effort for accepted work, not more generated changes. Do not promise a token-saving percentage.

## Start and boundaries

Restate the task, worker, ownership exclusions, and one-batch stop rule before launching work. Default: at most three small tasks, one worker, sequential implementation, one final Claude review. Another batch requires a new user request or existing explicit authorization for multiple batches. Updating this skill does not authorize running another batch.

Use `opencode/deepseek-v4.1-flash-free`, provider `opencode`, `variant=high`. Verify availability through the host's capabilities before the first delegation, following its discovery rules. Unavailable or rate-limited: report and stop; do not silently substitute a paid model or schedule retries. Claude coordinates and reviews; do not add councils or duplicate model evaluations.

Read current repository instructions and status. Delegate implementation into a ClickAway worktree using the host delegation tool, never a shell-created child checkout. Record base commit, branch, and checkout. Workers receive no assumed parent history: supply the complete brief from [worker-brief.md](worker-brief.md), task boundaries, and applicable learned instructions explicitly. Follow the host's completion/wakeup instructions rather than polling.

Concurrent UI ownership covers frontend pages/components/hooks/utilities/styles/assets, browser tests/snapshots/capture scripts, UI roadmaps/reports, and `.claude/skills/clickaway-rsi/**`. Read when needed; never edit or start a UI audit. Do not infer missing functionality from uncommitted UI changes absent in the worktree. Do not touch the active checkout's changes, branch, servers, or staging area. No cherry-picking or integration into it.

No changes to authentication/session/authorization logic, anti-cheat, scoring/rewards/MMR, purchase/equip transactions, migrations, or database compatibility logic. Evidence-backed findings are allowed. No dependency/configuration/lockfile changes, package installs, migrations, real data mutations, production calls, credential access, shared services, pushes, PRs, merges, deployments, or snapshot updates. A skill never grants permission beyond the user's task.

## Select and delegate

Read the current routing and active lessons in [learning.md](learning.md). Read full old run records only to investigate a recurring failure. Existing lessons are hypotheses with scope, not repository facts.

Have the worker choose up to three tasks within the user's scope: backend documentation corrections, regression tests of pure backend/independent utility behavior using existing infrastructure, or a small confirmed non-UI bug. Prefer tasks with cheap, decisive verification. Let it proceed on low-risk tasks without a Claude planning round. Do not manufacture tasks to fill the batch.

If asked for specific tasks, respect that selection instead of optimizing it away. An unsafe or blocked task becomes a finding; it does not authorize unrelated work. Use one writer per task/file. If an isolated checkout cannot run checks without installing dependencies, record that limitation; favor a documentation task or leave the patch unverified rather than manipulating shared dependencies.

## Review and finish

Review the actual diff, changed-file list, and consequential claims against surrounding source at the worker's final commit. Verify tests establish intended behavior. A handoff is navigation, not proof; passing checks are necessary where applicable but not sufficient. Preserve the distinction between tested commits and later edits.

Review once per batch, then send at most one consolidated repair delegation with exact findings. A new repair/review task uses a new delegation, not a message repurposing the completed child. The worker gets at most two unsuccessful repair attempts per task, including attempts before handoff. If substantial repair remains, stop that task as unaccepted rather than quietly implementing it in Claude. Do not rerun valid unchanged checks without a concrete reason.

Commit completed work only in the isolated checkout, one coherent task per commit, staging explicit owned files. Never amend someone else's commits. Every commit message, including skill-learning commits, uses exactly two concise plain-language lines:

```text
1.) Problem: Setup instructions named the wrong database.
2.) Solution: Updated them to match what ClickAway uses.
```

Report accepted, unverified, and rejected work separately, with commit IDs, checks, limitations, and reviewer corrections. Leave commits for later integration; do not apply them to the UI checkout.

## Improve the next run

Claude owns the learning update; workers may propose lessons but cannot alter this skill, routing, or review standards. Update only this skill's directory, in an isolated checkout, and keep the update separate from product commits. Do not overwrite concurrent edits to these files. If the relevant skill files are absent from the starting commit, include the current skill package in the isolated checkout before editing it. Do not switch the active UI branch to publish learning.

At the end of every completed batch, append a compact run record to `learning.md`, including failed or unaccepted tasks. Record per task: model/variant, task class, outcome, concrete defects, repair attempts, reviewer-effort category, and evidence references. Mark unavailable usage/time measurements as unknown. Worker completion and self-ratings do not count as reviewer acceptance.

Reviewer effort:
- **Light:** localized verification; no behavioral correction or new approach supplied.
- **Moderate:** a specific factual/test correction or one precise repair brief.
- **Substantial:** Claude supplies the approach, rewrites meaningful logic/tests, repeats much of the investigation, or the task still fails after the repair round. One serious unsupported claim may be substantial even in a short report.

Substantial guidance MUST produce a next-run solution, not just a lesson saying "be careful":
1. Diagnose the cause from evidence: missing context, excessive scope, weak task fit, faulty search, test misunderstanding, or environment/tool failure. Do not blame the model for an infrastructure failure.
2. Choose the smallest intervention: add a concrete worker check/example, narrow the task's files/acceptance condition, require a specific evidence artifact, or route fewer tasks of that class and more of a class with accepted results.
3. Write the exact instruction/routing change, its applicability, expected observable improvement, and the next-run check into `learning.md`. Amend `worker-brief.md` only for broadly useful, supported instructions; task-specific advice stays in the ledger and is injected only for matching work.
4. Make at most two material instruction/routing changes per batch so their effects can be interpreted. Still record all failures. Do not grow instructions for every typo.

Treat a new lesson as **provisional**. Validate it on the next naturally occurring comparable task, not by generating busywork or using Claude to redo the trial. Promote after two comparable accepted outcomes with no recurrence and light review. If a lesson causes failure, excess effort, or needless restrictions, revise or roll it back and record why. Small samples do not justify model-wide conclusions.

For each task class, use recent reviewed outcomes to select **prefer**, **bounded trial**, or **defer**. Two recent substantial-correction/rejected outcomes justify deferring the class or requiring a narrower trial. Two clean comparable outcomes can justify preferring it. Do not increase risk, scope, or autonomy automatically. Do not defer an entire class solely due to one tool outage.

Never optimize by lowering acceptance criteria, hiding failures, weakening tests, approving fewer checks, inflating success counts, removing review, changing paid-model policy, or relaxing UI/sensitive-code exclusions. User-set boundaries remain fixed unless the user changes them.

Keep active lessons at eight or fewer. Consolidate duplicates and retire obsolete rules. Keep at most six detailed recent run records here; move older records to a local archive only when needed, retaining evidence links and aggregate counts. Do not reread the archive by default. Learning updates should be a short end-of-batch action, not another research/review loop. Validate changed skill frontmatter and local reference links with available local tooling; no new dependencies for validation.

Final response includes one short next-run improvement, or says no supported change was needed. Stop after the authorized batch.
