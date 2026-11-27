import { buildRoundRules } from "../constants/buildcraft.js"
import { getDifficultyById } from "../constants/gameModesConfig.js"
import { replayRoundEvents } from "../game/engine/roundEngine.js"

export function buildRoundRulesFromReplay(replay = {}) {
  if (!replay || typeof replay !== "object" || Array.isArray(replay)) return null
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
  if (!replay || typeof replay !== "object" || Array.isArray(replay)) return 0
  const roundRules = buildRoundRulesFromReplay(replay, playerLevel)
  if (!roundRules) {
    return 0
  }

  const events = Array.isArray(replay.events) ? replay.events : []
  const elapsed = Math.max(0, Number(elapsedMs) || 0)
  const visibleEvents = events.filter((event) => Number(event?.t) <= elapsed)
  const outcome = replayRoundEvents(roundRules, visibleEvents, replay.loadoutSnapshot?.arenaWidth ? {
    seed: replay.seed,
    arenaWidth: replay.loadoutSnapshot.arenaWidth,
    arenaHeight: replay.loadoutSnapshot.arenaHeight,
  } : {})

  return outcome.valid ? Math.max(0, Number(outcome.score) || 0) : 0
}

export function normalizeReplayRecord(replay = {}) {
  if (!replay || typeof replay !== "object" || Array.isArray(replay)) replay = {}
  let events = Array.isArray(replay.events) ? replay.events : replay.eventsJson
  if (typeof events === "string") {
    try {
      events = JSON.parse(events)
    } catch {
      events = []
    }
  }
  if (!Array.isArray(events)) events = []

  let loadoutSnapshot = replay.loadoutSnapshot ?? null
  if (!loadoutSnapshot && replay.loadoutSnapshotJson) {
    try {
      loadoutSnapshot = typeof replay.loadoutSnapshotJson === "string"
        ? JSON.parse(replay.loadoutSnapshotJson)
        : replay.loadoutSnapshotJson
    } catch {
      loadoutSnapshot = null
    }
  }
  if (!loadoutSnapshot || typeof loadoutSnapshot !== "object" || Array.isArray(loadoutSnapshot)) {
    loadoutSnapshot = null
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

// Check transport data before normalization can turn missing/invalid seeds into 0.
export function isValidGhostReplay(replay) {
  return Boolean(replay)
    && Number.isInteger(replay.id) && replay.id > 0
    && ["easy", "normal", "hard"].includes(replay.modeId)
    && Number.isInteger(replay.seed) && replay.seed >= 0 && replay.seed <= 0xffffffff
}
