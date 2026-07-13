import { Link } from "react-router-dom"

import { getProfileAvatarStyle, getProfileInitials } from "../utils/profileAvatarStyling.js"
import { formatPercent } from "../utils/gameMath.js"
import { PLACEMENT_MATCH_COUNT, getRankImageSrc } from "../utils/rankUtils.js"

function QuickStat({ label, value, tone = "default" }) {
  return (
    <div className={`profileHoverStat tone-${tone}`}>
      <dt className="profileHoverStatLabel">{label}</dt>
      <dd className="profileHoverStatValue">{value}</dd>
    </div>
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
    return `${Math.max(0, Number(rankProgress.mmr) || 0).toLocaleString()} RR`
  }

  if (rankProgress && Number.isFinite(rankProgress.rr) && Number.isFinite(rankProgress.rrMax)) {
    return `${rankProgress.rr.toLocaleString()} / ${rankProgress.rrMax.toLocaleString()} RR`
  }

  const displayLabel = String(rankLabel || "Unranked").trim().toLowerCase()
  const displayMmr = Number.isFinite(rankMmr) ? Math.max(0, rankMmr) : 0
  return displayLabel === "unranked"
    ? `Complete ${PLACEMENT_MATCH_COUNT} placement matches to reveal your rank`
    : `${displayMmr.toLocaleString()} RR`
}

function PlayerAvatar({ username, profileImage }) {
  const hasImage = Boolean(profileImage?.imageSrc)
  const className = [
    "profileHoverAvatar",
    profileImage?.effectClass,
    hasImage ? "hasImage" : "",
  ].filter(Boolean).join(" ")

  return (
    <span
      className={className}
      style={hasImage ? undefined : getProfileAvatarStyle(username)}
      aria-hidden="true"
    >
      {hasImage ? (
        <img className="profileHoverAvatarImage" src={profileImage.imageSrc} alt="" width="512" height="512" decoding="async" />
      ) : (
        getProfileInitials(username)
      )}
    </span>
  )
}

function RankedIdentity({ rankProgress = null, rankLabel, rankMmr }) {
  const displayLabel = rankProgress?.tierLabel || rankLabel || "Unranked"
  const displayMmr = Number.isFinite(rankMmr) ? Math.max(0, rankMmr) : 0
  const rankImageSrc = getRankImageSrc(rankProgress ?? displayLabel)
  const metaText = getRankMetaText(rankProgress, displayLabel, displayMmr)

  return (
    <section className="profileHoverRankBlock" aria-label={`Ranked rating ${displayLabel}`}>
      {rankImageSrc ? (
        <span className="profileHoverRankIconSlot" aria-hidden="true">
          <img className="profileHoverRankIcon" src={rankImageSrc} alt="" width="128" height="128" decoding="async" />
        </span>
      ) : null}
      <div className="profileHoverRankText">
        <span className="profileHoverRankLabel">Ranked</span>
        <strong className="profileHoverRankValue">{displayLabel}</strong>
        <span className="profileHoverRankMeta">{metaText}</span>
      </div>
    </section>
  )
}

export default function PlayerHoverCard({
  id,
  className = "",
  role,
  username = "Player",
  profileImage = null,
  profileHref,
  onNavigate,
  rankProgress = null,
  rankLabel = "Unranked",
  rankMmr = 0,
  coins = 0,
  level = 1,
  accuracyPercent = 0,
  bestScore = null,
  bestStreak = null,
  rankedRounds = null,
}) {
  const formattedCoins = Number.isFinite(coins) ? coins.toLocaleString() : "0"
  const normalizedLevel = Number.isFinite(level) ? Math.max(1, level) : 1
  const formattedAccuracy = formatPercent(accuracyPercent)

  return (
    <div
      id={id}
      className={`profileHoverCard ${className}`.trim()}
      role={role}
      aria-label={role ? `${username} player details` : undefined}
    >
      <header className="profileHoverIdentity">
        <PlayerAvatar username={username} profileImage={profileImage} />
        <div className="profileHoverIdentityText">
          <span className="profileHoverIdentityLabel">Competitor</span>
          <strong className="profileHoverIdentityName">{username}</strong>
        </div>
      </header>

      <RankedIdentity rankProgress={rankProgress} rankLabel={rankLabel} rankMmr={rankMmr} />

      <dl className="profileHoverStats" aria-label="Player quick stats">
        <QuickStat label="Coins" value={formattedCoins} tone="coins" />
        <QuickStat label="Level" value={normalizedLevel.toLocaleString()} tone="level" />
        <QuickStat label="Accuracy" value={formattedAccuracy} tone="accuracy" />
        {bestScore !== null ? (
          <QuickStat
            label="Best score"
            value={Number.isFinite(bestScore) ? Math.max(0, bestScore).toLocaleString() : "0"}
          />
        ) : null}
        {bestStreak !== null ? (
          <QuickStat
            label="Best streak"
            value={Number.isFinite(bestStreak) ? Math.max(0, bestStreak).toLocaleString() : "0"}
          />
        ) : null}
        {rankedRounds !== null ? (
          <QuickStat
            label="Ranked rounds"
            value={Number.isFinite(rankedRounds) ? Math.max(0, rankedRounds).toLocaleString() : "0"}
          />
        ) : null}
      </dl>

      {profileHref ? (
        <Link className="profileHoverProfileLink" to={profileHref} onClick={onNavigate}>
          Open full profile
        </Link>
      ) : null}
    </div>
  )
}
