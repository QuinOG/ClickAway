export const FEEDBACK_PREFERENCES_STORAGE_KEY = "clickaway.feedback-preferences.v1"

export const FEEDBACK_INTENSITIES = Object.freeze([
  "reduced",
  "standard",
  "high",
])

export const DEFAULT_FEEDBACK_PREFERENCES = Object.freeze({
  masterVolume: 0.7,
  sfxVolume: 0.75,
  muted: false,
  reduceMotion: false,
  screenShake: true,
  flashes: true,
  haptics: false,
  feedbackIntensity: "standard",
})

function clampVolume(value, fallback) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return fallback
  return Math.min(1, Math.max(0, numericValue))
}

function normalizeBoolean(value, fallback) {
  return typeof value === "boolean" ? value : fallback
}

export function normalizeFeedbackPreferences(value = {}) {
  const candidate = value && typeof value === "object" ? value : {}
  const feedbackIntensity = FEEDBACK_INTENSITIES.includes(candidate.feedbackIntensity)
    ? candidate.feedbackIntensity
    : DEFAULT_FEEDBACK_PREFERENCES.feedbackIntensity

  return {
    masterVolume: clampVolume(
      candidate.masterVolume,
      DEFAULT_FEEDBACK_PREFERENCES.masterVolume
    ),
    sfxVolume: clampVolume(
      candidate.sfxVolume,
      DEFAULT_FEEDBACK_PREFERENCES.sfxVolume
    ),
    muted: normalizeBoolean(candidate.muted, DEFAULT_FEEDBACK_PREFERENCES.muted),
    reduceMotion: normalizeBoolean(
      candidate.reduceMotion,
      DEFAULT_FEEDBACK_PREFERENCES.reduceMotion
    ),
    screenShake: normalizeBoolean(
      candidate.screenShake,
      DEFAULT_FEEDBACK_PREFERENCES.screenShake
    ),
    flashes: normalizeBoolean(candidate.flashes, DEFAULT_FEEDBACK_PREFERENCES.flashes),
    haptics: normalizeBoolean(candidate.haptics, DEFAULT_FEEDBACK_PREFERENCES.haptics),
    feedbackIntensity,
  }
}

export function loadFeedbackPreferences(storage) {
  try {
    const resolvedStorage = storage ?? globalThis.localStorage
    if (!resolvedStorage?.getItem) return { ...DEFAULT_FEEDBACK_PREFERENCES }
    const storedValue = resolvedStorage.getItem(FEEDBACK_PREFERENCES_STORAGE_KEY)
    if (!storedValue) return { ...DEFAULT_FEEDBACK_PREFERENCES }
    return normalizeFeedbackPreferences(JSON.parse(storedValue))
  } catch {
    return { ...DEFAULT_FEEDBACK_PREFERENCES }
  }
}

export function saveFeedbackPreferences(
  preferences,
  storage
) {
  try {
    const resolvedStorage = storage ?? globalThis.localStorage
    if (!resolvedStorage?.setItem) return false
    resolvedStorage.setItem(
      FEEDBACK_PREFERENCES_STORAGE_KEY,
      JSON.stringify(normalizeFeedbackPreferences(preferences))
    )
    return true
  } catch {
    return false
  }
}

export function getMotionConfigPreference(preferences) {
  return preferences?.reduceMotion ? "always" : "user"
}

export function getEffectiveFeedbackPreferences(
  preferences,
  { systemReducedMotion = false, hapticsSupported = false } = {}
) {
  const normalized = normalizeFeedbackPreferences(preferences)
  const reduceMotion = normalized.reduceMotion || Boolean(systemReducedMotion)

  return {
    reduceMotion,
    screenShake: normalized.screenShake && !reduceMotion,
    flashes: normalized.flashes && !reduceMotion,
    haptics: normalized.haptics && Boolean(hapticsSupported),
  }
}
