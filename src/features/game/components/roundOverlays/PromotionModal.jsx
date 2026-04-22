import confetti from "canvas-confetti"
import { motion } from "motion/react"
import { useEffect, useMemo, useRef } from "react"
import TierBadge from "../../../../components/TierBadge.jsx"
import { usePrefersReducedMotion } from "./gameRoundOverlayMotionHooks.js"

const MotionDiv = motion.div
const MotionSection = motion.section

const OVERLAY_EASE = [0.22, 1, 0.36, 1]

// Card springs in from below — weighted, deliberate, not casual.
function getCardVariants(prefersReducedMotion) {
  if (prefersReducedMotion) {
    return {
      hidden: { opacity: 1, scale: 1, y: 0 },
      visible: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 1, scale: 1, y: 0 },
    }
  }

  return {
    hidden: { opacity: 0, scale: 0.86, y: 56 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 26,
        delayChildren: 0.08,
        staggerChildren: 0.12,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.97,
      y: 12,
      transition: { duration: 0.2, ease: [0.4, 0, 1, 1] },
    },
  }
}

// Text items cascade in top-to-bottom.
function getItemVariants(prefersReducedMotion) {
  if (prefersReducedMotion) {
    return { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
  }

  return {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: OVERLAY_EASE } },
  }
}

// Badge row container — orchestrates badge stagger independently.
function getBadgeRowVariants(prefersReducedMotion) {
  if (prefersReducedMotion) {
    return { hidden: { opacity: 1 }, visible: { opacity: 1 } }
  }

  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { delayChildren: 0, staggerChildren: 0.15 },
    },
  }
}

// Previous badge: fades in quietly, stays subdued.
function getPrevBadgeVariants(prefersReducedMotion) {
  if (prefersReducedMotion) {
    return { hidden: { opacity: 1, scale: 1 }, visible: { opacity: 1, scale: 1 } }
  }

  return {
    hidden: { opacity: 0, scale: 0.92 },
    visible: { opacity: 0.7, scale: 1, transition: { duration: 0.28, ease: OVERLAY_EASE } },
  }
}

// Arrow: slides in after the prev badge.
function getArrowVariants(prefersReducedMotion) {
  if (prefersReducedMotion) {
    return { hidden: { opacity: 1, x: 0 }, visible: { opacity: 1, x: 0 } }
  }

  return {
    hidden: { opacity: 0, x: -6 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.22, ease: OVERLAY_EASE } },
  }
}

// New rank badge: springs in with weight — the payoff moment.
function getNewBadgeVariants(prefersReducedMotion) {
  if (prefersReducedMotion) {
    return { hidden: { opacity: 1, scale: 1, y: 0 }, visible: { opacity: 1, scale: 1, y: 0 } }
  }

  return {
    hidden: { opacity: 0, scale: 0.72, y: 8 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { type: "spring", stiffness: 240, damping: 20 },
    },
  }
}

export default function PromotionModal({ isPlacementReveal, currentRankLabel, projectedRankLabel, onContinue }) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const buttonRef = useRef(null)

  const cardVariants = useMemo(() => getCardVariants(prefersReducedMotion), [prefersReducedMotion])
  const itemVariants = useMemo(() => getItemVariants(prefersReducedMotion), [prefersReducedMotion])
  const badgeRowVariants = useMemo(() => getBadgeRowVariants(prefersReducedMotion), [prefersReducedMotion])
  const prevBadgeVariants = useMemo(() => getPrevBadgeVariants(prefersReducedMotion), [prefersReducedMotion])
  const arrowVariants = useMemo(() => getArrowVariants(prefersReducedMotion), [prefersReducedMotion])
  const newBadgeVariants = useMemo(() => getNewBadgeVariants(prefersReducedMotion), [prefersReducedMotion])

  // Delay focus until after badge reveal — don't interrupt the moment.
  useEffect(() => {
    const timeoutId = window.setTimeout(() => buttonRef.current?.focus(), 900)
    return () => window.clearTimeout(timeoutId)
  }, [])

  // Confetti burst timed to land when the new rank badge springs in.
  useEffect(() => {
    if (prefersReducedMotion) return undefined

    const fire = (angle, origin) =>
      confetti({
        particleCount: 48,
        angle,
        spread: 62,
        startVelocity: 44,
        decay: 0.9,
        origin,
        colors: ["#f3c966", "#ffd700", "#ffe566", "#ffb800", "#ffffff", "#4ab8ff"],
        zIndex: 9999,
      })

    const timeoutId = window.setTimeout(() => {
      fire(70, { x: 0.22, y: 0.46 })
      fire(110, { x: 0.78, y: 0.46 })
    }, 640)

    return () => window.clearTimeout(timeoutId)
  }, [prefersReducedMotion])

  return (
    <MotionSection
      className="gameOverPromotionCard"
      aria-labelledby="promotion-modal-title"
      aria-live="polite"
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <MotionDiv variants={itemVariants}>
        <p className="gameOverPromotionEyebrow">
          {isPlacementReveal ? "Placement Complete" : "Rank Promotion"}
        </p>
      </MotionDiv>

      <MotionDiv variants={itemVariants}>
        <h2 id="promotion-modal-title" className="gameOverPromotionTitle">
          {isPlacementReveal ? "Rank Revealed" : "Promotion Secured"}
        </h2>
      </MotionDiv>

      <MotionDiv className="gameOverPromotionTierRow" aria-hidden="true" variants={badgeRowVariants}>
        <MotionDiv variants={prevBadgeVariants}>
          <TierBadge tierLabel={currentRankLabel} className="gameOverPromotionTier isPrevious" />
        </MotionDiv>
        <MotionDiv variants={arrowVariants}>
          <span className="gameOverPromotionArrow">&#8594;</span>
        </MotionDiv>
        <MotionDiv variants={newBadgeVariants}>
          <TierBadge tierLabel={projectedRankLabel} className="gameOverPromotionTier isCurrent" />
        </MotionDiv>
      </MotionDiv>

      <MotionDiv variants={itemVariants}>
        <p className="gameOverPromotionLead">
          {isPlacementReveal
            ? `Your first visible rank is ${projectedRankLabel}.`
            : `You climbed from ${currentRankLabel} to ${projectedRankLabel}.`}
        </p>
      </MotionDiv>

      <MotionDiv variants={itemVariants}>
        <button
          ref={buttonRef}
          type="button"
          className="primaryButton primaryButton-lg gameOverPromotionButton"
          onClick={onContinue}
        >
          View Rewards
        </button>
      </MotionDiv>
    </MotionSection>
  )
}
