import { formatPercent } from "../utils/gameMath.js"
import { PLACEMENT_MATCH_COUNT, getRankImageSrc } from "../utils/rankUtils.js"

function HoverStatRow({ label, value, tone = "default" }) {
  return (
    <tr className={`profileHoverStatRow tone-${tone}`}>
      <th scope="row" className="profileHoverStatLabel">{label}</th>
      <td className="profileHoverStatValue">{value}</td>
    </tr>
  )
}

function getRankMetaText(rankProgress, rankLabel, rankMmr) {
  if (rankProgress?.isUnranked) {
    return `Complete ${PLACEMENT_MATCH_COUNT} placement matches to reveal your rank`
  }

  if (rankProgress?.isPlacement) {
    return `${rankProgress.placementMatchesRemaining} placement matches remaining`
  }

  if (rankProgress?.isTopRank) {
    return `${Math.max(0, Number(rankProgress.mmr) || 0).toLocaleString()} rating`
  }

  if (rankProgress && Number.isFinite(rankProgress.rr) && Number.isFinite(rankProgress.rrMax)) {
    return `${rankProgress.rr.toLocaleString()} / ${rankProgress.rrMax.toLocaleString()} RR`
  }

  const displayLabel = String(rankLabel || "Unranked").trim().toLowerCase()
  const displayMmr = Number.isFinite(rankMmr) ? Math.max(0, rankMmr) : 0
  return displayLabel === "unranked"
    ? `Complete ${PLACEMENT_MATCH_COUNT} placement matches to reveal your rank`
    : `${displayMmr.toLocaleString()} MMR`
}

function RankedHoverRank({ rankProgress = null, rankLabel, rankMmr }) {
  const displayLabel = rankProgress?.tierLabel || rankLabel || "Unranked"
  const displayMmr = Number.isFinite(rankMmr) ? Math.max(0, rankMmr) : 0
  const rankImageSrc = getRankImageSrc(rankProgress ?? displayLabel)
  const metaText = getRankMetaText(rankProgress, displayLabel, displayMmr)

  return (
    <section className="profileHoverRankBlock" aria-label={`Ranked rating ${displayLabel}`}>
      {rankImageSrc ? (
        <span className="profileHoverRankIconSlot" aria-hidden="true">
          <img className="profileHoverRankIcon" src={rankImageSrc} alt="" />
        </span>
      ) : null}
      <div className="profileHoverRankText">
        <span className="profileHoverRankLabel">Ranked Rating</span>
        <strong className="profileHoverRankValue">{displayLabel}</strong>
        <span className="profileHoverRankMeta">{metaText}</span>
      </div>
    </section>
  )
}

export default function PlayerHoverCard({
  rankProgress = null,
  rankLabel = "Unranked",
  rankMmr = 0,
  coins = 0,
  level = 1,
  accuracyPercent = 0,
}) {
  const formattedCoins = Number.isFinite(coins) ? coins.toLocaleString() : "0"
  const normalizedLevel = Number.isFinite(level) ? Math.max(1, level) : 1
  const formattedAccuracy = formatPercent(accuracyPercent)

  return (
    <div className="profileHoverCard">
      <RankedHoverRank rankProgress={rankProgress} rankLabel={rankLabel} rankMmr={rankMmr} />
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
