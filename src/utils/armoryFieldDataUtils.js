/**
 * Phase 9 ("Field Data"): turns the aggregate per-build stats already
 * returned by the server (`user_loadout_stats`) into Armory- and Game
 * Over-facing selectors. Nothing here mutates or persists — it only reads.
 */

export function selectLoadoutStatsEntry(loadoutStats = [], loadoutId = "") {
  if (!loadoutId) return null
  return loadoutStats.find((entry) => entry.loadoutId === loadoutId) ?? null
}

/**
 * One quiet, advisory line for the Game Over overlay, or null when there is
 * nothing true to say yet. Guards on `baselineTotalRounds` (captured at round
 * start) so it never fires against a stale, pre-round stats snapshot.
 */
export function buildWorkshopNote({
  loadoutStats = [],
  loadoutSnapshot = null,
  baselineTotalRounds = 0,
  roundResult = null,
} = {}) {
  const loadoutId = loadoutSnapshot?.loadoutId
  if (!loadoutId || !roundResult) return null

  const entry = selectLoadoutStatsEntry(loadoutStats, loadoutId)
  if (!entry || entry.totalRounds <= baselineTotalRounds) return null

  const buildName = loadoutSnapshot.loadoutName || entry.loadoutName || "this build"

  if (roundResult.bestStreak > 0 && roundResult.bestStreak >= entry.bestStreak) {
    return `Best streak with ${buildName} so far: ${entry.bestStreak}.`
  }

  if (roundResult.score > 0 && roundResult.score >= entry.bestScore) {
    return `New best score with ${buildName}: ${entry.bestScore.toLocaleString()}.`
  }

  if (roundResult.isRanked && roundResult.rankDelta > 0 && entry.rankedRounds > 0) {
    const winRate = Math.round((entry.rankedWins / entry.rankedRounds) * 100)
    return `${entry.rankedWins} Ranked win${entry.rankedWins === 1 ? "" : "s"} with ${buildName} so far (${winRate}% win rate).`
  }

  if (entry.totalRounds > 0 && entry.totalRounds % 10 === 0) {
    return `${entry.totalRounds} rounds logged with ${buildName}.`
  }

  return null
}
