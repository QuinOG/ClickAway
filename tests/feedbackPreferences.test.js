import test from "node:test"
import assert from "node:assert/strict"

import {
  DEFAULT_FEEDBACK_PREFERENCES,
  FEEDBACK_PREFERENCES_STORAGE_KEY,
  getEffectiveFeedbackPreferences,
  getMotionConfigPreference,
  loadFeedbackPreferences,
  normalizeFeedbackPreferences,
  saveFeedbackPreferences,
} from "../src/app/feedbackPreferences.js"

function createMemoryStorage(initialValue = null) {
  const values = new Map()
  if (initialValue !== null) {
    values.set(FEEDBACK_PREFERENCES_STORAGE_KEY, initialValue)
  }
  return {
    getItem(key) {
      return values.get(key) ?? null
    },
    setItem(key, value) {
      values.set(key, value)
    },
  }
}

test("feedback preferences tolerate corrupt storage and preserve safe defaults", () => {
  const preferences = loadFeedbackPreferences(createMemoryStorage("{broken"))
  assert.deepEqual(preferences, DEFAULT_FEEDBACK_PREFERENCES)
  assert.equal(preferences.haptics, false)
})

test("feedback preferences normalize enums and clamp volume values", () => {
  assert.deepEqual(
    normalizeFeedbackPreferences({
      masterVolume: 5,
      sfxVolume: -2,
      feedbackIntensity: "extreme",
      muted: true,
      haptics: true,
    }),
    {
      ...DEFAULT_FEEDBACK_PREFERENCES,
      masterVolume: 1,
      sfxVolume: 0,
      muted: true,
      haptics: true,
    }
  )
})

test("feedback preferences persist and reload from the versioned key", () => {
  const storage = createMemoryStorage()
  const expected = {
    ...DEFAULT_FEEDBACK_PREFERENCES,
    muted: true,
    screenShake: false,
    feedbackIntensity: "reduced",
  }

  assert.equal(saveFeedbackPreferences(expected, storage), true)
  assert.deepEqual(loadFeedbackPreferences(storage), expected)
})

test("effective preferences never override an OS motion reduction", () => {
  const effective = getEffectiveFeedbackPreferences({
    ...DEFAULT_FEEDBACK_PREFERENCES,
    haptics: true,
  }, {
    systemReducedMotion: true,
    hapticsSupported: false,
  })

  assert.deepEqual(effective, {
    reduceMotion: true,
    screenShake: false,
    flashes: false,
    haptics: false,
  })
  assert.equal(getMotionConfigPreference({ reduceMotion: true }), "always")
  assert.equal(getMotionConfigPreference({ reduceMotion: false }), "user")
})
