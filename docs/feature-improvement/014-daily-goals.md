# 014 · Daily goals

**Status:** accepted locally (independent review below). Built on Claude's own initiative under the 2026-11-15 hand-off, after the user said yes to daily goals.

## Player task and why it matters
A returning player (days 2–10) should have a reason to open the game today and a short, concrete thing to aim for once they do.

- **Observed:** reward pacing is fine for days 2–10 (an unlock every few rounds until about round 26, first cosmetics within about 5 rounds' coins). The only daily reason to return is the first-round double XP (trial 013).
- **Assumed (hypothesis, no player data):** a small daily checklist with a visible reward brings players back more often and gives each session a target. This is the standard retention pattern; its effect on ClickAway isn't measured.

## Baseline
- Lobby: "First round today earns double XP" above Start; nothing else changes day to day.
- Results: coins and XP for the round; no daily objective.

## Design
- Three goals per UTC day, the same for every player, picked by a hash of the date from three pools: a show-up goal (play 3 or 4 rounds), a skill goal (15 or 20 streak, or a 90% accuracy round with 15+ hits) and a variety goal (2 Ranked rounds, or 100 or 150 hits).
- Rewards 40/60/50 coins and 80/120/100 XP (150 coins and 300 XP a day, about 5–6 rounds of coins and 1.5 rounds of XP). Nothing is lost for skipping a day.
- The server awards goals inside `completeUserRound`, under the same user-row lock as the daily bonus. Progress comes from today's `round_history` rows that earned XP, so Practice and unverified (tokenless) rounds can't count, and a goal pays only on the round that crosses it. No migration and no new table.
- Goal coins and XP are added to the round's own totals and history row, and reported separately as `dailyGoalRewards`. Progress reads include `dailyGoals` (day, reset time, goals with progress).
- Lobby: a "Daily goals · n/3" list with the time to new goals, on the open stage (top left) on wide screens. On phones the full list sits below Start, with one line above Start naming the next goal and its progress. On wide screens the double-XP note moves into the list; phones keep it above Start. An open lobby updates its countdown each minute and, once the day ends, replaces the goals with "New goals are ready" until the next save. Results: a "Daily goal done" row per goal the round finished.

## Pass/fail conditions
1. A round that crosses a goal pays its reward exactly once; later rounds don't pay it again.
2. Practice and unverified rounds neither count toward nor complete goals.
3. The lobby shows the three goals with progress, reward and time to new goals, and says Practice doesn't count when Practice is selected.
4. Results shows the finished goal only after the save is confirmed.
5. Start stays where it was or higher on wide screens, and within about one line of where it was on phones, with no sideways scroll in any mode.
6. An older server (no `dailyGoals`) leaves the lobby exactly as before.

Out of scope: streaks of days, rerolls, per-player goals, notifications.

## Evidence
- Unit: `tests/dailyGoals.test.js` (selection, measuring, crossing once, normalizers) and `tests/dailyBonusXp.test.js` (the real `completeUserRound` with a scripted connection: pays once, totals and history include the reward, no-XP rounds never check goals).
- UI: `tests/dailyGoalsUi.test.jsx` (lobby list, header note, Practice note, no-goals fallback; Results row only once saved).
- Layout, measured in the browser: Start's top moved 792→772 (1440×900), 787→747 (1280×720), 779→739 (1024×768), 725→740 (390×844, Casual: goals line added above Start). No sideways scroll at any size or mode. At 1280×720 and 1024×768 Start was already below the panel's first view before this change.
- `tests/e2e/lobby-modes-fit.spec.js`: every mode at 390×844, 360×640 and 820×1180 keeps its panel in the content column with nothing overlapping Start (fails 6/9 on the old CSS).
- Shots: `shots/daily-goals/`.

## Independent review (Sol, high reasoning): fail, then repaired
1. **H, fixed:** a save crossing UTC midnight could be checked against one day and stored in the next, paying the new day's goals twice. Repair: the round is stored at the transaction's database time, the same `now()` the bonus and goal checks use, and the daily queries are bounded to that one day. Sol's attack script, adapted to the fix, shows the second round no longer pays.
2. **M, not fixed (pre-existing):** at the 10,000,000 coin/XP caps the history and response report the full reward while the balance is capped. This predates goals and no real account is near the caps.
3. **M, confirmed and fixed (pre-existing, not caused by goals):** on phones and tablets, choosing Ranked squeezed its status panel into the empty stage column, and choosing Practice shrank the Practice lab to a 2px row, hiding the drills. One CSS rule reset its own column (`grid-area` after `grid-column`); the drawer also clipped itself to nothing. The goals layout itself measured fine; Sol's claim came from reading the CSS.
4. **M, fixed:** the reset time was hidden while the double-XP or Practice note showed. It now always shows; the notes moved to a line under the list.
5. **M, fixed:** an open lobby kept yesterday's goals and a frozen countdown.
6. **M, accepted limitation:** on deploy day, goals finished by rounds saved before the deploy show as done but pay nothing (the server can only see history, not claims). It affects one day once. Old cached clients may misjudge the next-round XP estimate until they reload.

**Status: accepted locally** after repairs.
