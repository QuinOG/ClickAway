import InfoStrip from "../components/InfoStrip.jsx"
import {
  LEADERBOARD_INSIGHTS,
  MOCK_LEADERBOARD,
} from "../features/leaderboard/leaderboardData.js"
import { buildPlayerLeaderboardStats } from "../utils/historyUtils.js"

function getLeaderboardRows(roundHistory) {
  if (!Array.isArray(roundHistory) || roundHistory.length === 0) {
    return MOCK_LEADERBOARD
  }

  const playerStats = buildPlayerLeaderboardStats(roundHistory)
  const mergedRows = [
    {
      username: "You",
      bestScore: playerStats.bestScore,
      bestStreak: playerStats.bestStreak,
      accuracy: playerStats.accuracy,
    },
    ...MOCK_LEADERBOARD,
  ]

  return mergedRows
    .sort((firstRow, secondRow) => secondRow.bestScore - firstRow.bestScore)
    .slice(0, 5)
}

export default function LeaderboardPage({ roundHistory = [] }) {
  const leaderboardRows = getLeaderboardRows(roundHistory)

  return (
    <div className="pageCenter">
      <section className="card">
        <h1 className="cardTitle">Leaderboard</h1>
        <p className="muted">
          See how top players are performing this season. Climb by improving your score,
          streak consistency, and accuracy.
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
            {leaderboardRows.map((player, index) => (
              <tr key={player.username}>
                <td>{index + 1}</td>
                <td>{player.username}</td>
                <td>{player.bestScore}</td>
                <td>{player.bestStreak}</td>
                <td>{player.accuracy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
