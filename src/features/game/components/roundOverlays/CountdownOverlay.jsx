import { AnimatePresence, motion } from "motion/react"

import { usePrefersReducedMotion } from "./gameRoundOverlayMotionHooks.js"

const MotionDiv = motion.div
const MotionSection = motion.section
const COUNTDOWN_EASE = [0.22, 1, 0.36, 1]

export function CountdownOverlay({ countdownValue }) {
  const prefersReducedMotion = usePrefersReducedMotion()

  return (
    <MotionDiv
      className="gameOverlay"
      role="status"
      aria-live="polite"
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={prefersReducedMotion ? undefined : { opacity: 0 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.18, ease: COUNTDOWN_EASE }}
    >
      <MotionSection
        className="countdownCard"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 32, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={prefersReducedMotion ? undefined : { opacity: 0, y: -14, scale: 0.96 }}
        transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 340, damping: 28 }}
      >
        <p>Starting In</p>
        <AnimatePresence initial={false} mode="wait">
          <MotionDiv
            key={countdownValue}
            className="countdownNumber"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 14, scale: 0.88 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -18, scale: 1.1 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2, ease: COUNTDOWN_EASE }}
          >
            {countdownValue}
          </MotionDiv>
        </AnimatePresence>
      </MotionSection>
    </MotionDiv>
  )
}
