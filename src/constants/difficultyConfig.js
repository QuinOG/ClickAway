export const DIFFICULTY_IDS = {
  EASY: "easy",
  NORMAL: "normal",
  HARD: "hard",
}

export const DEFAULT_DIFFICULTY_ID = DIFFICULTY_IDS.NORMAL

// Keep difficulty tuning data-driven so adding new modes only requires config updates.
export const DIFFICULTIES = [
  {
    id: DIFFICULTY_IDS.EASY,
    label: "Easy",
    description: "Longer timer and gentler pacing.",
    playerHint: "Best for new players learning movement and timing.",
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
    label: "Normal",
    description: "Balanced timing and score pressure.",
    playerHint: "Best for consistent score runs with moderate pressure.",
    durationSeconds: 15,
    initialButtonSize: 100,
    minButtonSize: 12,
    shrinkFactor: 0.96,
    missPenalty: 1,
    basePointsPerHit: 1,
    comboStep: 5,
    maxTimeBufferSeconds: 30,
    coinMultiplier: 1.1,
  },
  {
    id: DIFFICULTY_IDS.HARD,
    label: "Hard",
    description: "Faster shrink and harsher miss cost.",
    playerHint: "Best for high-risk leaderboard pushes and short windows.",
    durationSeconds: 12,
    initialButtonSize: 96,
    minButtonSize: 10,
    shrinkFactor: 0.94,
    missPenalty: 2,
    basePointsPerHit: 1,
    comboStep: 4,
    maxTimeBufferSeconds: 24,
    coinMultiplier: 1.25,
  },
]

export const DIFFICULTIES_BY_ID = DIFFICULTIES.reduce((difficultiesById, difficulty) => {
  difficultiesById[difficulty.id] = difficulty
  return difficultiesById
}, {})

export function getDifficultyById(difficultyId) {
  return DIFFICULTIES_BY_ID[difficultyId] ?? DIFFICULTIES_BY_ID[DEFAULT_DIFFICULTY_ID]
}
