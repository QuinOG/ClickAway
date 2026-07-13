import {
  Crosshair,
  Fire,
  Gauge,
  Timer,
  TrendDown,
  TrendUp,
  XCircle,
} from "@phosphor-icons/react"
import { motion } from "motion/react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"

import { useFeedbackPreferences } from "../../../../app/useFeedbackPreferences.js"
import { buildLoadoutPresentation } from "../../../../constants/buildcraftPresentation.js"
import { getDifficultyById as getModeById } from "../../../../constants/gameModesConfig.js"
import { evaluateAchievements } from "../../../../game/achievements/evaluateAchievements.js"
import {
  cancelCelebrationEffects,
  fireConfetti,
} from "../../../../services/celebrationEffects.js"
import { useCountUpNumber, usePrefersReducedMotion } from "./gameRoundOverlayMotionHooks.js"

const MotionDiv = motion.div
const MotionSection = motion.section
const SIGNATURE_CELL_COUNT = 18

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

function buildOutcomeSignature(hits = 0, misses = 0) {
  const normalizedHits = Math.max(0, Number(hits) || 0)
  const normalizedMisses = Math.max(0, Number(misses) || 0)
  const totalAttempts = normalizedHits + normalizedMisses
  if (totalAttempts === 0) return Array(SIGNATURE_CELL_COUNT).fill("empty")

  const hitCells = Math.round((normalizedHits / totalAttempts) * SIGNATURE_CELL_COUNT)
  return Array.from(
    { length: SIGNATURE_CELL_COUNT },
    (_, index) => (index < hitCells ? "hit" : "miss")
  )
}

function HitMissSignature({ hits, misses, prefersReducedMotion }) {
  const cells = useMemo(() => buildOutcomeSignature(hits, misses), [hits, misses])

  return (
    <section
      className="outcomeSignature"
      aria-label={`Hit signature: ${hits} hits and ${misses} misses`}
      role="img"
    >
      <div className="outcomeSignatureHeader" aria-hidden="true">
        <span><Crosshair weight="fill" /> {hits} hits</span>
        <span><XCircle weight="fill" /> {misses} misses</span>
      </div>
      <div className="outcomeSignatureTrack" aria-hidden="true">
        {cells.map((cell, index) => (
          <MotionDiv
            className={`outcomeSignatureCell is-${cell}`}
            key={`${cell}-${index}`}
            initial={prefersReducedMotion ? false : { opacity: 0, scaleY: 0.2 }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={prefersReducedMotion ? { duration: 0 } : {
              delay: 0.5 + (index * 0.025),
              duration: 0.18,
            }}
          />
        ))}
      </div>
    </section>
  )
}

function PersonalBestComparison({ score, bestScore }) {
  const normalizedBest = Math.max(0, Number(bestScore) || 0)
  const delta = score - normalizedBest
  const isNewBest = delta > 0
  const comparisonCeiling = Math.max(1, score, normalizedBest)
  const currentPercent = Math.max(4, (score / comparisonCeiling) * 100)
  const bestPercent = normalizedBest > 0
    ? Math.max(4, (normalizedBest / comparisonCeiling) * 100)
    : 0

  let comparisonCopy = "First score on record"
  if (normalizedBest > 0 && isNewBest) comparisonCopy = `New best by ${formatNumber(delta)}`
  if (normalizedBest > 0 && !isNewBest && delta === 0) comparisonCopy = "Personal best matched"
  if (normalizedBest > 0 && delta < 0) comparisonCopy = `${formatNumber(Math.abs(delta))} below your best`

  return (
    <section className={`outcomeBestComparison ${isNewBest ? "isNewBest" : ""}`} aria-label="Personal best comparison">
      <div className="outcomeBestHeader">
        <span>Personal best</span>
        <strong>
          {isNewBest ? <TrendUp weight="bold" aria-hidden="true" /> : <TrendDown weight="bold" aria-hidden="true" />}
          {comparisonCopy}
        </strong>
      </div>
      <div className="outcomeBestTracks" aria-hidden="true">
        <span className="outcomeBestTrack">
          <i style={{ width: `${bestPercent}%` }} />
          <b>Previous {normalizedBest ? formatNumber(normalizedBest) : "\u2014"}</b>
        </span>
        <span className="outcomeBestTrack isCurrent">
          <i style={{ width: `${currentPercent}%` }} />
          <b>This round {formatNumber(score)}</b>
        </span>
      </div>
    </section>
  )
}

function OutcomeInstruments({ accuracy, bestStreak, avgReactionMs, bestReactionMs }) {
  const instruments = [
    { label: "Accuracy", value: accuracy, icon: <Gauge weight="bold" aria-hidden="true" /> },
    { label: "Best streak", value: bestStreak, icon: <Fire weight="bold" aria-hidden="true" /> },
    { label: "Avg reaction", value: formatReactionTime(avgReactionMs), icon: <Timer weight="bold" aria-hidden="true" /> },
    { label: "Fastest", value: formatReactionTime(bestReactionMs), icon: <Crosshair weight="bold" aria-hidden="true" /> },
  ]

  return (
    <div className="outcomeInstruments" aria-label="Round performance details">
      {instruments.map(({ label, value, icon }) => (
        <div className="outcomeInstrument" key={label}>
          {icon}
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
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
  allowsCoinRewards = false,
  allowsLevelProgression = false,
  allowsRankProgression = false,
  selectedModeId,
  bestScore = 0,
  avgReactionMs = null,
  bestReactionMs = null,
  loadoutSnapshot = null,
  loadoutPresentation = null,
  workshopNote = null,
  achievementStats = {},
  unlockedAchievementIds = [],
  primaryActionLabel = "Play Again",
  onPrimaryAction,
}) {
  const { effectivePreferences } = useFeedbackPreferences()
  const prefersReducedMotion = usePrefersReducedMotion()
  const primaryActionRef = useRef(null)
  const cardVariants = useMemo(() => getCardVariants(prefersReducedMotion), [prefersReducedMotion])
  const [isWorkshopNoteDismissed, setIsWorkshopNoteDismissed] = useState(false)

  const isPracticeMode = !allowsCoinRewards && !allowsLevelProgression && !allowsRankProgression
  const hasCleanRun = misses === 0
  const isNewBestScore = score > bestScore
  const scoreBadgeText = isNewBestScore ? "New Personal Best!" : hasCleanRun ? "Clean Run" : "Score Locked"

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
      .filter((achievement) => (
        !achievement.isUnlocked &&
        achievement.type === "metric" &&
        achievement.isProgressAvailable &&
        achievement.percent > 0
      ))
      .sort((a, b) => b.percent - a.percent)[0] ?? null
  }, [achievementStats, unlockedAchievementIds])

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => primaryActionRef.current?.focus(),
      prefersReducedMotion ? 0 : 900
    )
    return () => window.clearTimeout(timeoutId)
  }, [prefersReducedMotion])

  useEffect(() => {
    if (!isNewBestScore || prefersReducedMotion || !effectivePreferences.flashes) return undefined

    const fire = (angle, origin) => fireConfetti({
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

    return () => {
      window.clearTimeout(timeoutId)
      cancelCelebrationEffects()
    }
  }, [effectivePreferences.flashes, isNewBestScore, prefersReducedMotion])

  const animatedScore = useCountUpNumber(score, {
    durationMs: 700,
    disabled: prefersReducedMotion,
  })
  const isScoreAnimationDone = prefersReducedMotion || animatedScore === score

  return (
    <MotionSection
      className={`gameOverCard gameOverCardWithDifficulty difficultyMood-${selectedModeId} gameOverTone-${tone}`}
      aria-labelledby="game-over-title"
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <header className="gameOverHeader">
        <p className="gameOverEyebrow">Outcome locked / {modeLabel}</p>
        <h2 id="game-over-title" className="gameOverTitle">Round Complete</h2>
      </header>

      <MotionDiv
        className={`gameOverScorePanel ${isScoreAnimationDone ? "isComplete" : "isLocking"}`}
        aria-label={`Final score ${score}`}
        initial={prefersReducedMotion ? false : { opacity: 0, y: 16, scale: 0.84 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 360, damping: 24, delay: 0.16 }}
      >
        <span className="gameOverScoreLockRail" aria-hidden="true"><i /></span>
        <p className="gameOverScoreLabel">Final Score</p>
        <p className="gameOverScoreValue" aria-hidden="true">{formatNumber(animatedScore)}</p>
        <p className="gameOverScoreBadge">{scoreBadgeText}</p>
        {loadoutSnapshot?.loadoutName ? (
          <p className="gameOverLoadoutBadge">
            {loadoutSnapshot.loadoutName}
            {resolvedLoadoutPresentation?.titleLine ? ` \u2022 ${resolvedLoadoutPresentation.titleLine}` : ""}
          </p>
        ) : null}
      </MotionDiv>

      <div className="gameOverBody">
        <MotionDiv
          className="outcomeContinuityBoard"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.34, duration: 0.3 }}
        >
          <HitMissSignature hits={hits} misses={misses} prefersReducedMotion={prefersReducedMotion} />
          <PersonalBestComparison score={score} bestScore={bestScore} />
          <OutcomeInstruments
            accuracy={accuracy}
            bestStreak={bestStreak}
            avgReactionMs={avgReactionMs}
            bestReactionMs={bestReactionMs}
          />
        </MotionDiv>

        {isPracticeMode ? (
          <p className="gameOverPracticeNote">Practice result recorded. No economy or rank was changed.</p>
        ) : null}

        {nearestAchievement ? (
          <div className="gameOverAchievementHint" aria-label="Nearest achievement">
            <span className="gameOverAchievementHintLabel">Next up</span>
            <span className="gameOverAchievementHintName">{nearestAchievement.title}</span>
            <span className="gameOverAchievementHintProgress">{nearestAchievement.progressText}</span>
          </div>
        ) : null}

        {workshopNote && !isWorkshopNoteDismissed ? (
          <div className="gameOverWorkshopHint" aria-label="Workshop notes">
            <span className="gameOverWorkshopHintLabel">Workshop notes</span>
            <span className="gameOverWorkshopHintText">{workshopNote}</span>
            <div className="gameOverWorkshopHintActions">
              {loadoutSnapshot?.loadoutId ? (
                <Link
                  className="gameOverWorkshopHintLink"
                  to={`/armory?bay=${encodeURIComponent(loadoutSnapshot.loadoutId)}`}
                >
                  Open in Armory
                </Link>
              ) : null}
              <button
                type="button"
                className="gameOverWorkshopHintDismiss"
                onClick={() => setIsWorkshopNoteDismissed(true)}
                aria-label="Dismiss workshop note"
              >
                \u00d7
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <MotionDiv
        className="overlayActions gameOverActions"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.72, duration: 0.24 }}
      >
        <button
          ref={primaryActionRef}
          className="primaryButton primaryButton-lg"
          type="button"
          onClick={onPrimaryAction}
        >
          {primaryActionLabel}
        </button>
      </MotionDiv>
    </MotionSection>
  )
}
