import { AnimatePresence, motion } from "motion/react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import TierBadge from "../../../../components/TierBadge.jsx"
import { buildLoadoutPresentation } from "../../../../constants/buildcraftPresentation.js"
import { getDifficultyById as getModeById } from "../../../../constants/difficultyConfig.js"
import { getLevelProgress, getRequiredXpForLevel } from "../../../../utils/progressionUtils.js"
import {
  PLACEMENT_MATCH_COUNT,
  PLACEMENT_MATCH_SCORE_MAX,
} from "../../../../utils/rankUtils.js"
import { easeOutCubic, useCountUpNumber, usePrefersReducedMotion } from "./useOverlayMotion.js"

const MotionDiv = motion.div
const MotionSection = motion.section
const XP_BAR_SEGMENT_DURATION_MS = 1000
const LEVEL_UP_MESSAGE_DURATION_MS = 600
const OVERLAY_EASE = [0.22, 1, 0.36, 1]
const CONTENT_EASE = [0.2, 0.9, 0.28, 1]

function getCardVariants(prefersReducedMotion) {
  if (prefersReducedMotion) {
    return {
      hidden: { opacity: 1, y: 0, scale: 1 },
      visible: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 1, y: 0, scale: 1 },
    }
  }

  return {
    hidden: { opacity: 0, y: 64, scale: 0.88 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: "spring", stiffness: 280, damping: 26, delay: 0.06 },
    },
    exit: {
      opacity: 0,
      y: -24,
      scale: 0.97,
      transition: { duration: 0.22, ease: [0.4, 0, 1, 1] },
    },
  }
}

function getPromotionOverlayVariants(prefersReducedMotion) {
  if (prefersReducedMotion) {
    return {
      hidden: { opacity: 1 },
      visible: { opacity: 1 },
      exit: { opacity: 1 },
    }
  }

  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.22, ease: OVERLAY_EASE },
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.14, ease: [0.4, 0, 1, 1] },
    },
  }
}

function getPromotionVariants(prefersReducedMotion) {
  if (prefersReducedMotion) {
    return {
      hidden: { opacity: 1, scale: 1, y: 0 },
      visible: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 1, scale: 1, y: 0 },
    }
  }

  return {
    hidden: { opacity: 0, scale: 0.88, y: 40 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 26,
        delayChildren: 0.18,
        staggerChildren: 0.09,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.96,
      y: 8,
      transition: { duration: 0.16, ease: [0.4, 0, 1, 1] },
    },
  }
}

function getPromotionItemVariants(prefersReducedMotion) {
  if (prefersReducedMotion) {
    return {
      hidden: { opacity: 1, y: 0, scale: 1 },
      visible: { opacity: 1, y: 0, scale: 1 },
    }
  }

  return {
    hidden: { opacity: 0, y: 16, scale: 0.985 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.28, ease: CONTENT_EASE },
    },
  }
}

function getGameOverTone({ hits, misses, accuracy, bestStreak }) {
  const accuracyValue = Number.parseInt(String(accuracy).replace("%", ""), 10)
  const normalizedAccuracy = Number.isFinite(accuracyValue) ? accuracyValue : 0

  if (normalizedAccuracy >= 90 && bestStreak >= 10) return "elite"
  if (hits >= misses && normalizedAccuracy >= 65) return "steady"
  return "recovery"
}

function formatSignedValue(value = 0) {
  const normalized = Number(value) || 0
  return `${normalized > 0 ? "+" : ""}${normalized}`
}

function formatNumber(value = 0) {
  return Number(value).toLocaleString()
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

function clampNonNegativeInteger(value) {
  const normalizedValue = Number(value)
  if (!Number.isFinite(normalizedValue)) return 0
  return Math.max(0, Math.floor(normalizedValue))
}

function formatReactionTime(value) {
  const normalizedValue = Number(value)
  if (!Number.isFinite(normalizedValue) || normalizedValue <= 0) {
    return "\u2014"
  }

  return `${Math.round(normalizedValue)} ms`
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

function getModeRewardsSummary({
  allowsCoinRewards,
  allowsLevelProgression,
  allowsRankProgression,
}) {
  if (!allowsCoinRewards && !allowsLevelProgression && !allowsRankProgression) {
    return "Rewards: None (aim practice)"
  }

  if (allowsRankProgression) {
    return "Rewards: XP, Coins, Rank"
  }

  return "Rewards: XP, Coins"
}

function GameOverSection({ title, rows = [], panelType = "neutral", caption = "" }) {
  if (!rows.length) return null

  return (
    <section className={`gameOverSection panel-${panelType}`} aria-label={title}>
      <h3 className="gameOverSectionTitle">{title}</h3>
      <div className="gameOverList">
        {rows.map((row) => (
          <article
            key={row.label}
            className={`gameOverListRow ${row.layout === "stacked" ? "isStacked" : ""} ${row.group ? `group-${row.group}` : ""}`}
          >
            <span className="gameOverListLabel">{row.label}</span>
            {row.content ? (
              <div className="gameOverListContent">
                {row.content}
              </div>
            ) : (
              <strong className={`gameOverListValue ${row.highlight ? "isReward" : ""}`}>
                {row.value}
              </strong>
            )}
          </article>
        ))}
      </div>
      {caption ? (
        <p className="gameOverSectionCaption">{caption}</p>
      ) : null}
    </section>
  )
}

function GameOverXpProgress({
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

export function GameOverOverlay({
  score,
  hits,
  misses,
  bestStreak,
  accuracy,
  modeLabel,
  playerLevel = 1,
  playerXpIntoLevel = 0,
  playerXpToNextLevel = 0,
  roundXpEarned = 0,
  roundCoinsEarned = 0,
  allowsCoinRewards = false,
  allowsLevelProgression = false,
  previousRankProgress = {},
  projectedRankProgress = {},
  roundRankDelta = 0,
  allowsRankProgression = false,
  selectedModeId,
  bestScore = 0,
  avgReactionMs = null,
  bestReactionMs = null,
  loadoutSnapshot = null,
  loadoutPresentation = null,
  onPlayAgain,
  onChooseMode,
}) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const promotionButtonRef = useRef(null)
  const cardVariants = useMemo(() => getCardVariants(prefersReducedMotion), [prefersReducedMotion])
  const promotionVariants = useMemo(
    () => getPromotionVariants(prefersReducedMotion),
    [prefersReducedMotion]
  )
  const promotionOverlayVariants = useMemo(
    () => getPromotionOverlayVariants(prefersReducedMotion),
    [prefersReducedMotion]
  )
  const promotionItemVariants = useMemo(
    () => getPromotionItemVariants(prefersReducedMotion),
    [prefersReducedMotion]
  )
  const rewardsSummaryText = getModeRewardsSummary({
    allowsCoinRewards,
    allowsLevelProgression,
    allowsRankProgression,
  })
  const isPracticeMode = !allowsCoinRewards && !allowsLevelProgression && !allowsRankProgression
  const hasCleanRun = misses === 0
  const isNewBestScore = score > bestScore
  const scoreBadgeText = isNewBestScore ? "New Personal Best!" : hasCleanRun ? "Clean Run" : ""
  const currentRankLabel = previousRankProgress?.tierLabel || "Unranked"
  const projectedRankLabel = projectedRankProgress?.tierLabel || "Unranked"
  const isPlacementReveal = (
    allowsRankProgression &&
    previousRankProgress?.isPlacement &&
    !projectedRankProgress?.isPlacement &&
    !projectedRankProgress?.isUnranked
  )
  const isPromotion = (
    allowsRankProgression &&
    !previousRankProgress?.isPlacement &&
    !projectedRankProgress?.isPlacement &&
    projectedRankProgress?.rankOrder > previousRankProgress?.rankOrder
  )
  const isPlacementMatch = allowsRankProgression && (
    previousRankProgress?.isPlacement ||
    isPlacementReveal
  )
  const showPromotionOrPlacementOverlay = isPromotion || isPlacementReveal
  const hasReactionData = avgReactionMs !== null || bestReactionMs !== null
  const resolvedLoadoutPresentation = useMemo(
    () => loadoutPresentation ?? (
      loadoutSnapshot
        ? buildLoadoutPresentation(getModeById(selectedModeId), loadoutSnapshot)
        : null
    ),
    [loadoutPresentation, loadoutSnapshot, selectedModeId]
  )
  const reactionCaption = hasReactionData
    ? ""
    : "Reaction stats populate in timed modes after your first recorded hit."
  const tone = getGameOverTone({ hits, misses, accuracy, bestStreak })
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
  const [showPromotionOverlay, setShowPromotionOverlay] = useState(() => showPromotionOrPlacementOverlay)

  const performanceRows = [
    ...(loadoutSnapshot?.loadoutName
      ? [{ label: "Build", value: loadoutSnapshot.loadoutName }]
      : []),
    ...(resolvedLoadoutPresentation?.titleLine
      ? [{ label: "Build Profile", value: resolvedLoadoutPresentation.titleLine }]
      : []),
    { label: "Hits", value: hits },
    { label: "Misses", value: misses },
    { label: "Accuracy", value: accuracy },
    { label: "Best Streak", value: bestStreak },
    { label: "Avg Reaction", value: formatReactionTime(avgReactionMs) },
    { label: "Best Reaction", value: formatReactionTime(bestReactionMs) },
  ]

  const rewardRows = []
  if (allowsLevelProgression) {
    rewardRows.push({
      label: "Level Progress",
      content: (
        <GameOverXpProgress
          displayedLevel={displayedLevel}
          displayedXpInLevel={displayedXpInLevel}
          displayedXpForNextLevel={displayedXpForNextLevel}
          levelUpMessage={levelUpMessage}
          isAnimationComplete={isXpAnimationComplete}
          animationStepIndex={currentXpStepIndex}
        />
      ),
      group: "status",
      layout: "stacked",
    })
  }
  if (allowsRankProgression) {
    if (projectedRankProgress?.isPlacement) {
      rewardRows.push({
        label: "Placement Status",
        value: projectedRankProgress.tierLabel,
        group: "status",
      })
      rewardRows.push({
        label: "Placement Track",
        value: formatRankProgressMeta(projectedRankProgress),
        group: "status",
      })
    } else {
      rewardRows.push({
        label: isPlacementReveal ? "Placed Rank" : "Current Rank",
        content: <TierBadge tierLabel={projectedRankLabel} className="gameOverTierBadge" />,
        group: "status",
      })
      rewardRows.push({
        label: projectedRankProgress?.isTopRank ? "Top Rank Rating" : "Division Progress",
        value: formatRankProgressMeta(projectedRankProgress).replace(/\.$/, ""),
        group: "status",
      })
    }
  }

  const animatedScore = useCountUpNumber(score, {
    durationMs: 700,
    disabled: prefersReducedMotion,
  })
  const animatedXp = useCountUpNumber(roundXpEarned, {
    durationMs: 500,
    delayMs: 70,
    disabled: prefersReducedMotion,
  })
  const animatedCoins = useCountUpNumber(roundCoinsEarned, {
    durationMs: 500,
    delayMs: 130,
    disabled: prefersReducedMotion,
  })
  const animatedRankDelta = useCountUpNumber(roundRankDelta, {
    durationMs: 500,
    delayMs: 190,
    disabled: prefersReducedMotion,
  })
  const isScoreAnimationDone = prefersReducedMotion || animatedScore === score
  const formattedScore = formatNumber(animatedScore)

  useEffect(() => {
    setShowPromotionOverlay(showPromotionOrPlacementOverlay)
  }, [showPromotionOrPlacementOverlay])

  useEffect(() => {
    if (showPromotionOverlay) {
      promotionButtonRef.current?.focus()
    }
  }, [showPromotionOverlay])

  useEffect(() => {
    if (!allowsLevelProgression) {
      return undefined
    }

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

      if (!step) {
        finishAnimation()
        return
      }

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
  }, [
    allowsLevelProgression,
    prefersReducedMotion,
    xpAnimationPlan,
    xpAnimationSteps,
  ])

  const summaryRewardRows = []
  if (allowsLevelProgression) {
    summaryRewardRows.push({
      label: "XP Earned",
      value: `+${animatedXp}`,
    })
  }
  if (allowsCoinRewards) {
    summaryRewardRows.push({
      label: "Coins Earned",
      value: `+${animatedCoins}`,
    })
  }
  if (allowsRankProgression) {
    summaryRewardRows.push({
      label: isPlacementMatch ? "Placement Score" : "Rank Delta",
      value: isPlacementMatch
        ? `${animatedRankDelta} / ${PLACEMENT_MATCH_SCORE_MAX}`
        : formatSignedValue(animatedRankDelta),
    })
  }

  return (
    <MotionDiv
      className="gameOverlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-over-title"
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={prefersReducedMotion ? undefined : { opacity: 0 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.18, ease: OVERLAY_EASE }}
    >
      <MotionSection
        className={`gameOverCard gameOverCardWithDifficulty difficultyMood-${selectedModeId} gameOverTone-${tone}`}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <AnimatePresence initial={false} mode="wait">
          {showPromotionOverlay ? (
            <MotionDiv
              key="promotion-overlay"
              className="gameOverPromotionOverlay"
              role="status"
              aria-live="polite"
              variants={promotionOverlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <MotionDiv
                className="gameOverPromotionCard"
                variants={promotionVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <MotionDiv variants={promotionItemVariants}>
                  <p className="gameOverPromotionEyebrow">
                    {isPlacementReveal ? "Placement Complete" : "Rank Promotion"}
                  </p>
                </MotionDiv>
                <MotionDiv variants={promotionItemVariants}>
                  <h3 className="gameOverPromotionTitle">
                    {isPlacementReveal ? "Rank Revealed" : "Promotion Secured"}
                  </h3>
                </MotionDiv>
                <MotionDiv variants={promotionItemVariants}>
                  <p className="gameOverPromotionLead">
                    {isPlacementReveal
                      ? `Your first visible rank is ${projectedRankLabel}.`
                      : `You climbed from ${currentRankLabel} to ${projectedRankLabel}.`}
                  </p>
                </MotionDiv>
                <MotionDiv
                  className="gameOverPromotionTierRow"
                  aria-hidden="true"
                  variants={promotionItemVariants}
                >
                  <TierBadge tierLabel={currentRankLabel} className="gameOverPromotionTier isPrevious" />
                  <span className="gameOverPromotionArrow">-&gt;</span>
                  <TierBadge tierLabel={projectedRankLabel} className="gameOverPromotionTier isCurrent" />
                </MotionDiv>
                <MotionDiv variants={promotionItemVariants}>
                  <button
                    ref={promotionButtonRef}
                    type="button"
                    className="primaryButton primaryButton-lg gameOverPromotionButton"
                    onClick={() => setShowPromotionOverlay(false)}
                  >
                    View Results
                  </button>
                </MotionDiv>
              </MotionDiv>
            </MotionDiv>
          ) : null}
        </AnimatePresence>

        <MotionDiv
          initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 28, delay: 0.12 }}
        >
          <header className="gameOverHeader">
            <h2 id="game-over-title" className="gameOverTitle">
              Round Complete
            </h2>
          </header>
        </MotionDiv>

        <MotionDiv
          className={`gameOverScorePanel ${isScoreAnimationDone ? "isComplete" : ""}`}
          aria-label="Final score summary"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 16, scale: 0.84 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 360, damping: 24, delay: 0.2 }}
        >
          <p className="gameOverScoreLabel">Final Score</p>
          <p className="gameOverScoreValue">{formattedScore}</p>
          {scoreBadgeText ? (
            <p className="gameOverScoreBadge" aria-label="Score highlight">
              {scoreBadgeText}
            </p>
          ) : null}
          <p className={`gameOverDifficultyBadge${allowsRankProgression ? " is-ranked" : ""}`}>
            {allowsRankProgression ? `Ranked | ${modeLabel}` : modeLabel}
          </p>
          {loadoutSnapshot?.loadoutName ? (
            <>
              <p className="gameOverLoadoutBadge">
                Build: {loadoutSnapshot.loadoutName}
                {resolvedLoadoutPresentation?.titleLine ? ` • ${resolvedLoadoutPresentation.titleLine}` : ""}
              </p>
              {resolvedLoadoutPresentation?.glanceText ? (
                <p className="gameOverLoadoutGlance">
                  {resolvedLoadoutPresentation.glanceText}
                </p>
              ) : null}
            </>
          ) : null}
          {summaryRewardRows.length ? (
            <div className="gameOverSummaryRewards" aria-label={rewardsSummaryText}>
              {summaryRewardRows.map((row) => (
                <p key={row.label} className="gameOverSummaryRewardRow">
                  <span className="gameOverSummaryRewardLabel">{row.label}</span>
                  <strong className="gameOverSummaryRewardValue">{row.value}</strong>
                </p>
              ))}
            </div>
          ) : (
            <p className="gameOverRewardsLine">{rewardsSummaryText}</p>
          )}
        </MotionDiv>

        <div className="gameOverBody">
          <div className="gameOverSections" aria-label="Round summary">
            <MotionDiv
              initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 280, damping: 28, delay: 0.3 }}
            >
              <GameOverSection
                title="Performance"
                rows={performanceRows}
                panelType="performance"
                caption={reactionCaption}
              />
            </MotionDiv>
            <MotionDiv
              initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 280, damping: 28, delay: 0.38 }}
            >
              <GameOverSection title="Rewards" rows={rewardRows} panelType="rewards" />
            </MotionDiv>
          </div>
          {isPracticeMode ? (
            <p className="gameOverPracticeNote">Rewards are not earned in Practice mode.</p>
          ) : null}
        </div>

        <MotionDiv
          className="overlayActions gameOverActions"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 28, delay: 0.46 }}
        >
          <button className="primaryButton primaryButton-lg" onClick={onPlayAgain}>
            Play Again
          </button>
          {isPracticeMode ? (
            <button className="secondaryButton" type="button" onClick={onChooseMode}>
              Back to Modes
            </button>
          ) : (
            <Link className="secondaryButton" to="/history">
              View History
            </Link>
          )}
        </MotionDiv>
      </MotionSection>
    </MotionDiv>
  )
}
