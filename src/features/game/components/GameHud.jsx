import GameStatusRow from "./GameStatusRow.jsx"

export default function GameHud({
  score,
  timeLeft,
  isTimedRound = true,
  streak,
  comboMultiplier,
  bestStreak,
  isPlaying = false,
  onEndRound,
}) {
  const timerDisplay = isTimedRound ? `${timeLeft}s` : "No Limit"

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
          <div className="timerText">{timerDisplay}</div>
        </div>
      </div>

      <div className="hudStatusLine">
        <GameStatusRow
          streak={streak}
          comboMultiplier={comboMultiplier}
          bestStreak={bestStreak}
        />
        {!isTimedRound && isPlaying ? (
          <button className="secondaryButton hudActionButton" type="button" onClick={onEndRound}>
            End Practice Round
          </button>
        ) : null}
      </div>
    </>
  )
}
