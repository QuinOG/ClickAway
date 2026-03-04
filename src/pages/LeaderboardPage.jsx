import InfoStrip from "../components/InfoStrip.jsx"
import {
  LEADERBOARD_INSIGHTS,
  MOCK_LEADERBOARD,
} from "../features/leaderboard/leaderboardData.js"
import { buildPlayerLeaderboardStats } from "../utils/historyUtils.js"

function isCompetitiveHistoryEntry(entry = {}) {
  if (!entry || typeof entry !== "object") return false
  if (entry.progressionMode === "competitive") return true
  return entry.difficultyId === "hard"
}

function getCompetitiveHistory(roundHistory) {
  if (!Array.isArray(roundHistory)) return []
  return roundHistory.filter(isCompetitiveHistoryEntry)
}

function getLeaderboardRows(roundHistory, playerRankLabel, playerRankMmr) {
  const competitiveHistory = getCompetitiveHistory(roundHistory)
  const playerStats = buildPlayerLeaderboardStats(competitiveHistory)
  const mergedRows = [
    {
      username: "You",
      bestScore: playerStats.bestScore,
      bestStreak: playerStats.bestStreak,
      accuracy: playerStats.accuracy,
      rankLabel: playerRankLabel,
      mmr: playerRankMmr,
    },
    ...MOCK_LEADERBOARD,
  ]

  return mergedRows
    .sort((firstRow, secondRow) => secondRow.bestScore - firstRow.bestScore)
    .slice(0, 5)
}

export default function LeaderboardPage({
  roundHistory = [],
  playerRankLabel = "Bronze",
  playerRankMmr = 1000,
}) {
  const leaderboardRows = getLeaderboardRows(roundHistory, playerRankLabel, playerRankMmr)

  return (
    <div className="pageCenter">
      <section className="card">
        <h1 className="cardTitle">Leaderboard</h1>
        <p className="muted">
          Competitive leaderboard. Only Hard mode rounds affect rank/MMR placement.
        </p>

        <InfoStrip points={LEADERBOARD_INSIGHTS} />

        <table className="table helpTable">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Tier</th>
              <th>MMR</th>
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
                <td>{player.rankLabel}</td>
                <td>{player.mmr}</td>
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
