export default function GameStatusRow({ streak, comboMultiplier, bestStreak }) {
  const milestoneAnnouncement = streak > 0 && streak % 5 === 0
    ? `${streak} hit streak, combo times ${comboMultiplier}`
    : ""

  return (
    <div className="gameStatusRow" aria-label={`Streak ${streak}, combo times ${comboMultiplier}, best streak ${bestStreak}`}>
      <div className="hudStreakReadout">
        <span className="hudStreakLabel">Streak</span>
        <span key={`streak-${streak}`} className="hudStreakValue">{streak}</span>
      </div>
      <div className="hudComboReadout">
        <span key={`combo-${comboMultiplier}`} className="hudComboValue">\u00d7{comboMultiplier}</span>
        <span className="hudComboLabel">Combo</span>
      </div>
      <span className="hudBestReadout">Best {bestStreak}</span>
      <span className="uiVisuallyHidden" role="status" aria-live="polite" aria-atomic="true">
        {milestoneAnnouncement}
      </span>
    </div>
  )
}
