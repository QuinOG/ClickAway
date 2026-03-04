import GameStatusRow from "./GameStatusRow.jsx"

export default function GameHud({
  score,
  timeLeft,
  isTimedRound = true,
  difficultyLabel,
  playerLevel = 1,
  playerXpIntoLevel = 0,
  playerXpToNextLevel = 0,
  playerLevelProgressPercent = 0,
  playerRankLabel = "Bronze",
  playerRankMmr = 0,
  playerRankToNextTier = 0,
  allowsRankProgression = false,
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

      <div
        className="difficultyHudTag"
        aria-label={`Current difficulty ${difficultyLabel}`}
      >
        Difficulty: {difficultyLabel}
      </div>

      <div
        className="levelHudTag"
        aria-label={`Current level ${playerLevel}, ${playerLevelProgressPercent}% to next level`}
      >
        Level {playerLevel} · XP {playerXpIntoLevel}/{playerXpIntoLevel + playerXpToNextLevel}
      </div>

      {allowsRankProgression ? (
        <div
          className="rankHudTag"
          aria-label={`Current rank ${playerRankLabel}, rating ${playerRankMmr}`}
        >
          Rank: {playerRankLabel} · {playerRankMmr} MMR · {playerRankToNextTier} to next
        </div>
      ) : null}

      <GameStatusRow
        streak={streak}
        comboMultiplier={comboMultiplier}
        bestStreak={bestStreak}
      />

      {!isTimedRound && isPlaying ? (
        <div className="hudActions">
          <button className="secondaryButton hudActionButton" type="button" onClick={onEndRound}>
            End Practice Round
          </button>
        </div>
      ) : null}
    </>
  )
}
