export const GETTING_STARTED_STEPS = [
  "Pick a mode first: Practice for mechanics, Casual for XP/coins, Ranked for XP + rank.",
  "Press Start Round, then use the 3-second countdown to center your cursor.",
  "Hit the target to build streak and multiplier; misses reset streak immediately.",
  "Use power-up keys only during live rounds: 1 = Time +2s, 2 = Grow +10, 3 = Freeze 1s.",
  "Watch the timer and combo, not just score. Consistency beats panic clicking.",
  "Practice mode has no progression. Casual and Ranked are where rewards happen.",
  "If the target gets too small, protect streak first and stop taking risky misses.",
  "After Game Over, review rewards and trend metrics before queueing the next round.",
]

export const ROUND_FLOW_POINTS = [
  "Ready phase: choose mode, preview rules, then confirm Start.",
  "Countdown phase: 3 -> 2 -> 1, then round state changes to live play.",
  "Playing phase: each hit shrinks target size and randomizes target position.",
  "Miss handling: streak resets to 0 and score penalty is applied by mode.",
  "Game Over phase: score, accuracy, streak, XP, coins, and optional rank delta are finalized.",
  "Play Again re-enters Ready with your selected mode preserved.",
]

export const CONTROLS_ROWS = [
  ["Hit Target", "Left click directly on the moving target."],
  ["Miss", "Left click the arena outside the target."],
  ["End Practice Round", "Use the End Practice Round button during Practice."],
  ["Use Time +2s", "Press 1 during live rounds when charges are available."],
  ["Use Grow +10", "Press 2 during live rounds when charges are available."],
  ["Use Freeze 1s", "Press 3 during live rounds when charges are available."],
  ["Mode Carousel", "In Ready overlay: Left/Right arrows cycle modes, Enter starts."],
  ["Close Ready Overlay", "Press Escape in the Ready overlay."],
]

export const NAVIGATION_ROWS = [
  ["Game", "Play rounds, use power-ups, and generate score/reward history."],
  ["Profile", "View player summary, rank card, and long-term account progress."],
  ["Shop", "Spend coins on cosmetics and equip owned items instantly."],
  ["History", "Review past rounds (mode, score, XP, coins, rank delta)."],
  ["Leaderboard", "Compare ranked players and MMR positions."],
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
  "Ranked: shorter timer (15s), faster shrink pressure, and rank/MMR movement enabled.",
  "Mode-specific tuning changes difficulty feel: min size, shrink factor, combo step, and miss cost.",
  "Ranked and Casual both award XP, but only Ranked can add/subtract MMR.",
]

export const MODE_TUNING_ROWS = [
  ["Practice", "110", "24", "0.98", "Every 6 hits", "40s"],
  ["Casual", "100", "12", "0.96", "Every 5 hits", "30s"],
  ["Ranked", "96", "10", "0.94", "Every 4 hits", "24s"],
]

export const RANK_TIER_ROWS = [
  { id: "bronze", label: "Bronze", mmrRange: "0-499 MMR", imageSrc: "/ranks/bronze.png" },
  { id: "silver", label: "Silver", mmrRange: "500-1499 MMR", imageSrc: "/ranks/silver.png" },
  { id: "gold", label: "Gold", mmrRange: "1500+ MMR", imageSrc: "/ranks/gold.png" },
]

export const RANK_RULES_POINTS = [
  "Placement state: account shows Unranked until you have ranked history.",
  "Rank delta applies only when mode is Ranked + ranked progression is enabled.",
  "Round rank delta is clamped between -30 and +35 per round.",
  "Delta is influenced by score, best streak, accuracy tiers, misses, and low-hit penalties.",
  "Low-performance safeguards exist: very high misses or very low hits can heavily reduce MMR gain.",
  "MMR cannot go below 0.",
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
  ["1", "Time +2s", "Earn 1 charge every 5 streak", "Adds 2s (timed modes only)."],
  ["2", "Grow +10", "Earn 1 charge every 10 streak", "Increases current target size by 10, capped at mode initial size."],
  ["3", "Freeze 1s", "Earn 1 charge every 15 streak", "Stops movement/reposition for 1 second."],
]

export const POWERUP_RULES_POINTS = [
  "Power-up charges start at 0 every round and do not carry across rounds.",
  "Charges are awarded when streak exactly hits award milestones (5/10/15...).",
  "Power-ups can only be activated while the round is actively playing.",
  "Time +2s cannot exceed mode time buffer cap (Practice 40, Casual 30, Ranked 24).",
]

export const SHOP_POINTS = [
  "Shop is cosmetic-only: no paid item changes scoring, hitbox, or rank gain.",
  "Buy unowned items with coins; owned items can be equipped repeatedly for free.",
  "Profile image, button skin, and arena theme equip independently.",
  "Built-in defaults are always available even with zero coins.",
]

export const PERFORMANCE_TIPS = [
  "Prioritize hit confirmation over speed when target gets small.",
  "Use Freeze to stabilize high-pressure moments and protect streak.",
  "Use Grow after several shrink cycles so hitbox recovery is meaningful.",
  "In Ranked, avoid miss spirals: penalties compound through score + accuracy impacts.",
  "If accuracy dips, reset pace for 3-5 clean hits before pushing tempo again.",
]

export const PROGRESSION_POINTS = [
  "Mode reward gates: Practice (none), Casual (XP + coins), Ranked (XP + coins + rank).",
  "Coins formula: floor(hits x coinMultiplier).",
  "XP base formula: hits x 5 + bestStreak x 3 + floor(score x 0.2).",
  "XP accuracy bonus: +25 at >=90% accuracy, +10 at >=75% accuracy.",
  "Level XP requirement scales linearly: 100 + (level - 1) x 50.",
  "History stores mode, score, hits, misses, streak, coins, XP, and rank delta per round.",
]

export const DATA_SYSTEM_POINTS = [
  "Progress is stored in browser localStorage (device/browser specific).",
  "Tracked data includes auth state, coins, XP, MMR, history, owned items, and equipped cosmetics.",
  "Clearing browser/site storage resets progression and inventory state.",
  "Switching browser profile/device starts a separate local profile unless data is migrated.",
]

export const FAQ_ITEMS = [
  {
    question: "What mode should I start with?",
    answer: "Practice first for mechanics, then Casual for stable rewards, then Ranked for ranked climb.",
  },
  {
    question: "Why did my MMR not change?",
    answer: "MMR changes only in Ranked rounds with rank progression enabled.",
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
    answer: "No. Cosmetics are visual only and do not modify gameplay stats.",
  },
  {
    question: "Why does my account appear reset?",
    answer: "Data is local to your browser storage. Clearing storage removes saved progress.",
  },
]

export const HELP_QUICK_NAV = [
  { id: "core", label: "Core Gameplay" },
  { id: "modes", label: "Modes + Ranked" },
  { id: "progression", label: "Progression" },
]
