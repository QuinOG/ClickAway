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

## Review (Sol, high reasoning: pass with issues) and repair 1
- Confirmed: lobby and Results agree across Practice/Casual/Ranked and with or without an XP round today; Results uses the server total without doubling again; the goal line leaves the bonus out. In a scripted two-connection model with the row lock, two simultaneous rounds got [160, 0]. Practice and tokenless rounds neither get nor use up the bonus. The UTC midnight expression is correct against a timestamptz column.
- Issue: the lobby inferred eligibility from the 50 loaded rounds, so 50+ zero-XP rounds after an XP round today would advertise a bonus the server wouldn't give. Repair: the progress response now includes `dailyBonusAvailable` from the same server query the save uses (`hasXpRoundToday`); the loaded-rounds check is only a fallback for responses without it.
- Policy, kept: a verified duel round earns XP, so it can be the day's bonus round. That matches "first XP-earning round of the day".
- Known edge, not changed: at the 10,000,000 XP cap, history records the full XP while the player gains only what fits. The same was true of base XP before this change.
- Seen but outside this trial: on phones, Practice's End Practice button can sit outside the screen.
