# Trial 004: reach every Ladder control on a phone

## In plain terms

- **Ladder buttons off the edge on phones.** Problem: on a phone, the Ladder's "Around Me" button and the "Accuracy" and "Reaction" board tabs were pushed off the right edge of the screen. You couldn't tap them or scroll to them, so you couldn't easily see where you stand. Solution: on phones, the board tabs now wrap into two or three rows and the search box and view buttons fit the screen, so every control is visible and tappable. Tablet and desktop look exactly the same as before.
- **Bigger Duel buttons (Sol's finding).** Problem: the Duel buttons added in trial 3 were a little small to tap on a phone (32px tall). Solution: they are now 40px tall.

Before / after screenshots: `shots/004/before-ladder-*`, `after-ladder-*`, `after-aroundme-*` (after tapping Around Me).

## Problem and selection

Player task: on a phone, switch the Ladder to **Around Me** to see where you stand, and switch the board to another metric (for example **Reaction**).

Observed and measured (Sol, trial 003 review; confirmed by the builder): at 390px and 320px wide, the Ladder control panel is laid out 466px wide. "Accuracy" is cut off, and "Reaction" (x 417-517) and "Around Me" (x 404-509) start completely off-screen. The page doesn't scroll sideways, so the hidden controls can't be reached. The page also passes a "no horizontal overflow" check, because the overflow is clipped, which is why existing tests missed it. Desktop (1440) is fine. Cause: the five board tabs are forced into one row of five columns, each at least as wide as its label (`game-feel.css:4842`), and the rest of the panel stretches to match.

Selected because it blocks a real player task outright on phones, it is measured rather than assumed, and the fix is bounded to one panel. It overlaps visual polish, but the goal is reachability, not looks. How many players use the Ladder on phones is unknown.

## Baseline and acceptance (written before implementation)

Baseline: `tests/e2e/ladder-phone-controls.spec.js` fails at 320 and 390 ("Accuracy right edge 410.6 > 320/390"). Screenshots: `shots/004/before-ladder-*.png`.

Pass conditions:

1. At 320px and 390px, every board tab, the search box, both view buttons and the sort control are fully on screen and at least 36px tall, with no sideways page scroll.
2. A player can switch to Around Me and to the Reaction board by tapping, and the pressed/selected state updates.
3. Desktop (1440) and tablet layouts of the panel are unchanged.
4. Trial 003's Duel links, search, sorting and hover cards still work. No new serious accessibility violations on the Ladder.

Excluded: row layout (names overlapping ratings on phone was noted in 003 and is visual polish), the podium, and other pages. One experiment, at most two repairs after Sol's review.

## Result

**Classification: accepted locally.** Not shipped, and not validated by players.

Final behavior: below 600px wide, the controls panel and its children may shrink to the screen width. The board tabs use `repeat(auto-fit, minmax(88px, 1fr))`, which gives 2 + 2 + 1 rows at 320-360px and 3 + 2 at 390-430px. Search takes the full width, and the two view buttons share a row. All of this is in `ladder.css`, scoped to `.leaderboardPageScene`.

Before and after: `tests/e2e/ladder-phone-controls.spec.js` failed at 320 and 390 ("Accuracy right edge 410.6"). It now passes at both widths, including tapping Around Me and Reaction, and Duel link height of at least 40px.

Builder checks: the measured layout at 768 and 1440 is identical to before, control by control. At 600 the panel is 6px taller and search takes a full row. Axe at 390 found no serious violations. At 320 there is one serious color-contrast violation on your own row's name. It is identical before the change, so it already existed and is out of scope. The trial 003 tests still pass (7/7).

Independent review: Sol (`gpt-6.1-sol`, medium) ran 7 browser tests of its own at 320, 360, 390 and 430 wide, 844x390 landscape, 768 and 1440, using touch and keyboard. **Verdict: pass with issues, no defect introduced.** All 9 controls fit with no overlaps. The task worked at every width, and tablet and desktop geometry was unchanged (708x148 and 1116x148). Its findings, all present before this trial:
1. A search with no matches says "No ranked players yet. Finish your placement matches…", which is misleading. Candidate for the next trial.
2. Hover cards are 360px wide, so they run off-screen at 320 and 360. Out of scope.
3. The Duel links from trial 003 are 32px tall on phones. Repair 1: raised to a minimum of 40px, and the browser check now asserts it.
4. The board tabs (`tablist`) don't respond to arrow keys. Out of scope.
5. Two regions have duplicate landmark names (moderate). Unchanged and out of scope.

Limitations: no real devices or players. The page still needs vertical scrolling to reach the controls.

## Follow-up (user review, 2026-11-13): the rest of the Ladder on phones

- **Problem:** On phones, each Ladder row kept its desktop three-column layout. At 320px the player column was about 28px wide, so names and rank badges spilled over the rating and off the screen (for example, your own "Gold II" badge at x 334-413 on a 320 or 390 screen).
- **Solution:** Below 600px wide, each row stacks: rank and player on the first line (the rank badge wraps under the name when needed), then the rating and Duel button on a second line. This uses the standard spacing steps.

Measured after the change: nothing runs off-screen at 320, 360 or 390, the rating line starts 8px below the player line, Duel buttons are 40px tall, and tablet and desktop rows are unchanged. Rows are taller on phones (145px at 390, up to 173px for your own row). Still open: podium names are shortened with "…" (for example "Kes…" at 320) because the podium columns are 45px wide. Screenshots: `shots/004b/before-ladder-*` and `after-ladder-*`.
