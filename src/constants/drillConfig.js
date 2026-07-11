import { DIFFICULTY_IDS, getDifficultyById } from "./gameModesConfig.js"

export const DRILL_IDS = {
  ACCURACY: "accuracy_shooter",
  STREAK: "streak_hold",
  REACTION: "reaction_sprint",
}

export const TRAINING_DRILLS = [
  {
    id: DRILL_IDS.ACCURACY,
    label: "Accuracy Shooter",
    description: "Small targets on a 60s timer. Chase 80% accuracy.",
    goalType: "accuracy",
    goalValue: 80,
    goalLabel: "80% accuracy",
    modeOverrides: {
      initialButtonSize: 88,
      minButtonSize: 10,
      shrinkFactor: 0.95,
      missPenalty: 0,
      durationSeconds: 60,
      maxTimeBufferSeconds: 70,
      isTimedRound: true,
    },
    metricKey: "accuracyPercent",
    higherIsBetter: true,
  },
  {
    id: DRILL_IDS.STREAK,
    label: "Streak Hold",
    description: "Forgiving targets on a 45s timer. Reach a 10-hit streak.",
    goalType: "streak",
    goalValue: 10,
    goalLabel: "10-hit streak",
    modeOverrides: {
      initialButtonSize: 104,
      minButtonSize: 18,
      shrinkFactor: 0.97,
      comboStep: 4,
      durationSeconds: 45,
      maxTimeBufferSeconds: 55,
      isTimedRound: true,
    },
    metricKey: "bestStreak",
    higherIsBetter: true,
  },
  {
    id: DRILL_IDS.REACTION,
    label: "Reaction Sprint",
    description: "30s of fast spawns. Lower average reaction wins.",
    goalType: "reaction",
    goalValue: null,
    goalLabel: "Beat your best avg reaction",
    modeOverrides: {
      initialButtonSize: 96,
      minButtonSize: 14,
      shrinkFactor: 0.96,
      missPenalty: 0,
      durationSeconds: 30,
      maxTimeBufferSeconds: 40,
      isTimedRound: true,
    },
    metricKey: "avgReactionMs",
    higherIsBetter: false,
  },
]

export const TRAINING_DRILLS_BY_ID = Object.fromEntries(
  TRAINING_DRILLS.map((drill) => [drill.id, drill])
)

export function getTrainingDrillById(drillId) {
  return TRAINING_DRILLS_BY_ID[String(drillId || "")] ?? null
}

export function buildDrillMode(drillId, baseMode = getDifficultyById(DIFFICULTY_IDS.EASY)) {
  const drill = getTrainingDrillById(drillId)
  if (!drill) {
    return baseMode
  }

  return {
    ...baseMode,
    ...drill.modeOverrides,
    drillId: drill.id,
    label: `${baseMode.label}: ${drill.label}`,
    description: drill.description,
    playerHint: `Drill goal: ${drill.goalLabel}`,
  }
}

export function isValidDrillId(drillId) {
  return Boolean(getTrainingDrillById(drillId))
}
