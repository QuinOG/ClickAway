# Learning log

Update this after every run (SKILL.md step 8). The run log and lessons here are what change the defaults, the brief and the feature list.

## Run log

| Run | Date | Features × effort | Found | Accepted | Rejected / skipped | Regressions of the previous run's fixes | High-severity | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 | 2026-11-13 | 6 broad × medium | 46 | 37 | 9 deferred (size) | – | ~6 | Several half-right claims (e.g. storage of the selected mode). |
| 2 | 2026-11-13 | 6 broad × medium, with brief | 17 | 16 | 1 (password at login: compat) | ~6 | 3 | Cross-feature notes caught two shared bugs. |
| 3 | 2026-11-13 | 12 narrow × high | 39 | 38 | 1 (same compat skip) | ~10 | 7 | Nearly every item proven by execution; no wrong claims. |
| 5 | 2026-11-13 | 12 narrow × high + paired medium on round saving (Help/menus lost to the Codex usage limit) | 34 | 33 | 1 deferred (placement label in History needs a DB column) | ~9 | 3 | Every report carried a run proof. Low-severity items rose; feature set is nearing diminishing returns. |
| 4 (A/B) | 2026-11-13 | 1 feature (round saving) × medium and × high | 3 + 2 | 4 unique | 0 | – | 1 (high only) | See the A/B result below. |

## Reviewer cost (wall time from `recentRuns`, steps = `itemCount`)

| Run | Feature | Effort | Time | Steps | Accepted | Severity mix |
|---|---|---|---|---|---|---|
| 4 | Round saving | medium | 2:01 | 24 | 3 (1 shared) | 3M |
| 4 | Round saving | high | 2:35 | 29 | 2 (1 shared) | 1H 1M |

Token counts are not exposed for child runs; time and steps are the proxy. Earlier runs were not timed.

## A/B result (run 4): is high worth it?
- **Cost:** high took about 28% more time and 21% more steps than medium on the same feature, brief and scope.
- **Severity:** high found the only high-severity bug. Leaving out the arena size skipped the hit check on a paid round. Medium missed it.
- **Proof:** high's proof was stronger. It ran the real API handler with an injected failure, where medium read the same code.
- **Coverage:** medium found two real bugs that high missed (unverified rounds still counting toward stats, and a stale rank on Results). The overlap was only one of four.
- **Conclusion:** use high by default, since the extra cost is small and it catches severe issues. On the riskiest feature of a run, also run medium in parallel; they look in different places. One sample only; keep timing both on the paired feature to confirm.

## Paired review, run 5 (round saving)
Medium found 3 and high found 3, with 2 shared. Each caught one medium-severity bug the other missed: medium found the season write skipped on a replay failure, high found the inverted snapshot order. That's the same pattern as run 4, so keep the paired rule. Times weren't measured this run.

## Lessons (newest first)
- **Run 5:** About a quarter of findings were regressions in the previous run's fixes, again. Concurrency-ordering fixes in particular kept leaking: request-start order, then read-start time. When a fix claims an ordering guarantee, ask the reviewer to try to break it with a reordered-I/O harness before it ships.
- **Run 5:** The browser capture's dev "g" shortcut and missing `/round/complete` mock silently skipped the rank-up screen after a behaviour change. Treat SKIPPED capture steps as failures.
- **Run 5:** Claude ran ahead of its token pace doing every fix. Effort-S fixes now go to a Codex builder (see SKILL.md).
- **Run 4:** Reviewers at different effort levels found largely different bugs. A paired review of the riskiest feature is cheap (about +100% on that one feature) and caught twice as many issues.
- **Run 4:** Two whole bug classes were only found once the brief asked about them: ways around a check (optional parameters, alternate routes, "unrewarded" paths that still write) and failures after a commit. Both are now in reviewer-brief.md.
- **Run 3:** Narrow features plus high reasoning gave deeper, proven findings and no wrong claims. Broad features at medium gave more half-right findings.
- **Run 3:** A quarter of findings were regressions or gaps in run 2's fixes. Always have reviewers re-check the last fix commit.
- **Run 2:** Cross-feature notes caught bugs that two reviewers saw from different sides. Keep them.
- **Run 2:** The brief's "what worked / didn't" sections changed reviewer behaviour within one run: shorter reports, a Verified-by line on every item, and no padding.
- **Run 1:** Findings that state how data is stored must be checked end to end. Half-right storage claims cost a lot of triage time.
- **All runs:** Stacked PRs were auto-closed when the user deleted the base branch after merging. Keep everything on one open PR targeting main.
- **All runs:** Server fixes can't run against Supabase locally. Prove the logic with node scripts on the real modules, and mark the PR checks *(server)*.
