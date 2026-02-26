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

function DifficultyOptionCard({
  difficulty,
  isSelected,
  onSelectDifficulty,
  canChangeDifficulty,
  compact,
}) {
  const displayLabel = formatDifficultyLabel(difficulty)
  const missPenaltyValue = difficulty.missPenalty > 0 ? `-${difficulty.missPenalty}` : "None"

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
          <strong>{difficulty.durationSeconds}s</strong>
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
        <span>{getCoinBonusText(difficulty.coinMultiplier)}</span>
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

function SummaryRow({ label, value }) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td>{value}</td>
    </tr>
  )
}

export function ReadyOverlay({
  onStart,
  difficulties = [],
  selectedDifficultyId,
  onSelectDifficulty,
  canChangeDifficulty = true,
}) {
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
        <h2 id="round-ready-title" className="readyTitle">
          Round Ready
        </h2>
        <p className="readyLead">
          Pick your difficulty, protect your streak, and score as many clean hits as you can.
        </p>

        <DifficultyPicker
          difficulties={difficulties}
          selectedDifficultyId={selectedDifficultyId}
          onSelectDifficulty={onSelectDifficulty}
          canChangeDifficulty={canChangeDifficulty}
        />

        <p className="difficultyHint">
          Difficulty affects timer length, miss penalties, combo growth pace, and coin reward.
        </p>

        <div className="overlayActions readyActions">
          <button className="primaryButton" onClick={onStart}>
            Start Round
          </button>
          <Link className="secondaryButton" to="/help">
            How To Play
          </Link>
        </div>
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
  difficulties = [],
  selectedDifficultyId,
  onSelectDifficulty,
  canChangeDifficulty = true,
  onPlayAgain,
}) {
  const feedbackMessage = getRoundFeedbackMessage({
    hits,
    misses,
    accuracy,
    bestStreak,
  })

  return (
    <div
      className="gameOverlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-over-title"
    >
      <section
        className={`gameOverCard gameOverCardWithDifficulty difficultyMood-${selectedDifficultyId}`}
      >
        <h2 id="game-over-title">Game Over</h2>
        <p className="gameOverScore">Final Score: {score}</p>
        <p className="gameOverFeedback">{feedbackMessage}</p>

        <table className="roundSummaryTable" aria-label="Round summary">
          <tbody>
            <SummaryRow label="Difficulty" value={difficultyLabel} />
            <SummaryRow label="Hits" value={hits} />
            <SummaryRow label="Misses" value={misses} />
            <SummaryRow label="Accuracy" value={accuracy} />
            <SummaryRow label="Best Streak" value={bestStreak} />
            <SummaryRow label="Power-ups Used" value={powerupsUsed} />
          </tbody>
        </table>

        <DifficultyPicker
          difficulties={difficulties}
          selectedDifficultyId={selectedDifficultyId}
          onSelectDifficulty={onSelectDifficulty}
          canChangeDifficulty={canChangeDifficulty}
        />

        <p className="difficultyHint gameOverHint">
          Select your next difficulty, then start another run.
        </p>

        <div className="overlayActions gameOverActions">
          <button className="primaryButton" onClick={onPlayAgain}>
            Play Again
          </button>
        </div>
      </section>
    </div>
  )
}
