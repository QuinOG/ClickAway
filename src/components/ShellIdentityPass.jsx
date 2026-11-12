import { Link } from "react-router-dom"
import PlayerPortrait from "./art/PlayerPortrait.jsx"
import { getProfileAvatarStyle } from "../utils/profileAvatarStyling.js"
import { formatPercent } from "../utils/gameMath.js"
import { PLACEMENT_MATCH_COUNT, getRankImageSrc } from "../utils/rankUtils.js"

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

function getPassSerial(username) {
  let hash = 7
  for (const char of String(username || "Player")) hash = (hash * 31 + char.charCodeAt(0)) % 1679616
  return `CA-S1-${hash.toString(36).toUpperCase().padStart(4, "0")}`
}

function ArenaSeal() {
  return <svg className="shellPassSeal" viewBox="0 0 80 80" aria-hidden="true">
    <defs><path id="shellPassSealArc" d="M40 40m-29 0a29 29 0 1 1 58 0a29 29 0 1 1-58 0" /></defs>
    <circle cx="40" cy="40" r="37" />
    <circle cx="40" cy="40" r="21" />
    <text><textPath href="#shellPassSealArc">CLICKAWAY ARENA ★ SEASON 1 ★</textPath></text>
    <path d="M40 27l3.8 8.2 9 .9-6.7 6 1.9 8.8L40 46.4l-8 4.5 1.9-8.8-6.7-6 9-.9z" />
  </svg>
}

export default function ShellIdentityPass({ id, className = "", role, username = "Player", profileImage = null, profileHref, onNavigate, rankProgress = null, rankLabel = "Unranked", rankMmr = 0, coins = 0, level = 1, accuracyPercent = 0 }) {
  const label = rankProgress?.tierLabel || rankLabel || "Unranked"
  const crest = getRankImageSrc(rankProgress ?? label)
  const hasImage = Boolean(profileImage?.imageSrc)
  const showTrack = rankProgress && !rankProgress.isUnranked && !rankProgress.isPlacement && !rankProgress.isTopRank && Number.isFinite(rankProgress.rr) && Number.isFinite(rankProgress.rrMax) && rankProgress.rrMax > 0
  const progress = showTrack ? Math.max(0, Math.min(100, 100 * rankProgress.rr / rankProgress.rrMax)) : 0
  const stats = [["Coins", Number.isFinite(coins) ? coins.toLocaleString() : "0"], ["Level", (Number.isFinite(level) ? Math.max(1, level) : 1).toLocaleString()], ["Accuracy", formatPercent(accuracyPercent)]]
  return <div id={id} className={`${className} shellIdentityPass`.trim()} role={role} aria-label={role ? `${username} player details` : undefined}>
    <header className="shellPassBanner">Competitor Pass</header>
    <div className="shellPassHero">
      <span className="shellPassPortraitMount"><span className={["shellPassPortrait", profileImage?.effectClass, hasImage ? "hasImage" : ""].filter(Boolean).join(" ")} style={hasImage ? undefined : getProfileAvatarStyle(username)} aria-hidden="true">{hasImage ? <img src={profileImage.imageSrc} alt="" width="512" height="512" decoding="async" /> : <PlayerPortrait name={username} size={88} />}</span></span>
      <ArenaSeal /><div className="shellPassIdentity"><strong className="shellPassName">{username}</strong><span>{label}</span></div>
    </div>
    <section className="shellPassRank" aria-label={`Ranked rating ${label}`}>
      {crest && <img className="shellPassCrest" src={crest} alt="" width="128" height="128" decoding="async" />}
      <div className="shellPassRankText"><span>Ranked</span><strong>{label}</strong><span>{getRankMetaText(rankProgress, label, rankMmr)}</span>{showTrack && <div className="shellPassRrTrack" aria-hidden="true"><i style={{ width: `${progress}%` }} /></div>}</div>
    </section>
    <dl className="shellPassStats" aria-label="Player quick stats">{stats.map(([name, value]) => <div className="shellPassStat" key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
    <p className="shellPassSerial" aria-hidden="true"><span>No.</span><b>{getPassSerial(username)}</b><i /></p>
    {profileHref && <Link className="shellPassProfileLink" to={profileHref} onClick={onNavigate}>Open full profile</Link>}
  </div>
}
