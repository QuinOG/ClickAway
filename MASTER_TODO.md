# MASTER TODO — ClickAway
> Plain feature/task list. No implementation plans, just what needs to be done.
> Last updated: 2026-04-02

---

## Bugs & Cleanup

- [ ] **FIX-01** — `git add` the two untracked files: `TierBadge.jsx` and `add_round_reaction_metrics.sql`
- [ ] **FIX-02** — Remove dead `difficultyId` field from history entries in `historyUtils.js` (duplicate of `modeId`)
- [ ] **FIX-03** — Extract `formatNumber` and `formatReactionTime` into a shared `src/utils/formatUtils.js` (currently copy-pasted in `GameOverOverlay.jsx` and `ProfilePage.jsx`)
- [ ] **FIX-04** — `ReadyOverlay.jsx` hardcodes mode names and copy disconnected from `difficultyConfig.js` — pull from config instead
- [ ] **FIX-05** — Remove stray `console.log` from `handleProfileOpen` in `LeaderboardPage.jsx`
- [ ] **FIX-06** — Rename `persistedAchievementIds` → `unlockedAchievementIds` throughout `App.jsx` for consistency
- [ ] **FIX-07** — Shop actions (`handlePurchase`, `handleEquip`) call `fetchCurrentUser` twice — deduplicate
- [ ] **FIX-08** — `PlayerHoverCard` is missing a "Rounds Played" stat row

---

## Quick Wins

- [ ] **QW-01** — Add a "Rematch" button to `GameOverOverlay` that restarts with the same mode, skipping the carousel
- [ ] **QW-02** — Show a near-miss message when the player scores within 12% of their personal best but doesn't beat it ("So close! PB: X")
- [ ] **QW-03** — Display the player's current personal best score in the HUD during play, highlight it if beaten mid-round
- [ ] **QW-04** — Celebrate a new best streak at end of round (distinct message/styling, not just the generic score summary)
- [ ] **QW-05** — Show "X XP to next level" text below the XP bar on the `GameOverOverlay`
- [ ] **QW-06** — Show a contextual message on ranked loss when accuracy is the main culprit (e.g. "Accuracy cost you MMR")
- [ ] **QW-07** — Style "Clean Run" (0 misses) differently in `GameOverOverlay` — gold color or icon
- [ ] **QW-08** — Play a brief animation when a shop item is purchased (coins deducted, item unlocks)

---

## Core Retention Features

- [ ] **RET-01** — Round grade system: award S/A/B/C/D grade at end of each round based on accuracy + streak + hits. Show on `GameOverOverlay` and store in history.
- [ ] **RET-02** — Achievement nudges in `GameOverOverlay`: surface the top 2 closest incomplete achievements ("You're 3 rounds away from X")
- [ ] **RET-03** — Level milestone rewards: at levels 5, 10, 20, 50, etc., show a special unlock screen and award bonus coins
- [ ] **RET-04** — Expand ranked tiers from 3 (Bronze/Silver/Gold) to 9 divisions (Bronze I/II/III, Silver I/II/III, Gold I/II/III) to give players more short-term rank goals
- [ ] **RET-05** — Daily challenge: one fixed objective per day (e.g. "Score 500+ in Ranked") with a coin reward for first completion
- [ ] **RET-06** — Atmosphere tier label: show a flavor label ("Rookie", "Sharpshooter", "Legend") next to level based on bracket ranges
- [ ] **RET-07** — Session summary strip on `ProfilePage`: "Today: X rounds, Y coins earned, Z XP gained"
- [ ] **RET-08** — MMR history sparkline on `ProfilePage`: small SVG line chart showing last 10 ranked rounds' MMR values

---

## Deep Systems

- [ ] **DEEP-01** — Season system: add a `season` concept to ranked — seasons reset MMR, award cosmetics based on peak rank, run for a fixed duration (e.g. 30 days)
- [ ] **DEEP-02** — Title/badge system: earn equippable titles ("Precision Machine", "Cold Streak") from achievements and milestones, display on profile and leaderboard
- [ ] **DEEP-03** — Achievement rewards: grant coins on achievement unlock; add a "Prestige" cosmetic tier only unlockable through achievement milestones
- [ ] **DEEP-04** — Leaderboard cosmetics: show equipped profile image and tier badge icon inline on the leaderboard row
- [ ] **DEEP-05** — Server cleanup: `formatPlayedAtLabel` is duplicated in `historyUtils.js` and `server/db.js` — consolidate; also audit other logic shared between client and server
