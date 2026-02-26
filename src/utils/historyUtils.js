import { MAX_HISTORY_ENTRIES } from "../constants/historyConstants.js"
import { formatAccuracy } from "./gameMath.js"

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
 * @param {string} roundSummary.difficultyId
 * @returns {Object}
 */
export function createHistoryEntry({
  score = 0,
  hits = 0,
  misses = 0,
  bestStreak = 0,
  coinsEarned = 0,
  difficultyId = "",
}) {
  const playedDate = new Date()

  return {
    id: `r-${playedDate.getTime()}-${Math.random().toString(16).slice(2, 6)}`,
    playedAt: formatPlayedAtLabel(playedDate),
    playedAtIso: playedDate.toISOString(),
    score,
    hits,
    misses,
    bestStreak,
    accuracy: formatAccuracy(hits, misses),
    coinsEarned,
    difficultyId,
  }
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
 * @returns {{bestScore: number, bestStreak: number, accuracy: string}}
 */
export function buildPlayerLeaderboardStats(historyEntries) {
  if (!historyEntries.length) {
    return {
      bestScore: 0,
      bestStreak: 0,
      accuracy: "0%",
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
    accuracy: formatAccuracy(totalHits, totalMisses),
  }
}
