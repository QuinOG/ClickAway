import { FEEDBACK_EVENTS } from "../constants/feedbackEvents.js"

const MAX_SIMULTANEOUS_VOICES = 6
const DUPLICATE_EVENT_WINDOW_MS = 1800

export { FEEDBACK_EVENTS }

const EVENT_RECIPES = Object.freeze({
  [FEEDBACK_EVENTS.NAVIGATE]: {
    notes: [420],
    duration: 0.045,
    gain: 0.11,
    type: "sine",
    vibration: 0,
  },
  [FEEDBACK_EVENTS.ACTION_CONFIRM]: {
    notes: [440, 660],
    duration: 0.075,
    gain: 0.16,
    type: "triangle",
    vibration: 8,
  },
  [FEEDBACK_EVENTS.ACTION_DENY]: {
    notes: [180, 140],
    duration: 0.09,
    gain: 0.14,
    type: "square",
    vibration: 16,
  },
  [FEEDBACK_EVENTS.SELECTION]: {
    notes: [520], duration: 0.04, gain: 0.09, type: "sine", vibration: 4,
  },
  [FEEDBACK_EVENTS.FILTER]: {
    notes: [360, 470], duration: 0.045, gain: 0.08, type: "sine", vibration: 4,
  },
  [FEEDBACK_EVENTS.PURCHASE]: {
    notes: [420, 620, 860], duration: 0.11, gain: 0.14, type: "triangle", vibration: [8, 24, 8],
  },
  [FEEDBACK_EVENTS.EQUIP]: {
    notes: [280, 560], duration: 0.08, gain: 0.13, type: "triangle", vibration: 10,
  },
  [FEEDBACK_EVENTS.DUEL_LAUNCH]: {
    notes: [260, 520, 790], duration: 0.1, gain: 0.14, type: "sawtooth", vibration: [8, 18, 8],
  },
  [FEEDBACK_EVENTS.RETRY]: {
    notes: [320, 480], duration: 0.065, gain: 0.1, type: "sine", vibration: 7,
  },
  [FEEDBACK_EVENTS.ACHIEVEMENT]: {
    notes: [480, 720, 960], duration: 0.12, gain: 0.14, type: "triangle", vibration: [8, 28, 8],
  },
  [FEEDBACK_EVENTS.COUNTDOWN_TICK]: {
    notes: [520],
    duration: 0.055,
    gain: 0.12,
    type: "sine",
    vibration: 0,
  },
  [FEEDBACK_EVENTS.COUNTDOWN_GO]: {
    notes: [520, 780],
    duration: 0.095,
    gain: 0.16,
    type: "triangle",
    vibration: 10,
  },
  [FEEDBACK_EVENTS.HIT]: {
    notes: [610, 880],
    duration: 0.045,
    gain: 0.13,
    type: "sine",
    vibration: 7,
  },
  [FEEDBACK_EVENTS.MISS]: {
    notes: [155],
    duration: 0.075,
    gain: 0.14,
    type: "square",
    vibration: 18,
  },
  [FEEDBACK_EVENTS.GUARDED_MISS]: {
    notes: [250, 360],
    duration: 0.06,
    gain: 0.1,
    type: "triangle",
    vibration: 8,
  },
  [FEEDBACK_EVENTS.STREAK_MILESTONE]: {
    notes: [520, 700, 920],
    duration: 0.08,
    gain: 0.15,
    type: "triangle",
    vibration: [8, 24, 8],
  },
  [FEEDBACK_EVENTS.POWER_READY]: {
    notes: [360, 720],
    duration: 0.09,
    gain: 0.12,
    type: "sine",
    vibration: 9,
  },
  [FEEDBACK_EVENTS.POWER_ACTIVATE]: {
    notes: [260, 520, 780],
    duration: 0.1,
    gain: 0.15,
    type: "sawtooth",
    vibration: 12,
  },
  [FEEDBACK_EVENTS.TIME_WARNING]: {
    notes: [210],
    duration: 0.08,
    gain: 0.13,
    type: "sine",
    vibration: 12,
  },
  [FEEDBACK_EVENTS.REWARD]: {
    notes: [480, 640, 820],
    duration: 0.12,
    gain: 0.14,
    type: "triangle",
    vibration: [8, 30, 8],
  },
  [FEEDBACK_EVENTS.RANK_CHANGE]: {
    notes: [330, 495, 740],
    duration: 0.15,
    gain: 0.16,
    type: "triangle",
    vibration: [12, 38, 12],
  },
  [FEEDBACK_EVENTS.TEST]: {
    notes: [420, 620, 840],
    duration: 0.09,
    gain: 0.14,
    type: "triangle",
    vibration: 10,
  },
  // The workshop's voice (Phase 13): sparse, mechanical, never louder than the
  // arena's own sounds. Install/hover reuse `pitch` for lane tone instead of
  // three near-duplicate recipes.
  [FEEDBACK_EVENTS.ARMORY_PART_HOVER]: {
    notes: [880],
    duration: 0.02,
    gain: 0.05,
    type: "sine",
    vibration: 0,
  },
  [FEEDBACK_EVENTS.ARMORY_PART_INSTALL]: {
    notes: [300, 200],
    duration: 0.07,
    gain: 0.15,
    type: "triangle",
    vibration: 14,
  },
  [FEEDBACK_EVENTS.ARMORY_BAY_ACTIVATE]: {
    notes: [220, 330],
    duration: 0.14,
    gain: 0.12,
    type: "sine",
    vibration: 10,
  },
  [FEEDBACK_EVENTS.ARMORY_RANGE_START]: {
    notes: [480, 640],
    duration: 0.08,
    gain: 0.1,
    type: "triangle",
    vibration: 8,
  },
})

const DEFAULT_PREFERENCES = Object.freeze({
  masterVolume: 0.7,
  sfxVolume: 0.75,
  muted: false,
  haptics: false,
  feedbackIntensity: "standard",
})

function getIntensityMultiplier(intensity) {
  if (intensity === "reduced") return 0.68
  if (intensity === "high") return 1.12
  return 1
}

export function createFeedbackEventGate({
  duplicateWindowMs = DUPLICATE_EVENT_WINDOW_MS,
  now = () => Date.now(),
} = {}) {
  const dispatchedIds = new Map()

  return {
    shouldDispatch(eventId) {
      if (!eventId) return true

      const currentTime = now()
      const previousTime = dispatchedIds.get(eventId)
      if (previousTime !== undefined && currentTime - previousTime < duplicateWindowMs) {
        return false
      }

      dispatchedIds.set(eventId, currentTime)
      for (const [storedId, storedAt] of dispatchedIds) {
        if (currentTime - storedAt >= duplicateWindowMs) dispatchedIds.delete(storedId)
      }
      return true
    },
    clear() {
      dispatchedIds.clear()
    },
  }
}

export class FeedbackService {
  constructor({
    AudioContextConstructor = null,
    vibrate = null,
    now,
    maxVoices = MAX_SIMULTANEOUS_VOICES,
  } = {}) {
    this.audioContext = null
    this.audioState = "locked"
    this.preferences = { ...DEFAULT_PREFERENCES }
    this.voices = new Set()
    this.eventGate = createFeedbackEventGate({ now })
    this.AudioContextConstructor = AudioContextConstructor
    this.vibrateAdapter = vibrate
    this.maxVoices = maxVoices
  }

  configure(preferences = {}) {
    const previousPreferences = this.preferences
    this.preferences = { ...this.preferences, ...preferences }
    if (
      this.preferences.muted
      || this.preferences.masterVolume <= 0
      || this.preferences.sfxVolume <= 0
    ) {
      this.stopAll()
    } else if (previousPreferences.haptics && !this.preferences.haptics) {
      this.cancelVibration()
    }
  }

  async unlock() {
    if (this.audioState === "unavailable") return false

    const AudioContextConstructor = this.AudioContextConstructor
      || globalThis.AudioContext
      || globalThis.webkitAudioContext
    if (!AudioContextConstructor) {
      this.audioState = "unavailable"
      return false
    }

    try {
      if (!this.audioContext || this.audioContext.state === "closed") {
        this.audioContext = new AudioContextConstructor()
      }
      if (this.audioContext.state !== "running" && this.audioContext.resume) {
        await this.audioContext.resume()
      }
      this.audioState = this.audioContext.state === "running" ? "ready" : "locked"
      return this.audioState === "ready"
    } catch {
      this.audioState = "locked"
      return false
    }
  }

  dispatch(eventName, {
    eventId,
    pitch = 1,
    strength = 1,
    scope = "global",
  } = {}) {
    const recipe = EVENT_RECIPES[eventName]
    if (!recipe) return { played: false, vibrated: false, reason: "unknown-event" }
    const dedupeId = eventId ? `${eventName}:${eventId}` : null
    if (!this.eventGate.shouldDispatch(dedupeId)) {
      return { played: false, vibrated: false, reason: "duplicate" }
    }

    const vibrated = this.vibrate(recipe.vibration, strength)
    let played = false
    try {
      played = this.playRecipe(recipe, pitch, strength, scope)
    } catch {
      // Feedback is presentation-only and must never interrupt an input path.
      this.stopAll()
      this.audioState = "unavailable"
    }
    const reason = played || vibrated
      ? "dispatched"
      : this.preferences.muted
        ? "muted"
        : this.audioState

    return { played, vibrated, reason }
  }

  playRecipe(recipe, pitch, strength, scope) {
    if (
      this.preferences.muted
      || this.audioState !== "ready"
      || !this.audioContext
      || this.audioContext.state !== "running"
    ) {
      if (this.audioContext && this.audioContext.state !== "running") {
        this.audioState = "locked"
      }
      return false
    }

    const masterVolume = Math.min(1, Math.max(0, Number(this.preferences.masterVolume) || 0))
    const sfxVolume = Math.min(1, Math.max(0, Number(this.preferences.sfxVolume) || 0))
    const intensity = getIntensityMultiplier(this.preferences.feedbackIntensity)
    const outputGain = recipe.gain * masterVolume * sfxVolume * intensity * Math.max(0.3, strength)
    if (outputGain <= 0) return false

    const context = this.audioContext
    const startAt = context.currentTime
    const noteSpacing = Math.min(0.035, recipe.duration * 0.32)

    recipe.notes.forEach((frequency, noteIndex) => {
      if (this.voices.size >= this.maxVoices) {
        const oldestVoice = this.voices.values().next().value
        this.stopVoice(oldestVoice)
      }

      const oscillator = context.createOscillator()
      const gainNode = context.createGain()
      const noteStart = startAt + noteIndex * noteSpacing
      const noteEnd = noteStart + recipe.duration

      oscillator.type = recipe.type
      oscillator.frequency.setValueAtTime(
        Math.max(60, frequency * Math.max(0.72, Math.min(1.5, pitch))),
        noteStart
      )
      gainNode.gain.setValueAtTime(0.0001, noteStart)
      gainNode.gain.exponentialRampToValueAtTime(
        Math.max(0.0001, outputGain / Math.max(1, recipe.notes.length * 0.72)),
        noteStart + 0.008
      )
      gainNode.gain.exponentialRampToValueAtTime(0.0001, noteEnd)

      oscillator.connect(gainNode)
      gainNode.connect(context.destination)

      const voice = { oscillator, gainNode, scope }
      this.voices.add(voice)
      oscillator.addEventListener("ended", () => {
        this.voices.delete(voice)
        oscillator.disconnect()
        gainNode.disconnect()
      }, { once: true })
      oscillator.start(noteStart)
      oscillator.stop(noteEnd + 0.01)
    })

    return true
  }

  vibrate(pattern, strength) {
    const vibrate = this.vibrateAdapter || globalThis.navigator?.vibrate?.bind(globalThis.navigator)
    if (!this.preferences.haptics || !pattern || !vibrate) return false

    try {
      const scale = Math.max(0.5, Math.min(1.4, strength))
      const resolvedPattern = Array.isArray(pattern)
        ? pattern.map((duration) => Math.round(duration * scale))
        : Math.round(pattern * scale)
      return Boolean(vibrate(resolvedPattern))
    } catch {
      return false
    }
  }

  stopVoice(voice) {
    if (!voice) return
    try {
      voice.oscillator.stop()
    } catch {
      // The voice may already have reached its scheduled end.
    }
    this.voices.delete(voice)
  }

  stopAll() {
    for (const voice of [...this.voices]) this.stopVoice(voice)
    this.cancelVibration()
  }

  cancelVibration() {
    const vibrate = this.vibrateAdapter || globalThis.navigator?.vibrate?.bind(globalThis.navigator)
    if (!vibrate) return
    try {
      vibrate(0)
    } catch {
      // Vibration support may disappear as the document loses visibility.
    }
  }

  stopScope(scope) {
    for (const voice of [...this.voices]) {
      if (voice.scope === scope) this.stopVoice(voice)
    }
  }

  resetEventHistory() {
    this.eventGate.clear()
  }

  getStatus() {
    const hapticsAvailable = Boolean(this.vibrateAdapter || globalThis.navigator?.vibrate)
    const resolvedAudioState = this.audioContext && this.audioContext.state !== "running"
      ? "locked"
      : this.audioState
    return {
      audio: resolvedAudioState,
      haptics: Boolean(this.preferences.haptics && hapticsAvailable),
      hapticsAvailable,
    }
  }

  async destroy() {
    this.stopAll()
    this.resetEventHistory()
    if (this.audioContext?.close) {
      try {
        await this.audioContext.close()
      } catch {
        // Closing an already-closed context is harmless for callers.
      }
    }
    this.audioContext = null
    this.audioState = "locked"
  }
}

export const feedbackService = new FeedbackService()
