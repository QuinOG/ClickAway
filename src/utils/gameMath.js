import {
  BUTTON_SHRINK_FACTOR,
  LABEL_HIDE_SIZE_THRESHOLD,
  LABEL_SCALE_FACTOR,
  MAX_LABEL_FONT_SIZE,
  MIN_BUTTON_SIZE,
  MIN_LABEL_FONT_SIZE,
} from "../constants/gameConstants.js"

const STREAK_ATMOSPHERE_MIN_STREAKS = [0, 4, 8, 12, 18]

function clampToArena(arenaSize, itemSize) {
  return Math.max(0, arenaSize - itemSize)
}

/**
 * Returns centered x/y coordinates for an item inside a rectangle.
 * @param {DOMRect} arenaRect
 * @param {number} itemSize
 * @returns {{x: number, y: number}}
 */
export function getCenteredPosition(arenaRect, itemSize) {
  return {
    x: Math.max(0, Math.floor((arenaRect.width - itemSize) / 2)),
    y: Math.max(0, Math.floor((arenaRect.height - itemSize) / 2)),
  }
}

/**
 * Returns a random valid x/y coordinate for an item inside a rectangle.
 * @param {DOMRect} arenaRect
 * @param {number} itemSize
 * @returns {{x: number, y: number}}
 */
export function getRandomPosition(arenaRect, itemSize) {
  const maxX = clampToArena(arenaRect.width, itemSize)
  const maxY = clampToArena(arenaRect.height, itemSize)

  return {
    x: Math.floor(Math.random() * (maxX + 1)),
    y: Math.floor(Math.random() * (maxY + 1)),
  }
}

/**
 * Calculates the next button size after a successful hit.
 * @param {number} currentSize
 * @param {Object} difficultySettings
 * @returns {number}
 */
export function getNextButtonSize(currentSize, difficultySettings = {}) {
  const minButtonSize = difficultySettings.minButtonSize ?? MIN_BUTTON_SIZE
  const shrinkFactor = difficultySettings.shrinkFactor ?? BUTTON_SHRINK_FACTOR
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
 * Formats hit accuracy as a percentage string.
 * @param {number} hits
 * @param {number} misses
 * @returns {string}
 */
export function formatAccuracy(hits, misses) {
  const totalAttempts = hits + misses
  if (totalAttempts === 0) return "0%"
  return `${Math.round((hits / totalAttempts) * 100)}%`
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
