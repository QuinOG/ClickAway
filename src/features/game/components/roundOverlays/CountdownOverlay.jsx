export function CountdownOverlay({ countdownValue }) {
  return (
    <div className="gameOverlay" role="status" aria-live="polite">
      <section className="countdownCard">
        <p>Starting In</p>
        <div className="countdownNumber">{countdownValue}</div>
      </section>
    </div>
  )
}
