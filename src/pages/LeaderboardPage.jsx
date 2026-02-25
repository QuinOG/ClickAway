// Placeholder data until leaderboard API is connected.
const demo = [{ username: "clickadmin", bestScore: 9 }]

export default function LeaderboardPage() {
  return (
    <div className="pageCenter">
      <section className="card">
        <h1 className="cardTitle">Leaderboard</h1>
        <p className="muted">Top 3 best scores.</p>

        <table className="table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Best Score</th>
            </tr>
          </thead>
          <tbody>
            {demo.map((row, idx) => (
              <tr key={row.username}>
                <td>{idx + 1}</td>
                <td>{row.username}</td>
                <td>{row.bestScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
