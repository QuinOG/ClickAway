# Trial 003: challenge a player you see on the Ladder

## In plain terms

- **Duel button on the Ladder.** Problem: to duel someone you saw on the Ladder, you had to remember their exact name, go to Duels and type it in. Solution: every other player's row now has a **Duel** button that opens Duels with that player already filled in as your rival. Your own row has no button.
- **Showing the rival on phones (Sol's finding).** Problem: on a phone, the filled-in rival was far down the Duels page, and the first thing you saw was a card for a different player's duel. Solution: Duels now scrolls to the rival and shows "Rival set to Kestrel. Pick a run to stake, or type another name."
- **Honest wording (Sol's finding).** Problem: the note said the rival was "picked from the Ladder" even when someone just edited the web address. Solution: it now simply says "Rival set to …".
- **Not interrupting typing.** Problem: the scroll-and-focus step could pull the cursor out of the name box if the player had already started typing. Solution: it only happens when the player hasn't started doing anything yet.

Before / after screenshots: `shots/003/before-ladder-*`, `after-ladder-*`, `before-duels-*`, `after-duels-*` (Duels after pressing Duel on Nova's row).

## Problem and selection

Player task: while looking at the Ladder, pick a player (for example, the one just above you) and send them a ghost duel.

Observed in the app: Ladder rows for other players have no action. The only link on a row is "Open profile" on your own row, and the hover card has no duel action. Nothing anywhere in the app links to Duels with a rival chosen (searched `src` for `/challenges`). To duel someone from the Ladder, a player has to remember their exact username, open Duels, and type it into "Opponent username". There is no player feedback or usage data, so demand is a hypothesis. The Ladder and Duels are the two competitive surfaces, and connecting them is the natural "beat that person" journey.

Selected because the obstacle is reproducible, the change is small (a link plus a pre-filled field), and it can be fully checked with local mocks. Other candidates checked: History follow-ups (cramped phone dates, chart labels) are visual polish, not a player task. No other feature gap was found on Shop or Help in this pass.

## Baseline and acceptance (written before implementation)

Baseline: no "challenge" control exists on the Ladder, and opening Duels always starts with an empty rival field. Screenshots: `shots/003/before-ladder-*.png` and `shots/003/before-duels-*.png`. A focused test must fail before the change.

Pass conditions:

1. Every other player's Ladder row (top list, around-me list and search results) has a visible, keyboard-reachable control named for that player ("Challenge Nova to a ghost duel") that works without hovering, including on phone. Your own row has no challenge control.
2. Using it opens Duels with that player already filled in as the rival. The player still chooses which run to stake and presses Send. The duel is sent to that player.
3. Duels makes clear where the rival came from, and the player can change or clear the rival before sending.
4. Edge cases: a player with no recorded runs still sees the rival filled in, plus the existing "Record a run" path. Arriving with your own name, or an empty or over-long name, does not fill the field. After a duel is sent, the form clears as before and does not fill the same rival again.
5. Existing Ladder behavior (sorting, search, views, own-row profile link, hover card) and Duels behavior (inbox, filters, manual entry) are unchanged.

Excluded: the server, new duel rules, a player profile page for other players, and visual redesign. One experiment, at most two repairs after Sol's review.

## Result

**Classification: accepted locally.** Not shipped, and not validated by players.

Final behavior: each other player's Ladder plate has a "Duel" link under its rating (accessible name "Challenge <name> to a ghost duel") pointing to `/challenges?rival=<name>`. Duels pre-fills the rival only for names of 3-32 characters that are not your own. It shows a confirmation note, and once the inbox has loaded it scrolls the note into view and focuses it, unless the player has already focused something. After a duel is sent, the form clears and `rival` is removed from the URL, so the rival doesn't come back.

Before and after: in `tests/ladderToDuel.test.jsx`, 4 of 7 checks failed before the change. The other 3 guard the self, empty and over-long names. All 7 pass now.

Builder checks: measured in a browser, the Duel link fits in the rating column at 1440 (170px) and 390 (110px) with no horizontal scroll. Rows with a Duel link are taller (117px instead of 86px). An axe scan of Ladder, Duels, and Duels with a rival found no serious or critical violations, the same as before. The full UI suite shows the same 7 failures as `main`, all outside these pages. The release-matrix suite shows the same failures as before. Its accessibility test stops at `/profile` (a problem that already existed) before reaching Ladder, so Ladder and Duels were scanned separately.

Independent review: Sol (`gpt-6.1-sol`, medium) ran 19 browser checks of its own, including keyboard-only use, editing the rival, a rejected send, self, empty and over-long names, special characters, and the inbox actions. **Verdict: pass with issues.** Its findings:
1. On phone, the Ladder view toggle and metric tabs run off-screen. This was already in the before shot and is out of scope.
2. On phone, row names overlap the rating column. This was already in the before shot. The Duel link stays on top and can be tapped: Sol completed the phone flow.
3. On phone, after following Duel, the rival was far down the page, focus was on the page itself, and the visible card was an unrelated "vs Nova" duel. Repair 1: Duels scrolls the confirmation note into view and focuses it. Measured at 390x844, the rival field (y 324-372), the note (433-467) and the first run (559-671) are all on screen.
4. A hand-edited URL produced "<name> was picked from the Ladder". Repair 1: the wording is now "Rival set to <name>. Pick a run to stake, or type another name."
5. The replay radios don't respond to arrow keys. This already existed and is out of scope.

During repair, a builder test found that the focus step could take focus away from a player who was already typing. A guard now skips the scroll and focus if anything else has focus.

Limitations: the server's handling (unknown names, delivery) was checked only through mocks. No real players.
