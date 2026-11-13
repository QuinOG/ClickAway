# Feature RSI learning

## Active lessons

1. (Provisional, 1 supporting run) On Windows, write non-ASCII UI text with the Edit/Write tools, not a PowerShell pipe or here-string, then grep the changed files for stray `?` or U+FFFD. Scope: any trial that adds copy containing `·`, `—`, or similar characters. Test: the next trial that adds such copy finds no garbled characters in review.

## Recent runs

- **001 history mode filter (2026-11-12): accepted locally.** Selection: an obstacle seen in the app, with demand as a hypothesis. The reviewer passed it with issues after writing 11 independent tests. One repair was used (the load hint wording). Lesson: a separator was garbled in a shell-written string, and neither the builder's tests nor the reviewer caught it; the builder found it by reading the diff. Possible next trial: the two sets of mode controls on History (chart and log).
