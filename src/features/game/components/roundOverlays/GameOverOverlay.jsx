import confetti from "canvas-confetti"
import { motion } from "motion/react"
import { useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import { buildLoadoutPresentation } from "../../../../constants/buildcraftPresentation.js"
import { getDifficultyById as getModeById } from "../../../../constants/difficultyConfig.js"
import { useCountUpNumber, usePrefersReducedMotion } from "./useOverlayMotion.js"

const MotionDiv = motion.div
const MotionSection = motion.section

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

function getGameOverTone({ hits, misses, accuracy, bestStreak }) {
  const accuracyValue = Number.parseInt(String(accuracy).replace("%", ""), 10)
  const normalizedAccuracy = Number.isFinite(accuracyValue) ? accuracyValue : 0

  if (normalizedAccuracy >= 90 && bestStreak >= 10) return "elite"
  if (hits >= misses && normalizedAccuracy >= 65) return "steady"
  return "recovery"
}

function formatNumber(value = 0) {
  return Number(value).toLocaleString()
}

function formatReactionTime(value) {
  const normalizedValue = Number(value)
  if (!Number.isFinite(normalizedValue) || normalizedValue <= 0) return "\u2014"
  return `${Math.round(normalizedValue)} ms`
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
              <div className="gameOverListContent">{row.content}</div>
            ) : (
              <strong className={`gameOverListValue ${row.highlight ? "isReward" : ""}`}>
                {row.value}
              </strong>
            )}
          </article>
        ))}
      </div>
      {caption ? <p className="gameOverSectionCaption">{caption}</p> : null}
    </section>
  )
}

export function GameOverOverlay({
  score,
  hits,
  misses,
  bestStreak,
  accuracy,
  modeLabel,
  allowsCoinRewards = false,
  allowsLevelProgression = false,
  allowsRankProgression = false,
  selectedModeId,
  bestScore = 0,
  avgReactionMs = null,
  bestReactionMs = null,
  loadoutSnapshot = null,
  loadoutPresentation = null,
  achievementStats = {},
  unlockedAchievementIds = [],
  onRematch,
  onPlayAgain,
  onChooseMode,
}) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const cardVariants = useMemo(() => getCardVariants(prefersReducedMotion), [prefersReducedMotion])

  const isPracticeMode = !allowsCoinRewards && !allowsLevelProgression && !allowsRankProgression
  const hasCleanRun = misses === 0
  const isNewBestScore = score > bestScore
  const scoreBadgeText = isNewBestScore ? "New Personal Best!" : hasCleanRun ? "Clean Run" : ""
  const hasReactionData = avgReactionMs !== null || bestReactionMs !== null
  const reactionCaption = hasReactionData
    ? ""
    : "Reaction stats populate in timed modes after your first recorded hit."

  const resolvedLoadoutPresentation = useMemo(
    () => loadoutPresentation ?? (
      loadoutSnapshot
        ? buildLoadoutPresentation(getModeById(selectedModeId), loadoutSnapshot)
        : null
    ),
    [loadoutPresentation, loadoutSnapshot, selectedModeId]
  )

  const tone = getGameOverTone({ hits, misses, accuracy, bestStreak })

  const nearestAchievement = useMemo(() => {
    if (!achievementStats || Object.keys(achievementStats).length === 0) return null
    const evaluated = evaluateAchievements(achievementStats, {
      persistedUnlockedIds: unlockedAchievementIds,
    })
    return evaluated
      .filter((a) => !a.isUnlocked && a.type === "metric" && a.isProgressAvailable && a.percent > 0)
      .sort((a, b) => b.percent - a.percent)[0] ?? null
  }, [achievementStats, unlockedAchievementIds])

  // Confetti shower on new personal best — fires once after the score counts up.
  useEffect(() => {
    if (!isNewBestScore || prefersReducedMotion) return undefined

    const fire = (angle, origin) =>
      confetti({
        particleCount: 36,
        angle,
        spread: 52,
        startVelocity: 32,
        decay: 0.88,
        origin,
        colors: ["#53d7b3", "#4ab8ff", "#ffffff", "#c084fc"],
        zIndex: 9999,
      })

    const timeoutId = window.setTimeout(() => {
      fire(65, { x: 0.1, y: 0.58 })
      fire(115, { x: 0.9, y: 0.58 })
    }, 780)

    return () => window.clearTimeout(timeoutId)
  }, [isNewBestScore, prefersReducedMotion])

  const animatedScore = useCountUpNumber(score, {
    durationMs: 700,
    disabled: prefersReducedMotion,
  })
  const isScoreAnimationDone = prefersReducedMotion || animatedScore === score
  const formattedScore = formatNumber(animatedScore)

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

  return (
    <MotionSection
      className={`gameOverCard gameOverCardWithDifficulty difficultyMood-${selectedModeId} gameOverTone-${tone}`}
      aria-labelledby="game-over-title"
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <MotionDiv
        initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 28, delay: 0.12 }}
      >
        <header className="gameOverHeader">
          <h2 id="game-over-title" className="gameOverTitle">Round Complete</h2>
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
          <p className="gameOverScoreBadge" aria-label="Score highlight">{scoreBadgeText}</p>
        ) : null}
        <p className={`gameOverDifficultyBadge${allowsRankProgression ? " is-ranked" : ""}`}>
          {modeLabel}
        </p>
        {loadoutSnapshot?.loadoutName ? (
          <>
            <p className="gameOverLoadoutBadge">
              Build: {loadoutSnapshot.loadoutName}
              {resolvedLoadoutPresentation?.titleLine ? ` \u2022 ${resolvedLoadoutPresentation.titleLine}` : ""}
            </p>
            {resolvedLoadoutPresentation?.glanceText ? (
              <p className="gameOverLoadoutGlance">{resolvedLoadoutPresentation.glanceText}</p>
            ) : null}
          </>
        ) : null}
      </MotionDiv>

      <div className="gameOverBody">
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

        {isPracticeMode ? (
          <p className="gameOverPracticeNote">Rewards are not earned in Practice mode.</p>
        ) : null}

        {nearestAchievement ? (
          <div className="gameOverAchievementHint" aria-label="Nearest achievement">
            <span className="gameOverAchievementHintLabel">Next up</span>
            <span className="gameOverAchievementHintName">{nearestAchievement.title}</span>
            <span className="gameOverAchievementHintProgress">{nearestAchievement.progressText}</span>
          </div>
        ) : null}
      </div>

      <MotionDiv
        className="overlayActions gameOverActions"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 28, delay: 0.38 }}
      >
        <button className="primaryButton primaryButton-lg" onClick={onRematch ?? onPlayAgain}>
          Play Again
        </button>
        <button className="secondaryButton" type="button" onClick={onPlayAgain}>
          Choose Mode
        </button>
        {!isPracticeMode ? (
          <Link className="secondaryButton" to="/history">
            View History
          </Link>
        ) : null}
      </MotionDiv>
    </MotionSection>
  )
}
