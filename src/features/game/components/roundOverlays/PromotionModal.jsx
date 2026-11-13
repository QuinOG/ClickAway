import "./roundResultsArt.css"
import { CrestIcon } from "../../../../components/art/GameIcons.jsx"
import {
  cancelCelebrationEffects,
  fireConfetti,
} from "../../../../services/celebrationEffects.js"
import { motion } from "motion/react"
import { useEffect, useMemo, useRef } from "react"
import { RANK_DIVISIONS, getRankImageSrc } from "../../../../utils/rankUtils.js"
import { useFeedbackPreferences } from "../../../../app/useFeedbackPreferences.js"
import { FEEDBACK_EVENTS } from "../../../../constants/feedbackEvents.js"
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

function getCrestToneFromLabel(label = "") {
  const tier = String(label).split(" ")[0].toLowerCase()
  return ["gold", "silver", "bronze", "platinum", "diamond"].includes(tier) ? tier : "unranked"
}

function DivisionMetalwork({ label }) {
  const division = RANK_DIVISIONS.find((rank) => rank.label === label)?.division
  if (!division || division < 2) return null
  return <img className={`divisionMetalwork divisionMetalwork-${division}`} src="/art/game-results/division-frame.png" alt="" aria-hidden="true" />
}

const LADDER_WINDOW = 7

// The climb on the division ladder: a seven-node window around the new rank,
// the divisions just gained lit along the rail, the new one crowned.
function DivisionLadder({ fromLabel, toLabel }) {
  const toIndex = RANK_DIVISIONS.findIndex((division) => division.label === toLabel)
  if (toIndex === -1) return null
  const foundFrom = RANK_DIVISIONS.findIndex((division) => division.label === fromLabel)
  const fromIndex = foundFrom === -1 ? toIndex : foundFrom
  const start = Math.max(0, Math.min(RANK_DIVISIONS.length - LADDER_WINDOW, toIndex - 4))
  const nodes = RANK_DIVISIONS.slice(start, start + LADDER_WINDOW)

  return (
    <div className="promotionLadder" style={{ "--ladder-count": nodes.length }}>
      {nodes.map((division) => {
        const state = division.order === toIndex
          ? "isCurrent"
          : division.order === fromIndex
            ? "isFrom"
            : division.order > fromIndex && division.order < toIndex
              ? "isClimbed"
              : division.order < fromIndex
                ? "isPassed"
                : "isFuture"
        const railLit = division.order <= toIndex && division.order > Math.min(fromIndex, toIndex)
        return (
          <span key={division.id} className={`promotionLadderNode tier-${division.majorTierId} ${state} ${railLit ? "isRailLit" : ""}`}>
            <i>{getRankImageSrc(division.label) ? <img src={getRankImageSrc(division.label)} alt="" width="40" height="40" decoding="async" /> : null}</i>
            <b>{division.majorTierLabel}</b>
            <small>{division.divisionLabel}</small>
          </span>
        )
      })}
    </div>
  )
}

export default function PromotionModal({
  isPlacementReveal,
  currentRankLabel,
  projectedRankLabel,
  buttonLabel = "Continue",
  onContinue,
  secondaryLabel = null,
  onSecondary = null,
}) {
  const { effectivePreferences, emitFeedback } = useFeedbackPreferences()
  const prefersReducedMotion = usePrefersReducedMotion()
  const buttonRef = useRef(null)

  const cardVariants = useMemo(() => getCardVariants(prefersReducedMotion), [prefersReducedMotion])
  const itemVariants = useMemo(() => getItemVariants(prefersReducedMotion), [prefersReducedMotion])
  const badgeRowVariants = useMemo(() => getBadgeRowVariants(prefersReducedMotion), [prefersReducedMotion])
  const newBadgeVariants = useMemo(() => getNewBadgeVariants(prefersReducedMotion), [prefersReducedMotion])

  useEffect(() => {
    emitFeedback(FEEDBACK_EVENTS.RANK_CHANGE, {
      eventId: `rank-${currentRankLabel}-${projectedRankLabel}-${isPlacementReveal}`,
      scope: "round-result",
    })
  }, [currentRankLabel, emitFeedback, isPlacementReveal, projectedRankLabel])

  // Delay focus until after badge reveal — don't interrupt the moment.
  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => buttonRef.current?.focus(),
      prefersReducedMotion ? 0 : 900
    )
    return () => window.clearTimeout(timeoutId)
  }, [prefersReducedMotion])

  // Confetti burst timed to land when the new rank badge springs in.
  useEffect(() => {
    if (prefersReducedMotion || !effectivePreferences.flashes) return undefined

    const fire = (angle, origin) =>
      fireConfetti({
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

    return () => {
      window.clearTimeout(timeoutId)
      cancelCelebrationEffects()
    }
  }, [effectivePreferences.flashes, prefersReducedMotion])

  return (
    <MotionSection
      className="gameOverPromotionCard rankCeremony"
      data-tier={getCrestToneFromLabel(projectedRankLabel)}
      aria-labelledby="promotion-modal-title"
      aria-live="polite"
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <div className="rankCeremonyCannon isLeft" aria-hidden="true" />
      <div className="rankCeremonyCannon isRight" aria-hidden="true" />
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

      <MotionDiv className="gameOverPromotionEmblem" aria-hidden="true" variants={newBadgeVariants}>
        <span className="gameOverPromotionRays" />
        <span className="gameOverPromotionPedestal" />
        {!isPlacementReveal && getRankImageSrc(currentRankLabel) && (
          <div className="rankCeremonyPrevious"><div className="divisionCrest"><img src={getRankImageSrc(currentRankLabel)} alt="" /><DivisionMetalwork label={currentRankLabel} /></div><span>{currentRankLabel}</span></div>
        )}
        {getRankImageSrc(projectedRankLabel) ? (
          <div className="divisionCrest divisionCrestNew"><img className="gameOverPromotionMedal" src={getRankImageSrc(projectedRankLabel)} alt="" width="220" height="220" decoding="async" /><DivisionMetalwork label={projectedRankLabel} /></div>
        ) : (
          <CrestIcon tone={getCrestToneFromLabel(projectedRankLabel)} size={220} />
        )}
        <strong className="gameOverPromotionEmblemLabel gameOverPromotionRibbon"><span>{projectedRankLabel}</span></strong>
      </MotionDiv>

      <MotionDiv className="gameOverPromotionTierRow isLadder" aria-hidden="true" variants={badgeRowVariants}>
        <DivisionLadder fromLabel={isPlacementReveal ? projectedRankLabel : currentRankLabel} toLabel={projectedRankLabel} />
      </MotionDiv>

      <MotionDiv variants={itemVariants}>
        <p className="gameOverPromotionLead">
          {isPlacementReveal
            ? `Your first visible rank is ${projectedRankLabel}.`
            : `You climbed from ${currentRankLabel} to ${projectedRankLabel}.`}
        </p>
      </MotionDiv>

      <MotionDiv className="gameOverPromotionActions" variants={itemVariants}>
        <button
          ref={buttonRef}
          type="button"
          className="primaryButton primaryButton-lg gameOverPromotionButton"
          onClick={onContinue}
        >
          {buttonLabel}
        </button>
        {secondaryLabel && onSecondary ? (
          <button type="button" className="secondaryButton gameOverRematch" onClick={onSecondary}>
            {secondaryLabel}
          </button>
        ) : null}
      </MotionDiv>
    </MotionSection>
  )
}
