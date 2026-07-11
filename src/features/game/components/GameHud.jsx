import GameStatusRow from "./GameStatusRow.jsx"

export default function GameHud({
  score,
  ghostScore = null,
  ghostUsername = null,
  ghostTargetScore = null,
  isGhostDuel = false,
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
  drillGoal = null,
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
  const ghostLead = isGhostDuel && ghostScore !== null && ghostTargetScore !== null
    ? ghostScore >= ghostTargetScore
    : null

  return (
    <>
      {isGhostDuel ? (
        <div className="ghostDuelBanner" aria-label="Ghost duel status">
          <span className="ghostDuelLabel">Ghost Duel vs {ghostUsername || "Rival"}</span>
          <span className="ghostDuelScores">
            You: {score.toLocaleString()} · Ghost: {Number(ghostScore || 0).toLocaleString()}
            {ghostTargetScore ? ` / ${Number(ghostTargetScore).toLocaleString()}` : ""}
          </span>
          {ghostLead !== null ? (
            <span className={`ghostDuelLead${ghostLead ? " isAhead" : " isBehind"}`}>
              {ghostLead ? "Ahead of ghost pace" : "Behind ghost pace"}
            </span>
          ) : null}
        </div>
      ) : null}

      {drillGoal ? (
        <div
          className={`drillGoalBanner${drillGoal.isComplete ? " isComplete" : ""}`}
          aria-label="Training drill goal"
        >
          <span className="drillGoalLabel">{drillGoal.label}</span>
          <span className="drillGoalProgress">{drillGoal.progressLabel}</span>
        </div>
      ) : null}

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
