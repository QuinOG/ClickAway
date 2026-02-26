import {
  BUTTON_SHRINK_FACTOR,
  MIN_BUTTON_SIZE,
  MIN_LABEL_FONT_SIZE,
  MAX_LABEL_FONT_SIZE,
  LABEL_SCALE_FACTOR,
  LABEL_HIDE_SIZE_THRESHOLD,
} from "./gameConfig.js"

const STREAK_ATMOSPHERE_MIN_STREAKS = [0, 4, 8, 12, 18]

function clampToArena(arenaSize, itemSize) {
  return Math.max(0, arenaSize - itemSize)
}

export function getCenteredPosition(rect, itemSize) {
  return {
    x: Math.max(0, Math.floor((rect.width - itemSize) / 2)),
    y: Math.max(0, Math.floor((rect.height - itemSize) / 2)),
  }
}

export function getRandomPosition(rect, itemSize) {
  const maxX = clampToArena(rect.width, itemSize)
  const maxY = clampToArena(rect.height, itemSize)

  return {
    x: Math.floor(Math.random() * (maxX + 1)),
    y: Math.floor(Math.random() * (maxY + 1)),
  }
}

export function getNextButtonSize(currentSize, difficultySettings = {}) {
  const minButtonSize = difficultySettings.minButtonSize ?? MIN_BUTTON_SIZE
  const shrinkFactor = difficultySettings.shrinkFactor ?? BUTTON_SHRINK_FACTOR

  return Math.max(minButtonSize, Math.floor(currentSize * shrinkFactor))
}

export function getComboMultiplier(streak, comboStep = 5) {
  const safeComboStep = Math.max(1, comboStep)
  return 1 + Math.floor(streak / safeComboStep)
}

export function formatAccuracy(hits, misses) {
  const totalAttempts = hits + misses
  if (totalAttempts === 0) return "0%"
  return `${Math.round((hits / totalAttempts) * 100)}%`
}

export function getButtonLabel(size) {
  return size >= LABEL_HIDE_SIZE_THRESHOLD ? "Click Here" : ""
}

export function getButtonLabelFontSize(size) {
  return Math.min(
    MAX_LABEL_FONT_SIZE,
    Math.max(MIN_LABEL_FONT_SIZE, Math.floor(size * LABEL_SCALE_FACTOR))
  )
}

export function getStreakAtmosphereTier(streak) {
  for (let index = STREAK_ATMOSPHERE_MIN_STREAKS.length - 1; index >= 0; index -= 1) {
    if (streak >= STREAK_ATMOSPHERE_MIN_STREAKS[index]) {
      return index
    }
  }
  return 0
}
