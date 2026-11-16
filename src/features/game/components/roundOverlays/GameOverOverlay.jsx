import { CoinIcon, GemIcon } from "../../../../components/art/GameIcons.jsx"
import {
  Crosshair,
  Fire,
  Gauge,
  Timer,
  TrendUp,
} from "@phosphor-icons/react"
import { motion } from "motion/react"
import { useEffect, useMemo, useRef } from "react"
import { Link } from "react-router-dom"

import { buildLoadoutPresentation } from "../../../../constants/buildcraftPresentation.js"
import { getDifficultyById as getModeById } from "../../../../constants/gameModesConfig.js"
import { UNLOCK_WALL_PARTS } from "../../../../utils/unlockWallUtils.js"
import { getRequiredXpForLevel } from "../../../../utils/progressionUtils.js"
import { getNextRoundGoal } from "../../../../utils/nextRoundGoal.js"
import { SHOP_ITEMS } from "../../../../constants/shopCatalog.js"
import { getNewlyAffordableShopItem } from "../../../../utils/shopUtils.js"
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
      transition: { duration: 0.35, ease: "easeOut" },
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

function formatCount(value, singular, plural) {
  return `${formatNumber(value)} ${Number(value) === 1 ? singular : plural}`
}

function formatReactionTime(value) {
  const normalizedValue = Number(value)
  if (!Number.isFinite(normalizedValue) || normalizedValue <= 0) return "\u2014"
  return `${Math.round(normalizedValue)} ms`
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
function getPerformanceStats({ accuracy, bestStreak, avgReactionMs, bestReactionMs, score, bestScore }) {
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
  return stats
}

function OutcomeInstruments({ stats }) {
  return (
    <div className="outcomeRating" aria-label="Round performance details">
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

function XpTally({ level, xpIntoLevel, earned, prefersReducedMotion }) {
  const { reachedLevel, xpIntoReachedLevel, xpToNextLevel: remaining } = getLevelAfterRound(level, xpIntoLevel, earned)
  const percent = xpIntoReachedLevel / getRequiredXpForLevel(reachedLevel) * 100
  return (
    <span className="gameOverXpTally" aria-label={`Level ${level} progress`}>
      <span className="gameOverXpTallyHeader"><b>Lv {reachedLevel}</b><small> · {formatNumber(remaining)} XP to {reachedLevel + 1}</small></span>
      <span className="gameOverXpTallyTrack"><MotionDiv className="gameOverXpTallyGain" initial={false} animate={{ width: `${percent}%` }} transition={{ duration: prefersReducedMotion ? 0 : 0.3 }} /></span>
    </span>
  )
}

export function GameOverOverlay({
  score,
  hits,
  bullseyes = 0,
  goldHits = 0,
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
  primaryActionLabel = "Play Again",
  onPrimaryAction,
  roundCoinsEarned = 0,
  roundXpEarned = 0,
  roundDailyBonusXp = 0,
  roundDailyGoals = null,
  dailyGoals = null,
  roundRankDelta = 0,
  rankEventLabel = null,
  placementLabel = null,
  roundSaveStatus = "idle",
  roundSaveError = "",
  roundSaveNote = "",
  playerLevel = 1,
  playerXpIntoLevel = 0,
  playerCoins = null,
  ownedItemIds = [],
  secondaryActionLabel = null,
  onSecondaryAction = null,
}) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const primaryActionRef = useRef(null)
  const cardVariants = useMemo(() => getCardVariants(prefersReducedMotion), [prefersReducedMotion])

  const isPracticeMode = !allowsCoinRewards && !allowsLevelProgression && !allowsRankProgression
  const isRoundSaved = roundSaveStatus === "saved"
  const showRoundRewards = isRoundSaved || roundSaveStatus === "saving"
  const isNewBestScore = score > bestScore
  const resolvedLoadoutPresentation = useMemo(
    () => loadoutPresentation ?? (
      loadoutSnapshot
        ? buildLoadoutPresentation(getModeById(selectedModeId), loadoutSnapshot)
        : null
    ),
    [loadoutPresentation, loadoutSnapshot, selectedModeId]
  )

  // Waits for the save so the XP it counts is what the server awarded.
  const nextRoundGoal = isRoundSaved && !isPracticeMode
    ? getNextRoundGoal({
      score,
      bestScore,
      countsLevelProgress: allowsLevelProgression,
      level: playerLevel,
      xpIntoLevel: playerXpIntoLevel,
      earnedXp: roundXpEarned,
      // A plain next round earns neither the daily bonus nor goal rewards.
      nextRoundXp: roundXpEarned - roundDailyBonusXp - (Number(roundDailyGoals?.xp) || 0),
      dailyGoals,
      roundDailyGoals,
      round: { modeId: selectedModeId, hits, misses, bestStreak },
    })
    : null

  // Waits for the save so the coins counted are the server's total (daily goal
  // coins included); an unknown balance can't tell what the round changed.
  const nowAffordableItem = isRoundSaved && allowsCoinRewards && playerCoins !== null
    ? getNewlyAffordableShopItem(SHOP_ITEMS, {
      coinsBefore: playerCoins,
      coinsAfter: Number(playerCoins) + Number(roundCoinsEarned),
      ownedItemIds,
    })
    : null

  const tone = getGameOverTone({ hits, misses, accuracy, bestStreak })
  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => primaryActionRef.current?.focus(),
      prefersReducedMotion ? 0 : 400
    )
    return () => window.clearTimeout(timeoutId)
  }, [prefersReducedMotion])

  const animatedScore = useCountUpNumber(score, {
    durationMs: 400,
    disabled: prefersReducedMotion,
  })
  const stats = getPerformanceStats({ accuracy, bestStreak, avgReactionMs, bestReactionMs, score, bestScore })
  const grade = getRoundGrade(stats.reduce((sum, stat) => sum + stat.rating, 0) / stats.length)
  const reachedLevel = getLevelAfterRound(playerLevel, playerXpIntoLevel, roundXpEarned).reachedLevel
  const unlockedPart = allowsLevelProgression ? [...UNLOCK_WALL_PARTS]
    .filter((part) => part.unlockLevel > playerLevel && part.unlockLevel <= reachedLevel)
    .sort((a, b) => b.unlockLevel - a.unlockLevel)[0] : null
  const events = []
  if (isRoundSaved && !isPracticeMode) {
    if (allowsRankProgression && (placementLabel || rankEventLabel)) events.push(<span key="rank">{placementLabel || rankEventLabel}</span>)
    for (const goal of roundDailyGoals?.goals ?? []) {
      events.push(<span key={`goal-${goal.id}`}>Daily goal done: {goal.label} · +{formatNumber(goal.reward?.coins || 0)} coins</span>)
    }
    if (unlockedPart) events.push(<span key="unlock">Unlocked: {unlockedPart.label} · <Link to={unlockedPart.kind === "power" ? "/armory?step=hotbar&powerSlot=1" : `/armory?step=passives&lane=${encodeURIComponent(unlockedPart.slotId)}`} aria-label={`Unlocked ${unlockedPart.label}. Open Armory`}>Equip</Link></span>)
    if (!events.length && nowAffordableItem) events.push(<span key="shop" className="gameOverNowAffordable">Now affordable: {nowAffordableItem.name} · <Link to="/shop" aria-label={`Open Shop to buy ${nowAffordableItem.name}`}>Shop</Link></span>)
  }

  return (
    <MotionSection className={`gameOverCard resultCeremony difficultyMood-${selectedModeId} gameOverTone-${tone} ${isNewBestScore ? "isPersonalBest" : ""}`}
      aria-labelledby="game-over-title" variants={cardVariants} initial="hidden" animate="visible" exit="exit">
      <header className="gameOverHeader">
        <p className="gameOverEyebrow">{modeLabel}{isNewBestScore ? <span> · New personal best</span> : null}</p>
        <h2 id="game-over-title" className="gameOverTitle">Round Complete</h2>
      </header>
      <div className="gameOverScorePanel" aria-label={`Final score ${score}`}>
        <p className="gameOverScoreValue" aria-hidden="true">{isNewBestScore ? <i>✦</i> : null}{formatNumber(animatedScore)}{isNewBestScore ? <i>✦</i> : null}</p>
        <p className="resultGrade" aria-label={`Round grade ${grade}`}>Grade <strong>{grade}</strong></p>
        <p className="resultBest">{isNewBestScore ? `+${formatNumber(score - bestScore)} over your previous best` : `Personal best ${formatNumber(bestScore)}`}</p>
      </div>
      {showRoundRewards && !isPracticeMode ? (
        <div className="gameOverRewards" aria-label="Round rewards">
          {allowsCoinRewards ? <span className={`gameOverReward isCoins ${isRoundSaved ? "" : "isPending"}`}><CoinIcon size={28} /><strong>+{formatNumber(roundCoinsEarned)}</strong><small>coins{isRoundSaved ? null : <span className="resultPendingTag"> pending</span>}</small></span> : null}
          {allowsLevelProgression ? <span className={`gameOverReward isXp ${isRoundSaved ? "" : "isPending"}`}><GemIcon size={28} /><strong>+{formatNumber(roundXpEarned)}</strong><small>XP{isRoundSaved ? null : <span className="resultPendingTag"> pending</span>}</small></span> : null}
          {allowsLevelProgression ? <XpTally level={playerLevel} xpIntoLevel={playerXpIntoLevel} earned={roundXpEarned} prefersReducedMotion={prefersReducedMotion} /> : null}
          {allowsRankProgression ? <span className="resultRank">{isRoundSaved && !placementLabel ? `${roundRankDelta > 0 ? "+" : ""}${formatNumber(roundRankDelta)} RR` : ""}</span> : null}
          <span className="resultSave" role="status">{!isRoundSaved ? "Saving round…" : ""}</span>
        </div>
      ) : null}
      {events.length ? <div className="resultEvents" aria-label="Round events">{events.slice(0, 2).map((event) => <p key={event.key}>{event}</p>)}</div> : null}
      {isPracticeMode ? <p className="gameOverPracticeNote">{isRoundSaved ? "Practice result recorded." : "Practice round complete."} No economy or rank was changed.</p> : null}
      {roundSaveStatus === "idle" && roundSaveNote ? <p className="gameOverPracticeNote">{roundSaveNote}</p> : null}
      {roundSaveStatus === "failed" ? <p className="gameOverSaveStatus isFailed" role="alert">This round couldn't be saved, so its rewards weren't added.{roundSaveError ? ` ${roundSaveError}` : ""}</p> : null}
      <div className="gameOverActions">
        <p className="gameOverNextGoal" data-goal={nextRoundGoal?.kind}>Next round · {nextRoundGoal?.text || `Push for ${formatNumber(Math.max(score, bestScore) + 1)} points`}</p>
        <button ref={primaryActionRef} className="primaryButton primaryButton-lg" type="button" onClick={onPrimaryAction}>{primaryActionLabel}</button>
        <div className="resultFooter">
          <details className="resultDetails">
            <summary>Round details <span aria-hidden="true">+</span></summary>
            <div className="resultBreakdown">
              <p>{formatCount(hits, "hit", "hits")} · {formatCount(misses, "miss", "misses")} · {formatCount(bullseyes, "bullseye", "bullseyes")} · {formatNumber(goldHits)} gold</p>
              {loadoutSnapshot?.loadoutName ? <p>{loadoutSnapshot.loadoutName}{resolvedLoadoutPresentation?.titleLine ? ` · ${resolvedLoadoutPresentation.titleLine}` : ""}</p> : null}
              <OutcomeInstruments stats={stats} />
            </div>
          </details>
          {secondaryActionLabel && onSecondaryAction ? <button className="resultSecondary" type="button" onClick={onSecondaryAction}>{secondaryActionLabel}</button> : null}
        </div>
      </div>
    </MotionSection>
  )
}
