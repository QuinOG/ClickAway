# Trial 006: choose a duel run with the keyboard

## In plain terms

- **Choosing a duel run with the keyboard.** Problem: on Duels, the "Stake a run" picker is announced as a set of radio buttons, but the arrow keys did nothing and every run was a separate Tab stop, so keyboard and screen-reader players couldn't move between runs the way the control tells them to. Solution: Tab now lands on the picker once (on your chosen run, or the first one), the arrow keys move between runs and pick them, Home and End jump to the first and last run, and the next Tab moves on to the message box. Mouse and touch work the same as before.

No screenshots: nothing looks different. The change is in how the keyboard works.

## Problem and selection

Player task: on Duels, using only the keyboard, choose which of your runs to stake and send the duel.

Observed (Sol, trial 003 review; confirmed in code at `ChallengesPage.jsx:437`): the "Stake a run" picker is announced as a radio group (`role="radiogroup"` with `role="radio"` buttons), but it doesn't work like one. The arrow keys do nothing, and every run is a separate Tab stop, so a keyboard or screen-reader player who presses the arrow keys (as the announced role says to) can't change their run. Tab and Space still work, so the task is possible, just not in the way the control announces. Sol confirmed this was already the case before trial 003. Demand is a hypothesis; there is no usage data on keyboard players.

Selected because two independent reviews found it, it is a correctness issue (the control claims behavior it doesn't have), it is bounded to one control, and it can be fully tested in jsdom. It is not visual, so no screenshots are needed. The reviewer for this trial is a separate Claude agent, because Sol's account hit its usage limit and the user asked to finish the run rather than wait.

## Baseline and acceptance (written before implementation)

Baseline: with three runs, Tab reaches every run separately, and ArrowRight on a run changes neither the selection nor the focus. A focused test must fail before the change.

Pass conditions:

1. The picker is a single Tab stop: Tab lands on the selected run, or the first run if none is selected, and the next Tab leaves the picker.
2. ArrowRight/ArrowDown and ArrowLeft/ArrowUp move to the next or previous run and select it, wrapping at the ends. Home and End go to the first and last run.
3. Choosing a run with the keyboard updates the score on the line and the send hint exactly as a click does, and Send duel sends that run.
4. Mouse and touch selection is unchanged. With no runs, the "Record a run" path is unchanged. The trial 003 rival pre-fill and its focus step are unaffected.

Excluded: the Ladder's board tabs (same kind of issue, separate control), visual changes, and the server. One experiment, at most two repairs after independent review.

## Result

**Reverted (user, 2026-11-13).** Not kept by the user.

**Classification: unverified.** No independent review was run. Sol's account hit its usage limit, and the user chose to finish the run without a separate review for this trial ("no need for a separate review on this one since we only have claude available"). Not shipped, and not validated by players.

Final behavior: the radio group handles ArrowRight/Down and ArrowLeft/Up (move and select, wrapping) and Home/End. Each run's `tabIndex` is 0 only for the chosen run, or for the first run when none is chosen, and -1 for the rest. Selection reuses the existing click handler, so the score on the line, the send hint and the feedback cue all behave as they do with a click.

Before and after: in `tests/duelRunPickerKeyboard.test.jsx`, 3 of the 4 checks failed before the change (the 4th guards the no-runs path). All 4 pass now. The trial 003 Ladder-to-Duel tests still pass (11/11 across both files).

Builder browser check (Playwright, 1440 wide): Tab from the rival field lands on the first run, ArrowRight moves focus to the second run and selects it, focus shows a 2px solid outline, Tab moves on to the message input, and Shift+Tab comes back to the chosen run. Axe on Duels reports no serious or critical violations. The full UI suite has the same 7 failures as `main`, all on other pages.

Limitations: no independent reviewer and no real screen-reader session. Only the builder's own tests and browser check support this result.
