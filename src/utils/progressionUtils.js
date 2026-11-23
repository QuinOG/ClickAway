import { calculateAccuracyPercent } from "./gameMath.js"

const BASE_XP_PER_HIT = 5
const XP_PER_BEST_STREAK_POINT = 3
const SCORE_XP_FACTOR = 0.2

const LEVEL_BASE_REQUIREMENT = 100
const LEVEL_REQUIREMENT_STEP = 50

function normalizeNumber(value) {
  if (typeof value !== "number" && (typeof value !== "string" || !value.trim())) return 0
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function clampNonNegative(value) {
  return Math.max(0, normalizeNumber(value))
}

export function getRequiredXpForLevel(level) {
  const normalizedLevel = Math.max(1, Math.floor(clampNonNegative(level)))
  return LEVEL_BASE_REQUIREMENT + (normalizedLevel - 1) * LEVEL_REQUIREMENT_STEP
}

export function calculateRoundXp(options = {}) {
  const { hits = 0, misses = 0, bestStreak = 0, score = 0 } =
    options && typeof options === "object" ? options : {}
  const normalizedHits = clampNonNegative(hits)
  const normalizedMisses = clampNonNegative(misses)
  const normalizedBestStreak = clampNonNegative(bestStreak)
  const normalizedScore = clampNonNegative(score)

  const normalizedAccuracy = calculateAccuracyPercent(normalizedHits, normalizedMisses)

  let xp = 0
  xp += normalizedHits * BASE_XP_PER_HIT
  xp += normalizedBestStreak * XP_PER_BEST_STREAK_POINT
  xp += Math.floor(normalizedScore * SCORE_XP_FACTOR)

  if (normalizedAccuracy >= 90) xp += 25
  else if (normalizedAccuracy >= 75) xp += 10

  return Math.floor(clampNonNegative(xp))
}

export function getLevelProgress(totalXp = 0) {
  const normalizedTotalXp = Math.floor(clampNonNegative(totalXp))

  let level = 1
  let xpRemaining = normalizedTotalXp
  let requiredForCurrentLevel = getRequiredXpForLevel(level)

  while (xpRemaining >= requiredForCurrentLevel) {
    xpRemaining -= requiredForCurrentLevel
    level += 1
    requiredForCurrentLevel = getRequiredXpForLevel(level)
  }

  const xpIntoLevel = xpRemaining
  const xpToNextLevel = Math.max(0, requiredForCurrentLevel - xpIntoLevel)
  const progressPercent = requiredForCurrentLevel > 0
    ? Math.min(xpToNextLevel > 0 ? 99 : 100, Math.round((xpIntoLevel / requiredForCurrentLevel) * 100))
    : 0

  return {
    totalXp: normalizedTotalXp,
    level,
    xpIntoLevel,
    xpToNextLevel,
    xpForNextLevel: requiredForCurrentLevel,
    progressPercent,
  }
}
