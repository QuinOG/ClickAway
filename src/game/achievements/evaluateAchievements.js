import { isRankedModeEntry } from "../../utils/modeUtils.js"
import { ACHIEVEMENTS } from "./achievementsList.js"

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function toNonNegativeNumber(value) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? Math.max(0, numericValue) : null
}

function normalizeTarget(targetValue) {
  const numericTarget = Number(targetValue)
  if (!Number.isFinite(numericTarget) || numericTarget <= 0) {
    return 1
  }
  return numericTarget
}

function getAchievementCurrentValue(achievement, playerStats) {
  if (typeof achievement.computeCurrent === "function") {
    return toNonNegativeNumber(achievement.computeCurrent(playerStats))
  }
  return toNonNegativeNumber(playerStats?.[achievement.metricKey])
}

function getProgressText(current, target, isProgressAvailable) {
  if (!isProgressAvailable) return "Progress unavailable"
  return `${Math.min(current, target).toLocaleString()} / ${target.toLocaleString()}`
}

function isMetricAchievement(achievement = {}) {
  return achievement?.type === "metric"
}

function isCategoryMasterAchievement(achievement = {}) {
  return achievement?.type === "categoryMaster"
}

function isMasterOfMastersAchievement(achievement = {}) {
  return achievement?.type === "masterOfMasters"
}

/**
 * Builds a normalized stats snapshot used by achievements.
 */
export function buildAchievementStats({
  levelProgress = {},
  roundHistory = [],
  coins = 0,
} = {}) {
  const rounds = Array.isArray(roundHistory) ? roundHistory : []
  let rankedRounds = 0
  let totalCoinsEarned = 0
  let hasCoinsData = false

  rounds.forEach((round) => {
    const coinsEarned = toNonNegativeNumber(round?.coinsEarned)

    if (coinsEarned !== null) {
      hasCoinsData = true
      totalCoinsEarned += coinsEarned
    }

    if (isRankedModeEntry(round)) {
      rankedRounds += 1
    }
  })

  const normalizedLevel = toNonNegativeNumber(levelProgress?.level) ?? 1

  return {
    level: Math.max(1, normalizedLevel),
    currentCoins: toNonNegativeNumber(coins) ?? 0,
    totalRounds: rounds.length,
    rankedRounds,
    totalCoinsEarned: hasCoinsData ? totalCoinsEarned : null,
  }
}

function evaluateMetricAchievement(achievement, playerStats, persistedUnlockedIds) {
  const target = normalizeTarget(achievement.targetValue)
  const currentValue = getAchievementCurrentValue(achievement, playerStats)
  const isProgressAvailable = currentValue !== null
  const baseRatio = isProgressAvailable
    ? clamp(currentValue / target, 0, 1)
    : 0
  const basePercent = isProgressAvailable ? Math.floor(baseRatio * 100) : 0
  const isUnlockedByProgress = isProgressAvailable && currentValue >= target
  const isUnlocked = isUnlockedByProgress || persistedUnlockedIds.has(achievement.id)
  const percent = isUnlocked ? 100 : basePercent
  const progressRatio = isUnlocked ? 1 : baseRatio
  const current = isProgressAvailable ? currentValue : 0

  return {
    ...achievement,
    current,
    target,
    percent,
    progressRatio,
    isUnlocked,
    isProgressAvailable,
    progressText: getProgressText(current, target, isProgressAvailable),
    percentText: isProgressAvailable
      ? (isUnlocked ? "Unlocked" : `${percent}%`)
      : "Progress unavailable",
  }
}

function evaluateCategoryMasterAchievement({
  achievement,
  categoryMetricAchievements,
  persistedUnlockedIds,
}) {
  const target = categoryMetricAchievements.length
  const current = categoryMetricAchievements.filter((item) => item.isUnlocked).length
  const isProgressAvailable = target > 0
  const baseRatio = isProgressAvailable
    ? clamp(current / target, 0, 1)
    : 0
  const basePercent = isProgressAvailable ? Math.floor(baseRatio * 100) : 0
  const isUnlockedByProgress = isProgressAvailable && current >= target
  const isUnlocked = isUnlockedByProgress || persistedUnlockedIds.has(achievement.id)
  const percent = isUnlocked ? 100 : basePercent
  const progressRatio = isUnlocked ? 1 : baseRatio

  return {
    ...achievement,
    current,
    target,
    percent,
    progressRatio,
    isUnlocked,
    isProgressAvailable,
    progressText: getProgressText(current, target, isProgressAvailable),
    percentText: isUnlocked ? "Unlocked" : `${percent}%`,
  }
}

function evaluateMasterOfMastersAchievement({
  achievement,
  evaluatedCategoryMasters,
  persistedUnlockedIds,
}) {
  const target = evaluatedCategoryMasters.length
  const current = evaluatedCategoryMasters.filter((item) => item.isUnlocked).length
  const isProgressAvailable = target > 0
  const baseRatio = isProgressAvailable
    ? clamp(current / target, 0, 1)
    : 0
  const basePercent = isProgressAvailable ? Math.floor(baseRatio * 100) : 0
  const isUnlockedByProgress = isProgressAvailable && current >= target
  const isUnlocked = isUnlockedByProgress || persistedUnlockedIds.has(achievement.id)
  const percent = isUnlocked ? 100 : basePercent
  const progressRatio = isUnlocked ? 1 : baseRatio

  return {
    ...achievement,
    current,
    target,
    percent,
    progressRatio,
    isUnlocked,
    isProgressAvailable,
    progressText: getProgressText(current, target, isProgressAvailable),
    percentText: isUnlocked ? "Unlocked" : `${percent}%`,
  }
}

/**
 * Enriches achievement definitions with computed progress.
 */
export function evaluateAchievements(playerStats = {}, options = {}) {
  const persistedUnlockedIds = new Set(
    Array.isArray(options.persistedUnlockedIds)
      ? options.persistedUnlockedIds.filter((id) => typeof id === "string")
      : []
  )

  const metricAchievements = ACHIEVEMENTS.filter((achievement) =>
    isMetricAchievement(achievement)
  )
  const categoryMasterAchievements = ACHIEVEMENTS.filter((achievement) =>
    isCategoryMasterAchievement(achievement)
  )
  const masterOfMastersAchievement = ACHIEVEMENTS.find((achievement) =>
    isMasterOfMastersAchievement(achievement)
  )

  const evaluatedMetricAchievements = metricAchievements.map((achievement) =>
    evaluateMetricAchievement(achievement, playerStats, persistedUnlockedIds)
  )

  const metricAchievementsByCategory = evaluatedMetricAchievements.reduce(
    (achievementsByCategory, achievement) => {
      const categoryKey = achievement?.categoryKey
      if (!categoryKey) return achievementsByCategory

      if (!achievementsByCategory.has(categoryKey)) {
        achievementsByCategory.set(categoryKey, [])
      }

      achievementsByCategory.get(categoryKey).push(achievement)
      return achievementsByCategory
    },
    new Map()
  )

  const evaluatedCategoryMasters = categoryMasterAchievements.map((achievement) => {
    const categoryMetricAchievements =
      metricAchievementsByCategory.get(achievement.masterCategoryKey) ?? []

    return evaluateCategoryMasterAchievement({
      achievement,
      categoryMetricAchievements,
      persistedUnlockedIds,
    })
  })

  const evaluatedMasterOfMasters = masterOfMastersAchievement
    ? evaluateMasterOfMastersAchievement({
      achievement: masterOfMastersAchievement,
      evaluatedCategoryMasters,
      persistedUnlockedIds,
    })
    : null

  const evaluatedAchievementsById = new Map([
    ...evaluatedMetricAchievements.map((achievement) => [achievement.id, achievement]),
    ...evaluatedCategoryMasters.map((achievement) => [achievement.id, achievement]),
    ...(evaluatedMasterOfMasters
      ? [[evaluatedMasterOfMasters.id, evaluatedMasterOfMasters]]
      : []),
  ])

  return ACHIEVEMENTS
    .map((achievement) => evaluatedAchievementsById.get(achievement.id))
    .filter(Boolean)
}

export function getUnlockedAchievementIds(evaluatedAchievements = []) {
  return evaluatedAchievements
    .filter((achievement) => achievement?.isUnlocked)
    .map((achievement) => achievement.id)
}
