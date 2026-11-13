---
name: clickaway-feature-rsi
description: Improve ClickAway features through bounded experiments on player tasks, independent task review, and evidence-based learning. Use for feature RSI or iterative feature improvement, rather than visual polish or routine maintenance.
---

# ClickAway Feature RSI

Improve what players can accomplish and how easily they can accomplish it. Adding, simplifying, repairing, or removing a feature are all valid outcomes. Do not select work to chase a reviewer score or a feature count.

## Scope and stopping rule

Start with the player's task, the evidence for the problem, and the proposed success conditions in plain language. Default to one improvement experiment per request, with at most two repair attempts after independent review. Stop when the conditions pass, the repair limit is reached, or the idea lacks enough support to proceed. A learning update does not authorize another experiment. Follow explicit user choices about scope and duration.

Inspect repository instructions, working changes, and existing behavior first. Keep the visual RSI and maintenance skills separate. A focused interface change needed for the task is allowed; do not start an app-wide redesign. Keep unrelated work intact. Use local fixtures for tests; changes to real player data, live services, sharing, or publication need authorization from the current task.

## Select a problem

If the user names a problem, use it. Otherwise inspect a small set of existing player journeys and choose a concrete obstacle with cheap, decisive verification. Compare candidates by player benefit, evidence strength, frequency when known, effort, and risk. Existing behavior and feedback may support a problem; they do not prove how many players experience it. Label inferred demand as a hypothesis. Do not invent feedback, usage measurements, or problems to fill a quota.

Read [learning.md](learning.md) for active lessons, treating them as scoped hypotheses rather than facts about the app.

## Make an experiment record

Before implementation, create a short record under `docs/feature-improvement/` containing:

- Player task and why it matters; distinguish observed obstacles from assumed demand.
- Baseline: what a player can currently do, with reproducible steps or an executable failing task check.
- Intended outcome and observable pass/fail conditions, including a relevant mistake, empty state, or recovery path.
- What must continue to work, what is excluded, and the repair/stop limit.

For example: a player can find only Ranked matches in their history, retrieve older matches without losing that choice, and return to all matches. Checks should observe the rendered result and player actions rather than private implementation details.

## Improve and check

Implement the smallest complete improvement. Do not prescribe a feature when simplifying existing behavior solves the task. Check the complete journey with realistic local data, including the selected edge/recovery case. Compare against the baseline and protect neighboring behavior. Use relevant automated checks and an appropriate build; a successful build alone does not show the task works. Use browser tools when the user requested browser work and follow the host's browser rules.

**Visual changes get before/after screenshots (user, 2026-11-12).** Before editing, capture the affected route with `ROUTE=<route id> OUT=docs/feature-improvement/shots/NNN/before npx playwright test tests/e2e/zz-feature-shot.spec.js --workers=1` (writes desktop 1440 and mobile 390 shots; `CLICK=<button name>` clicks one control first). After the change, capture `after` (and any state-specific shots), commit them with the code, and post a before/after PR comment (`python .claude/skills/clickaway-rsi/step_comment.py`). Check layout with measured element positions rather than by reading screenshots.

Keep claims tied to evidence. Automated component interactions, browser interactions, reviewer judgments, and actual player feedback are different kinds of evidence. Do not describe a simulated task as a real user study or claim time savings without measurement. Screenshots may support layout checks but cannot establish working behavior.

## Independent task review

Use one independent reviewer for each trial. The user's choice (2026-11-12) is Sol: `delegate_task` with provider `codex`, model `gpt-6.1-sol`, `reasoningEffort: medium`, `role: review`, run in the shared checkout as read-only for product files. If Sol is unavailable, say so rather than silently swapping models. This skill explicitly requests that review: the builder implements; the reviewer independently attempts the player task and checks the success conditions. No additional council is needed by default.

Give the reviewer the skill path, player task, repository location, raw fixtures, permitted local checks, and relevant boundaries. Do not give the intended solution, claimed result, or your test verdict. Ask it to discover the controls without a walkthrough, inspect the resulting behavior, and report evidence for task completion, discoverability, recovery, and regressions. It may write independent tests in a temporary directory; it must not edit product files or use live data. Follow the host's delegation and model rules. If delegation is unavailable, report that independent review was not performed and classify the experiment as unverified rather than self-approving it.

Review its actual evidence and address concrete findings within the repair limit. If a change fails, revise it or undo only your experiment's product changes when they cannot meet the conditions. Preserve useful findings and unrelated edits. Independent approval is necessary for accepting the trial but does not replace executable checks or prove demand.

## Finish and learn

Update the experiment record with final behavior, before/after task evidence, checks, reviewer findings, repairs, and limitations. Classify the result as accepted locally, unverified, or rejected; do not imply an accepted local trial has shipped or been validated by players. Report the outcome and stop.

## Commits and the PR (user, 2026-11-12)

Work on a feature branch. Each commit holds one coherent change and stages explicit files. Every commit message is exactly two plain-language lines that a non-technical reader can follow:

```text
1.) Problem: The match list mixed every game mode, so players couldn't see only their Ranked games.
2.) Solution: Added mode buttons above the list that show only the chosen mode's games.
```

Open the PR with the first commit of a run rather than at the end, then push after every commit so the PR always shows the latest state. `gh` isn't installed: use `.claude/skills/clickaway-rsi/gh.sh METHOD /path [json-file]`, build JSON bodies with Python, and never print the token. Keep the PR description current. List each change as a plain **Problem** / **Solution** pair, then the checks, the reviewer's verdict, and what was left out on purpose. Link the PR to the thread with `link_pull_request`. Do not merge unless asked.

Append a compact run entry to [learning.md](learning.md). Record any selection or review failure as well as successes. Add at most one or two supported next-run changes, describing the observation, a specific instruction adjustment, its scope, and how the next comparable task would test it. If no change is supported, say so. Keep new lessons provisional until two later comparable outcomes support them; revise or retire lessons that add effort without benefit. Do not create extra work to validate lessons or lower acceptance conditions to improve the success rate. Keep at most eight active lessons and six detailed recent runs; summarize older evidence when needed.
