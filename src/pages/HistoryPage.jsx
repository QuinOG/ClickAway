import InfoStrip from "../components/InfoStrip.jsx"
import { HISTORY_INSIGHTS, MOCK_HISTORY } from "../features/history/historyData.js"

function getHistoryRows(roundHistory) {
  if (Array.isArray(roundHistory) && roundHistory.length > 0) {
    return roundHistory
  }

  return MOCK_HISTORY
}

export default function HistoryPage({ roundHistory = [] }) {
  const historyRows = getHistoryRows(roundHistory)

  return (
    <div className="pageCenter">
      <section className="card">
        <h1 className="cardTitle">Match History</h1>
        <p className="muted">
          Review your recent rounds to spot patterns, improve your consistency, and track
          coin growth.
        </p>

        <InfoStrip points={HISTORY_INSIGHTS} />

        <table className="table helpTable">
          <thead>
            <tr>
              <th>Played</th>
              <th>Score</th>
              <th>Hits</th>
              <th>Misses</th>
              <th>Accuracy</th>
              <th>Coins Earned</th>
            </tr>
          </thead>
          <tbody>
            {historyRows.map((round) => (
              <tr key={round.id}>
                <td>{round.playedAt}</td>
                <td>{round.score}</td>
                <td>{round.hits}</td>
                <td>{round.misses}</td>
                <td>{round.accuracy}</td>
                <td>{round.coinsEarned}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
