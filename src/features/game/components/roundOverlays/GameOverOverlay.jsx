import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { getLevelProgress, getRequiredXpForLevel } from "../../../../utils/progressionUtils.js"
import { getRankTierFromMmr } from "../../../../utils/rankUtils.js"
import { easeOutCubic, useCountUpNumber, usePrefersReducedMotion } from "./useOverlayMotion.js"

const XP_BAR_SEGMENT_DURATION_MS = 1000
const LEVEL_UP_MESSAGE_DURATION_MS = 600

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

function clampNonNegativeInteger(value) {
  const normalizedValue = Number(value)
  if (!Number.isFinite(normalizedValue)) return 0
  return Math.max(0, Math.floor(normalizedValue))
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

function GameOverSection({ title, rows = [], panelType = "neutral" }) {
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
  playerRankMmr = 0,
  roundRankDelta = 0,
  allowsRankProgression = false,
  selectedModeId,
  onPlayAgain,
  onChooseMode,
}) {
  const rewardsSummaryText = getModeRewardsSummary({
    allowsCoinRewards,
    allowsLevelProgression,
    allowsRankProgression,
  })
  const isPracticeMode = !allowsCoinRewards && !allowsLevelProgression && !allowsRankProgression
  const hasCleanRun = misses === 0
  const scoreBadgeText = hasCleanRun ? "Clean Run" : ""
  const projectedMmr = Math.max(0, playerRankMmr + roundRankDelta)
  const projectedRankLabel = getRankTierFromMmr(projectedMmr).label
  const tone = getGameOverTone({ hits, misses, accuracy, bestStreak })
  const prefersReducedMotion = usePrefersReducedMotion()
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

  const performanceRows = [
    { label: "Hits", value: hits },
    { label: "Misses", value: misses },
    { label: "Accuracy", value: accuracy },
    { label: "Best Streak", value: bestStreak },
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
    rewardRows.push({ label: "MMR After Match", value: `${projectedMmr}`, group: "status" })
    rewardRows.push({ label: "New Rank", value: projectedRankLabel, group: "status" })
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
  const formattedScore = Number(animatedScore).toLocaleString()

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
      label: "Rank Delta",
      value: formatSignedValue(animatedRankDelta),
    })
  }

  return (
    <div
      className="gameOverlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-over-title"
    >
      <section
        className={`gameOverCard gameOverCardWithDifficulty difficultyMood-${selectedModeId} gameOverTone-${tone}`}
      >
        <header className="gameOverHeader">
          <h2 id="game-over-title" className="gameOverTitle">
            Round Complete
          </h2>
        </header>

        <section
          className={`gameOverScorePanel ${isScoreAnimationDone ? "isComplete" : ""}`}
          aria-label="Final score summary"
        >
          <p className="gameOverScoreLabel">Final Score</p>
          <p className="gameOverScoreValue">{formattedScore}</p>
          {scoreBadgeText ? (
            <p className="gameOverScoreBadge" aria-label="Score highlight">
              {scoreBadgeText}
            </p>
          ) : null}
          <p className="gameOverDifficultyBadge">{modeLabel}</p>
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
        </section>

        <div className="gameOverBody">
          <div className="gameOverSections" aria-label="Round summary">
            <GameOverSection title="Performance" rows={performanceRows} panelType="performance" />
            <GameOverSection title="Rewards" rows={rewardRows} panelType="rewards" />
          </div>
          {isPracticeMode ? (
            <p className="gameOverPracticeNote">Rewards are not earned in Practice mode.</p>
          ) : null}
        </div>

        <div className="overlayActions gameOverActions">
          <button className="primaryButton" onClick={onPlayAgain}>
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
        </div>
      </section>
    </div>
  )
}
