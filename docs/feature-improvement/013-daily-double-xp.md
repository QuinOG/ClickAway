# 013: Double XP on the first round of the day

## Player task
A player who played yesterday has a reason to come back today and play a round.

Why it matters: whether players return the next day is the strongest predictor of whether a game keeps them, and a small daily reward is the most common fair way to give them a reason. This version only adds: there's no streak to lose and nothing taken away for missing a day. Whether it raises returns here is a hypothesis; there are no player numbers.

Not requested directly; chosen under the user's go-ahead (2026-11-14) to pick the highest-value hook work from game-behaviour research.

## Baseline (observed)
Nothing in the game changed from one day to the next: no daily challenge, bonus or streak. Lobby before: shots/009/after-*. First Results before: shots/011/after-* (+160 XP).

## Intended outcome (pass/fail)
- The first XP-earning round of each UTC day earns its XP twice, decided by the server inside the locked save transaction (two rounds finishing together can't both claim it).
- Practice and unverified rounds earn no XP, so they neither get nor use up the bonus.
- The lobby says "First round today earns double XP" above Start when the selected mode earns XP and no XP round has been played today.
- Results shows the doubled XP with "XP · 2× today"; the "one more round" line doesn't assume the next round is doubled.
- Not changed: coins, rank, every other round's XP.

Excluded: daily challenges, streaks, notifications. No schema change (uses round_history's existing xp_earned and played_at). Repair limit: two.

## Result
- Server: `completeUserRound` checks for an earlier XP-earning round today under the user row lock and doubles `earnedXp` if there is none; the history row stores the doubled XP; the response adds `dailyBonusXp` (and `earnedXp` includes it).
- Client: lobby notice (`ReadyOverlay`), Results label (`GameOverOverlay`), `nextRoundXp` in the goal line.
- Checks: 3 server tests run the real `completeUserRound` with a scripted connection (first round doubled, second not, no-XP rounds don't check or consume); goal-line test for the bonus; 4 lobby notice tests (no rounds, XP round today, only yesterday's, Practice). Lint, unit, full UI suite and build pass.
- Shots: shots/013/after-lobby-*, after-results-* (the save ran with a mocked bonus response).
- Day boundary is UTC, so for a player in New York the day turns over at 7 or 8 p.m. local time. A local-day boundary would need the player's time zone on the server.
