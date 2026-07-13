import { ArrowRight, Coins, Lightning, Play } from "@phosphor-icons/react"
import { motion } from "motion/react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useFeedbackPreferences } from "../../../../app/useFeedbackPreferences.js"
import { FEEDBACK_EVENTS } from "../../../../constants/feedbackEvents.js"
import TierBadge from "../../../../components/TierBadge.jsx"
import { getLevelProgress, getRequiredXpForLevel } from "../../../../utils/progressionUtils.js"
import {
  PLACEMENT_MATCH_COUNT,
  PLACEMENT_MATCH_SCORE_MAX,
} from "../../../../utils/rankUtils.js"
import {
  easeOutCubic,
  useCountUpNumber,
  usePrefersReducedMotion,
} from "./gameRoundOverlayMotionHooks.js"

const MotionDiv = motion.div
const MotionSection = motion.section

const OVERLAY_EASE = [0.22, 1, 0.36, 1]
const XP_BAR_SEGMENT_DURATION_MS = 1000
const LEVEL_UP_MESSAGE_DURATION_MS = 600

function getCardVariants(prefersReducedMotion) {
  if (prefersReducedMotion) {
    return {
      hidden: { opacity: 1, y: 0, scale: 1 },
      visible: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 1, y: 0, scale: 1 },
    }
  }

  return {
    hidden: { opacity: 0, y: 56, scale: 0.88 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: "spring", stiffness: 280, damping: 26, delay: 0.05 },
    },
    exit: {
      opacity: 0,
      y: -20,
      scale: 0.97,
      transition: { duration: 0.2, ease: [0.4, 0, 1, 1] },
    },
  }
}

function clampNonNegativeInteger(value) {
  const normalized = Number(value)
  if (!Number.isFinite(normalized)) return 0
  return Math.max(0, Math.floor(normalized))
}

function formatNumber(value = 0) {
  return Number(value).toLocaleString()
}

function formatSignedValue(value = 0) {
  const normalized = Number(value) || 0
  return `${normalized > 0 ? "+" : ""}${normalized}`
}

function formatRankProgressMeta(rankProgress = {}) {
  if (!rankProgress || Object.keys(rankProgress).length === 0) {
    return "Rank data unavailable."
  }

  if (rankProgress?.isUnranked) {
    return `Complete ${PLACEMENT_MATCH_COUNT} placement matches to reveal your rank.`
  }

  if (rankProgress?.isPlacement) {
    return `${rankProgress.placementMatchesRemaining} placement matches remaining.`
  }

  if (rankProgress?.isTopRank) {
    return `${formatNumber(rankProgress.mmr)} rating.`
  }

  return `${formatNumber(rankProgress.rr)} / ${formatNumber(rankProgress.rrMax)} RR.`
}

function getTotalXpBeforeLevel(level = 1) {
  const normalizedLevel = Math.max(1, clampNonNegativeInteger(level) || 1)
  let totalXp = 0
  for (let currentLevel = 1; currentLevel < normalizedLevel; currentLevel += 1) {
    totalXp += getRequiredXpForLevel(currentLevel)
  }
  return totalXp
}

function buildXpAnimationPlan({
  level = 1,
  xpIntoLevel = 0,
  xpToNextLevel = 0,
  roundXpEarned = 0,
}) {
  const startingLevel = Math.max(1, clampNonNegativeInteger(level) || 1)
  const startingXpIntoLevel = clampNonNegativeInteger(xpIntoLevel)
  const startingXpToNextLevel = clampNonNegativeInteger(xpToNextLevel)
  const earnedXp = clampNonNegativeInteger(roundXpEarned)
  const startingLevelRequirement = Math.max(
    getRequiredXpForLevel(startingLevel),
    startingXpIntoLevel + startingXpToNextLevel
  )
  const startingTotalXp = getTotalXpBeforeLevel(startingLevel) + startingXpIntoLevel
  const finalProgress = getLevelProgress(startingTotalXp + earnedXp)
  const steps = []

  let currentLevel = startingLevel
  let currentXp = startingXpIntoLevel
  let remainingXp = earnedXp

  while (remainingXp > 0) {
    const xpForNextLevel = getRequiredXpForLevel(currentLevel)
    const xpRemainingInLevel = Math.max(0, xpForNextLevel - currentXp)

    if (xpRemainingInLevel <= 0) {
      currentLevel += 1
      currentXp = 0
      continue
    }

    const appliedXp = Math.min(remainingXp, xpRemainingInLevel)
    const endXp = currentXp + appliedXp

    steps.push({
      level: currentLevel,
      startXp: currentXp,
      endXp,
      xpForNextLevel,
      completesLevel: endXp >= xpForNextLevel,
      nextLevel: currentLevel + 1,
    })

    remainingXp -= appliedXp

    if (endXp >= xpForNextLevel) {
      currentLevel += 1
      currentXp = 0
    } else {
      currentXp = endXp
    }
  }

  return {
    initialState: {
      level: startingLevel,
      xpIntoLevel: startingXpIntoLevel,
      xpForNextLevel: startingLevelRequirement,
    },
    finalState: {
      level: finalProgress.level,
      xpIntoLevel: finalProgress.xpIntoLevel,
      xpForNextLevel: finalProgress.xpForNextLevel,
    },
    steps,
  }
}

function XpProgressBar({
  displayedLevel = 1,
  displayedXpInLevel = 0,
  displayedXpForNextLevel = 0,
  levelUpMessage = "",
  isAnimationComplete = true,
  animationStepIndex = -1,
}) {
  const normalizedLevel = Math.max(1, clampNonNegativeInteger(displayedLevel) || 1)
  const normalizedXpForNextLevel = Math.max(1, clampNonNegativeInteger(displayedXpForNextLevel))
  const normalizedDisplayedXp = Math.max(
    0,
    Math.min(normalizedXpForNextLevel, Math.round(displayedXpInLevel))
  )
  const progressPercent = Math.max(
    0,
    Math.min(100, (displayedXpInLevel / normalizedXpForNextLevel) * 100)
  )
  const xpToNextLevel = Math.max(0, normalizedXpForNextLevel - normalizedDisplayedXp)

  return (
    <div
      className={`gameOverXpProgress ${isAnimationComplete ? "isComplete" : "isAnimating"}`}
      aria-busy={!isAnimationComplete}
      data-step={animationStepIndex}
    >
      <div className="gameOverXpProgressTop">
        <div className="gameOverXpProgressTitleGroup">
          <span className="gameOverXpProgressLevel">Level {normalizedLevel}</span>
          <strong className="gameOverXpProgressPercent">{Math.round(progressPercent)}%</strong>
        </div>
        <span className="gameOverXpProgressSummary">
          {formatNumber(normalizedDisplayedXp)} / {formatNumber(normalizedXpForNextLevel)} XP
        </span>
      </div>
      <div className="gameOverXpProgressEnds" aria-hidden="true">
        <span>Lv {normalizedLevel}</span>
        <span>Lv {normalizedLevel + 1}</span>
      </div>
      <div className="gameOverXpProgressTrack">
        <span
          className="gameOverXpProgressFill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <div className="gameOverXpProgressFooter">
        <span className="gameOverXpProgressRemaining">
          {formatNumber(xpToNextLevel)} XP to Level {normalizedLevel + 1}
        </span>
        <span
          className={`gameOverLevelUpMessage ${levelUpMessage ? "isVisible" : ""}`}
          role="status"
          aria-live="polite"
        >
          {levelUpMessage}
        </span>
      </div>
    </div>
  )
}

function getRankPathData(previousRankProgress = {}, projectedRankProgress = {}) {
  if (projectedRankProgress?.isPlacement) {
    const previous = Math.max(0, Number(previousRankProgress?.placementMatchesPlayed) || 0)
    const next = Math.max(previous, Number(projectedRankProgress?.placementMatchesPlayed) || 0)
    return {
      startPercent: (previous / PLACEMENT_MATCH_COUNT) * 100,
      endPercent: (next / PLACEMENT_MATCH_COUNT) * 100,
      startLabel: previousRankProgress?.tierLabel || "Unranked",
      endLabel: projectedRankProgress?.tierLabel || "Placement",
      detail: `${next} of ${PLACEMENT_MATCH_COUNT} placements complete`,
      deltaUnit: "placement points",
    }
  }

  const previousRr = Math.max(0, Number(previousRankProgress?.rr) || 0)
  const projectedRr = Math.max(0, Number(projectedRankProgress?.rr) || 0)
  const rrMax = Math.max(1, Number(projectedRankProgress?.rrMax) || 100)
  const changedDivision = previousRankProgress?.tierLabel !== projectedRankProgress?.tierLabel
  const isClimb = (Number(projectedRankProgress?.rankOrder) || 0) >= (
    Number(previousRankProgress?.rankOrder) || 0
  )

  return {
    startPercent: changedDivision ? (isClimb ? 8 : 92) : (previousRr / rrMax) * 100,
    endPercent: changedDivision
      ? (isClimb ? 92 : 8)
      : projectedRankProgress?.isTopRank ? 100 : (projectedRr / rrMax) * 100,
    startLabel: previousRankProgress?.tierLabel || "Unranked",
    endLabel: projectedRankProgress?.tierLabel || "Unranked",
    detail: projectedRankProgress?.isTopRank
      ? `${formatNumber(projectedRankProgress?.mmr)} rating`
      : `${projectedRr} / ${rrMax} RR`,
    deltaUnit: "RR",
  }
}

function RankMovementPath({
  previousRankProgress,
  projectedRankProgress,
  roundRankDelta,
  prefersReducedMotion,
}) {
  const path = getRankPathData(previousRankProgress, projectedRankProgress)
  const movementTone = roundRankDelta > 0 ? "positive" : roundRankDelta < 0 ? "negative" : "neutral"
  const startPercent = Math.max(0, Math.min(100, path.startPercent))
  const endPercent = Math.max(0, Math.min(100, path.endPercent))

  return (
    <section
      className={`rewardRankPath is-${movementTone}`}
      aria-label={`Rank movement: ${path.startLabel} to ${path.endLabel}, ${formatSignedValue(roundRankDelta)} ${path.deltaUnit}, ${path.detail}`}
    >
      <div className="rewardRankPathHeader">
        <span>Rank movement</span>
        <strong>{formatSignedValue(roundRankDelta)} {path.deltaUnit}</strong>
      </div>
      <div className="rewardRankPathLabels" aria-hidden="true">
        <span>{path.startLabel}</span>
        <ArrowRight weight="bold" />
        <strong>{path.endLabel}</strong>
      </div>
      <div className="rewardRankTrack" aria-hidden="true">
        <span className="rewardRankTrail" />
        <span className="rewardRankMarker isStart" style={{ left: `${startPercent}%` }} />
        <MotionDiv
          className="rewardRankMarker isCurrent"
          initial={prefersReducedMotion ? false : { left: `${startPercent}%` }}
          animate={{ left: `${endPercent}%` }}
          transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.48, duration: 0.82, ease: OVERLAY_EASE }}
        />
      </div>
      <p>{path.detail}</p>
    </section>
  )
}

export default function RewardsModal({
  allowsLevelProgression = false,
  allowsCoinRewards = false,
  allowsRankProgression = false,
  playerLevel = 1,
  playerCoins = 0,
  playerXpIntoLevel = 0,
  playerXpToNextLevel = 0,
  roundXpEarned = 0,
  roundCoinsEarned = 0,
  roundRankDelta = 0,
  previousRankProgress = {},
  projectedRankProgress = {},
  projectedRankLabel = "Unranked",
  isPlacementReveal = false,
  onContinue,
  onChooseMode,
}) {
  const { emitFeedback } = useFeedbackPreferences()
  const prefersReducedMotion = usePrefersReducedMotion()
  const buttonRef = useRef(null)
  const cardVariants = useMemo(() => getCardVariants(prefersReducedMotion), [prefersReducedMotion])

  useEffect(() => {
    emitFeedback(FEEDBACK_EVENTS.REWARD, {
      eventId: `reward-${roundXpEarned}-${roundCoinsEarned}-${roundRankDelta}-${projectedRankLabel}`,
      scope: "round-result",
    })
  }, [
    emitFeedback,
    projectedRankLabel,
    roundCoinsEarned,
    roundRankDelta,
    roundXpEarned,
  ])

  const isPlacementMatch = allowsRankProgression && (
    previousRankProgress?.isPlacement || isPlacementReveal
  )

  // XP animation plan — computed once on mount from the snapshot.
  const [initialXpSnapshot] = useState(() => ({
    level: playerLevel,
    xpIntoLevel: playerXpIntoLevel,
    xpToNextLevel: playerXpToNextLevel,
    roundXpEarned,
  }))
  const [xpAnimationPlan] = useState(() => buildXpAnimationPlan(initialXpSnapshot))
  const [xpAnimationSteps] = useState(() => xpAnimationPlan.steps)

  const shouldBypassXpAnimation = (
    !allowsLevelProgression ||
    prefersReducedMotion ||
    xpAnimationSteps.length === 0
  )
  const initialDisplayedXpState = shouldBypassXpAnimation
    ? xpAnimationPlan.finalState
    : xpAnimationPlan.initialState

  const [displayedLevel, setDisplayedLevel] = useState(() => initialDisplayedXpState.level)
  const [displayedXpInLevel, setDisplayedXpInLevel] = useState(() => initialDisplayedXpState.xpIntoLevel)
  const [displayedXpForNextLevel, setDisplayedXpForNextLevel] = useState(() => initialDisplayedXpState.xpForNextLevel)
  const [currentXpStepIndex, setCurrentXpStepIndex] = useState(() => (
    shouldBypassXpAnimation
      ? (xpAnimationSteps.length ? xpAnimationSteps.length - 1 : -1)
      : 0
  ))
  const [levelUpMessage, setLevelUpMessage] = useState("")
  const [isXpAnimationComplete, setIsXpAnimationComplete] = useState(() => shouldBypassXpAnimation)

  const animatedXp = useCountUpNumber(roundXpEarned, {
    durationMs: 500,
    delayMs: 80,
    disabled: prefersReducedMotion,
  })
  const animatedCoins = useCountUpNumber(roundCoinsEarned, {
    durationMs: 500,
    delayMs: 160,
    disabled: prefersReducedMotion,
  })
  const animatedRankDelta = useCountUpNumber(roundRankDelta, {
    durationMs: 500,
    delayMs: 240,
    disabled: prefersReducedMotion,
  })
  const settledCoinBalance = Math.max(0, Number(playerCoins) || 0) + Math.max(0, Number(roundCoinsEarned) || 0)

  useEffect(() => {
    buttonRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!allowsLevelProgression) return undefined

    let timeoutId = 0
    let animationFrameId = 0
    let isCancelled = false
    const finalStepIndex = xpAnimationSteps.length ? xpAnimationSteps.length - 1 : -1

    if (prefersReducedMotion || xpAnimationSteps.length === 0) {
      animationFrameId = window.requestAnimationFrame(() => {
        if (isCancelled) return
        setDisplayedLevel(xpAnimationPlan.finalState.level)
        setDisplayedXpInLevel(xpAnimationPlan.finalState.xpIntoLevel)
        setDisplayedXpForNextLevel(xpAnimationPlan.finalState.xpForNextLevel)
        setCurrentXpStepIndex(finalStepIndex)
        setLevelUpMessage("")
        setIsXpAnimationComplete(true)
      })
      return () => {
        isCancelled = true
        window.cancelAnimationFrame(animationFrameId)
      }
    }

    function finishAnimation() {
      if (isCancelled) return
      setDisplayedLevel(xpAnimationPlan.finalState.level)
      setDisplayedXpInLevel(xpAnimationPlan.finalState.xpIntoLevel)
      setDisplayedXpForNextLevel(xpAnimationPlan.finalState.xpForNextLevel)
      setCurrentXpStepIndex(finalStepIndex)
      setLevelUpMessage("")
      setIsXpAnimationComplete(true)
    }

    function animateStep(stepIndex) {
      const step = xpAnimationSteps[stepIndex]
      if (!step) { finishAnimation(); return }

      setCurrentXpStepIndex(stepIndex)
      setDisplayedLevel(step.level)
      setDisplayedXpForNextLevel(step.xpForNextLevel)
      setDisplayedXpInLevel(step.startXp)
      setLevelUpMessage("")

      const startTimestamp = performance.now()

      function animateFrame(now) {
        if (isCancelled) return
        const progress = Math.min(1, (now - startTimestamp) / XP_BAR_SEGMENT_DURATION_MS)
        const easedProgress = easeOutCubic(progress)
        const nextXp = step.startXp + ((step.endXp - step.startXp) * easedProgress)
        setDisplayedXpInLevel(nextXp)

        if (progress < 1) {
          animationFrameId = window.requestAnimationFrame(animateFrame)
          return
        }

        setDisplayedXpInLevel(step.endXp)

        if (step.completesLevel) {
          setLevelUpMessage(`Level ${step.nextLevel}!`)
          timeoutId = window.setTimeout(() => {
            if (isCancelled) return
            setDisplayedLevel(step.nextLevel)
            setDisplayedXpInLevel(0)
            setDisplayedXpForNextLevel(getRequiredXpForLevel(step.nextLevel))
            setLevelUpMessage("")
            animateStep(stepIndex + 1)
          }, LEVEL_UP_MESSAGE_DURATION_MS)
          return
        }

        animateStep(stepIndex + 1)
      }

      animationFrameId = window.requestAnimationFrame(animateFrame)
    }

    animationFrameId = window.requestAnimationFrame(() => {
      if (isCancelled) return
      setDisplayedLevel(xpAnimationPlan.initialState.level)
      setDisplayedXpInLevel(xpAnimationPlan.initialState.xpIntoLevel)
      setDisplayedXpForNextLevel(xpAnimationPlan.initialState.xpForNextLevel)
      setCurrentXpStepIndex(0)
      setLevelUpMessage("")
      setIsXpAnimationComplete(false)
      animateStep(0)
    })

    return () => {
      isCancelled = true
      window.clearTimeout(timeoutId)
      window.cancelAnimationFrame(animationFrameId)
    }
  }, [allowsLevelProgression, prefersReducedMotion, xpAnimationPlan, xpAnimationSteps])

  return (
    <MotionSection
      className="rewardsCard"
      aria-labelledby="rewards-modal-title"
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <MotionDiv
        initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 28, delay: 0.1 }}
      >
        <header className="rewardsCardHeader">
          <p className="rewardsCardEyebrow">Performance converted</p>
          <h2 id="rewards-modal-title" className="rewardsCardTitle">Rewards Settled</h2>
        </header>
      </MotionDiv>

      <div className="rewardSettlementDock" aria-label="Updated persistent balances" aria-live="polite">
        {allowsCoinRewards ? (
          <span className="rewardBalanceChip isCoins">
            <Coins weight="fill" aria-hidden="true" />
            <small>Balance</small>
            <strong>{formatNumber(settledCoinBalance)}</strong>
          </span>
        ) : null}
        {allowsLevelProgression ? (
          <span className="rewardBalanceChip isLevel">
            <Lightning weight="fill" aria-hidden="true" />
            <small>Level</small>
            <strong>{displayedLevel}</strong>
          </span>
        ) : null}
      </div>

      {!prefersReducedMotion ? (
        <div className="rewardFlightLayer" aria-hidden="true">
          {allowsCoinRewards ? (
            <MotionDiv
              className="rewardFlightToken isCoins"
              initial={{ opacity: 0, x: -72, y: 146, scale: 0.72 }}
              animate={{ opacity: [0, 1, 1, 0], x: 76, y: 8, scale: [0.72, 1, 0.82] }}
              transition={{ delay: 0.42, duration: 0.92, ease: OVERLAY_EASE }}
            >
              <Coins weight="fill" />
            </MotionDiv>
          ) : null}
          {allowsLevelProgression ? (
            <MotionDiv
              className="rewardFlightToken isXp"
              initial={{ opacity: 0, x: 52, y: 146, scale: 0.72 }}
              animate={{ opacity: [0, 1, 1, 0], x: -58, y: 8, scale: [0.72, 1, 0.82] }}
              transition={{ delay: 0.32, duration: 0.92, ease: OVERLAY_EASE }}
            >
              <Lightning weight="fill" />
            </MotionDiv>
          ) : null}
        </div>
      ) : null}

      {allowsLevelProgression ? (
        <MotionDiv
          initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 280, damping: 26, delay: 0.18 }}
        >
          <XpProgressBar
            displayedLevel={displayedLevel}
            displayedXpInLevel={displayedXpInLevel}
            displayedXpForNextLevel={displayedXpForNextLevel}
            levelUpMessage={levelUpMessage}
            isAnimationComplete={isXpAnimationComplete}
            animationStepIndex={currentXpStepIndex}
          />
        </MotionDiv>
      ) : null}

      {allowsRankProgression ? (
        <RankMovementPath
          previousRankProgress={previousRankProgress}
          projectedRankProgress={projectedRankProgress}
          roundRankDelta={roundRankDelta}
          prefersReducedMotion={prefersReducedMotion}
        />
      ) : null}

      <MotionDiv
        className="rewardsStatList"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 280, damping: 26, delay: 0.26 }}
      >
        {allowsLevelProgression ? (
          <div className="rewardsStatRow">
            <span className="rewardsStatLabel">XP Earned</span>
            <strong className="rewardsStatValue isReward">+{animatedXp}</strong>
          </div>
        ) : null}

        {allowsCoinRewards ? (
          <div className="rewardsStatRow">
            <span className="rewardsStatLabel">Coins Earned</span>
            <strong className="rewardsStatValue isReward">+{animatedCoins}</strong>
          </div>
        ) : null}

        {allowsRankProgression ? (
          <>
            {projectedRankProgress?.isPlacement ? (
              <>
                <div className="rewardsStatRow">
                  <span className="rewardsStatLabel">Placement Status</span>
                  <strong className="rewardsStatValue">{projectedRankProgress.tierLabel}</strong>
                </div>
                <div className="rewardsStatRow">
                  <span className="rewardsStatLabel">Placement Track</span>
                  <strong className="rewardsStatValue">{formatRankProgressMeta(projectedRankProgress)}</strong>
                </div>
              </>
            ) : (
              <>
                <div className="rewardsStatRow">
                  <span className="rewardsStatLabel">{isPlacementReveal ? "Placed Rank" : "Current Rank"}</span>
                  <TierBadge tierLabel={projectedRankLabel} className="gameOverTierBadge" />
                </div>
                <div className="rewardsStatRow">
                  <span className="rewardsStatLabel">{isPlacementMatch ? "Placement Score" : "Rank Delta"}</span>
                  <strong className="rewardsStatValue isReward">
                    {isPlacementMatch
                      ? `${animatedRankDelta} / ${PLACEMENT_MATCH_SCORE_MAX}`
                      : formatSignedValue(animatedRankDelta)}
                  </strong>
                </div>
                <div className="rewardsStatRow">
                  <span className="rewardsStatLabel">{projectedRankProgress?.isTopRank ? "Top Rank Rating" : "Division Progress"}</span>
                  <strong className="rewardsStatValue">
                    {formatRankProgressMeta(projectedRankProgress).replace(/\.$/, "")}
                  </strong>
                </div>
              </>
            )}
          </>
        ) : null}
      </MotionDiv>

      <MotionDiv
        initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 28, delay: 0.36 }}
      >
        <div className="rewardsCardActions">
          <button
            ref={buttonRef}
            type="button"
            className="primaryButton primaryButton-lg rewardReplayButton"
            onClick={onContinue}
          >
            <Play weight="fill" aria-hidden="true" />
            Play Again
          </button>
          {onChooseMode ? (
            <button type="button" className="rewardChangeModeButton" onClick={onChooseMode}>
              Change mode
            </button>
          ) : null}
        </div>
      </MotionDiv>
    </MotionSection>
  )
}
