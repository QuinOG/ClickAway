import InfoStrip from "../components/InfoStrip.jsx"

const MOCK_LEADERBOARD = [
  { username: "ClickMaster", bestScore: 128, bestStreak: 19, accuracy: "86%" },
  { username: "NeonNinja", bestScore: 117, bestStreak: 16, accuracy: "82%" },
  { username: "SwiftTap", bestScore: 103, bestStreak: 14, accuracy: "79%" },
  { username: "ArcadeAce", bestScore: 94, bestStreak: 12, accuracy: "75%" },
  { username: "FocusFox", bestScore: 88, bestStreak: 11, accuracy: "73%" },
]

const LEADERBOARD_INSIGHTS = [
  "Highest score is the primary ranking driver.",
  "Best streak separates players with similar scores.",
  "Accuracy shows how repeatable your performance is.",
]

export default function LeaderboardPage() {
  return (
    <div className="pageCenter">
      <section className="card">
        <h1 className="cardTitle">Leaderboard</h1>
        <p className="muted">
          See how top players are performing this season. Climb by improving your score, streak consistency, and accuracy.
        </p>

        <InfoStrip points={LEADERBOARD_INSIGHTS} />

        <table className="table helpTable">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Best Score</th>
              <th>Best Streak</th>
              <th>Accuracy</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_LEADERBOARD.map((row, idx) => (
              <tr key={row.username}>
                <td>{idx + 1}</td>
                <td>{row.username}</td>
                <td>{row.bestScore}</td>
                <td>{row.bestStreak}</td>
                <td>{row.accuracy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
