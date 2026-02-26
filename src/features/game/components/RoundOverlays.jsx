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
      {difficulties.map((difficulty) => {
        const isSelected = difficulty.id === selectedDifficultyId
        const displayLabel = formatDifficultyLabel(difficulty)
        const missPenaltyValue =
          difficulty.missPenalty > 0 ? `-${difficulty.missPenalty}` : "None"

        return (
          <button
            key={difficulty.id}
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

            {!compact ? <span className="difficultyDescription">{difficulty.playerHint}</span> : null}
          </button>
        )
      })}
    </div>
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
    <div className="gameOverlay" role="dialog" aria-modal="true" aria-labelledby="round-ready-title">
      <section className={`gameOverCard readyCard readyCardStack difficultyMood-${selectedDifficultyId}`}>
        <h2 id="round-ready-title" className="readyTitle">Ready?</h2>
        <p className="readyLead">
          Choose your difficulty, then build a streak before time runs out.
        </p>

        <DifficultyPicker
          difficulties={difficulties}
          selectedDifficultyId={selectedDifficultyId}
          onSelectDifficulty={onSelectDifficulty}
          canChangeDifficulty={canChangeDifficulty}
        />

        <p className="difficultyHint">
          Difficulty changes timer length, miss penalties, and target pressure.
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
  return (
    <div className="gameOverlay" role="dialog" aria-modal="true" aria-labelledby="game-over-title">
      <section className={`gameOverCard gameOverCardWithDifficulty difficultyMood-${selectedDifficultyId}`}>
        <h2 id="game-over-title">Game Over</h2>
        <p className="gameOverScore">Final Score: {score}</p>

        <table className="roundSummaryTable" aria-label="Round summary">
          <tbody>
            <tr>
              <th scope="row">Difficulty</th>
              <td>{difficultyLabel}</td>
            </tr>
            <tr>
              <th scope="row">Hits</th>
              <td>{hits}</td>
            </tr>
            <tr>
              <th scope="row">Misses</th>
              <td>{misses}</td>
            </tr>
            <tr>
              <th scope="row">Accuracy</th>
              <td>{accuracy}</td>
            </tr>
            <tr>
              <th scope="row">Best Streak</th>
              <td>{bestStreak}</td>
            </tr>
            <tr>
              <th scope="row">Power-ups Used</th>
              <td>{powerupsUsed}</td>
            </tr>
          </tbody>
        </table>

        <DifficultyPicker
          difficulties={difficulties}
          selectedDifficultyId={selectedDifficultyId}
          onSelectDifficulty={onSelectDifficulty}
          canChangeDifficulty={canChangeDifficulty}
        />

        <div className="overlayActions gameOverActions">
          <button className="primaryButton" onClick={onPlayAgain}>
            Play Again
          </button>
        </div>
      </section>
    </div>
  )
}
