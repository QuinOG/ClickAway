import { useMemo, useState } from "react"
import { Link } from "react-router-dom"

function formatDifficultyLabel(difficulty) {
  if (difficulty.id === "normal") return "Medium"
  return difficulty.label
}

function getShrinkPaceLabel(shrinkFactor) {
  if (shrinkFactor >= 0.98) return "Relaxed"
  if (shrinkFactor >= 0.965) return "Balanced"
  return "Aggressive"
}

function getCoinBonusText(coinMultiplier) {
  const bonusPercent = Math.round((coinMultiplier - 1) * 100)
  if (bonusPercent <= 0) return "Coins: base"
  return `Coins: +${bonusPercent}%`
}

function getRoundFeedbackMessage({ hits, misses, accuracy, bestStreak }) {
  if (hits === 0) {
    return "No hits landed this round. Focus on tracking the target first."
  }

  const accuracyValue = Number.parseInt(String(accuracy).replace("%", ""), 10)
  const normalizedAccuracy = Number.isFinite(accuracyValue) ? accuracyValue : 0

  if (normalizedAccuracy >= 85 && bestStreak >= 8) {
    return "Strong run. Keep that rhythm and push for a longer streak."
  }

  if (misses > hits) {
    return "Misses outweighed hits. Slow down slightly and prioritize clean clicks."
  }

  return "Solid round. Cut a few misses and your score will climb quickly."
}

function getGameOverTone({ hits, misses, accuracy, bestStreak }) {
  const accuracyValue = Number.parseInt(String(accuracy).replace("%", ""), 10)
  const normalizedAccuracy = Number.isFinite(accuracyValue) ? accuracyValue : 0

  if (normalizedAccuracy >= 90 && bestStreak >= 10) return "elite"
  if (hits >= misses && normalizedAccuracy >= 65) return "steady"
  return "recovery"
}

function DifficultyOptionCard({
  difficulty,
  isSelected,
  onSelectDifficulty,
  canChangeDifficulty,
  compact,
}) {
  const displayLabel = formatDifficultyLabel(difficulty)
  const missPenaltyValue = difficulty.missPenalty > 0 ? `-${difficulty.missPenalty}` : "None"
  const roundLengthValue = difficulty.isTimedRound === false
    ? "No limit"
    : `${difficulty.durationSeconds}s`
  const coinBonusText = difficulty.allowsCoinRewards === false
    ? "Coins: off"
    : getCoinBonusText(difficulty.coinMultiplier)

  return (
    <button
      type="button"
      className={`difficultyOption ${isSelected ? "selected" : ""}`}
      aria-pressed={isSelected}
      onClick={() => onSelectDifficulty?.(difficulty.id)}
      disabled={!canChangeDifficulty}
    >
      <span className="difficultyTop">
        <span className="difficultyName">{displayLabel}</span>
      </span>
      <span className="difficultyDescriptionLine">{difficulty.description}</span>

      <span className="difficultyQuickStats">
        <span className="difficultyQuickStat">
          <strong>{roundLengthValue}</strong>
          <small>Round</small>
        </span>
        <span className="difficultyQuickStat">
          <strong>{missPenaltyValue}</strong>
          <small>Miss</small>
        </span>
        <span className="difficultyQuickStat">
          <strong>{getShrinkPaceLabel(difficulty.shrinkFactor)}</strong>
          <small>Shrink</small>
        </span>
      </span>

      <span className="difficultySecondaryInfo">
        <span>Combo: every {difficulty.comboStep} hits</span>
        <span>{coinBonusText}</span>
      </span>

      {!compact ? (
        <span className="difficultyDescription">{difficulty.playerHint}</span>
      ) : null}
    </button>
  )
}

function DifficultyPicker({
  difficulties = [],
  selectedDifficultyId,
  onSelectDifficulty,
  canChangeDifficulty,
  compact = false,
}) {
  return (
    <div
      className={`difficultyPicker ${compact ? "compact" : ""}`}
      role="radiogroup"
      aria-label="Difficulty"
    >
      {difficulties.map((difficulty) => (
        <DifficultyOptionCard
          key={difficulty.id}
          difficulty={difficulty}
          isSelected={difficulty.id === selectedDifficultyId}
          onSelectDifficulty={onSelectDifficulty}
          canChangeDifficulty={canChangeDifficulty}
          compact={compact}
        />
      ))}
    </div>
  )
}

function getReadyDifficultySummary(selectedDifficulty) {
  if (!selectedDifficulty) {
    return {
      label: "Unknown",
      round: "Round length unavailable",
      coinBonus: "Coins: base",
    }
  }

  return {
    label: formatDifficultyLabel(selectedDifficulty),
    round: selectedDifficulty.isTimedRound === false
      ? "No time limit"
      : `${selectedDifficulty.durationSeconds}s round`,
    coinBonus: selectedDifficulty.allowsCoinRewards === false
      ? "Coins disabled"
      : getCoinBonusText(selectedDifficulty.coinMultiplier),
  }
}

function buildGameOverStats({
  hits,
  misses,
  accuracy,
  bestStreak,
  powerupsUsed,
  playerLevel,
  roundXpEarned,
  playerXpToNextLevel,
  allowsLevelProgression,
  playerRankLabel,
  playerRankMmr,
  roundRankDelta,
  allowsRankProgression,
}) {
  const xpEarnedDisplay = allowsLevelProgression ? `+${roundXpEarned}` : "Off"
  const nextLevelDisplay = allowsLevelProgression ? `${playerXpToNextLevel} XP` : "Off"
  const rankDeltaDisplay = allowsRankProgression
    ? `${roundRankDelta > 0 ? "+" : ""}${roundRankDelta}`
    : "Off"

  return [
    { label: "Hits", value: hits },
    { label: "Misses", value: misses },
    { label: "Accuracy", value: accuracy },
    { label: "Best Streak", value: bestStreak },
    { label: "Power-ups Used", value: powerupsUsed },
    { label: "Level", value: playerLevel },
    { label: "XP Earned", value: xpEarnedDisplay },
    { label: "Next Level", value: nextLevelDisplay },
    { label: "Rank", value: allowsRankProgression ? playerRankLabel : "Unranked" },
    { label: "MMR", value: allowsRankProgression ? playerRankMmr : "Off" },
    { label: "Rank Delta", value: rankDeltaDisplay },
  ]
}

export function ReadyOverlay({
  onStart,
  difficulties = [],
  selectedDifficultyId,
  onSelectDifficulty,
  canChangeDifficulty = true,
}) {
  const [isChoosingDifficulty, setIsChoosingDifficulty] = useState(false)
  const selectedDifficulty = useMemo(
    () => difficulties.find((difficulty) => difficulty.id === selectedDifficultyId) ?? null,
    [difficulties, selectedDifficultyId]
  )

  function handleOpenDifficultyPicker() {
    if (!canChangeDifficulty) return
    setIsChoosingDifficulty(true)
  }

  function handleBackToReady() {
    setIsChoosingDifficulty(false)
  }

  const readyDifficultySummary = getReadyDifficultySummary(selectedDifficulty)

  return (
    <div
      className="gameOverlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="round-ready-title"
    >
      <section
        className={`gameOverCard readyCard readyCardStack difficultyMood-${selectedDifficultyId}`}
      >
        {!isChoosingDifficulty ? (
          <>
            <h2 id="round-ready-title" className="readyTitle">
              Round Ready
            </h2>
            <p className="readyLead">
              Jump in quickly or tune your difficulty before the next run.
            </p>

            <section className="readyCurrentDifficulty" aria-label="Selected difficulty">
              <span className="readyCurrentDifficultyLabel">Selected Difficulty</span>
              <strong className="readyCurrentDifficultyName">{readyDifficultySummary.label}</strong>
              <div className="readyCurrentDifficultyMeta">
                <span>{readyDifficultySummary.round}</span>
                <span>{readyDifficultySummary.coinBonus}</span>
              </div>
            </section>

            <div className="overlayActions readyActions">
              <button className="primaryButton" onClick={onStart}>
                Start Round
              </button>
              <button
                className="secondaryButton"
                type="button"
                onClick={handleOpenDifficultyPicker}
                disabled={!canChangeDifficulty}
              >
                Change Difficulty
              </button>
              <Link className="secondaryButton" to="/help">
                How To Play
              </Link>
            </div>
          </>
        ) : (
          <>
            <h2 id="round-ready-title" className="readyTitle">
              Choose Difficulty
            </h2>
            <p className="readyLead">
              Difficulty affects timer length, miss penalties, combo growth pace, and coin reward.
            </p>

            <DifficultyPicker
              difficulties={difficulties}
              selectedDifficultyId={selectedDifficultyId}
              onSelectDifficulty={onSelectDifficulty}
              canChangeDifficulty={canChangeDifficulty}
              compact
            />

            <div className="overlayActions readyActions">
              <button className="primaryButton" onClick={onStart}>
                Start Round
              </button>
              <button className="secondaryButton" type="button" onClick={handleBackToReady}>
                Back
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

export function CountdownOverlay({ countdownValue }) {
  return (
    <div className="gameOverlay" role="status" aria-live="polite">
      <section className="countdownCard">
        <p>Starting In</p>
        <div className="countdownNumber">{countdownValue}</div>
      </section>
    </div>
  )
}

export function GameOverOverlay({
  score,
  hits,
  misses,
  bestStreak,
  powerupsUsed,
  accuracy,
  difficultyLabel,
  playerLevel = 1,
  playerXpIntoLevel = 0,
  playerXpToNextLevel = 0,
  roundXpEarned = 0,
  allowsLevelProgression = false,
  playerRankLabel = "Bronze",
  playerRankMmr = 0,
  roundRankDelta = 0,
  allowsRankProgression = false,
  selectedDifficultyId,
  onPlayAgain,
}) {
  const feedbackMessage = getRoundFeedbackMessage({
    hits,
    misses,
    accuracy,
    bestStreak,
  })
  const stats = buildGameOverStats({
    hits,
    misses,
    accuracy,
    bestStreak,
    powerupsUsed,
    playerLevel,
    roundXpEarned,
    playerXpToNextLevel,
    allowsLevelProgression,
    playerRankLabel,
    playerRankMmr,
    roundRankDelta,
    allowsRankProgression,
  })
  const tone = getGameOverTone({ hits, misses, accuracy, bestStreak })
  const formattedScore = Number(score).toLocaleString()

  return (
    <div
      className="gameOverlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-over-title"
    >
      <section
        className={`gameOverCard gameOverCardWithDifficulty difficultyMood-${selectedDifficultyId} gameOverTone-${tone}`}
      >
        <header className="gameOverHeader">
          <p className="gameOverEyebrow">Round Complete</p>
          <h2 id="game-over-title" className="gameOverTitle">
            Game Over
          </h2>
        </header>

        <section className="gameOverScorePanel" aria-label="Final score summary">
          <p className="gameOverScoreLabel">Final Score</p>
          <p className="gameOverScoreValue">{formattedScore}</p>
          <p className="gameOverDifficultyBadge">{difficultyLabel}</p>
          <p className="gameOverLevelMeta">
            Level {playerLevel} · XP {playerXpIntoLevel}/{playerXpIntoLevel + playerXpToNextLevel}
          </p>
          {allowsRankProgression ? (
            <p className="gameOverRankMeta">
              Rank {playerRankLabel} · {playerRankMmr} MMR
            </p>
          ) : null}
        </section>

        <p className="gameOverFeedback">{feedbackMessage}</p>

        <section className="gameOverStatGrid" aria-label="Round summary">
          {stats.map((stat) => (
            <article className="gameOverStatCard" key={stat.label}>
              <p className="gameOverStatLabel">{stat.label}</p>
              <p className="gameOverStatValue">{stat.value}</p>
            </article>
          ))}
        </section>

        <div className="overlayActions gameOverActions">
          <button className="primaryButton" onClick={onPlayAgain}>
            Play Again
          </button>
        </div>
      </section>
    </div>
  )
}
