export default function GameStatusRow({ streak, comboMultiplier, comboStep = 5, bestStreak }) {
  const step = Math.max(1, Number(comboStep) || 5)
  const intoStep = streak % step
  const hitsToNext = step - intoStep
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
        <span key={`combo-${comboMultiplier}`} className="hudComboValue">{"\u00d7"}{comboMultiplier}</span>
        <span className="hudComboLabel">Combo</span>
      </div>
      <div className="hudComboNext" aria-label={`${hitsToNext} hits to combo times ${comboMultiplier + 1}`}>
        <span className="hudComboNextPips" aria-hidden="true">
          {Array.from({ length: step }, (_, index) => (
            <span key={index} className={index < intoStep ? "isLit" : ""} />
          ))}
        </span>
        <span className="hudComboNextLabel">{"×"}{comboMultiplier + 1} in {hitsToNext}</span>
      </div>
      <span className="hudBestReadout">Best {bestStreak}</span>
      <span className="uiVisuallyHidden" role="status" aria-live="polite" aria-atomic="true">
        {milestoneAnnouncement}
      </span>
    </div>
  )
}
