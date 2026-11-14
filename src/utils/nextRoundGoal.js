import { getRequiredXpForLevel } from "./progressionUtils.js"
import { UNLOCK_WALL_PARTS } from "./unlockWallUtils.js"

// The one goal the very next round could reach, for the line above Play Again.
// A near miss on the personal best comes first (it pulls hardest); otherwise a
// level that one more similar round would reach. Nothing when neither is close,
// so the line only appears when it's true.
const NEAR_BEST_SHARE = 0.15
const NEAR_BEST_MIN_POINTS = 5

function levelAfterRound(level, xpIntoLevel, earned) {
  let reachedLevel = Math.max(1, Math.floor(Number(level) || 1))
  let remaining = Math.max(0, Number(xpIntoLevel) || 0) + Math.max(0, Number(earned) || 0)
  while (remaining >= getRequiredXpForLevel(reachedLevel)) {
    remaining -= getRequiredXpForLevel(reachedLevel)
    reachedLevel += 1
  }
  return { reachedLevel, remaining }
}

export function getNextRoundGoal({
  score = 0,
  bestScore = 0,
  countsLevelProgress = false,
  level = 1,
  xpIntoLevel = 0,
  earnedXp = 0,
} = {}) {
  const roundScore = Math.max(0, Number(score) || 0)
  const best = Math.max(0, Number(bestScore) || 0)
  if (best > 0 && roundScore < best) {
    const gap = best - roundScore
    if (gap <= Math.max(NEAR_BEST_MIN_POINTS, Math.round(best * NEAR_BEST_SHARE))) {
      return { kind: "best", text: `${gap.toLocaleString()} ${gap === 1 ? "point" : "points"} off your best.` }
    }
  }

  const earned = Math.max(0, Number(earnedXp) || 0)
  if (countsLevelProgress && earned > 0) {
    const { reachedLevel, remaining } = levelAfterRound(level, xpIntoLevel, earned)
    if (getRequiredXpForLevel(reachedLevel) - remaining <= earned) {
      const nextLevel = reachedLevel + 1
      const unlock = UNLOCK_WALL_PARTS.find((part) => part.unlockLevel === nextLevel)
      return {
        kind: "level",
        text: unlock
          ? `One more round like that reaches Lv ${nextLevel} and unlocks ${unlock.label}.`
          : `One more round like that reaches Lv ${nextLevel}.`,
      }
    }
  }

  return null
}
