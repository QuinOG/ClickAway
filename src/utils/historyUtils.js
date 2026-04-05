import { MAX_HISTORY_ENTRIES } from "../constants/historyConstants.js"
import {
  calculateAccuracyPercent,
  normalizePercentValue,
} from "./gameMath.js"

function normalizeLoadoutSnapshot(snapshot = {}) {
  const candidateSnapshot = snapshot?.loadoutId || snapshot?.loadoutName
    ? snapshot
    : {
        loadoutId: snapshot.loadoutId ?? snapshot.id ?? "",
        loadoutName: snapshot.loadoutName ?? snapshot.name ?? "",
        moduleIds: snapshot.moduleIds,
        powerupIds: snapshot.powerupIds,
      }
  const nextModuleIds = candidateSnapshot?.moduleIds ?? {}
  const nextPowerupIds = Array.isArray(candidateSnapshot?.powerupIds)
    ? candidateSnapshot.powerupIds
        .map((powerupId) => String(powerupId || "").trim())
        .filter(Boolean)
        .slice(0, 3)
    : []

  const loadoutId = String(candidateSnapshot?.loadoutId || "")
  const loadoutName = String(candidateSnapshot?.loadoutName || "").trim()

  if (!loadoutId && !loadoutName && !nextPowerupIds.length) {
    return null
  }

  return {
    loadoutId,
    loadoutName: loadoutName || "Loadout",
    moduleIds: {
      tempoCoreId: String(nextModuleIds.tempoCoreId || ""),
      streakLensId: String(nextModuleIds.streakLensId || ""),
      powerRigId: String(nextModuleIds.powerRigId || ""),
    },
    powerupIds: nextPowerupIds,
  }
}

function formatTimeOnly(date) {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })
}

function isSameDay(firstDate, secondDate) {
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  )
}

function normalizeReactionMetric(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return null
  }

  return Math.round(numericValue)
}

function normalizeNonNegativeNumber(value) {
  return Math.max(0, Number(value) || 0)
}

function normalizePlayedAtIso(value, fallbackDate = new Date()) {
  const parsedDate = value ? new Date(value) : fallbackDate
  return Number.isNaN(parsedDate.getTime())
    ? fallbackDate.toISOString()
    : parsedDate.toISOString()
}

export function normalizeHistoryEntry(entry = {}, index = 0) {
  const fallbackDate = new Date(Date.now() - index)
  const playedAtIso = normalizePlayedAtIso(
    entry.playedAtIso ?? entry.playedAt,
    fallbackDate
  )
  const hits = normalizeNonNegativeNumber(entry.hits)
  const misses = normalizeNonNegativeNumber(entry.misses)
  const loadoutSnapshot = normalizeLoadoutSnapshot(
    entry.loadoutSnapshot ?? {
      loadoutId: entry.loadoutId,
      loadoutName: entry.loadoutName,
      moduleIds: {
        tempoCoreId: entry.tempoCoreId,
        streakLensId: entry.streakLensId,
        powerRigId: entry.powerRigId,
      },
      powerupIds: [
        entry.powerupSlot1Id,
        entry.powerupSlot2Id,
        entry.powerupSlot3Id,
      ],
    }
  )

  return {
    id: String(entry.id || `r-${Date.parse(playedAtIso)}-${index}`),
    playedAtIso,
    score: normalizeNonNegativeNumber(entry.score),
    hits,
    misses,
    bestStreak: normalizeNonNegativeNumber(entry.bestStreak),
    accuracyPercent: normalizePercentValue(
      entry.accuracyPercent ?? calculateAccuracyPercent(hits, misses)
    ),
    avgReactionMs: normalizeReactionMetric(entry.avgReactionMs),
    bestReactionMs: normalizeReactionMetric(entry.bestReactionMs),
    coinsEarned: normalizeNonNegativeNumber(entry.coinsEarned),
    modeId: String(entry.modeId || entry.difficultyId || ""),
    difficultyId: String(entry.modeId || entry.difficultyId || ""),
    progressionMode: String(entry.progressionMode || ""),
    xpEarned: normalizeNonNegativeNumber(entry.xpEarned),
    rankDelta: Number.isFinite(Number(entry.rankDelta)) ? Number(entry.rankDelta) : 0,
    loadoutSnapshot,
  }
}

/**
 * Builds the display label used on the History page.
 * @param {Date} playedDate
 * @returns {string}
 */
export function formatPlayedAtLabel(playedDate) {
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)

  if (isSameDay(playedDate, now)) {
    return `Today, ${formatTimeOnly(playedDate)}`
  }

  if (isSameDay(playedDate, yesterday)) {
    return `Yesterday, ${formatTimeOnly(playedDate)}`
  }

  return playedDate.toLocaleString([], {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

/**
 * Creates one history record from round-end values.
 * @param {Object} roundSummary
 * @param {number} roundSummary.score
 * @param {number} roundSummary.hits
 * @param {number} roundSummary.misses
 * @param {number} roundSummary.bestStreak
 * @param {number} roundSummary.coinsEarned
 * @param {string} roundSummary.modeId
 * @param {string} roundSummary.difficultyId
 * @returns {Object}
 */
export function createHistoryEntry({
  score = 0,
  hits = 0,
  misses = 0,
  bestStreak = 0,
  avgReactionMs = null,
  bestReactionMs = null,
  coinsEarned = 0,
  modeId = "",
  difficultyId = "",
  progressionMode = "",
  xpEarned = 0,
  rankDelta = 0,
  loadoutSnapshot = null,
}) {
  const playedDate = new Date()
  const resolvedModeId = modeId || difficultyId

  return normalizeHistoryEntry({
    id: `r-${playedDate.getTime()}-${Math.random().toString(16).slice(2, 6)}`,
    playedAtIso: playedDate.toISOString(),
    score,
    hits,
    misses,
    bestStreak,
    accuracyPercent: calculateAccuracyPercent(hits, misses),
    avgReactionMs: normalizeReactionMetric(avgReactionMs),
    bestReactionMs: normalizeReactionMetric(bestReactionMs),
    coinsEarned,
    modeId: resolvedModeId,
    difficultyId: resolvedModeId,
    progressionMode,
    xpEarned,
    rankDelta,
    loadoutSnapshot,
  })
}

/**
 * Appends a new record at the top and keeps a max history size.
 * @param {Object[]} currentHistory
 * @param {Object} nextEntry
 * @returns {Object[]}
 */
export function appendHistoryEntry(currentHistory, nextEntry) {
  return [nextEntry, ...currentHistory].slice(0, MAX_HISTORY_ENTRIES)
}

/**
 * Creates leaderboard values from saved round history.
 * @param {Object[]} historyEntries
 * @returns {{bestScore: number, bestStreak: number, accuracyPercent: number}}
 */
export function buildPlayerLeaderboardStats(historyEntries) {
  if (!historyEntries.length) {
    return {
      bestScore: 0,
      bestStreak: 0,
      accuracyPercent: 0,
    }
  }

  let bestScore = 0
  let bestStreak = 0
  let totalHits = 0
  let totalMisses = 0

  historyEntries.forEach((entry) => {
    bestScore = Math.max(bestScore, Number(entry.score) || 0)
    bestStreak = Math.max(bestStreak, Number(entry.bestStreak) || 0)
    totalHits += Number(entry.hits) || 0
    totalMisses += Number(entry.misses) || 0
  })

  return {
    bestScore,
    bestStreak,
    accuracyPercent: calculateAccuracyPercent(totalHits, totalMisses),
  }
}

export function buildCareerReactionStats(historyEntries = []) {
  const rows = Array.isArray(historyEntries) ? historyEntries : []
  let reactionRounds = 0
  let totalAverageReactionMs = 0
  let bestReactionMs = null

  rows.forEach((entry) => {
    const entryAverageReactionMs = normalizeReactionMetric(entry?.avgReactionMs)
    const entryBestReactionMs = normalizeReactionMetric(entry?.bestReactionMs)

    if (entryAverageReactionMs !== null) {
      reactionRounds += 1
      totalAverageReactionMs += entryAverageReactionMs
    }

    if (entryBestReactionMs !== null) {
      bestReactionMs = bestReactionMs === null
        ? entryBestReactionMs
        : Math.min(bestReactionMs, entryBestReactionMs)
    }
  })

  return {
    avgReactionMs: reactionRounds > 0
      ? Math.round(totalAverageReactionMs / reactionRounds)
      : null,
    bestReactionMs,
  }
}
