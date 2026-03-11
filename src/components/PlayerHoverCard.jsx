import { getRankImageSrc } from "../utils/rankUtils.js"

function formatAccuracyValue(accuracy) {
  if (typeof accuracy === "number" && Number.isFinite(accuracy)) {
    const normalized = Math.max(0, Math.min(100, Math.round(accuracy)))
    return `${normalized}%`
  }

  const parsedValue = Number.parseInt(String(accuracy ?? "").replace("%", ""), 10)
  return Number.isFinite(parsedValue) ? `${Math.max(0, Math.min(100, parsedValue))}%` : "0%"
}

function HoverStatRow({ label, value, tone = "default" }) {
  return (
    <tr className={`profileHoverStatRow tone-${tone}`}>
      <th scope="row" className="profileHoverStatLabel">{label}</th>
      <td className="profileHoverStatValue">{value}</td>
    </tr>
  )
}

function RankedHoverRank({ rankLabel, rankMmr }) {
  const displayLabel = rankLabel || "Unranked"
  const displayMmr = Number.isFinite(rankMmr) ? Math.max(0, rankMmr) : 0
  const isUnranked = displayLabel.toLowerCase() === "unranked"
  const rankImageSrc = getRankImageSrc(displayLabel)
  const mmrText = isUnranked ? "Play 1 round of ranked to get placed" : `${displayMmr.toLocaleString()} MMR`

  return (
    <section className="profileHoverRankBlock" aria-label={`Ranked rating ${displayLabel} ${displayMmr} MMR`}>
      {rankImageSrc ? (
        <span className="profileHoverRankIconSlot" aria-hidden="true">
          <img className="profileHoverRankIcon" src={rankImageSrc} alt="" />
        </span>
      ) : null}
      <div className="profileHoverRankText">
        <span className="profileHoverRankLabel">Ranked Rating</span>
        <strong className="profileHoverRankValue">{displayLabel}</strong>
        <span className="profileHoverRankMeta">{mmrText}</span>
      </div>
    </section>
  )
}

export default function PlayerHoverCard({ rankLabel = "Unranked", rankMmr = 0, coins = 0, level = 1, accuracy = "0%" }) {
  const formattedCoins = Number.isFinite(coins) ? coins.toLocaleString() : "0"
  const normalizedLevel = Number.isFinite(level) ? Math.max(1, level) : 1
  const formattedAccuracy = formatAccuracyValue(accuracy)

  return (
    <div className="profileHoverCard">
      <RankedHoverRank rankLabel={rankLabel} rankMmr={rankMmr} />
      <section className="profileHoverStats" aria-label="Player quick stats">
        <table className="profileHoverStatsTable">
          <tbody>
            <HoverStatRow label="Coin Vault" value={formattedCoins} tone="coins" />
            <HoverStatRow label="XP Level" value={`Lv ${normalizedLevel}`} tone="level" />
            <HoverStatRow label="Accuracy" value={formattedAccuracy} tone="accuracy" />
          </tbody>
        </table>
      </section>
    </div>
  )
}
