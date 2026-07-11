import { isRankedModeEntry } from "./gameModeLabelsAndRankedFilters.js"

export const RECENT_HISTORY_LIMIT = 50
export const HISTORY_PAGE_SIZE = 25

export const DEFAULT_LIFETIME_STATS = {
  totalRounds: 0,
  rankedRounds: 0,
  bestStreak: 0,
  bestSingleScore: 0,
  bestRankedStreak: 0,
  bestSingleRoundAccuracy: 0,
  cleanRounds: 0,
  totalCoinsEarned: 0,
  totalHits: 0,
  totalMisses: 0,
  maxConsecutiveRankedWins: 0,
  currentConsecutiveRankedWins: 0,
  reactionRounds: 0,
  totalReactionMs: 0,
  bestReactionMs: null,
}

function toNonNegativeNumber(value) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? Math.max(0, numericValue) : null
}

function toNullableReactionMs(value) {
  if (value === null || value === undefined || value === "") {
    return null
  }

  const numericValue = Number(value)
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return null
  }
  return Math.round(numericValue)
}

export function normalizeLifetimeStats(stats = {}) {
  const bestReactionMs = toNullableReactionMs(stats.bestReactionMs)

  return {
    totalRounds: toNonNegativeNumber(stats.totalRounds) ?? 0,
    rankedRounds: toNonNegativeNumber(stats.rankedRounds) ?? 0,
    bestStreak: toNonNegativeNumber(stats.bestStreak) ?? 0,
    bestSingleScore: toNonNegativeNumber(stats.bestSingleScore) ?? 0,
    bestRankedStreak: toNonNegativeNumber(stats.bestRankedStreak) ?? 0,
    bestSingleRoundAccuracy: toNonNegativeNumber(stats.bestSingleRoundAccuracy) ?? 0,
    cleanRounds: toNonNegativeNumber(stats.cleanRounds) ?? 0,
    totalCoinsEarned: toNonNegativeNumber(stats.totalCoinsEarned) ?? 0,
    totalHits: toNonNegativeNumber(stats.totalHits) ?? 0,
    totalMisses: toNonNegativeNumber(stats.totalMisses) ?? 0,
    maxConsecutiveRankedWins: toNonNegativeNumber(stats.maxConsecutiveRankedWins) ?? 0,
    currentConsecutiveRankedWins: toNonNegativeNumber(stats.currentConsecutiveRankedWins) ?? 0,
    reactionRounds: toNonNegativeNumber(stats.reactionRounds) ?? 0,
    totalReactionMs: toNonNegativeNumber(stats.totalReactionMs) ?? 0,
    bestReactionMs,
  }
}

export function normalizeLoadoutStatsEntry(entry = {}) {
  const loadoutId = String(entry.loadoutId || "").trim()
  if (!loadoutId) {
    return null
  }

  return {
    loadoutId,
    loadoutName: String(entry.loadoutName || "Loadout").trim() || "Loadout",
    totalRounds: toNonNegativeNumber(entry.totalRounds) ?? 0,
    rankedRounds: toNonNegativeNumber(entry.rankedRounds) ?? 0,
    rankedWins: toNonNegativeNumber(entry.rankedWins) ?? 0,
    bestScore: toNonNegativeNumber(entry.bestScore) ?? 0,
    bestStreak: toNonNegativeNumber(entry.bestStreak) ?? 0,
    bestRankedStreak: toNonNegativeNumber(entry.bestRankedStreak) ?? 0,
    totalHits: toNonNegativeNumber(entry.totalHits) ?? 0,
    totalMisses: toNonNegativeNumber(entry.totalMisses) ?? 0,
  }
}

/**
 * Applies one completed round to lifetime counters.
 */
export function applyRoundToLifetimeStats(stats = {}, round = {}) {
  const normalizedStats = normalizeLifetimeStats(stats)
  const hits = toNonNegativeNumber(round.hits) ?? 0
  const misses = toNonNegativeNumber(round.misses) ?? 0
  const score = toNonNegativeNumber(round.score) ?? 0
  const bestStreak = toNonNegativeNumber(round.bestStreak) ?? 0
  const coinsEarned = toNonNegativeNumber(round.coinsEarned) ?? 0
  const attempts = hits + misses
  const avgReactionMs = toNullableReactionMs(round.avgReactionMs)
  const bestReactionMs = toNullableReactionMs(round.bestReactionMs)
  const isRanked = isRankedModeEntry(round)
  const rankDelta = Number.isFinite(Number(round.rankDelta)) ? Number(round.rankDelta) : 0

  let currentConsecutiveRankedWins = normalizedStats.currentConsecutiveRankedWins
  if (isRanked) {
    if (rankDelta > 0) {
      currentConsecutiveRankedWins += 1
    } else {
      currentConsecutiveRankedWins = 0
    }
  }

  return {
    ...normalizedStats,
    totalRounds: normalizedStats.totalRounds + 1,
    rankedRounds: normalizedStats.rankedRounds + (isRanked ? 1 : 0),
    bestStreak: Math.max(normalizedStats.bestStreak, bestStreak),
    bestSingleScore: Math.max(normalizedStats.bestSingleScore, score),
    bestRankedStreak: isRanked
      ? Math.max(normalizedStats.bestRankedStreak, bestStreak)
      : normalizedStats.bestRankedStreak,
    bestSingleRoundAccuracy: attempts >= 10
      ? Math.max(
          normalizedStats.bestSingleRoundAccuracy,
          Math.round((hits / attempts) * 100)
        )
      : normalizedStats.bestSingleRoundAccuracy,
    cleanRounds: misses === 0 && hits >= 5
      ? normalizedStats.cleanRounds + 1
      : normalizedStats.cleanRounds,
    totalCoinsEarned: normalizedStats.totalCoinsEarned + coinsEarned,
    totalHits: normalizedStats.totalHits + hits,
    totalMisses: normalizedStats.totalMisses + misses,
    currentConsecutiveRankedWins,
    maxConsecutiveRankedWins: Math.max(
      normalizedStats.maxConsecutiveRankedWins,
      currentConsecutiveRankedWins
    ),
    reactionRounds: avgReactionMs !== null
      ? normalizedStats.reactionRounds + 1
      : normalizedStats.reactionRounds,
    totalReactionMs: avgReactionMs !== null
      ? normalizedStats.totalReactionMs + avgReactionMs
      : normalizedStats.totalReactionMs,
    bestReactionMs: bestReactionMs === null
      ? normalizedStats.bestReactionMs
      : normalizedStats.bestReactionMs === null
        ? bestReactionMs
        : Math.min(normalizedStats.bestReactionMs, bestReactionMs),
  }
}

/**
 * Applies one completed round to per-build counters.
 */
export function applyRoundToLoadoutStats(stats = {}, round = {}) {
  const loadoutId = String(round?.loadoutSnapshot?.loadoutId || round?.loadoutId || "").trim()
  if (!loadoutId) {
    return stats
  }

  const normalizedStats = normalizeLoadoutStatsEntry({
    loadoutId,
    loadoutName: round?.loadoutSnapshot?.loadoutName || round?.loadoutName || "Loadout",
    ...stats,
  }) ?? normalizeLoadoutStatsEntry({ loadoutId })

  const hits = toNonNegativeNumber(round.hits) ?? 0
  const misses = toNonNegativeNumber(round.misses) ?? 0
  const score = toNonNegativeNumber(round.score) ?? 0
  const bestStreak = toNonNegativeNumber(round.bestStreak) ?? 0
  const isRanked = isRankedModeEntry(round)
  const rankDelta = Number.isFinite(Number(round.rankDelta)) ? Number(round.rankDelta) : 0

  return {
    ...normalizedStats,
    totalRounds: normalizedStats.totalRounds + 1,
    rankedRounds: normalizedStats.rankedRounds + (isRanked ? 1 : 0),
    rankedWins: normalizedStats.rankedWins + (isRanked && rankDelta > 0 ? 1 : 0),
    bestScore: Math.max(normalizedStats.bestScore, score),
    bestStreak: Math.max(normalizedStats.bestStreak, bestStreak),
    bestRankedStreak: isRanked
      ? Math.max(normalizedStats.bestRankedStreak, bestStreak)
      : normalizedStats.bestRankedStreak,
    totalHits: normalizedStats.totalHits + hits,
    totalMisses: normalizedStats.totalMisses + misses,
  }
}

/**
 * Rebuilds lifetime counters by scanning a chronological round list.
 */
export function buildLifetimeStatsFromRounds(rounds = []) {
  const chronologicalRounds = [...rounds].sort((leftRound, rightRound) => {
    const leftTime = Date.parse(leftRound?.playedAtIso || leftRound?.playedAt || 0)
    const rightTime = Date.parse(rightRound?.playedAtIso || rightRound?.playedAt || 0)
    return leftTime - rightTime
  })

  return chronologicalRounds.reduce(
    (stats, round) => applyRoundToLifetimeStats(stats, round),
    normalizeLifetimeStats({})
  )
}

/**
 * Achievement-facing stats derived from durable lifetime counters.
 */
export function buildAchievementStatsFromLifetime({
  lifetimeStats = {},
  levelProgress = {},
  coins = 0,
} = {}) {
  const normalizedLifetimeStats = normalizeLifetimeStats(lifetimeStats)
  const normalizedLevel = toNonNegativeNumber(levelProgress?.level) ?? 1

  return {
    level: Math.max(1, normalizedLevel),
    currentCoins: toNonNegativeNumber(coins) ?? 0,
    totalRounds: normalizedLifetimeStats.totalRounds,
    rankedRounds: normalizedLifetimeStats.rankedRounds,
    bestStreak: normalizedLifetimeStats.bestStreak,
    totalCoinsEarned: normalizedLifetimeStats.totalCoinsEarned,
    cleanRounds: normalizedLifetimeStats.cleanRounds,
    bestSingleRoundAccuracy: normalizedLifetimeStats.bestSingleRoundAccuracy,
    bestRankedStreak: normalizedLifetimeStats.bestRankedStreak,
    bestSingleScore: normalizedLifetimeStats.bestSingleScore,
    maxConsecutiveRankedWins: normalizedLifetimeStats.maxConsecutiveRankedWins,
  }
}

export function buildCareerReactionStatsFromLifetime(lifetimeStats = {}) {
  const normalizedLifetimeStats = normalizeLifetimeStats(lifetimeStats)

  return {
    avgReactionMs: normalizedLifetimeStats.reactionRounds > 0
      ? Math.round(
          normalizedLifetimeStats.totalReactionMs / normalizedLifetimeStats.reactionRounds
        )
      : null,
    bestReactionMs: normalizedLifetimeStats.bestReactionMs,
  }
}

export function buildPlayerLeaderboardStatsFromLifetime(lifetimeStats = {}) {
  const normalizedLifetimeStats = normalizeLifetimeStats(lifetimeStats)
  const totalAttempts = normalizedLifetimeStats.totalHits + normalizedLifetimeStats.totalMisses

  return {
    bestScore: normalizedLifetimeStats.bestSingleScore,
    bestStreak: normalizedLifetimeStats.bestStreak,
    accuracyPercent: totalAttempts > 0
      ? Math.round((normalizedLifetimeStats.totalHits / totalAttempts) * 100)
      : 0,
  }
}

export function buildProfileStatsFromLifetime(lifetimeStats = {}, roundHistory = []) {
  const normalizedLifetimeStats = normalizeLifetimeStats(lifetimeStats)
  const now = Date.now()
  let roundsThisWeek = 0

  ;(Array.isArray(roundHistory) ? roundHistory : []).forEach((round) => {
    if (!round?.playedAtIso) return

    const playedAt = new Date(round.playedAtIso).getTime()
    if (!Number.isNaN(playedAt) && now - playedAt <= 7 * 24 * 60 * 60 * 1000) {
      roundsThisWeek += 1
    }
  })

  const totalAttempts = normalizedLifetimeStats.totalHits + normalizedLifetimeStats.totalMisses

  return {
    totalRounds: normalizedLifetimeStats.totalRounds,
    rankedRounds: normalizedLifetimeStats.rankedRounds,
    bestScore: normalizedLifetimeStats.bestSingleScore,
    bestStreak: normalizedLifetimeStats.bestStreak,
    accuracyPercent: totalAttempts > 0
      ? Math.round((normalizedLifetimeStats.totalHits / totalAttempts) * 100)
      : 0,
    roundsThisWeek,
  }
}
