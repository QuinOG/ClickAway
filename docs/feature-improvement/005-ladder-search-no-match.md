# Trial 005: a Ladder search that finds nobody says so

## In plain terms

- **Search that finds nobody.** Problem: searching the Ladder for a name that doesn't exist said "No ranked players yet. Finish your placement matches", as if the Ladder were empty. Solution: it now says *No players match "Zephyr"* and has a **Clear search** button that takes you back.
- **Around Me searches (Sol's finding).** Problem: in Around Me, a search only looks at players near you, but the message didn't say so. Solution: it now explains that Around Me only searches a small window near your rank, and offers **Search all players**.
- **Standing card during a search (Sol's finding).** Problem: during a search, the card at the top said "0 ranked" or "unranked, finish placement" even for ranked players. Solution: it keeps showing the whole Ladder's size and your real rank.
- **Old results replacing new ones (Sol's finding).** Problem: if an older, slower search finished after a newer one, it replaced the newer results. Solution: only the newest search can update the page.
- **Message changing too early, and long searches (Sol's findings).** Problem: while you corrected a search, the message briefly named the new name as "no match", and very long searches spilled out of the box. Solution: the message only names a search whose results have loaded, and long text wraps.

Before / after screenshots: `shots/005/before-search-*` and `after-search-*` (Ladder after typing "Zephyr").

## Problem and selection

Player task: search the Ladder for a player by name. If the name is wrong, understand that the search found nobody, then fix the search or get back to the full Ladder.

Observed (Sol, trial 004 review; confirmed in code at `LeaderboardPage.jsx:770`): any empty result shows "No ranked players yet. Finish your placement matches to start populating the ladder.", even when it came from a search with no matches. Your own rank and the rest of the Ladder still exist, so a player who mistypes a name is told the Ladder is empty and that they need placement matches. The message is wrong and gives the wrong next step. There is no "clear search" action except deleting the text by hand.

Selected because the message is wrong (not just a style issue), it affects a common action (search), and it is small and fully testable. How often players search is unknown.

## Baseline and acceptance (written before implementation)

Baseline: in a component test with a search that returns no rows, the page says "No ranked players yet." and offers no way to clear the search. The focused test must fail before the change.

Pass conditions:

1. A search with no matches says that no players match that search and names what was searched. It does not mention placement matches.
2. It offers a "Clear search" action that empties the search box, returns focus to the search box, and shows the full Ladder again.
3. A truly empty Ladder (no search) still shows the existing "No ranked players yet" guidance.
4. A failed load still shows the existing error and Retry, not the no-match message.
5. Typing a new search after a no-match result works as before. Trial 003's Duel links and trial 004's phone layout are unaffected.

Excluded: server search behavior (for example, fuzzy matching), search suggestions, and the Around Me view's server logic. One experiment, at most two repairs after Sol's review.

## Result

**Classification: accepted locally, with one known open defect** (see re-check 2). The final re-check was done by a separate Claude reviewer, because Sol's account hit its usage limit. Not shipped, and not validated by players.

Final behavior: with no search, an empty result keeps the placement guidance. A search with no results shows "No players match “X”." with **Clear search**, which empties the box, refocuses it and reloads the list. In Around Me it says that the view only searches a small window near your rank, and offers **Search all players** (switches to Top Players and keeps the search) as well as Clear search. The message uses the search whose results are showing (`resultsQuery`). Only the newest request may update the page. The field count and your rank are kept from loads without a search when a search omits them. Long search text wraps.

Before and after: `tests/ladderSearchNoMatch.test.jsx` has 9 checks. Before the change, 2 of the first 4 failed; the other 2 guard the empty Ladder and load errors. All 9 pass after the repairs. The test fixture for `/leaderboard` now filters by `search`, like the server does.

Checks: the Ladder test files pass (15/15). The full UI suite has the same 7 failures as `main`. The phone-controls and release Ladder browser tests pass. Measured in a browser, a 600-character search stays inside the 330px box with no horizontal scroll.

Independent review: Sol (`gpt-6.1-sol`, medium).
- **Review 1, verdict fail.** It confirmed the basic search fix works. It found: (1) Around Me wording that was misleading, and Clear search promising "the full Ladder"; (2) the standing card showing "0 ranked" or "Complete placement" during a search (this already existed); (3) the live region briefly naming the new search as "no match"; (4) a long search overflowing its box. Also already existing and out of scope: board tabs ignore arrow keys, and hover cards have duplicate landmark names.
- **Repair 1** fixed 1, 3 and 4, and part of 2 (field count).
- **Re-check 1, verdict fail.** 1, 3 and 4 were confirmed fixed. Still open: the standing card said "Outside the placed ladder / UNRANKED" when the server omits your rank during a search. New findings: a slow older search response replaced newer results (this already existed); the server's Around Me search filters by name before finding your window, so even nearby players can be missed (server code, out of scope).
- **Repair 2 (last allowed):** your known rank is kept during a search, and stale responses are ignored. The Around Me wording now only claims what the view actually searched.
- **Re-check 2, by a separate Claude agent (Sol unavailable); verdict pass with issues.** It wrote 14 tests of its own with mocks that behave like the server. A, B and C are fixed and no message says anything false, and all the earlier fixes hold, with no regressions. Its findings:
  1. **New, open (the repair limit was reached):** your-rank memory can go stale. The server ranks only the players a search matches, so a search like "r" ranks you #3. A following no-match search then keeps that #3 ("You are ranked #3 out of 5") instead of your real #4. Switching boards during a search does the same. Fix: keep only the rank from the last load without a search, per board.
  2. Already existed: during a search, the ranks shown are counted among the matching players only (server behavior). This is the root cause of 1.
  3. The Around Me explanation is true but blames the window size. The real cause is the server dropping you from your own search, so even nearby players aren't found. The "Search all players" button recovers correctly.
  4. New, minor: after "Search all players" the button disappears and keyboard focus falls back to the top of the page.

Process note: a cancelled duplicate review left its temporary spec `tests/e2e/zz-sol-review-005.spec.js` in the repo. It was moved to the scratchpad and not committed.

Follow-up (server, out of scope): Around Me + search should find your window first and then filter by name (`server/playerMysqlDatabase.js` near line 1505).
