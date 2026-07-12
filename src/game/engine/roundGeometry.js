import { getNextButtonSize } from "../../utils/gameMath.js"
import { ROUND_EVENT_TYPES } from "./roundEngine.js"
import { createSeededRng } from "./seededRng.js"

export const FREEZE_MOVEMENT_DURATION_MS = 1000
export const MAGNET_CENTER_FREEZE_MS = 400
export const SIZE_BOOST_GROWTH = 10
export const MAGNET_CENTER_GROWTH = 6
export const SIZE_LOCK_DURATION_MS = 3000

const MIN_ARENA_DIMENSION = 120
const MAX_ARENA_DIMENSION = 2000

function clampToArena(arenaSize, itemSize) {
  return Math.max(0, arenaSize - itemSize)
}

export function getCenteredPosition(arenaWidth, arenaHeight, itemSize) {
  return {
    x: Math.max(0, Math.floor((arenaWidth - itemSize) / 2)),
    y: Math.max(0, Math.floor((arenaHeight - itemSize) / 2)),
  }
}

export function getRandomPosition(arenaWidth, arenaHeight, itemSize, random = Math.random) {
  const maxX = clampToArena(arenaWidth, itemSize)
  const maxY = clampToArena(arenaHeight, itemSize)

  return {
    x: Math.floor(random() * (maxX + 1)),
    y: Math.floor(random() * (maxY + 1)),
  }
}

export function isPointInsideButton(x, y, position, buttonSize) {
  return (
    x >= position.x
    && y >= position.y
    && x < position.x + buttonSize
    && y < position.y + buttonSize
  )
}

export function normalizeArenaDimensions(arenaWidth, arenaHeight) {
  const width = Math.floor(Number(arenaWidth))
  const height = Math.floor(Number(arenaHeight))

  if (
    !Number.isFinite(width)
    || !Number.isFinite(height)
    || width < MIN_ARENA_DIMENSION
    || height < MIN_ARENA_DIMENSION
    || width > MAX_ARENA_DIMENSION
    || height > MAX_ARENA_DIMENSION
  ) {
    return null
  }

  return { arenaWidth: width, arenaHeight: height }
}

/**
 * Stateful geometry replay that mirrors the client's button trajectory:
 * centered start, seeded repositions after hits, and powerup-driven growth/freeze.
 */
export function createGeometrySimulation({
  roundRules = {},
  arenaWidth,
  arenaHeight,
  rng = Math.random,
} = {}) {
  const initialButtonSize = Number(roundRules.initialButtonSize) || 100
  const powerupsById = Object.fromEntries(
    (Array.isArray(roundRules.equippedPowerups) ? roundRules.equippedPowerups : [])
      .map((powerup) => [powerup.id, powerup])
  )

  let buttonSize = initialButtonSize
  let position = getCenteredPosition(arenaWidth, arenaHeight, buttonSize)
  let freezeMovementUntilMs = 0
  let sizeLockUntilMs = 0

  function getState() {
    return {
      buttonSize,
      position: { ...position },
      freezeMovementUntilMs,
      sizeLockUntilMs,
    }
  }

  function pointHitsButton(x, y) {
    return isPointInsideButton(x, y, position, buttonSize)
  }

  function applyHit(eventTimeMs = 0) {
    if (eventTimeMs >= sizeLockUntilMs) {
      buttonSize = getNextButtonSize(buttonSize, roundRules)
    }

    if (eventTimeMs >= freezeMovementUntilMs) {
      position = getRandomPosition(arenaWidth, arenaHeight, buttonSize, rng)
    }

    return getState()
  }

  function applyMiss() {
    return getState()
  }

  function applyPowerup(powerupId, eventTimeMs = 0) {
    const powerup = powerupsById[powerupId]
    if (!powerup) return getState()

    if (powerup.effectType === "size_boost") {
      buttonSize = Math.min(initialButtonSize, buttonSize + SIZE_BOOST_GROWTH)
    } else if (powerup.effectType === "freeze_movement") {
      freezeMovementUntilMs = eventTimeMs + FREEZE_MOVEMENT_DURATION_MS
    } else if (powerup.effectType === "magnet_center") {
      freezeMovementUntilMs = eventTimeMs + MAGNET_CENTER_FREEZE_MS
      buttonSize = Math.min(initialButtonSize, buttonSize + MAGNET_CENTER_GROWTH)
      position = getCenteredPosition(arenaWidth, arenaHeight, buttonSize)
    } else if (powerup.effectType === "size_lock") {
      sizeLockUntilMs = eventTimeMs + SIZE_LOCK_DURATION_MS
    }

    return getState()
  }

  return {
    applyHit,
    applyMiss,
    applyPowerup,
    getState,
    pointHitsButton,
  }
}

/**
 * Replays click geometry for a submitted event stream. Hit coordinates must land
 * inside the button that was active at that event time; miss coordinates must
 * fall outside when provided.
 */
export function validateRoundGeometry(roundRules, events = [], {
  seed,
  arenaWidth,
  arenaHeight,
} = {}) {
  const arena = normalizeArenaDimensions(arenaWidth, arenaHeight)
  if (!arena) {
    return { valid: false, reason: "Invalid arena dimensions." }
  }

  const rng = createSeededRng(seed)
  const simulation = createGeometrySimulation({
    roundRules,
    arenaWidth: arena.arenaWidth,
    arenaHeight: arena.arenaHeight,
    rng,
  })

  for (const event of events) {
    if (event.type === ROUND_EVENT_TYPES.HIT) {
      if (typeof event.x !== "number" || typeof event.y !== "number") {
        return { valid: false, reason: "Hit missing click coordinates." }
      }
      if (!simulation.pointHitsButton(event.x, event.y)) {
        return { valid: false, reason: "Hit click was outside the target." }
      }
      simulation.applyHit(event.t)
    } else if (event.type === ROUND_EVENT_TYPES.MISS) {
      if (typeof event.x === "number" && typeof event.y === "number") {
        if (simulation.pointHitsButton(event.x, event.y)) {
          return { valid: false, reason: "Miss click was inside the target." }
        }
      }
      simulation.applyMiss(event.t)
    } else if (event.type === ROUND_EVENT_TYPES.POWERUP) {
      simulation.applyPowerup(event.powerupId, event.t)
    }
  }

  return { valid: true, ...simulation.getState() }
}
