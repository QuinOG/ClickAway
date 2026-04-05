import { getRankAppearanceId, getRankImageSrc } from "../utils/rankUtils.js"

export default function TierBadge({
  tierLabel = "Unranked",
  className = "",
}) {
  const normalizedLabel = String(tierLabel || "Unranked").trim()
  const tierVariant = getRankAppearanceId(normalizedLabel) || "unranked"
  const rankImageSrc = getRankImageSrc(normalizedLabel)
  const resolvedClassName = `tierBadge is-${tierVariant} ${className}`.trim()

  return (
    <span className={resolvedClassName}>
      {rankImageSrc ? <img src={rankImageSrc} alt="" className="tierBadgeIcon" /> : null}
      <span>{normalizedLabel}</span>
    </span>
  )
}
