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
- Lobby: a "Daily goals · n/3" list on the open stage (top left) on wide screens. On phones the full list sits below Start, with one line above Start naming the next goal and its progress. The double-XP note moves into the list's header. Results: a "Daily goal done" row per goal the round finished.

## Pass/fail conditions
1. A round that crosses a goal pays its reward exactly once; later rounds don't pay it again.
2. Practice and unverified rounds neither count toward nor complete goals.
3. The lobby shows the three goals with progress, reward and time to new goals, and says Practice doesn't count when Practice is selected.
4. Results shows the finished goal only after the save is confirmed.
5. Start stays where it was or higher at 1440×900, 1280×720, 1024×768, 390×844 and 360×640, with no sideways scroll.
6. An older server (no `dailyGoals`) leaves the lobby exactly as before.

Out of scope: streaks of days, rerolls, per-player goals, notifications.

## Evidence
- Unit: `tests/dailyGoals.test.js` (selection, measuring, crossing once, normalizers) and `tests/dailyBonusXp.test.js` (the real `completeUserRound` with a scripted connection: pays once, totals and history include the reward, no-XP rounds never check goals).
- UI: `tests/dailyGoalsUi.test.jsx` (lobby list, header note, Practice note, no-goals fallback; Results row only once saved).
- Layout, measured in the browser: Start's top moved from 792→772 (1440×900), 787→747 (1280×720), 779→739 (1024×768), 725→700 (390×844), 792→749 (360×640); no sideways scroll at any size. At 1280×720 and 1024×768 Start was already below the panel's first view before this change.
- Shots: `shots/daily-goals/`.
