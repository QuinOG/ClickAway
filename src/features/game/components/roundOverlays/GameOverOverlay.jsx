import "./roundResultsArt.css"
import { CoinIcon, CrestIcon, GemIcon, PartEmblem, PowerEmblem } from "../../../../components/art/GameIcons.jsx"
import {
  Crosshair,
  Fire,
  Gauge,
  Timer,
  TrendDown,
  TrendUp,
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
import { UNLOCK_WALL_PARTS } from "../../../../utils/unlockWallUtils.js"
import { getRequiredXpForLevel } from "../../../../utils/progressionUtils.js"
import { useCountUpNumber, usePrefersReducedMotion } from "./gameRoundOverlayMotionHooks.js"

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
  if (normalizedBest > 0 && delta < 0) comparisonCopy = `${formatNumber(normalizedBest)} — keep climbing`

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

const clampRating = (value) => Math.max(0, Math.min(10, Math.round(value)))

function getRoundGrade(average) {
  if (average >= 9) return "S"
  if (average >= 7.5) return "A"
  if (average >= 6) return "B"
  if (average >= 4) return "C"
  return "D"
}

// Round performance as a rated stat card: each readout becomes a 10-segment
// bar and the average becomes a letter grade.
function OutcomeInstruments({ accuracy, bestStreak, avgReactionMs, bestReactionMs, score, bestScore }) {
  const accuracyValue = Number.parseFloat(String(accuracy).replace("%", "")) || 0
  const avgMs = Number(avgReactionMs)
  const bestMs = Number(bestReactionMs)
  const normalizedBest = Math.max(0, Number(bestScore) || 0)
  const stats = [
    { label: "Accuracy", value: accuracy, rating: clampRating(accuracyValue / 10), icon: <Gauge weight="bold" aria-hidden="true" /> },
    { label: "Streak", value: bestStreak, rating: clampRating(bestStreak / 2), icon: <Fire weight="bold" aria-hidden="true" /> },
    { label: "Avg speed", value: formatReactionTime(avgReactionMs), rating: avgMs > 0 ? clampRating((650 - avgMs) / 45) : 0, icon: <Timer weight="bold" aria-hidden="true" /> },
    { label: "Fastest", value: formatReactionTime(bestReactionMs), rating: bestMs > 0 ? clampRating((520 - bestMs) / 35) : 0, icon: <Crosshair weight="bold" aria-hidden="true" /> },
    { label: "Vs best", value: normalizedBest ? `${Math.round((score / normalizedBest) * 100)}%` : "New", rating: normalizedBest ? clampRating((score / normalizedBest) * 10) : 10, icon: <TrendUp weight="bold" aria-hidden="true" /> },
  ]
  const average = stats.reduce((sum, stat) => sum + stat.rating, 0) / stats.length
  const grade = getRoundGrade(average)

  return (
    <div className={`outcomeInstruments outcomeRating grade-${grade}`} aria-label="Round performance details">
      <div className="outcomeRatingGrade" aria-label={`Round grade ${grade}`}>
        <span>Grade</span>
        <strong>{grade}</strong>
        <small>{average.toFixed(1)} / 10</small>
      </div>
      <div className="outcomeRatingBars">
        {stats.map(({ label, value, rating, icon }) => (
          <div className={`outcomeInstrument outcomeRatingRow ${rating >= 8 ? "isHigh" : rating <= 3 ? "isLow" : ""}`} key={label}>
            {icon}
            <span>{label}</span>
            <i className="outcomeRatingSegments" aria-hidden="true">
              {Array.from({ length: 10 }, (_, index) => <b key={index} className={index < rating ? "isOn" : ""} />)}
            </i>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

// The next Armory part the level track pays out, so every round points at a
// concrete reward. If this round crossed that level, it reads as unlocked.
// Where the round's XP actually lands. Early levels are cheap, so one round can
// cross several of them.
function getLevelAfterRound(level, xpIntoLevel, earned) {
  let reachedLevel = Math.max(1, Number(level) || 1)
  let remaining = Math.max(0, Number(xpIntoLevel) || 0) + Math.max(0, Number(earned) || 0)
  while (remaining >= getRequiredXpForLevel(reachedLevel)) {
    remaining -= getRequiredXpForLevel(reachedLevel)
    reachedLevel += 1
  }
  return {
    reachedLevel,
    xpIntoReachedLevel: remaining,
    xpToNextLevel: getRequiredXpForLevel(reachedLevel) - remaining,
  }
}

function NextUnlock({ level, xpIntoLevel, earned }) {
  const { reachedLevel } = getLevelAfterRound(level, xpIntoLevel, earned)
  const justUnlocked = reachedLevel > level
    ? [...UNLOCK_WALL_PARTS]
      .filter((part) => part.unlockLevel > level && part.unlockLevel <= reachedLevel)
      .sort((a, b) => b.unlockLevel - a.unlockLevel)[0] ?? null
    : null
  const nextPart = justUnlocked ?? [...UNLOCK_WALL_PARTS]
    .filter((part) => part.unlockLevel > reachedLevel)
    .sort((a, b) => a.unlockLevel - b.unlockLevel)[0]

  if (!nextPart) return null

  return (
    <Link
      className={`gameOverNextUnlock ${justUnlocked ? "isUnlocked" : ""}`}
      to="/armory"
      aria-label={justUnlocked ? `Unlocked ${nextPart.label}. Open Armory` : `Next unlock ${nextPart.label} at level ${nextPart.unlockLevel}. Open Armory`}
    >
      <span className="gameOverNextUnlockIcon" aria-hidden="true">
        {nextPart.kind === "power" ? <PowerEmblem powerupId={nextPart.id} size={96} /> : <><img className="gameOverUnlockRig" src="/art/results/unlock-rig.png" alt="" width="384" height="384" decoding="async" /><PartEmblem partId={nextPart.id} slotId={nextPart.slotId} size={72} /></>}
        <i className="gameOverNextUnlockBadge">{justUnlocked ? "NEW" : `Lv ${nextPart.unlockLevel}`}</i>
      </span>
      <span className="gameOverNextUnlockCopy">
        <small>{justUnlocked ? "Unlocked" : `Unlocks at Lv ${nextPart.unlockLevel}`} · {nextPart.kind === "power" ? "Powerup" : "Armory part"}</small>
        <strong>{nextPart.label}</strong>
        {nextPart.description ? <span className="gameOverNextUnlockBenefit">{nextPart.description}</span> : null}
      </span>
      <span className="gameOverNextUnlockCta" aria-hidden="true">{justUnlocked ? "Equip" : "Preview"} {"›"}</span>
    </Link>
  )
}

function XpTally({ level, xpIntoLevel, xpToNextLevel, earned, prefersReducedMotion }) {
  const span = Math.max(1, Number(xpIntoLevel) + Number(xpToNextLevel))
  const startPercent = Math.min(100, (Number(xpIntoLevel) / span) * 100)
  const endXp = Number(xpIntoLevel) + Number(earned)
  const { reachedLevel } = getLevelAfterRound(level, xpIntoLevel, earned)
  const levelsUp = reachedLevel > level
  const endPercent = levelsUp ? 100 : Math.min(100, (endXp / span) * 100)

  return (
    <span className={`gameOverXpTally ${levelsUp ? "isLevelUp" : ""}`} aria-label={`Level ${level} progress`}>
      <span className="gameOverXpTallyHeader">
        <b>Lv {level}</b>
        <small>{levelsUp ? `Level up to ${reachedLevel}!` : `${Math.max(0, span - endXp).toLocaleString()} XP to Lv ${level + 1}`}</small>
      </span>
      <span className="gameOverXpTallyTrack">
        <i className="gameOverXpTallyBase" style={{ width: `${startPercent}%` }} />
        <MotionDiv
          className="gameOverXpTallyGain"
          style={{ left: `${startPercent}%` }}
          initial={prefersReducedMotion ? false : { width: 0 }}
          animate={{ width: `${Math.max(0, endPercent - startPercent)}%` }}
          transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.7, duration: 0.9, ease: "easeOut" }}
        />
      </span>
    </span>
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
  roundCoinsEarned = 0,
  roundXpEarned = 0,
  roundRankDelta = 0,
  placementLabel = null,
  roundSaveStatus = "idle",
  roundSaveError = "",
  playerLevel = 1,
  playerXpIntoLevel = 0,
  playerXpToNextLevel = 0,
  playerCoins = null,
  secondaryActionLabel = null,
  onSecondaryAction = null,
}) {
  const { effectivePreferences } = useFeedbackPreferences()
  const prefersReducedMotion = usePrefersReducedMotion()
  const primaryActionRef = useRef(null)
  const cardVariants = useMemo(() => getCardVariants(prefersReducedMotion), [prefersReducedMotion])
  const [isWorkshopNoteDismissed, setIsWorkshopNoteDismissed] = useState(false)

  const isPracticeMode = !allowsCoinRewards && !allowsLevelProgression && !allowsRankProgression
  const hasCleanRun = misses === 0
  const isNewBestScore = score > bestScore
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
        <p className="gameOverEyebrow">{modeLabel}{isNewBestScore ? " · New personal best" : hasCleanRun && hits > 0 ? " · Flawless" : ""}</p>
        <h2 id="game-over-title" className="gameOverTitle">Round Complete</h2>
        {roundSaveStatus === "saving" ? (
          <p className="gameOverSaveStatus isSaving" role="status">Saving round…</p>
        ) : null}
        {roundSaveStatus === "failed" ? (
          <p className="gameOverSaveStatus isFailed" role="alert">
            This round couldn't be saved, so its rewards weren't added.{roundSaveError ? ` ${roundSaveError}` : ""}
          </p>
        ) : null}
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
        <p className="gameOverScoreTally">{formatNumber(hits)} hits · {formatNumber(misses)} misses</p>
        {loadoutSnapshot?.loadoutName ? (
          <p className="gameOverLoadoutBadge">
            {loadoutSnapshot.loadoutName}
            {resolvedLoadoutPresentation?.titleLine ? ` \u2022 ${resolvedLoadoutPresentation.titleLine}` : ""}
          </p>
        ) : null}
      </MotionDiv>

      {allowsCoinRewards || allowsLevelProgression || allowsRankProgression ? (
        <MotionDiv
          className="gameOverRewards"
          aria-label="Round rewards"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 10, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 340, damping: 22, delay: 0.42 }}
        >
          {allowsCoinRewards ? (
            <span className="gameOverReward isCoins"><CoinIcon size={34} /><strong>+{formatNumber(roundCoinsEarned)}</strong><small>{playerCoins === null ? "coins" : `coins · ${formatNumber(Number(playerCoins) + Number(roundCoinsEarned))} total`}</small></span>
          ) : null}
          {allowsLevelProgression ? (
            <span className="gameOverReward isXp"><GemIcon size={34} /><strong>+{formatNumber(roundXpEarned)}</strong><small>XP</small></span>
          ) : null}
          {allowsLevelProgression ? (
            <XpTally
              level={playerLevel}
              xpIntoLevel={playerXpIntoLevel}
              xpToNextLevel={playerXpToNextLevel}
              earned={roundXpEarned}
              prefersReducedMotion={prefersReducedMotion}
            />
          ) : null}
          {allowsRankProgression && placementLabel ? (
            <span className="gameOverReward isRank isPlacement"><CrestIcon size={34} /><strong>{formatNumber(roundRankDelta)}</strong><small>Placement score · {placementLabel}</small></span>
          ) : null}
          {allowsRankProgression && !placementLabel ? (
            <span className={`gameOverReward isRank ${roundRankDelta < 0 ? "isLoss" : ""}`}><CrestIcon size={34} /><strong>{roundRankDelta > 0 ? "+" : ""}{formatNumber(roundRankDelta)}</strong><small>RR</small></span>
          ) : null}
        </MotionDiv>
      ) : null}

      <div className="gameOverBody">
        <MotionDiv
          className="outcomeContinuityBoard"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.34, duration: 0.3 }}
        >
          <PersonalBestComparison score={score} bestScore={bestScore} />
          <OutcomeInstruments
            accuracy={accuracy}
            bestStreak={bestStreak}
            avgReactionMs={avgReactionMs}
            bestReactionMs={bestReactionMs}
            score={score}
            bestScore={bestScore}
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
                {"\u00d7"}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {allowsLevelProgression ? (
        <MotionDiv
          className="gameOverSpotlight"
          initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 22, delay: 0.56 }}
        >
          <NextUnlock
            level={playerLevel}
            xpIntoLevel={playerXpIntoLevel}
            xpToNextLevel={playerXpToNextLevel}
            earned={roundXpEarned}
          />
        </MotionDiv>
      ) : null}

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
        {secondaryActionLabel && onSecondaryAction ? (
          <button className="secondaryButton gameOverRematch" type="button" onClick={onSecondaryAction}>
            {secondaryActionLabel}
          </button>
        ) : null}
      </MotionDiv>
    </MotionSection>
  )
}
