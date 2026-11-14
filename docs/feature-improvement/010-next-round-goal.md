# 010: Results names the goal one more round could reach

## Player task
After a round, a player decides whether to play again. Give them one concrete, reachable reason to.

Why it matters: people try harder as a goal gets close (goal-gradient effect), and a narrow miss makes them want to try again more than a clear loss does (near-miss effect). Results already had the data, but only showed "40 — keep climbing" and a "vs best" bar. Whether this raises replays here is a hypothesis; there are no player numbers.

## Baseline (observed)
`PLAY_ROUND=1 BEST=40` (shots/010/before-*): a score of 37 against a best of 40 shows "40 — keep climbing" in the header and 93% on a bar. Nothing near Play Again says how close the player was or what the next round could get.

## Intended outcome (pass/fail)
- When the round lands within 15% (at least 5 points) of the personal best: "N points off your best." directly above Play Again.
- Otherwise, when one more similar round would reach the next level: "One more round like that reaches Lv N" (plus "and unlocks X" when a part unlocks there).
- Nothing when neither is close, before the save is confirmed, or in Practice.
- Not changed: everything else on Results; new-best and first-score rounds.

Excluded: rank/RR goals (RR math is sensitive), new UI elsewhere. Repair limit: two.

## Result
- `src/utils/nextRoundGoal.js` picks the goal; `GameOverOverlay` shows it as the first line of the actions row.
- Checks: 5 unit tests (near miss, far miss, new best, level reach with unlock, out of reach) and 3 Results render tests (shown when saved, hidden while saving, hidden on a far miss). Shots: shots/010/after-*.
- Seen but not caused here: on phones the unlock card's title and label are cut off (also in the before shot). Picked up in the next trial.
