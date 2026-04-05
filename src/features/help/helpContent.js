import {
  PLACEMENT_MATCH_COUNT,
  PLACEMENT_MATCH_SCORE_MAX,
} from "../../utils/rankUtils.js"

export const QUICKSTART_CARDS = [
  {
    eyebrow: "1",
    title: "Pick a mode",
    body: "Practice teaches mechanics. Casual pays XP and coins. Ranked adds competitive progress.",
  },
  {
    eyebrow: "2",
    title: "Start the round",
    body: "Pick your active build in Ready, press Start Round, and use the 3-second countdown to center up.",
  },
  {
    eyebrow: "3",
    title: "Hit to build",
    body: "Click the target to grow streak and multiplier. A miss resets your streak immediately and applies the mode penalty.",
  },
  {
    eyebrow: "4",
    title: "Use powers and rewards",
    body: "Keys 1, 2, and 3 use your equipped powers during live rounds. Practice gives no progression; Casual and Ranked do.",
  },
]

export const ROUND_FLOW_STEPS = [
  {
    title: "Ready",
    body: "Choose a mode, preview the rules, and confirm Start.",
  },
  {
    title: "Countdown",
    body: "The 3 -> 2 -> 1 countdown gives you a beat to center up before live play.",
  },
  {
    title: "Live Round",
    body: "Each hit shrinks the target and randomizes its next position.",
  },
  {
    title: "Miss",
    body: "A miss resets streak to 0 and applies the score penalty for that mode.",
  },
  {
    title: "Game Over",
    body: "Score, accuracy, streak, rewards, and ranked result all finalize here.",
  },
  {
    title: "Play Again",
    body: "You return to Ready with your chosen mode preserved.",
  },
]

export const CONTROLS_ROWS = [
  ["Hit Target", "Left click directly on the moving target."],
  ["Miss", "Left click the arena outside the target."],
  ["End Practice Round", "Use the End Practice Round button during Practice."],
  ["Use Power Slot 1", "Press 1 during live rounds when the first equipped power is charged."],
  ["Use Power Slot 2", "Press 2 during live rounds when the second equipped power is charged."],
  ["Use Power Slot 3", "Press 3 during live rounds when the third equipped power is charged."],
  ["Mode Carousel", "In Ready overlay: Left/Right arrows or carousel arrows change mode; Enter starts."],
]

export const NAVIGATION_ROWS = [
  ["Game", "Play rounds, use power-ups, and generate score/reward history."],
  ["Armory", "Tune loadouts, compare mode sims, and set which build Ready uses next."],
  ["Profile", "View identity, ranked insights, achievement progress, and logout controls."],
  ["Shop", "Spend coins on cosmetics and equip owned items instantly."],
  ["History", "Review past rounds (mode, score, XP, coins, rank result)."],
  ["Leaderboard", "Compare placed ranked players and competitive rating positions."],
  ["Help", "Reference systems, formulas, controls, and progression rules."],
]

export const DIFFICULTY_ROWS = [
  ["Practice", "No limit", "0", "Off", "Off", "Off"],
  ["Casual", "30s", "1", "1.00x", "On", "Off"],
  ["Ranked", "15s", "2", "1.50x", "On", "On"],
]

export const MODE_EXPLANATION_POINTS = [
  "Practice: untimed training with no coins, no XP, and no rank changes.",
  "Casual: timed mode (30s) with moderate miss penalty and steady progression.",
  "Ranked: shorter timer (15s), faster shrink pressure, placement matches, and rank movement enabled.",
  "Mode-specific tuning changes difficulty feel: min size, shrink factor, combo step, and miss cost.",
  "Ranked and Casual both award XP, but only Ranked changes your competitive rating.",
]

export const MODE_TUNING_ROWS = [
  ["Practice", "110px", "24px", "2%", "Every 6 hits", "40s"],
  ["Casual", "100px", "12px", "4%", "Every 5 hits", "30s"],
  ["Ranked", "96px", "10px", "6%", "Every 4 hits", "24s"],
]

export const RANK_TIER_ROWS = [
  { id: "bronze", label: "Bronze I-III", mmrRange: "0-299 Rating", imageSrc: "/ranks/bronze.png" },
  { id: "silver", label: "Silver I-III", mmrRange: "300-599 Rating", imageSrc: "/ranks/silver.png" },
  { id: "gold", label: "Gold I-III", mmrRange: "600-899 Rating", imageSrc: "/ranks/gold.png" },
  { id: "platinum", label: "Platinum I-III", mmrRange: "900-1199 Rating", imageSrc: "/ranks/platinum.svg" },
  { id: "diamond", label: "Diamond I-III", mmrRange: "1200-1499 Rating", imageSrc: "/ranks/diamond.svg" },
  { id: "deadeye", label: "Deadeye", mmrRange: "1500+ Rating", imageSrc: "/ranks/deadeye.svg" },
]

export const RANK_RULES_POINTS = [
  `Your first visible rank appears only after ${PLACEMENT_MATCH_COUNT} Ranked placement matches.`,
  "All major ranks use I -> II -> III divisions except Deadeye, which has no subdivisions.",
  "Internal rating is still numeric, but normal ranks display division progress as RR instead of raw MMR.",
  "Promotion into a new visible division grants 2 matches of demotion protection.",
  `Each placement match awards a simple 0-${PLACEMENT_MATCH_SCORE_MAX} score based on score, accuracy, streak, and miss control.`,
  `Your first placement rank comes from the average of ${PLACEMENT_MATCH_COUNT} placement scores and is capped at Gold III.`,
  "Round rank delta is still performance-based and clamped for stability.",
]

export const SCORING_ROWS = [
  ["Points Per Hit", "points = basePointsPerHit x comboMultiplier (basePointsPerHit = 1)."],
  ["Combo Multiplier", "comboMultiplier = 1 + floor(streak / comboStep)."],
  ["Combo Step by Mode", "Practice: 6, Casual: 5, Ranked: 4."],
  ["Miss Penalty", "Practice: 0, Casual: -1, Ranked: -2 (score never drops below 0)."],
  ["Accuracy", "accuracy% = round(hits / (hits + misses) x 100)."],
  ["Target Shrink", "Each successful hit shrinks size by mode shrinkFactor until minButtonSize."],
]

export const POWERUP_ROWS = [
  ["Time +2s", "Lv 1", "Every 5 streak", "Adds 2 seconds in timed rounds."],
  ["Grow +10", "Lv 1", "Every 8 streak", "Increases current target size by 10, capped at round start size."],
  ["Freeze 1s", "Lv 1", "Every 12 streak", "Stops movement and reposition for 1 second."],
  ["Magnet Center", "Lv 4", "Every 9 streak", "Centers the target, adds 6 size, and freezes it briefly."],
  ["Combo Surge", "Lv 7", "Every 14 streak", "Your next 4 hits score as if streak were 4 higher."],
  ["Guard Charge", "Lv 11", "Every 16 streak", "The next miss within 8 seconds keeps streak and prevents miss penalty."],
]

export const POWERUP_RULES_POINTS = [
  "Power-up charges start at 0 every round and do not carry across rounds.",
  "Your active loadout chooses which 3 powers occupy keys 1, 2, and 3 for that round.",
  "Charges are awarded when streak exactly hits each equipped power's milestone.",
  "Power-ups can only be activated while the round is actively playing.",
  "Time +2s cannot exceed mode time buffer cap (Practice 40, Casual 30, Ranked 24).",
]

export const LOADOUT_POINTS = [
  "Every account has 3 saved loadout slots, and the active slot is chosen in Ready before a round starts.",
  "Each loadout contains 3 passive modules: Tempo Core, Streak Lens, and Power Rig.",
  "Passive modules always come with tradeoffs. Faster scoring setups usually make misses or target pressure harsher.",
  "Armory is where you rename builds, swap modules and powers, and compare how they feel in each mode.",
  "Builds are legal in every mode, including Ranked. XP, coin, and rating formulas stay the same; only gameplay conditions change.",
]

export const SHOP_POINTS = [
  "Shop is cosmetic-only: no paid item changes scoring, hitbox, or rank gain.",
  "Buildcraft loadouts are separate from the shop and are edited in Armory.",
  "Shop categories are button skins, arena themes, and profile images.",
  "Buy unowned items with coins; owned items can be equipped repeatedly for free.",
  "Profile image, button skin, and arena theme equip independently.",
  "Built-in defaults are always available even with zero coins.",
]

export const PERFORMANCE_TIPS = [
  "Prioritize hit confirmation over speed when target gets small.",
  "Watch the timer and combo, not just score. Consistency beats panic clicking.",
  "Use Freeze to stabilize high-pressure moments and protect streak.",
  "Use Grow after several shrink cycles so hitbox recovery is meaningful.",
  "In Ranked, avoid miss spirals: penalties compound through score + accuracy impacts.",
  "If the target gets too small, protect streak first and stop taking risky misses.",
  "If accuracy dips, reset pace for 3-5 clean hits before pushing tempo again.",
]

export const PROGRESSION_POINTS = [
  "Mode reward gates: Practice (none), Casual (XP + coins), Ranked (XP + coins + rank).",
  "Coins formula: floor(hits x coinMultiplier).",
  "XP base formula: hits x 5 + bestStreak x 3 + floor(score x 0.2).",
  "XP accuracy bonus: +25 at >=90% accuracy, +10 at >=75% accuracy.",
  "Level XP requirement scales linearly: 100 + (level - 1) x 50.",
  "History stores mode, score, hits, misses, streak, coins, XP, and ranked result per round.",
]

export const DATA_SYSTEM_POINTS = [
  "Progress is stored against your signed-in account on the server.",
  "Rounds, achievement unlocks, purchases, equips, and loadout edits all sync back to the server while you play.",
  "Tracked data includes coins, XP, competitive rating, history, owned items, equipped cosmetics, saved loadouts, and unlocked achievements.",
  "Clearing browser/site storage or logging out signs you out locally but does not erase account progression.",
  "Signing into the same account on another browser/device restores the same stored progression.",
  "If a saved session is invalid or expired, the app signs you out and asks you to log in again.",
]

export const ACCOUNT_ROWS = [
  ["Create Account", "Sign up with a 3-32 character username and an 8+ character password."],
  ["Login", "Use the same username/password later to restore your saved account progress."],
  ["Protected Pages", "Game, Armory, Profile, Shop, History, Leaderboard, and Help all require sign-in."],
  ["Session Restore", "On refresh, the app checks your saved session and reloads your account automatically."],
  ["Session Expiry", "If the saved session is no longer valid, you are returned to login."],
  ["Logout", "Logout clears this browser session only. Server-side progression stays attached to your account."],
]

export const PROFILE_POINTS = [
  "Profile combines avatar identity, coin balance, level progress, ranked card, and achievements in one page.",
  `The ranked panel shows Unranked before placements begin, then a visible placement tracker until match ${PLACEMENT_MATCH_COUNT} reveals your first rank.`,
  "Recent ranked insights summarize the last 10 Ranked rounds: total movement, positive-round rate, and sample size.",
  "Achievement tabs cover Rounds, Level, Ranked, Economy, Streak, and Master milestones.",
  "Category Master achievements unlock after finishing an entire core category; Master of Masters requires every category master.",
  "Unlocked achievements sync automatically to your account once your saved stats meet the requirement.",
]

export const TRACKING_POINTS = [
  "History keeps the 50 most recent rounds, newest first, with time, mode, score, hits, misses, accuracy, coins, XP, and ranked result.",
  "After Game Over, review score, accuracy, streak, XP, coins, and ranked result before jumping into the next queue.",
  "If your account has no saved rounds yet, the History page shows an empty state with a quick link back to Game.",
  "Leaderboard only includes players who have completed placements and currently loads up to 25 players from the server.",
  "Server rank order is hidden rating first, then best score, best streak, accuracy, username, and user id as tie-breakers.",
  "Leaderboard headers let you re-sort the visible rows by rating, best score, best streak, or accuracy.",
  "Hover leaderboard names for quick stats. Your own row is marked YOU and opens your profile; other players currently expose hover stats only.",
]

export const FAQ_ITEMS = [
  {
    question: "What mode should I start with?",
    answer: "Practice first for mechanics, then Casual for stable rewards, then Ranked for ranked climb.",
  },
  {
    question: "Why did my rank not change?",
    answer: `Rank movement only happens in Ranked rounds. During placements, your visible rank stays hidden until match ${PLACEMENT_MATCH_COUNT}.`,
  },
  {
    question: "Do power-ups carry to the next round?",
    answer: "No. Charges reset at the start of each round.",
  },
  {
    question: "How are coins calculated?",
    answer: "Coins are floor(hits x coin multiplier). Ranked uses a higher multiplier than Casual.",
  },
  {
    question: "How is XP calculated?",
    answer: "XP uses hits, best streak, score scaling, plus an accuracy bonus when thresholds are met.",
  },
  {
    question: "Can cosmetics improve rank or score?",
    answer: "No. Cosmetics are visual only. Loadouts can modify gameplay, but cosmetics never do.",
  },
  {
    question: "Why is my History page empty?",
    answer: "History stays empty until your account has real saved rounds. Once you finish a match, the page starts logging time, mode, score, rewards, and ranked result.",
  },
  {
    question: "How do achievements unlock?",
    answer: "Achievement progress is calculated from your saved level, coins, best streak, and round history, then synced to your account automatically.",
  },
  {
    question: "Why does my account appear reset?",
    answer: "Make sure you are signed into the same account. Progress now follows your account, not just one browser.",
  },
]

export const HELP_QUICK_NAV = [
  { id: "core", label: "Core Gameplay" },
  { id: "modes", label: "Modes + Ranked" },
  { id: "progression", label: "Progression" },
  { id: "account", label: "Account + Tracking" },
]
