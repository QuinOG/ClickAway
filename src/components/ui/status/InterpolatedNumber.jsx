import { useContext, useEffect, useRef, useState } from "react"

import { FeedbackPreferencesContext } from "../../../app/feedbackPreferencesContextValue.js"

function normalizeValue(value) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : 0
}

export function InterpolatedNumber({
  value = 0,
  duration = 460,
  format = (number) => Math.round(number).toLocaleString(),
  className,
}) {
  const feedbackContext = useContext(FeedbackPreferencesContext)
  const reduceMotion = feedbackContext?.effectivePreferences?.reduceMotion ?? false
  const targetValue = normalizeValue(value)
  const displayedValueRef = useRef(targetValue)
  const [displayedValue, setDisplayedValue] = useState(targetValue)

  useEffect(() => {
    const startValue = displayedValueRef.current
    if (
      startValue === targetValue
      || reduceMotion
      || typeof window === "undefined"
      || typeof window.requestAnimationFrame !== "function"
    ) {
      displayedValueRef.current = targetValue
      setDisplayedValue(targetValue)
      return undefined
    }

    let animationFrameId = 0
    let startTime = null
    const step = (timestamp) => {
      if (startTime === null) startTime = timestamp
      const progress = Math.min(1, (timestamp - startTime) / duration)
      const easedProgress = 1 - ((1 - progress) ** 3)
      const nextValue = startValue + ((targetValue - startValue) * easedProgress)
      displayedValueRef.current = nextValue
      setDisplayedValue(nextValue)
      if (progress < 1) animationFrameId = window.requestAnimationFrame(step)
    }

    animationFrameId = window.requestAnimationFrame(step)
    return () => window.cancelAnimationFrame(animationFrameId)
  }, [duration, reduceMotion, targetValue])

  return <span className={className}>{format(displayedValue)}</span>
}
