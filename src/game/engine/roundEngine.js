import { getComboMultiplier } from "../../utils/gameMath.js"

// Score-relevant powerup tuning lives here (not in the UI hook) so the client
// simulation and the server's replay of the submitted event stream can never
// disagree about what a powerup did.
export const COMBO_SURGE_STREAK_BONUS = 4
export const COMBO_SURGE_HIT_COUNT = 4
export const GUARD_CHARGE_DURATION_MS = 8000

export const ROUND_EVENT_TYPES = {
  HIT: "hit",
  MISS: "miss",
  POWERUP: "powerup",
}

function toCount(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

/**
 * Creates a stateful, deterministic round simulation from resolved round rules
 * (a base mode merged with loadout effects via buildRoundRules).
 *
 * The simulation is pure with respect to its inputs: it never reads clocks or
 * randomness. Event times are caller-provided milliseconds since round start,
 * so replaying the same rules + event sequence always produces the same totals.
 */
export function createRoundSimulation(roundRules = {}) {
  const basePointsPerHit = Number(roundRules.basePointsPerHit) || 1
  const comboStep = Math.max(1, Number(roundRules.comboStep) || 5)
  const missPenalty = Math.max(0, Number(roundRules.missPenalty) || 0)
  const scoreMultiplier = Number(roundRules.scoreMultiplier) > 0
    ? Number(roundRules.scoreMultiplier)
    : 1
  const isTimedRound = roundRules.isTimedRound !== false
  const equippedPowerups = Array.isArray(roundRules.equippedPowerups)
    ? roundRules.equippedPowerups
    : []
  const powerupsById = Object.fromEntries(
    equippedPowerups.map((powerup) => [powerup.id, powerup])
  )

  const charges = {}
  equippedPowerups.forEach((powerup) => {
    charges[powerup.id] = toCount(roundRules.startingPowerupCharges)
  })

  let score = 0
  let streak = 0
  let bestStreak = 0
  let hits = 0
  let misses = 0
  let comboSurgeHitsRemaining = 0
  let guardActiveUntilMs = 0

  function getState() {
    return {
      score,
      streak,
      bestStreak,
      hits,
      misses,
      comboSurgeHitsRemaining,
      guardActiveUntilMs,
      powerupCharges: { ...charges },
    }
  }

  function applyHit() {
    const nextStreak = streak + 1
    const effectiveStreak = comboSurgeHitsRemaining > 0
      ? nextStreak + COMBO_SURGE_STREAK_BONUS
      : nextStreak
    const pointsEarned = Math.max(
      1,
      Math.round(
        basePointsPerHit *
        getComboMultiplier(effectiveStreak, comboStep) *
        scoreMultiplier
      )
    )

    if (comboSurgeHitsRemaining > 0) {
      comboSurgeHitsRemaining -= 1
    }

    streak = nextStreak
    bestStreak = Math.max(bestStreak, streak)
    hits += 1
    score += pointsEarned

    const grantedPowerups = equippedPowerups.filter(
      (powerup) => nextStreak % Math.max(1, powerup.awardEvery) === 0
    )
    grantedPowerups.forEach((powerup) => {
      charges[powerup.id] = (charges[powerup.id] ?? 0) + 1
    })

    return { pointsEarned, grantedPowerups, ...getState() }
  }

  function applyMiss(eventTimeMs = 0) {
    misses += 1

    const guarded = guardActiveUntilMs > eventTimeMs
    let penaltyApplied = 0

    if (guarded) {
      guardActiveUntilMs = 0
    } else {
      streak = 0
      penaltyApplied = missPenalty
      score = Math.max(0, score - missPenalty)
    }

    return { guarded, penaltyApplied, ...getState() }
  }

  function applyPowerup(powerupId, eventTimeMs = 0) {
    const powerup = powerupsById[powerupId]
    if (!powerup) {
      return { applied: false, reason: "unknown_powerup", ...getState() }
    }
    if ((charges[powerup.id] ?? 0) <= 0) {
      return { applied: false, reason: "no_charge", ...getState() }
    }
    if (powerup.effectType === "time_boost" && !isTimedRound) {
      return { applied: false, reason: "untimed_round", ...getState() }
    }

    charges[powerup.id] -= 1

    if (powerup.effectType === "combo_surge") {
      comboSurgeHitsRemaining += COMBO_SURGE_HIT_COUNT
    }
    if (powerup.effectType === "guard_charge") {
      guardActiveUntilMs = eventTimeMs + GUARD_CHARGE_DURATION_MS
    }

    return {
      applied: true,
      effectType: powerup.effectType,
      powerup,
      ...getState(),
    }
  }

  function getSummary() {
    return {
      score: Math.floor(score),
      hits,
      misses,
      bestStreak,
    }
  }

  return { applyHit, applyMiss, applyPowerup, getState, getSummary }
}

/**
 * Replays a full event stream through the simulation. Used by the server to
 * verify submissions and by golden-file tests. Powerup activations that are
 * illegal at their point in the stream (no charge available, unknown powerup)
 * invalidate the whole round instead of being skipped, since an honest client
 * can never produce them.
 */
export function replayRoundEvents(roundRules, events = []) {
  const simulation = createRoundSimulation(roundRules)

  for (const event of events) {
    if (event.type === ROUND_EVENT_TYPES.HIT) {
      simulation.applyHit(event.t)
    } else if (event.type === ROUND_EVENT_TYPES.MISS) {
      simulation.applyMiss(event.t)
    } else if (event.type === ROUND_EVENT_TYPES.POWERUP) {
      const outcome = simulation.applyPowerup(event.powerupId, event.t)
      if (!outcome.applied && outcome.reason !== "untimed_round") {
        return {
          valid: false,
          reason: outcome.reason === "no_charge"
            ? "Powerup used without an available charge."
            : "Unknown powerup in event stream.",
        }
      }
    } else {
      return { valid: false, reason: "Invalid event type." }
    }
  }

  return { valid: true, ...simulation.getSummary() }
}
