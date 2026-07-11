import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import {
  DEFAULT_FEEDBACK_PREFERENCES,
  FEEDBACK_PREFERENCES_STORAGE_KEY,
  getEffectiveFeedbackPreferences,
  loadFeedbackPreferences,
  normalizeFeedbackPreferences,
  saveFeedbackPreferences,
} from "./feedbackPreferences.js"
import { feedbackService } from "../services/feedbackService.js"
import { cancelCelebrationEffects } from "../services/celebrationEffects.js"
import { FeedbackPreferencesContext } from "./feedbackPreferencesContextValue.js"

function getSystemReducedMotion() {
  return typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function applyPreferenceAttributes(preferences, systemReducedMotion = false) {
  const effectiveReducedMotion = preferences.reduceMotion || systemReducedMotion
  const root = document.documentElement
  root.dataset.motionReduced = String(effectiveReducedMotion)
  root.dataset.screenShake = preferences.screenShake && !effectiveReducedMotion ? "on" : "off"
  root.dataset.flashes = preferences.flashes && !effectiveReducedMotion ? "on" : "reduced"
  root.dataset.feedbackIntensity = preferences.feedbackIntensity
  root.dataset.sound = preferences.muted ? "muted" : "on"
}

export function FeedbackPreferencesProvider({ children }) {
  const [preferences, setPreferences] = useState(loadFeedbackPreferences)
  const preferencesRef = useRef(preferences)
  const [systemReducedMotion, setSystemReducedMotion] = useState(getSystemReducedMotion)
  const systemReducedMotionRef = useRef(systemReducedMotion)
  const unlockPromiseRef = useRef(null)
  const [saveState, setSaveState] = useState("saved")
  const [feedbackStatus, setFeedbackStatus] = useState(() => feedbackService.getStatus())

  const commitPreferences = useCallback((value) => {
    const patch = typeof value === "function"
      ? value(preferencesRef.current)
      : value
    const nextPreferences = normalizeFeedbackPreferences({
      ...preferencesRef.current,
      ...patch,
    })

    preferencesRef.current = nextPreferences
    setPreferences(nextPreferences)
    feedbackService.configure(nextPreferences)
    if (nextPreferences.reduceMotion || !nextPreferences.flashes) {
      cancelCelebrationEffects()
    }
    applyPreferenceAttributes(nextPreferences, systemReducedMotionRef.current)
    setSaveState(saveFeedbackPreferences(nextPreferences) ? "saved" : "error")
  }, [])

  const resetPreferences = useCallback(() => {
    commitPreferences({ ...DEFAULT_FEEDBACK_PREFERENCES })
  }, [commitPreferences])

  const unlockFeedback = useCallback(async () => {
    if (unlockPromiseRef.current) return unlockPromiseRef.current

    const unlockPromise = feedbackService.unlock()
      .then((unlocked) => {
        setFeedbackStatus(feedbackService.getStatus())
        return unlocked
      })
      .finally(() => {
        unlockPromiseRef.current = null
      })

    unlockPromiseRef.current = unlockPromise
    return unlockPromise
  }, [])
  const emitFeedback = useCallback(
    (eventName, options) => feedbackService.dispatch(eventName, options),
    []
  )
  const previewFeedback = useCallback((eventName, options, previewPreferences) => {
    feedbackService.configure(normalizeFeedbackPreferences(previewPreferences))
    try {
      return feedbackService.dispatch(eventName, options)
    } finally {
      feedbackService.configure(preferencesRef.current)
      setFeedbackStatus(feedbackService.getStatus())
    }
  }, [])
  const stopFeedback = useCallback(() => feedbackService.stopAll(), [])

  useLayoutEffect(() => {
    feedbackService.configure(preferencesRef.current)
    applyPreferenceAttributes(
      preferencesRef.current,
      systemReducedMotionRef.current
    )

    const handleActivation = () => {
      const audioStatus = feedbackService.getStatus().audio
      if (audioStatus === "ready" || audioStatus === "unavailable") return
      void unlockFeedback()
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        feedbackService.stopAll()
        cancelCelebrationEffects()
      }
    }
    const handleStorageChange = (event) => {
      if (event.key !== FEEDBACK_PREFERENCES_STORAGE_KEY) return

      try {
        const nextPreferences = event.newValue
          ? normalizeFeedbackPreferences(JSON.parse(event.newValue))
          : { ...DEFAULT_FEEDBACK_PREFERENCES }
        preferencesRef.current = nextPreferences
        setPreferences(nextPreferences)
        feedbackService.configure(nextPreferences)
        applyPreferenceAttributes(nextPreferences, systemReducedMotionRef.current)
        if (nextPreferences.reduceMotion || !nextPreferences.flashes) {
          cancelCelebrationEffects()
        }
        setFeedbackStatus(feedbackService.getStatus())
        setSaveState("saved")
      } catch {
        // A corrupt value in another tab must not replace the current settings.
      }
    }
    const motionQuery = typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null
    const handleMotionPreferenceChange = (event) => {
      systemReducedMotionRef.current = event.matches
      setSystemReducedMotion(event.matches)
      applyPreferenceAttributes(preferencesRef.current, event.matches)
      if (event.matches) cancelCelebrationEffects()
    }

    window.addEventListener("pointerdown", handleActivation, true)
    window.addEventListener("keydown", handleActivation, true)
    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("storage", handleStorageChange)
    motionQuery?.addEventListener?.("change", handleMotionPreferenceChange)

    return () => {
      window.removeEventListener("pointerdown", handleActivation, true)
      window.removeEventListener("keydown", handleActivation, true)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("storage", handleStorageChange)
      motionQuery?.removeEventListener?.("change", handleMotionPreferenceChange)
      feedbackService.stopAll()
    }
  }, [unlockFeedback])

  const effectivePreferences = useMemo(
    () => getEffectiveFeedbackPreferences(preferences, {
      systemReducedMotion,
      hapticsSupported: Boolean(globalThis.navigator?.vibrate),
    }),
    [preferences, systemReducedMotion]
  )

  const contextValue = useMemo(() => ({
    preferences,
    effectivePreferences,
    systemReducedMotion,
    setPreferences: commitPreferences,
    resetPreferences,
    saveState,
    feedbackStatus,
    unlockFeedback,
    emitFeedback,
    previewFeedback,
    stopFeedback,
    getFeedbackStatus: () => feedbackService.getStatus(),
  }), [
    commitPreferences,
    effectivePreferences,
    emitFeedback,
    feedbackStatus,
    previewFeedback,
    preferences,
    resetPreferences,
    saveState,
    systemReducedMotion,
    stopFeedback,
    unlockFeedback,
  ])

  return (
    <FeedbackPreferencesContext.Provider value={contextValue}>
      {children}
    </FeedbackPreferencesContext.Provider>
  )
}
