import GameStatusRow from "./GameStatusRow.jsx"

function formatSignedDelta(value) {
  const safeValue = Number(value) || 0
  return `${safeValue >= 0 ? "+" : "\u2212"}${Math.abs(safeValue).toLocaleString()}`
}

export default function GameHud({
  score,
  ghostScore = null,
  ghostUsername = null,
  ghostTargetScore = null,
  isGhostDuel = false,
  timeLeft,
  roundDurationSeconds = 0,
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
  pbPaceDelta = null,
  playerBestScore = 0,
  onEndRound,
  drillGoal = null,
}) {
  const timerDisplay = isTimedRound ? `${timeLeft}` : "\u221e"
  const timerAccessibleLabel = isTimedRound ? `${timeLeft} seconds remaining` : "No time limit"
  const timerState = !isTimedRound
    ? "untimed"
    : timeLeft <= 3
      ? "danger"
      : timeLeft <= 5
        ? "urgent"
        : "normal"
  const timerProgress = isTimedRound && roundDurationSeconds > 0
    ? Math.max(0, Math.min(1, timeLeft / roundDurationSeconds))
    : 1
  const ghostDelta = isGhostDuel && ghostScore !== null
    ? score - Number(ghostScore || 0)
    : null
  const ghostLead = ghostDelta === null ? null : ghostDelta >= 0
  const paceLabel = pbPaceStatus === "ahead" ? "Ahead of PB pace" : "Behind PB pace"
  const paceDeltaLabel = pbPaceDelta === null ? "" : ` ${formatSignedDelta(pbPaceDelta)}`

  return (
    <header className="gameHud" aria-label="Round status">
      <div className="hudPrimaryRow">
        <section className="hudScoreAnchor" aria-label={`Score ${score.toLocaleString()}`}>
          <span className="hudEyebrow">Score</span>
          <span key={`score-${score}`} className={`scoreNumber${comboActive ? " comboActive" : ""}`}>
            {score.toLocaleString()}
          </span>
          {pbPaceStatus ? (
            <span className={`hudPace hudPace-${pbPaceStatus}`} aria-label={`${paceLabel}${paceDeltaLabel}`}>
              <span aria-hidden="true">{pbPaceStatus === "ahead" ? "\u2191" : "\u2193"}</span>
              {paceLabel}{paceDeltaLabel}
            </span>
          ) : playerBestScore > 0 ? (
            <span className="hudQuietMeta">PB {playerBestScore.toLocaleString()}</span>
          ) : (
            <span className="hudQuietMeta">Set the pace</span>
          )}
        </section>

        <div className="hudCenterChannel">
          <GameStatusRow
            streak={streak}
            comboMultiplier={comboMultiplier}
            bestStreak={bestStreak}
          />
          <div className="hudIdentity" aria-label={`${modeLabel || "Unknown mode"}, ${rankLabel || "Unranked"}, ${loadoutName || "Loadout"}`}>
            <span className="hudModeIdentity">{modeLabel || "Unknown"}</span>
            <span aria-hidden="true">/</span>
            <span>{rankLabel || "Unranked"}</span>
            <span aria-hidden="true">/</span>
            <span>{loadoutName || "Loadout"}</span>
          </div>
        </div>

        <section
          className={`hudTimerAnchor is-${timerState}`}
          style={{ "--hud-timer-progress": `${timerProgress * 360}deg` }}
          aria-label={timerAccessibleLabel}
        >
          <span className="hudEyebrow">Time</span>
          <span key={`timer-${timeLeft}`} className="timerText" aria-hidden="true">{timerDisplay}</span>
          <span className="hudTimerUnit" aria-hidden="true">{isTimedRound ? "sec" : "no limit"}</span>
        </section>
      </div>

      {isGhostDuel || drillGoal || (!isTimedRound && isPlaying) ? (
        <div className="hudContextRail">
          {isGhostDuel ? (
            <div className="hudGhostContext" aria-label={`Ghost duel against ${ghostUsername || "Rival"}`}>
              <span className="hudContextLabel">vs {ghostUsername || "Rival"}</span>
              <span>You {score.toLocaleString()}</span>
              <span>Ghost {Number(ghostScore || 0).toLocaleString()}</span>
              {ghostTargetScore ? <span>Target {Number(ghostTargetScore).toLocaleString()}</span> : null}
              <span className={ghostLead ? "isAhead" : "isBehind"}>
                {ghostLead ? "Ahead" : "Behind"} {formatSignedDelta(ghostDelta)}
              </span>
            </div>
          ) : null}

          {drillGoal ? (
            <div className={`hudDrillContext${drillGoal.isComplete ? " isComplete" : ""}`}>
              <span className="hudContextLabel">{drillGoal.label}</span>
              <span>{drillGoal.progressLabel}</span>
              {drillGoal.isComplete ? <span className="hudGoalComplete">Goal complete</span> : null}
            </div>
          ) : null}

          {!isTimedRound && isPlaying ? (
            <button className="secondaryButton hudActionButton" type="button" onClick={onEndRound}>
              End Practice
            </button>
          ) : null}
        </div>
      ) : null}
    </header>
  )
}
