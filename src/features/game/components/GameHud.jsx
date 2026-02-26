import GameStatusRow from "./GameStatusRow.jsx"

export default function GameHud({
  score,
  timeLeft,
  difficultyLabel,
  streak,
  comboMultiplier,
  bestStreak,
}) {
  return (
    <>
      <div className="hudTopRow">
        <div className="hudTopBlock">
          <span className="hudTopLabel">Score</span>
          <div className="scoreNumber" aria-live="polite">
            {score}
          </div>
        </div>

        <div className="hudTopBlock">
          <span className="hudTopLabel">Time Remaining</span>
          <div className="timerText">{timeLeft}s</div>
        </div>
      </div>

      <div
        className="difficultyHudTag"
        aria-label={`Current difficulty ${difficultyLabel}`}
      >
        Difficulty: {difficultyLabel}
      </div>

      <GameStatusRow
        streak={streak}
        comboMultiplier={comboMultiplier}
        bestStreak={bestStreak}
      />
    </>
  )
}
