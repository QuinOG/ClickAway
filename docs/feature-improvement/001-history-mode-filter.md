# Trial 001: find matches by game mode

## Problem and selection

Player task: find only Ranked matches, including older matches, then return to the full match list.

Observed: HistoryTrajectory has mode buttons, but Full Log and Match cards render every loaded history row with no mode filter. The chart controls do not filter those lists. There is no supplied player feedback or usage evidence; demand is a product hypothesis.

Selected because the obstacle is reproducible, the change is bounded to match-history browsing, and completion can be checked without a live account. Equipment comparison already exists and would require a wider investigation; no additional candidate audit is needed for this trial.

## Baseline and acceptance (written before implementation)

Baseline: render mixed Practice, Casual, and Ranked history; the Full match log section has no control for selecting Ranked. A focused interaction check must fail on this missing capability before implementation.

Pass conditions:

1. A player can select All, Practice, Casual, or Ranked for the match log; both the desktop table and mobile cards include only matching loaded rounds, preserving their order.
2. The selection is announced through an accessible label/state. Counts explicitly describe loaded matches; they do not imply the complete archive has been searched.
3. Loading older matches preserves the selection, includes new matching entries, and avoids duplicate rounds.
4. A filter with no loaded matches explains that state, keeps older-match loading available when applicable, and offers a route back to All. A failed older-match request shows an error and can be retried without losing the selection.
5. Initial empty history retains its existing Play a Round action. The chart, highlights, rewards, and career summaries keep their existing behavior.

Excluded: server filtering, score/reward rules, archive search, visual redesign, and live player data. One experiment, at most two repairs after independent review. No push or publication is requested.

## In plain terms

- **New feature: mode filter.** Problem: the match list mixed every game mode, so you couldn't see only your Ranked games. Solution: All / Practice / Casual / Ranked buttons above the list show just the games you pick.
- **Garbled symbol.** Problem: the line counting your games showed a stray "?". Solution: changed it back to the small dot it was meant to be.
- **Unclear hint.** Problem: the note about older games was vague, and the button it mentions is far away at the bottom of the list. Solution: the note now says older games haven't loaded yet and that the button is below the list.

## Result

**Classification: accepted locally.** Not shipped, and not validated by players. Demand is still a hypothesis.

Final behavior: the Full Log section has a "Filter match log" group with All / Practice / Casual / Ranked buttons (`aria-pressed`). The desktop table and the mobile cards both render only matching loaded rounds, in their original order. A polite live status reads "Showing N of M loaded rounds · Mode". When more rounds can be loaded, a hint points to the Load older rounds control. An empty filter shows "No <Mode> rounds in the loaded matches." with a "Show all rounds" button, and loading older rounds stays available. Loading older rounds keeps the selection and de-duplicates rows. A failed load shows an alert, and retrying keeps the selection.

Before and after: before, the match list had no mode control. After, the 6 checks in `tests/historyModeFilter.test.jsx` cover the task, and all 6 failed before the change.

Checks: the focused test passes (6/6), unit tests pass (112/112), and the build succeeds. The full UI suite has 7 failures in armory, auth, outcome, profile, shell, and shop. The same 7 fail on the committed code without this change. `npm run lint` reports 2 errors in `ShopHeroHeader.jsx`, which this change does not touch.

Independent review (a subagent wrote 11 of its own tests with its own fixtures, without this record or the builder's tests): **pass with issues**. It confirmed conditions 1-5 and found no regressions. Its findings:
1. Two sets of Practice / Casual / Ranked buttons (the chart's existing Trend mode group and the new log filter) can be confused. Not repaired: the chart control already existed, and merging the two would change the chart's behavior, which is out of scope. The visible "Filter match log" label reduces the confusion. Candidate for a later trial.
2. Rounds with an unknown mode appear only under All, while the chart counts them as Casual. Kept on purpose: those rounds show an "Unknown" badge, so listing them under Casual would be inaccurate, and the "of M loaded" count still includes them.
3. The "N of N loaded" count next to a larger "saved rounds" total could mislead, and the load hint was far from the button. Repair 1: the hint now says older rounds aren't loaded yet and that the control is below the list.
4. The filter resets when the player leaves the page. Out of scope.

Builder fix before review: the status separator had been garbled to "?" by shell encoding and was restored to "·".

Limitations: the task was checked with component interactions and a reviewer simulation, not with a real browser session or real players. Filtering happens only on the client, over loaded rounds; searching the server archive is excluded.
