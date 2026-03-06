import { DIFFICULTY_IDS, PROGRESSION_MODE } from "../constants/difficultyConfig.js"

export const INITIAL_RANK_MMR = 0
export const UNRANKED_LABEL = "Unranked"

const RANK_TIERS = [
  { id: "bronze", label: "Bronze", minMmr: 0 },
  { id: "silver", label: "Silver", minMmr: 500 },
  { id: "gold", label: "Gold", minMmr: 1500 },
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
    isUnranked: false,
  }
}

export function getUnrankedProgress() {
  return {
    mmr: 0,
    tierId: "unranked",
    tierLabel: UNRANKED_LABEL,
    nextTierLabel: RANK_TIERS[0]?.label ?? "Bronze",
    mmrToNextTier: 0,
    isUnranked: true,
  }
}

export function getRankProgressWithPlacement(mmr = INITIAL_RANK_MMR, hasRankedHistory = false) {
  if (!hasRankedHistory) {
    return getUnrankedProgress()
  }

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
    isUnranked: false,
  }
}

export function getRankImageSrc(rankLabel = "") {
  const normalizedLabel = String(rankLabel).trim().toLowerCase()
  if (!normalizedLabel || normalizedLabel === UNRANKED_LABEL.toLowerCase()) {
    return ""
  }

  return `/ranks/${normalizedLabel}.png`
}

export function calculateRoundRankDelta({
  score = 0,
  hits = 0,
  misses = 0,
  bestStreak = 0,
  modeId = "",
  difficultyId = "",
  progressionMode = "",
  allowsRankProgression = false,
}) {
  const resolvedModeId = modeId || difficultyId
  const isHardMode = resolvedModeId === DIFFICULTY_IDS.HARD
  const isRankedMode = progressionMode === PROGRESSION_MODE.RANKED

  if (!allowsRankProgression || !isHardMode || !isRankedMode) {
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

  // 1) Score scaling:
  delta += Math.floor(normalizedScore / 40)

  // 2) Streak scaling:
  delta += Math.floor(normalizedBestStreak / 3)

  // 3) Accuracy tiers:
  if (normalizedAccuracy >= 99) delta += 8
  else if (normalizedAccuracy >= 95) delta += 6
  else if (normalizedAccuracy >= 90) delta += 3
  else if (normalizedAccuracy >= 85) delta += 1
  else if (normalizedAccuracy >= 75) delta -= 3
  else if (normalizedAccuracy >= 60) delta -= 6
  else delta -= 10

  // 4) Penalties
  if (normalizedMisses >= 18) delta -= 10
  if (normalizedHits <= 8) delta -= 12

  return Math.max(-30, Math.min(35, Math.floor(delta)))
}
