import InfoStrip from "../components/InfoStrip.jsx"
import { HISTORY_INSIGHTS, MOCK_HISTORY } from "../features/history/historyData.js"
import { getModeLabelFromHistoryEntry } from "../utils/modeUtils.js"

function formatRankDelta(rankDelta = 0) {
  const normalizedDelta = Number.isFinite(rankDelta) ? rankDelta : 0
  return `${normalizedDelta > 0 ? "+" : ""}${normalizedDelta}`
}

function getHistoryRows(roundHistory) {
  if (Array.isArray(roundHistory) && roundHistory.length > 0) {
    return roundHistory
  }

  // Keep the page useful for first-time users before they have real matches logged.
  return MOCK_HISTORY
}

export default function HistoryPage({ roundHistory = [] }) {
  const historyRows = getHistoryRows(roundHistory)

  return (
    <div className="pageCenter">
      <section className="card">
        <h1 className="cardTitle">Match History</h1>
        <p className="muted">
          Review rounds by mode and track coins, XP gain, and ranked rank changes.
        </p>

        <InfoStrip
          points={HISTORY_INSIGHTS}
          collapsible
          defaultCollapsed
        />

        <table className="table helpTable">
          <thead>
            <tr>
              <th>Played</th>
              <th>Mode</th>
              <th>Score</th>
              <th>Hits</th>
              <th>Misses</th>
              <th>Accuracy</th>
              <th>Coins Earned</th>
              <th>XP</th>
              <th>Rank +/-</th>
            </tr>
          </thead>
          <tbody>
            {historyRows.map((round) => (
              <tr key={round.id}>
                <td>{round.playedAt}</td>
                <td>{getModeLabelFromHistoryEntry(round)}</td>
                <td>{round.score}</td>
                <td>{round.hits}</td>
                <td>{round.misses}</td>
                <td>{round.accuracy}</td>
                <td>{round.coinsEarned}</td>
                <td>{round.xpEarned ?? 0}</td>
                <td>{formatRankDelta(round.rankDelta)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
