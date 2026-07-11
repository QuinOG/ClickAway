import { getTrainingDrillById } from "../constants/drillConfig.js"
import { calculateAccuracyPercent } from "./gameMath.js"

export function normalizeDrillStatsEntry(entry = {}) {
  const drillId = String(entry.drillId || "").trim()
  if (!drillId) {
    return null
  }

  const bestMetric = Number(entry.bestMetric)
  const lastMetric = Number(entry.lastMetric)

  return {
    drillId,
    rounds: Math.max(0, Number(entry.rounds) || 0),
    bestMetric: Number.isFinite(bestMetric) ? bestMetric : null,
    lastMetric: Number.isFinite(lastMetric) ? lastMetric : null,
  }
}

export function normalizeDrillStats(stats = {}) {
  if (!stats || typeof stats !== "object" || Array.isArray(stats)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(stats)
      .map(([drillId, entry]) => normalizeDrillStatsEntry({ ...entry, drillId }))
      .filter(Boolean)
      .map((entry) => [entry.drillId, entry])
  )
}

export function evaluateDrillMetric(drill, round = {}) {
  if (!drill) {
    return null
  }

  if (drill.metricKey === "accuracyPercent") {
    return Math.round(calculateAccuracyPercent(round.hits, round.misses))
  }

  if (drill.metricKey === "bestStreak") {
    return Math.max(0, Number(round.bestStreak) || 0)
  }

  if (drill.metricKey === "avgReactionMs") {
    const avgReactionMs = Number(round.avgReactionMs)
    return Number.isFinite(avgReactionMs) && avgReactionMs > 0
      ? Math.round(avgReactionMs)
      : null
  }

  return null
}

export function isDrillMetricBetter(drill, candidateMetric, currentBestMetric) {
  if (candidateMetric === null || candidateMetric === undefined) {
    return false
  }

  if (currentBestMetric === null || currentBestMetric === undefined) {
    return true
  }

  return drill.higherIsBetter
    ? candidateMetric > currentBestMetric
    : candidateMetric < currentBestMetric
}

export function applyRoundToDrillStats(drillStats = {}, drillId, round = {}) {
  const drill = getTrainingDrillById(drillId)
  if (!drill) {
    return normalizeDrillStats(drillStats)
  }

  const normalizedStats = normalizeDrillStats(drillStats)
  const metric = evaluateDrillMetric(drill, round)
  const existing = normalizedStats[drillId] ?? {
    drillId,
    rounds: 0,
    bestMetric: null,
    lastMetric: null,
  }

  return {
    ...normalizedStats,
    [drillId]: {
      drillId,
      rounds: existing.rounds + 1,
      bestMetric: isDrillMetricBetter(drill, metric, existing.bestMetric)
        ? metric
        : existing.bestMetric,
      lastMetric: metric,
    },
  }
}

export function formatDrillBestMetric(drill, entry) {
  if (!drill || !entry || entry.bestMetric === null || entry.bestMetric === undefined) {
    return "—"
  }

  if (drill.metricKey === "accuracyPercent") {
    return `${entry.bestMetric}%`
  }

  if (drill.metricKey === "bestStreak") {
    return `${entry.bestMetric} streak`
  }

  if (drill.metricKey === "avgReactionMs") {
    return `${entry.bestMetric}ms`
  }

  return String(entry.bestMetric)
}
