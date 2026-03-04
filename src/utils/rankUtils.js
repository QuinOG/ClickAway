import { DIFFICULTY_IDS, PROGRESSION_MODE } from "../constants/difficultyConfig.js"

export const INITIAL_RANK_MMR = 1000

const RANK_TIERS = [
  { id: "bronze", label: "Bronze", minMmr: 0 },
  { id: "silver", label: "Silver", minMmr: 1200 },
  { id: "gold", label: "Gold", minMmr: 1500 },
  { id: "platinum", label: "Platinum", minMmr: 1850 },
  { id: "diamond", label: "Diamond", minMmr: 2250 },
  { id: "master", label: "Master", minMmr: 2700 },
]

function clampNonNegative(value) {
  const normalized = Number.isFinite(value) ? value : 0
  return Math.max(0, normalized)
}

function parseAccuracyPercent(accuracy) {
  if (typeof accuracy === "number" && Number.isFinite(accuracy)) {
    return Math.max(0, Math.min(100, accuracy))
  }

  const parsedValue = Number.parseInt(String(accuracy).replace("%", ""), 10)
  return Number.isFinite(parsedValue) ? Math.max(0, Math.min(100, parsedValue)) : 0
}

export function getRankTierFromMmr(mmr = INITIAL_RANK_MMR) {
  const normalizedMmr = clampNonNegative(mmr)
  let currentTier = RANK_TIERS[0]

  RANK_TIERS.forEach((tier) => {
    if (normalizedMmr >= tier.minMmr) {
      currentTier = tier
    }
  })

  return currentTier
}

export function getRankProgress(mmr = INITIAL_RANK_MMR) {
  const normalizedMmr = clampNonNegative(mmr)
  const tier = getRankTierFromMmr(normalizedMmr)
  const currentTierIndex = RANK_TIERS.findIndex((tierItem) => tierItem.id === tier.id)
  const nextTier = RANK_TIERS[currentTierIndex + 1] ?? null
  const mmrToNextTier = nextTier ? Math.max(0, nextTier.minMmr - normalizedMmr) : 0

  return {
    mmr: normalizedMmr,
    tierId: tier.id,
    tierLabel: tier.label,
    nextTierLabel: nextTier?.label ?? "Max",
    mmrToNextTier,
  }
}

export function calculateRoundRankDelta({
  score = 0,
  hits = 0,
  misses = 0,
  bestStreak = 0,
  difficultyId = "",
  progressionMode = "",
  allowsRankProgression = false,
}) {
  const isHardMode = difficultyId === DIFFICULTY_IDS.HARD
  const isCompetitiveMode = progressionMode === PROGRESSION_MODE.COMPETITIVE

  if (!allowsRankProgression || !isHardMode || !isCompetitiveMode) {
    return 0
  }

  const normalizedScore = clampNonNegative(score)
  const normalizedHits = clampNonNegative(hits)
  const normalizedMisses = clampNonNegative(misses)
  const normalizedBestStreak = clampNonNegative(bestStreak)
  const totalAttempts = normalizedHits + normalizedMisses
  const accuracyPercent = totalAttempts > 0 ? (normalizedHits / totalAttempts) * 100 : 0
  const normalizedAccuracy = parseAccuracyPercent(accuracyPercent)

  let delta = 0
  delta += Math.floor(normalizedScore / 20)
  delta += Math.floor(normalizedBestStreak / 2)

  if (normalizedAccuracy >= 85) delta += 8
  else if (normalizedAccuracy >= 70) delta += 3
  else if (normalizedAccuracy < 55) delta -= 8

  if (normalizedMisses >= 18) delta -= 10
  if (normalizedHits <= 8) delta -= 12

  return Math.max(-30, Math.min(35, Math.floor(delta)))
}
