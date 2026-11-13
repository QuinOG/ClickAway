import {
  buildRoundRules,
  normalizeLoadoutSnapshotForLevel,
} from "../src/constants/buildcraft.js"
import { getDifficultyById } from "../src/constants/gameModesConfig.js"
import { getMaxClickEvents, MIN_CLICK_INTERVAL_MS, replayRoundEvents, ROUND_EVENT_TYPES } from "../src/game/engine/roundEngine.js"
import { validateRoundGeometry } from "../src/game/engine/roundGeometry.js"
import { calculateRoundCoins } from "../src/utils/roundRewards.js"
import { calculateRoundXp } from "../src/utils/progressionUtils.js"
import { calculatePlacementMatchScore, calculateRoundRankDelta } from "../src/utils/rankUtils.js"

// Powerup activations are keyboard/UI actions, not clicks, so they are exempt
// from the click-interval check. The replay already refuses any activation
// without an earned charge; this ceiling only bounds payload size. Charges are
// earned at most once per hit plus a few starting charges, so it follows the
// mode's click cap.
const STARTING_CHARGE_ALLOWANCE = 20
function getMaxPowerupEvents(modeId) {
  return getMaxClickEvents(modeId) + STARTING_CHARGE_ALLOWANCE
}

function clamp(value) {
  const n = Number.isFinite(value) ? value : 0
  return Math.max(0, n)
}

function accuracyPercent(hits, misses) {
  const total = hits + misses
  return total > 0 ? (hits / total) * 100 : 0
}

function isClickEvent(event) {
  return event.type === ROUND_EVENT_TYPES.HIT || event.type === ROUND_EVENT_TYPES.MISS
}

function validateEventStream(events, mode) {
  const maxClickEvents = getMaxClickEvents(mode.id)

  if (!Array.isArray(events)) return { valid: false, reason: "Events must be an array." }

  let clickCount = 0
  let powerupCount = 0
  let previousClickTime = null

  for (const event of events) {
    if (!event || typeof event !== "object") {
      return { valid: false, reason: "Invalid event." }
    }
    if (typeof event.t !== "number" || !Number.isFinite(event.t) || event.t < 0) {
      return { valid: false, reason: "Invalid event timestamp." }
    }

    if (isClickEvent(event)) {
      clickCount += 1
      if (previousClickTime !== null && event.t - previousClickTime < MIN_CLICK_INTERVAL_MS) {
        return { valid: false, reason: "Events too fast to be human." }
      }
      previousClickTime = event.t
    } else if (event.type === ROUND_EVENT_TYPES.POWERUP) {
      powerupCount += 1
      if (typeof event.powerupId !== "string" || !event.powerupId) {
        return { valid: false, reason: "Invalid powerup event." }
      }
    } else {
      return { valid: false, reason: "Invalid event type." }
    }
  }

  if (clickCount > maxClickEvents) return { valid: false, reason: "Too many events." }
  if (powerupCount > getMaxPowerupEvents(mode.id)) {
    return { valid: false, reason: "Too many powerup events." }
  }

  return { valid: true }
}

// The client's timer starts at durationSeconds; each Time Boost adds 2 seconds
// to the time remaining, capped at maxTimeBufferSeconds remaining. Replaying that
// rule gives the latest legal moment for every event, so a round cannot run past
// its timer, and legitimately boosted rounds are not rejected.
const TIME_BOOST_MS = 2000
const ROUND_DEADLINE_GRACE_MS = 1000

function validateRoundDeadline(roundRules, mode, events) {
  if (!mode.isTimedRound) return { valid: true, roundEndMs: null }

  const bufferMs = (Number(roundRules.maxTimeBufferSeconds ?? mode.maxTimeBufferSeconds) || 0) * 1000
  let deadlineMs = (Number(roundRules.durationSeconds ?? mode.durationSeconds) || 0) * 1000
  const timeBoostIds = new Set(
    (Array.isArray(roundRules.equippedPowerups) ? roundRules.equippedPowerups : [])
      .filter((powerup) => powerup?.effectType === "time_boost")
      .map((powerup) => powerup.id)
  )

  for (const event of events) {
    if (event.t > deadlineMs + ROUND_DEADLINE_GRACE_MS) {
      return { valid: false, reason: "Round events continue past the timer." }
    }
    if (event.type === ROUND_EVENT_TYPES.POWERUP && timeBoostIds.has(event.powerupId)) {
      const remainingMs = Math.max(0, deadlineMs - event.t)
      deadlineMs = event.t + Math.min(bufferMs, remainingMs + TIME_BOOST_MS)
    }
  }

  // When the timer actually ran out, counting every Time Boost used.
  return { valid: true, roundEndMs: deadlineMs }
}

/**
 * Re-simulates a submitted round with the same shared engine the client uses,
 * including loadout (passive module) effects and powerup activation events, so
 * the persisted score always matches what the player saw.
 *
 * `loadoutSnapshot` is optional for backward compatibility: bare
 * `{ modeId, events }` submissions replay against the base mode exactly as
 * before.
 */
export function simulateRound(events, modeId, {
  loadoutSnapshot = null,
  playerLevel = 1,
  roundSeed = null,
  arenaWidth = null,
  arenaHeight = null,
} = {}) {
  const mode = getDifficultyById(modeId)
  if (!mode || mode.id !== modeId) return { valid: false, reason: "Invalid modeId." }

  const streamValidation = validateEventStream(events, mode)
  if (!streamValidation.valid) return streamValidation

  // Events must already be in chronological order — an honest client records
  // them as they happen. Sorting a shuffled stream would let a scripted client
  // hide powerup-ordering violations, so out-of-order submissions are rejected.
  for (let i = 1; i < events.length; i++) {
    if (events[i].t < events[i - 1].t) {
      return { valid: false, reason: "Events are out of order." }
    }
  }

  const normalizedSnapshot = loadoutSnapshot
    ? normalizeLoadoutSnapshotForLevel(playerLevel, loadoutSnapshot)
    : null
  const roundRules = normalizedSnapshot
    ? buildRoundRules(mode, normalizedSnapshot)
    : mode

  const replay = replayRoundEvents(roundRules, events)
  if (!replay.valid) return replay

  const deadlineCheck = validateRoundDeadline(roundRules, mode, events)
  if (!deadlineCheck.valid) return deadlineCheck

  if (mode.allowsRankProgression) {
    if (roundSeed === null || roundSeed === undefined) {
      return { valid: false, reason: "Ranked rounds require a round seed." }
    }

    const geometryCheck = validateRoundGeometry(roundRules, events, {
      seed: roundSeed,
      arenaWidth,
      arenaHeight,
    })
    if (!geometryCheck.valid) return geometryCheck
  } else if (
    roundSeed !== null
    && roundSeed !== undefined
    && arenaWidth !== null
    && arenaHeight !== null
  ) {
    const geometryCheck = validateRoundGeometry(roundRules, events, {
      seed: roundSeed,
      arenaWidth,
      arenaHeight,
    })
    if (!geometryCheck.valid) return geometryCheck
  }

  return {
    valid: true,
    hits: replay.hits,
    misses: replay.misses,
    score: replay.score,
    bestStreak: replay.bestStreak,
    loadoutSnapshot: normalizedSnapshot,
    roundEndMs: deadlineCheck.roundEndMs,
  }
}

export function calculateRoundRewards({
  modeId,
  hits,
  misses,
  score,
  bestStreak,
  currentMmr,
  currentRankedState,
  hasRankedHistory,
}) {
  const mode = getDifficultyById(modeId)
  const h = clamp(hits)
  const m = clamp(misses)
  const s = clamp(score)
  const bs = clamp(bestStreak)
  const acc = accuracyPercent(h, m)

  const earnedCoins = mode.allowsCoinRewards
    ? calculateRoundCoins(h, mode.coinMultiplier)
    : 0

  const earnedXp = mode.allowsLevelProgression
    ? calculateRoundXp({ hits: h, misses: m, bestStreak: bs, score: s })
    : 0

  const baseRankDelta = calculateRoundRankDelta({
    score: s,
    hits: h,
    misses: m,
    bestStreak: bs,
    modeId,
    progressionMode: mode.progressionMode,
    allowsRankProgression: mode.allowsRankProgression,
  })
  const placementMatchScore = calculatePlacementMatchScore({
    score: s,
    hits: h,
    misses: m,
    bestStreak: bs,
    modeId,
    progressionMode: mode.progressionMode,
    allowsRankProgression: mode.allowsRankProgression,
  })

  return {
    earnedCoins,
    earnedXp,
    progressionMode: mode.progressionMode,
    accuracyPercent: acc,
    baseRankDelta,
    placementMatchScore,
    allowsRankProgression: mode.allowsRankProgression,
    currentMmr,
    currentRankedState,
    hasRankedHistory,
  }
}
