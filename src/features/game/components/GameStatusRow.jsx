export default function GameStatusRow({ streak, comboMultiplier, bestStreak }) {
  return (
    <div className="gameStatusRow" aria-label="Live round stats">
      <div className="statusBar" aria-live="polite">
        <div className="statusBarItem">
          <span className="statusBarLabel">Streak</span>
          <span key={`streak-${streak}`} className="statusBarValue">{streak}</span>
        </div>
        <div className="statusBarItem">
          <span className="statusBarLabel">Combo</span>
          <span key={`combo-${comboMultiplier}`} className="statusBarValue">x{comboMultiplier}</span>
        </div>
        <div className="statusBarItem">
          <span className="statusBarLabel">Best</span>
          <span key={`best-${bestStreak}`} className="statusBarValue">{bestStreak}</span>
        </div>
      </div>
    </div>
  )
}
