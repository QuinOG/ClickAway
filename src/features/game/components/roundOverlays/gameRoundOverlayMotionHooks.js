import { useEffect, useState } from "react"

export function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false
    }

    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
  })

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")

    function handleChange(event) {
      setPrefersReducedMotion(event.matches)
    }

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange)
      return () => mediaQuery.removeEventListener("change", handleChange)
    }

    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }, [])

  return prefersReducedMotion
}

export function easeOutCubic(progress) {
  return 1 - ((1 - progress) ** 3)
}

export function useCountUpNumber(targetValue, { durationMs, delayMs = 0, disabled = false }) {
  const [displayValue, setDisplayValue] = useState(targetValue)

  useEffect(() => {
    if (disabled) {
      return undefined
    }

    const absoluteTarget = Math.abs(targetValue)
    let animationFrameId = 0
    let timeoutId = 0
    const direction = targetValue >= 0 ? 1 : -1

    // We use RAF so animation pace stays smooth across different refresh rates.
    function startAnimation() {
      setDisplayValue(0)
      const startTimestamp = performance.now()

      function animateFrame(now) {
        const elapsed = now - startTimestamp
        const progress = Math.min(1, elapsed / durationMs)
        const easedProgress = easeOutCubic(progress)
        const nextValue = Math.round(absoluteTarget * easedProgress) * direction
        setDisplayValue(nextValue)

        if (progress < 1) {
          animationFrameId = window.requestAnimationFrame(animateFrame)
        } else {
          setDisplayValue(targetValue)
        }
      }

      animationFrameId = window.requestAnimationFrame(animateFrame)
    }

    timeoutId = window.setTimeout(startAnimation, delayMs)

    return () => {
      window.clearTimeout(timeoutId)
      window.cancelAnimationFrame(animationFrameId)
    }
  }, [delayMs, disabled, durationMs, targetValue])

  return displayValue
}
