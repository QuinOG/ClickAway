import {
  BUTTON_SHRINK_FACTOR,
  LABEL_HIDE_SIZE_THRESHOLD,
  LABEL_SCALE_FACTOR,
  MAX_LABEL_FONT_SIZE,
  MIN_BUTTON_SIZE,
  MIN_LABEL_FONT_SIZE,
} from "../constants/gameConstants.js"

const STREAK_ATMOSPHERE_MIN_STREAKS = [0, 4, 8, 12, 18]

function clampPercentage(value) {
  return Math.max(0, Math.min(100, value))
}

import {
  getCenteredPosition as getCenteredPositionPure,
  getRandomPosition as getRandomPositionPure,
} from "../game/engine/roundGeometry.js"

/**
 * Returns centered x/y coordinates for an item inside a rectangle.
 * @param {DOMRect} arenaRect
 * @param {number} itemSize
 * @returns {{x: number, y: number}}
 */
export function getCenteredPosition(arenaRect, itemSize) {
  return getCenteredPositionPure(arenaRect.width, arenaRect.height, itemSize)
}

/**
 * Returns a random valid x/y coordinate for an item inside a rectangle.
 * Accepts an injectable random source so button geometry can be derived from
 * a seeded RNG (server-issued round seeds) instead of ambient randomness.
 * @param {DOMRect} arenaRect
 * @param {number} itemSize
 * @param {() => number} [random]
 * @returns {{x: number, y: number}}
 */
export function getRandomPosition(arenaRect, itemSize, random = Math.random) {
  return getRandomPositionPure(arenaRect.width, arenaRect.height, itemSize, random)
}

/**
 * Calculates the next button size after a successful hit.
 * @param {number} currentSize
 * @param {Object} modeSettings
 * @returns {number}
 */
export function getNextButtonSize(currentSize, modeSettings = {}) {
  const minButtonSize = modeSettings.minButtonSize ?? MIN_BUTTON_SIZE
  const shrinkFactor = modeSettings.shrinkFactor ?? BUTTON_SHRINK_FACTOR
  return Math.max(minButtonSize, Math.floor(currentSize * shrinkFactor))
}

/**
 * Calculates combo multiplier from streak and combo step.
 * @param {number} streak
 * @param {number} comboStep
 * @returns {number}
 */
export function getComboMultiplier(streak, comboStep = 5) {
  const safeComboStep = Math.max(1, comboStep)
  return 1 + Math.floor(streak / safeComboStep)
}

/**
 * Normalizes a percentage-like value into a 0-100 number.
 * @param {number|string} value
 * @returns {number}
 */
export function normalizePercentValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return clampPercentage(value)
  }

  const parsedValue = Number.parseFloat(String(value ?? "").replace("%", ""))
  return Number.isFinite(parsedValue) ? clampPercentage(parsedValue) : 0
}

/**
 * Formats a percentage-like value as a rounded percentage string.
 * @param {number|string} value
 * @returns {string}
 */
export function formatPercent(value) {
  return `${Math.round(normalizePercentValue(value))}%`
}

/**
 * Calculates hit accuracy as a percentage.
 * @param {number} hits
 * @param {number} misses
 * @returns {number}
 */
export function calculateAccuracyPercent(hits, misses) {
  const normalizedHits = Math.max(0, Number(hits) || 0)
  const normalizedMisses = Math.max(0, Number(misses) || 0)
  const totalAttempts = normalizedHits + normalizedMisses

  if (totalAttempts === 0) {
    return 0
  }

  return clampPercentage((normalizedHits / totalAttempts) * 100)
}

/**
 * Formats hit accuracy as a percentage string.
 * @param {number} hits
 * @param {number} misses
 * @returns {string}
 */
export function formatAccuracy(hits, misses) {
  return formatPercent(calculateAccuracyPercent(hits, misses))
}

/**
 * Returns target button text based on size.
 * @param {number} size
 * @returns {string}
 */
export function getButtonLabel(size) {
  return size >= LABEL_HIDE_SIZE_THRESHOLD ? "Click Me" : ""
}

/**
 * Returns target button font size based on size.
 * @param {number} size
 * @returns {number}
 */
export function getButtonLabelFontSize(size) {
  return Math.min(
    MAX_LABEL_FONT_SIZE,
    Math.max(MIN_LABEL_FONT_SIZE, Math.floor(size * LABEL_SCALE_FACTOR))
  )
}

/**
 * Maps streak to atmosphere tier index for UI styling.
 * @param {number} streak
 * @returns {number}
 */
export function getStreakAtmosphereTier(streak) {
  for (
    let tierIndex = STREAK_ATMOSPHERE_MIN_STREAKS.length - 1;
    tierIndex >= 0;
    tierIndex -= 1
  ) {
    if (streak >= STREAK_ATMOSPHERE_MIN_STREAKS[tierIndex]) {
      return tierIndex
    }
  }

  return 0
}
