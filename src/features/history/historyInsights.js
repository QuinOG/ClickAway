import { buildCareerReactionStats } from "../../utils/historyUtils.js"
import { isRankedModeEntry } from "../../utils/modeUtils.js"

function toNumber(value) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : 0
}

function getAttempts(round = {}) {
  return toNumber(round.hits) + toNumber(round.misses)
}

export function buildHistorySnapshot(roundHistory = []) {
  const rows = Array.isArray(roundHistory) ? roundHistory : []
  const recentRounds = rows.slice(0, 10)
  const rankedRounds = rows.filter((round) => isRankedModeEntry(round))
  const recentRankedRounds = rankedRounds.slice(0, 10)

  let bestScore = 0
  let bestStreak = 0
  let bestScoreRound = null
  let cleanestRound = null
  let latestRankedRound = rankedRounds[0] ?? null
  let bestRankGainRound = null
  let bestRankGain = Number.NEGATIVE_INFINITY

  rows.forEach((round) => {
    const score = toNumber(round.score)
    const streak = toNumber(round.bestStreak)
    const accuracyPercent = toNumber(round.accuracyPercent)
    const attempts = getAttempts(round)
    const rankDelta = toNumber(round.rankDelta)

    if (score > bestScore || bestScoreRound === null) {
      bestScore = score
      bestScoreRound = round
    }

    if (streak > bestStreak) {
      bestStreak = streak
    }

    if (
      attempts > 0
      && (
        cleanestRound === null
        || accuracyPercent > toNumber(cleanestRound.accuracyPercent)
        || (
          accuracyPercent === toNumber(cleanestRound.accuracyPercent)
          && score > toNumber(cleanestRound.score)
        )
      )
    ) {
      cleanestRound = round
    }

    if (isRankedModeEntry(round) && rankDelta > bestRankGain) {
      bestRankGain = rankDelta
      bestRankGainRound = round
    }
  })

  const recentTotals = recentRounds.reduce((totals, round) => ({
    hits: totals.hits + toNumber(round.hits),
    misses: totals.misses + toNumber(round.misses),
    score: totals.score + toNumber(round.score),
  }), { hits: 0, misses: 0, score: 0 })

  const recentAccuracyPercent = recentTotals.hits + recentTotals.misses > 0
    ? Math.round((recentTotals.hits / (recentTotals.hits + recentTotals.misses)) * 100)
    : 0
  const recentAverageScore = recentRounds.length > 0
    ? Math.round(recentTotals.score / recentRounds.length)
    : 0
  const recentRankDelta = recentRankedRounds.reduce(
    (sum, round) => sum + toNumber(round.rankDelta),
    0
  )
  const recentPositiveRankRounds = recentRankedRounds.filter(
    (round) => toNumber(round.rankDelta) > 0
  ).length

  return {
    totalRounds: rows.length,
    bestScore,
    bestStreak,
    latestRound: rows[0] ?? null,
    bestScoreRound,
    cleanestRound,
    latestRankedRound,
    bestRankGainRound,
    bestRankGain: Number.isFinite(bestRankGain) ? bestRankGain : 0,
    reactionStats: buildCareerReactionStats(rows),
    recentSampleSize: recentRounds.length,
    recentAccuracyPercent,
    recentAverageScore,
    recentRankedSampleSize: recentRankedRounds.length,
    recentRankDelta,
    recentPositiveRankRounds,
  }
}
