export const DIFFICULTY_IDS = {
  EASY: "easy",
  NORMAL: "normal",
  HARD: "hard",
}

export const PROGRESSION_MODE = {
  PRACTICE: "practice",
  NON_RANKED: "non_ranked",
  RANKED: "ranked",
}

export const DEFAULT_DIFFICULTY_ID = DIFFICULTY_IDS.NORMAL

// Keep difficulty tuning data-driven so adding new modes only requires config updates.
export const DIFFICULTIES = [
  {
    id: DIFFICULTY_IDS.EASY,
    label: "Practice",
    readyGlyph: "1",
    description: "Untimed training mode focused on mechanics.",
    playerHint: "No coins or progression rewards. Use this mode to warm up and drill accuracy.",
    progressionMode: PROGRESSION_MODE.PRACTICE,
    isTimedRound: false,
    allowsCoinRewards: false,
    allowsLevelProgression: false,
    allowsRankProgression: false,
    durationSeconds: 200,
    initialButtonSize: 110,
    minButtonSize: 24,
    shrinkFactor: 0.98,
    missPenalty: 0,
    basePointsPerHit: 1,
    comboStep: 6,
    maxTimeBufferSeconds: 40,
    coinMultiplier: 1,
  },
  {
    id: DIFFICULTY_IDS.NORMAL,
    label: "Casual",
    readyGlyph: "2",
    description: "Balanced timing and score pressure.",
    playerHint: "Coins and levels are enabled. Ranked progression is disabled.",
    progressionMode: PROGRESSION_MODE.NON_RANKED,
    isTimedRound: true,
    allowsCoinRewards: true,
    allowsLevelProgression: true,
    allowsRankProgression: false,
    durationSeconds: 30,
    initialButtonSize: 100,
    minButtonSize: 12,
    shrinkFactor: 0.96,
    missPenalty: 1,
    basePointsPerHit: 1,
    comboStep: 5,
    maxTimeBufferSeconds: 30,
    coinMultiplier: 1,
  },
  {
    id: DIFFICULTY_IDS.HARD,
    label: "Ranked",
    readyGlyph: "R",
    description: "Faster shrink and harsher miss cost.",
    playerHint: "Full progression mode: coins, levels, and Ranked progression are all enabled.",
    progressionMode: PROGRESSION_MODE.RANKED,
    isTimedRound: true,
    allowsCoinRewards: true,
    allowsLevelProgression: true,
    allowsRankProgression: true,
    durationSeconds: 15,
    initialButtonSize: 96,
    minButtonSize: 10,
    shrinkFactor: 0.94,
    missPenalty: 2,
    basePointsPerHit: 1,
    comboStep: 4,
    maxTimeBufferSeconds: 24,
    coinMultiplier: 1.5,
  },
]

export const DIFFICULTIES_BY_ID = DIFFICULTIES.reduce((difficultiesById, difficulty) => {
  difficultiesById[difficulty.id] = difficulty
  return difficultiesById
}, {})

export function getDifficultyById(difficultyId) {
  return DIFFICULTIES_BY_ID[difficultyId] ?? DIFFICULTIES_BY_ID[DEFAULT_DIFFICULTY_ID]
}

export function getDifficultyProgressionRules(difficultyId) {
  const difficulty = getDifficultyById(difficultyId)

  return {
    progressionMode: difficulty.progressionMode,
    isTimedRound: difficulty.isTimedRound,
    allowsCoinRewards: difficulty.allowsCoinRewards,
    allowsLevelProgression: difficulty.allowsLevelProgression,
    allowsRankProgression: difficulty.allowsRankProgression,
  }
}
