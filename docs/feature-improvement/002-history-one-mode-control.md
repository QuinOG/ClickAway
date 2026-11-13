# Trial 002: one mode choice for the whole History page

## In plain terms

- **One mode choice for the whole page.** Problem: History had two separate sets of Practice / Casual / Ranked buttons, one for the chart and one for the match list, so picking Ranked in one didn't change the other. Solution: there is now one set of buttons at the top (All / Practice / Casual / Ranked) that changes both the chart and the list together.
- **Saying what "All" does to the chart.** Problem: a chart can only show one mode at a time, so with All picked it wasn't obvious which mode the chart was showing. Solution: a short note under the buttons says the chart is showing your latest mode, and names it.
- **Honest empty chart (Sol's finding).** Problem: picking a mode with no games showed "No practice rounds yet", even though older games might just not be loaded. Solution: it now says "No Practice rounds in loaded history".

Before / after screenshots: `shots/002/before-*.png`, `shots/002/after-*.png` (All selected) and `shots/002/after-ranked-*.png` (Ranked selected).

## Problem and selection

Player task: on History, pick Ranked once and see both the Ranked score trend and only the Ranked matches, then go back to everything.

Observed (trial 001 independent review): the page has two separate groups of Practice / Casual / Ranked buttons. The chart's "Trend mode" group changes only the chart, and the "Filter match log" group changes only the list. The chart's Ranked button is often already pressed by default. A page-wide search for a "Ranked" button finds 2. A player who clicks the chart's buttons sees no change in the list. This confusion was observed by the reviewer simulation; no real player reports exist, so how often it happens is a hypothesis.

Selected because it is the one concrete, unrepaired finding from trial 001, it stays on one page, and it can be checked without live data.

## Baseline and acceptance (written before implementation)

Baseline: with mixed history, the page has two "Ranked" buttons. Clicking the chart's Ranked does not change the match list, and clicking the log's Ranked does not change the chart heading. Screenshots: `shots/002/before-desktop.png` and `shots/002/before-mobile.png`. A focused test must fail on this before the change.

Pass conditions:

1. The page has exactly one set of mode buttons (All / Practice / Casual / Ranked), placed before both the chart and the list, with a label saying it changes both.
2. Choosing a mode switches the chart to that mode and the list to only that mode's loaded rounds.
3. Choosing All shows every loaded round in the list. The chart still needs one mode, so it shows the latest round's mode and says it is doing that.
4. A mode with no loaded rounds shows the chart's existing empty message and the list's "Show all rounds" recovery.
5. Trial 001 behavior keeps working: order, count line, loading older rounds keeps the choice, and the failed load can be retried. Highlights, the empty-history state and the trend strip are unchanged.

Excluded: filtering highlights or the trend strip, server filtering, remembering the choice across visits, and any redesign beyond moving the control. One experiment, at most two repairs after independent review (Sol, `gpt-6.1-sol`, at the user's request).

## Result

**Classification: accepted locally.** Not shipped, and not validated by players.

Final behavior: a "Mode · score trend and match log" button group (All / Practice / Casual / Ranked, with mode-colored dots and `aria-pressed`) sits above the chart and highlights. The chart's own buttons are gone. A specific mode sets both the chart and the list. With All, the list shows everything and the chart shows the latest round's mode, which the note under the buttons names. On wide screens the group spans the full row, and the chart and highlights move to the row below.

Before and after: 3 of the 4 checks in `tests/historyOneModeControl.test.jsx` failed before the change (the 4th guards the empty-history state, which stays the same). All 4 pass now. The trial 001 tests were updated for the new location and name of the control. Its old "chart stays separate from the log" check was removed, because this trial changes that behavior on purpose.

Builder layout checks (positions measured in a real browser): the first version put an explanatory note inside the chart. On phone it covered the tops of the bars (note at y 545-573, bars from y 507). The note was moved under the buttons, and the remeasured layout shows no overlap and no horizontal scroll at 1440 or 390 wide.

Checks: both History test files pass (10/10). The full UI suite has the same 7 failures as `main`, all outside History. Browser suites (release-matrix and visual-cohesion) show the same 25 failures and 13 passes with and without this change, so it introduced none. Those failures are mostly outdated screenshot comparisons from earlier visual work, and the History paging test passes. Lint passes for `HistoryPage.jsx`.

Independent review: Sol (`gpt-6.1-sol`, medium) wrote 3 component tests and 7 browser tests of its own. **Verdict: pass with issues.** It confirmed task completion on desktop and phone, the empty states, that the choice is kept through older-round loading, failures and retries, with no duplicates, and that there were no regressions. Its findings:
1. On phone, the chart's axis labels overlap and its delta badge is clipped. This was already present in the before shot and is a visual polish issue, so it is not repaired here; candidate for the visual RSI skill.
2. The empty-mode chart said "No practice rounds yet" and announced "Up 0 points" while older rounds were still unloaded. Repair 1: the text and announcement now say "No <Mode> rounds in loaded history".
3. On phone, the dates in the match cards are cramped. This was already present in the before shot and is out of scope.

Limitations: no real players and no real screen-reader run. Highlights and the trend strip still cover every mode, and the control's label names only the chart and log.
