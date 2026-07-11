import { DIFFICULTY_IDS } from "../constants/gameModesConfig.js"
import { DRILL_IDS, getTrainingDrillById } from "../constants/drillConfig.js"
import { calculateAccuracyPercent } from "./gameMath.js"

const MIN_ROUNDS_FOR_WARMUP = 12

export function getWarmupSuggestion(lifetimeStats = {}, selectedModeId = "") {
  if (selectedModeId !== DIFFICULTY_IDS.HARD) {
    return null
  }

  const totalRounds = Math.max(0, Number(lifetimeStats.totalRounds) || 0)
  if (totalRounds < MIN_ROUNDS_FOR_WARMUP) {
    return null
  }

  const hits = Math.max(0, Number(lifetimeStats.totalHits) || 0)
  const misses = Math.max(0, Number(lifetimeStats.totalMisses) || 0)
  const attempts = hits + misses

  if (attempts < MIN_ROUNDS_FOR_WARMUP * 4) {
    return null
  }

  const accuracy = calculateAccuracyPercent(hits, misses)
  if (accuracy < 78) {
    return getTrainingDrillById(DRILL_IDS.ACCURACY)
  }

  if ((Number(lifetimeStats.bestStreak) || 0) < 10) {
    return getTrainingDrillById(DRILL_IDS.STREAK)
  }

  const reactionRounds = Math.max(0, Number(lifetimeStats.reactionRounds) || 0)
  const totalReactionMs = Math.max(0, Number(lifetimeStats.totalReactionMs) || 0)
  const averageReactionMs = reactionRounds > 0
    ? Math.round(totalReactionMs / reactionRounds)
    : null

  if (averageReactionMs !== null && averageReactionMs > 420) {
    return getTrainingDrillById(DRILL_IDS.REACTION)
  }

  return null
}
