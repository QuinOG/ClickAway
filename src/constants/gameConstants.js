export const GAME_DURATION_SECONDS = 15
export const INITIAL_BUTTON_SIZE = 100
export const MIN_BUTTON_SIZE = 10
export const BUTTON_SHRINK_FACTOR = 0.97
export const TIMER_TICK_MS = 1000
export const FEEDBACK_LIFETIME_MS = 500
export const FEEDBACK_OFFSET = { x: 12, y: -12 }
export const MIN_LABEL_FONT_SIZE = 8
export const MAX_LABEL_FONT_SIZE = 18
export const LABEL_SCALE_FACTOR = 0.18
export const LABEL_HIDE_SIZE_THRESHOLD = 40
export const MAX_TIME_BUFFER_SECONDS = 30
export const READY_COUNTDOWN_START = 3
export const SHAKE_STREAK_MILESTONE = 10
export const SHAKE_DURATION_MS = 260
export const FREEZE_MOVEMENT_DURATION_MS = 1000

export const ROUND_PHASE = {
  READY: "ready",
  COUNTDOWN: "countdown",
  PLAYING: "playing",
  GAME_OVER: "game_over",
}

export const POWERUPS = [
  {
    id: "time_boost",
    key: "1",
    label: "Time +2s",
    awardEvery: 5,
    description: "Adds 2 seconds to the timer.",
  },
  {
    id: "size_boost",
    key: "2",
    label: "Grow +10",
    awardEvery: 10,
    description: "Temporarily makes the target larger.",
  },
  {
    id: "freeze_movement",
    key: "3",
    label: "Freeze 1s",
    awardEvery: 15,
    description: "Stops target movement for 1 seconds.",
  },
]

export const POWERUP_BY_KEY = POWERUPS.reduce((powerupsByKey, powerup) => {
  powerupsByKey[powerup.key] = powerup
  return powerupsByKey
}, {})

export function buildInitialPowerupCharges() {
  return POWERUPS.reduce((chargesById, powerup) => {
    chargesById[powerup.id] = 0
    return chargesById
  }, {})
}
