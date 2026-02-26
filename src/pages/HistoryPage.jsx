import InfoStrip from "../components/InfoStrip.jsx"

const MOCK_HISTORY = [
  {
    id: "r-001",
    playedAt: "Today, 4:12 PM",
    score: 84,
    hits: 67,
    misses: 15,
    accuracy: "82%",
    coinsEarned: 67,
  },
  {
    id: "r-002",
    playedAt: "Today, 3:48 PM",
    score: 73,
    hits: 59,
    misses: 17,
    accuracy: "78%",
    coinsEarned: 59,
  },
  {
    id: "r-003",
    playedAt: "Yesterday, 8:05 PM",
    score: 91,
    hits: 72,
    misses: 14,
    accuracy: "84%",
    coinsEarned: 72,
  },
]

const HISTORY_INSIGHTS = [
  "Low misses usually predict higher score growth.",
  "Accuracy trends reveal consistency over time.",
  "Coins earned mirrors successful hits each round.",
]

export default function HistoryPage() {
  return (
    <div className="pageCenter">
      <section className="card">
        <h1 className="cardTitle">Match History</h1>
        <p className="muted">
          Review your recent rounds to spot patterns, improve your consistency, and track coin growth.
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
            {MOCK_HISTORY.map((round) => (
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
