import { buildRoundRules } from "../constants/buildcraft.js"
import { getDifficultyById } from "../constants/gameModesConfig.js"
import { replayRoundEvents } from "../game/engine/roundEngine.js"

export function buildRoundRulesFromReplay(replay = {}) {
  const mode = getDifficultyById(replay.modeId)
  if (!mode) {
    return null
  }

  return buildRoundRules(mode, replay.loadoutSnapshot ?? {})
}

/**
 * Replays a ghost's event stream up to an elapsed millisecond mark and returns
 * the score they had at that moment in their round.
 */
export function computeGhostScoreAtElapsed(replay = {}, elapsedMs = 0, playerLevel = 1) {
  const roundRules = buildRoundRulesFromReplay(replay, playerLevel)
  if (!roundRules) {
    return 0
  }

  const events = Array.isArray(replay.events) ? replay.events : []
  const elapsed = Math.max(0, Number(elapsedMs) || 0)
  const visibleEvents = events.filter((event) => Number(event?.t) <= elapsed)
  const outcome = replayRoundEvents(roundRules, visibleEvents)

  return outcome.valid ? Math.max(0, Number(outcome.score) || 0) : 0
}

export function normalizeReplayRecord(replay = {}) {
  const events = Array.isArray(replay.events)
    ? replay.events
    : (typeof replay.eventsJson === "string"
      ? JSON.parse(replay.eventsJson)
      : replay.eventsJson ?? [])

  let loadoutSnapshot = replay.loadoutSnapshot ?? null
  if (!loadoutSnapshot && replay.loadoutSnapshotJson) {
    loadoutSnapshot = typeof replay.loadoutSnapshotJson === "string"
      ? JSON.parse(replay.loadoutSnapshotJson)
      : replay.loadoutSnapshotJson
  }

  return {
    id: Number(replay.id) || 0,
    userId: Number(replay.userId) || 0,
    username: String(replay.username || "Player"),
    modeId: String(replay.modeId || ""),
    seed: Number(replay.seed) >>> 0,
    events,
    loadoutSnapshot,
    score: Math.max(0, Number(replay.score) || 0),
    hits: Math.max(0, Number(replay.hits) || 0),
    misses: Math.max(0, Number(replay.misses) || 0),
    bestStreak: Math.max(0, Number(replay.bestStreak) || 0),
    playedAt: replay.playedAt ?? replay.playedAtIso ?? null,
  }
}
