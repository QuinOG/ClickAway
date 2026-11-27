import { CoinIcon, GemIcon, PartEmblem, PowerEmblem } from "../../../../components/art/GameIcons.jsx"
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

// eslint-disable-next-line react-refresh/only-export-components -- exported for tests
export function getRoundGrade(average) {
  if (average >= 9) return "S"
  if (average >= 7.5) return "A"
  if (average >= 6) return "B"
  if (average >= 4) return "C"
  return "D"
}

// A few fast, accurate clicks rate high on most stats, so a short round can't
// earn a top grade however clean it was.
// eslint-disable-next-line react-refresh/only-export-components -- exported for tests
export function getGradeForRound({ stats, hits }) {
  const grade = getRoundGrade(stats.reduce((sum, stat) => sum + stat.rating, 0) / stats.length)
  const cap = hits < 10 ? "C" : hits < 20 ? "B" : "S"
  const bestToWorst = ["S", "A", "B", "C", "D"]
  return bestToWorst[Math.max(bestToWorst.indexOf(grade), bestToWorst.indexOf(cap))]
}

// Use the same performance ratings for the grade; details show plain values.
function getPerformanceStats({ accuracy, bestStreak, avgReactionMs, bestReactionMs, score, bestScore }) {
  const accuracyValue = Number.parseFloat(String(accuracy).replace("%", "")) || 0
  const avgMs = Number(avgReactionMs)
  const bestMs = Number(bestReactionMs)
  const normalizedBest = Math.max(0, Number(bestScore) || 0)
  const stats = [
    { label: "Accuracy", value: accuracy, rating: clampRating(accuracyValue / 10) },
    { label: "Streak", value: bestStreak, rating: clampRating(bestStreak / 2) },
    { label: "Avg speed", value: formatReactionTime(avgReactionMs), rating: avgMs > 0 ? clampRating((650 - avgMs) / 45) : 0 },
    { label: "Fastest", value: formatReactionTime(bestReactionMs), rating: bestMs > 0 ? clampRating((520 - bestMs) / 35) : 0 },
    // With no best score there is nothing to compare, so the rating stays neutral.
    { label: "Vs best", value: normalizedBest ? `${Math.round((score / normalizedBest) * 100)}%` : "New", rating: normalizedBest ? clampRating((score / normalizedBest) * 10) : 5 },
  ]
  return stats
}

function OutcomeInstruments({ stats }) {
  return (
    <dl className="resultStatList" aria-label="Round performance details">
      {stats.map(({ label, value }) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>
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
  roundSaveRetryable = false,
  onRetryRoundSave = null,
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
  const grade = getGradeForRound({ stats, hits })
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
    if (!events.length && nowAffordableItem) events.push(<span key="shop" className="gameOverNowAffordable">Now affordable: {nowAffordableItem.name} · <Link to="/shop" aria-label={`Open Shop to buy ${nowAffordableItem.name}`}>Shop</Link></span>)
  }

  return (
    <MotionSection className={`gameOverCard resultCeremony difficultyMood-${selectedModeId} gameOverTone-${tone} ${isNewBestScore ? "isPersonalBest" : ""}`}
      aria-labelledby="game-over-title" variants={cardVariants} initial="hidden" animate="visible" exit="exit">
      <header className="gameOverHeader">
        <p className="gameOverEyebrow">{modeLabel}</p>
        <h2 id="game-over-title" className="gameOverTitle">Round Complete</h2>
      </header>
      <div className="gameOverScorePanel" aria-label={`Final score ${score}`}>
        <p className="gameOverScoreLabel">Final score</p>
        <p className="gameOverScoreValue" aria-hidden="true">{formatNumber(animatedScore)}</p>
      </div>
      <div className="resultStanding">
        <p className="resultGrade" aria-label={`Round grade ${grade}`}><span>Grade</span><strong>{grade}</strong></p>
        <div><p className="resultStandingLabel">{isNewBestScore ? "New personal best" : "Keep climbing"}</p><p className="resultBest">{isNewBestScore ? `+${formatNumber(score - bestScore)} over your previous best` : `Personal best ${formatNumber(bestScore)}`}</p></div>
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
      {isRoundSaved && unlockedPart ? (
        <div className="resultUnlock">
          {unlockedPart.kind === "power" ? <PowerEmblem powerupId={unlockedPart.id} size={68} /> : <PartEmblem partId={unlockedPart.id} slotId={unlockedPart.slotId} size={68} />}
          <div><p className="resultUnlockLabel">New Armory part</p><strong>{unlockedPart.label}</strong></div>
          <Link className="resultEquip" to={unlockedPart.kind === "power" ? "/armory?step=hotbar&powerSlot=1" : `/armory?step=passives&lane=${encodeURIComponent(unlockedPart.slotId)}`} aria-label={`Unlocked ${unlockedPart.label}. Open Armory`}>Open Armory <span aria-hidden="true">›</span></Link>
        </div>
      ) : null}
      {isPracticeMode ? <p className="gameOverPracticeNote">{isRoundSaved ? "Practice result recorded." : "Practice round complete."} No coins, XP, or RR earned.</p> : null}
      {(isRoundSaved || roundSaveStatus === "idle") && roundSaveNote ? <p className="gameOverPracticeNote" role={isRoundSaved ? "status" : undefined}>{roundSaveNote}</p> : null}
      {roundSaveStatus === "failed" ? (
        <p className="gameOverSaveStatus isFailed" role="alert">
          {roundSaveRetryable && onRetryRoundSave
            ? "This round hasn't been confirmed yet. Check your connection and try again."
            : `This round couldn't be saved, so its rewards weren't added.${roundSaveError ? ` ${roundSaveError}` : ""}`}
          {roundSaveRetryable && onRetryRoundSave ? (
            <> <button className="resultSecondary" type="button" onClick={onRetryRoundSave}>Try saving again</button></>
          ) : null}
        </p>
      ) : null}
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
