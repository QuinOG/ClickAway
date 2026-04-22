import GameStatusRow from "./GameStatusRow.jsx"

export default function GameHud({
  score,
  timeLeft,
  isTimedRound = true,
  modeLabel = "",
  rankLabel = "Unranked",
  loadoutName = "Loadout",
  streak,
  comboMultiplier,
  comboActive = false,
  bestStreak,
  isPlaying = false,
  pbPaceStatus = null,
  playerBestScore = 0,
  onEndRound,
}) {
  const timerDisplay = isTimedRound ? `${timeLeft}s` : "No Limit"
  const timerStateClassName = !isTimedRound
    ? ""
    : timeLeft < 3
      ? " timerDanger"
      : timeLeft < 5
        ? " timerUrgent"
        : ""
  const scoreClassName = `scoreNumber${comboActive ? " comboActive" : ""}`
  return (
    <>
      <div className="hudTopRow">
        <div className="hudTopBlock">
          <span className="hudTopLabel">Score</span>
          <div className={scoreClassName} aria-live="polite">
            {score}
          </div>
          {pbPaceStatus ? (
            <span className={`hudPbPace hudPbPace-${pbPaceStatus}`} aria-live="polite">
              {pbPaceStatus === "ahead" ? "▲ PB pace" : "▼ Behind PB"}
            </span>
          ) : (
            <span className="hudTopMeta">
              Mode: {modeLabel || "Unknown"} / Rank: {rankLabel || "Unranked"}
            </span>
          )}
        </div>

        <div className="hudTopBlock">
          <span className="hudTopLabel">Time Remaining</span>
          <div className={`timerText${timerStateClassName}`}>{timerDisplay}</div>
          <span className="hudTopMeta">
            {pbPaceStatus && playerBestScore > 0
              ? `Best: ${playerBestScore.toLocaleString()} \u00b7 Build: ${loadoutName || "Loadout"}`
              : `Build: ${loadoutName || "Loadout"}`}
          </span>
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
