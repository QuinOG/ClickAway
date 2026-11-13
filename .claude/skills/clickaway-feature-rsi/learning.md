# Feature RSI learning

## Active lessons

1. (Provisional, 1 supporting run) On Windows, write non-ASCII UI text with the Edit/Write tools, not a PowerShell pipe or here-string, then grep the changed files for stray `?` or U+FFFD. Scope: any trial that adds copy containing `·`, `—`, or similar characters. Test: the next trial that adds such copy finds no garbled characters in review.

2. (Provisional, 1 supporting run) For any change that moves or adds visible UI, measure element positions in a real browser at 1440 and 390 wide before review (bounding boxes, not screenshot reading). Scope: layout-affecting trials. Test: in trial 002 this caught a note covering the chart's bars on phone before the reviewer saw it.

## Recent runs

- **001 history mode filter (2026-11-12): accepted locally.** Selection: an obstacle seen in the app, with demand as a hypothesis. The reviewer passed it with issues after writing 11 independent tests. One repair was used (the load hint wording). Lesson: a separator was garbled in a shell-written string, and neither the builder's tests nor the reviewer caught it; the builder found it by reading the diff. Possible next trial: the two sets of mode controls on History (chart and log).
- **002 one mode choice on History (2026-11-12): accepted locally.** Selection: the unrepaired, reviewer-observed finding from 001. Reviewer: Sol, pass with issues; one repair (honest empty-chart wording). Its two other findings were already present in the before shots, which made them easy to scope out. Lesson: before/after shots let the reviewer separate old problems from new ones.
- **003 Ladder to Duel (2026-11-12): accepted locally.** Selection: a cross-page journey gap (no link from the Ladder to Duels). Sol: pass with issues; one repair covering two findings (phone handoff, wording). Lesson: hand-offs between pages need an arrival check on phone (is the handed-over value on screen?), and `release-matrix`'s accessibility test stops at the first failing route, so scan the trial's routes separately.
