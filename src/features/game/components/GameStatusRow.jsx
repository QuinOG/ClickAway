export default function GameStatusRow({ streak, comboMultiplier, bestStreak }) {
  return (
    <div className="gameStatusRow">
      <span className="statusChip">Streak: {streak}</span>
      <span className="statusChip">Combo: x{comboMultiplier}</span>
      <span className="statusChip">Best: {bestStreak}</span>
    </div>
  )
}
