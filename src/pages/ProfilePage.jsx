import { useMemo, useState } from "react"
import { FEEDBACK_EVENTS } from "../constants/feedbackEvents.js"
import { useActionFeedback } from "../hooks/useActionFeedback.js"

import AchievementTile from "../components/achievements/AchievementTile.jsx"
import AchievementsCarousel from "../components/achievements/AchievementsCarousel.jsx"
import {
  ACHIEVEMENT_CATEGORIES,
  DEFAULT_ACHIEVEMENT_CATEGORY_KEY,
} from "../game/achievements/achievementsList.js"
import { evaluateAchievements } from "../game/achievements/evaluateAchievements.js"
import {
  buildCareerReactionStatsFromLifetime,
  buildProfileStatsFromLifetime,
} from "../utils/lifetimeStatsUtils.js"
import { isRankedModeEntry } from "../utils/gameModeLabelsAndRankedFilters.js"
import { getProfileAvatarStyle } from "../utils/profileAvatarStyling.js"
import PlayerPortrait from "../components/art/PlayerPortrait.jsx"
import { ArmoryIcon, BoltIcon, FlameIcon, StopwatchIcon, TargetIcon, TrophyIcon } from "../components/art/GameIcons.jsx"
import {
  PLACEMENT_MATCH_COUNT,
  getRankImageSrc,
  getRankToneClassName,
} from "../utils/rankUtils.js"

function toNumber(value) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : 0
}

function formatNumber(value = 0) {
  return toNumber(value).toLocaleString()
}

function formatReactionTime(value) {
  const normalizedValue = Number(value)
  if (!Number.isFinite(normalizedValue) || normalizedValue <= 0) return "\u2014"
  return `${Math.round(normalizedValue)} ms`
}

function formatSignedValue(value = 0) {
  const normalized = toNumber(value)
  return `${normalized > 0 ? "+" : ""}${normalized}`
}

function getProfileTagline({ totalRounds, accuracyPercent, bestStreak }) {
  if (totalRounds === 0) return "No rounds logged yet. Your first signal starts in the arena."
  if (accuracyPercent >= 85 && bestStreak >= 10) return "Precision specialist. Your tempo is locked in."
  if (accuracyPercent >= 70) return "Strong fundamentals. Keep building consistency."
  return "Momentum is building. Focus accuracy and chain longer streaks."
}

function getPlayerTitle({ totalRounds, rankedRounds, bestStreak, rankLabel = "" }) {
  const normalizedRankLabel = rankLabel.toLowerCase()
  if (totalRounds === 0) return "Arena Rookie"
  if (normalizedRankLabel.includes("deadeye")) return "Deadeye Contender"
  if (normalizedRankLabel.includes("diamond")) return "Diamond Operator"
  if (normalizedRankLabel.includes("platinum")) return "Platinum Climber"
  if (normalizedRankLabel.includes("gold")) return "Gold Contender"
  if (rankedRounds >= 25) return "Ranked Specialist"
  if (bestStreak >= 15) return "Combo Architect"
  if (totalRounds >= 60) return "Arena Veteran"
  return "Rising Contender"
}

function getRankMetaText(rankProgress = {}) {
  if (rankProgress.isUnranked) {
    return `Complete ${PLACEMENT_MATCH_COUNT} placement matches to reveal your rank`
  }
  if (rankProgress.isPlacement) {
    return `${rankProgress.placementMatchesRemaining} placement matches remaining`
  }
  if (rankProgress.isTopRank) return `${formatNumber(rankProgress.mmr)} rating`
  return `${formatNumber(rankProgress.rr)} / ${formatNumber(rankProgress.rrMax)} RR`
}

function buildRecentForm(roundHistory = []) {
  const recentRounds = (Array.isArray(roundHistory) ? roundHistory : []).slice(0, 7).reverse()
  const scores = recentRounds.map((round) => toNumber(round.score))
  const maxScore = Math.max(...scores, 1)
  const minScore = scores.length > 0 ? Math.min(...scores) : 0
  const bars = recentRounds.map((round, index) => ({
    id: `${round?.playedAtIso ?? "round"}-${index}`,
    score: scores[index],
    height: Math.max(12, Math.round((scores[index] / maxScore) * 100)),
    // 0.2–1: where this run sits between the worst and best of the window.
    rise: 0.2 + (maxScore > minScore ? ((scores[index] - minScore) / (maxScore - minScore)) * 0.8 : 0.8),
    rankDelta: toNumber(round.rankDelta),
    isRanked: isRankedModeEntry(round),
  }))
  const midpoint = Math.max(1, Math.floor(scores.length / 2))
  const olderAverage = scores.slice(0, midpoint).reduce((sum, score) => sum + score, 0) / midpoint
  const newerScores = scores.slice(midpoint)
  const newerAverage = newerScores.length > 0
    ? newerScores.reduce((sum, score) => sum + score, 0) / newerScores.length
    : olderAverage

  return {
    bars,
    averageScore: scores.length > 0
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : 0,
    trendPercent: olderAverage > 0
      ? Math.round(((newerAverage - olderAverage) / olderAverage) * 100)
      : 0,
  }
}

function getStrongestTrait(profileStats, reactionStats) {
  const traits = [
    { key: "precision", label: "Precision", score: profileStats.accuracyPercent / 85 },
    { key: "tempo", label: "Tempo", score: reactionStats.avgReactionMs ? 430 / reactionStats.avgReactionMs : 0 },
    { key: "chain", label: "Combo chain", score: profileStats.bestStreak / 15 },
  ]
  return traits.sort((firstTrait, secondTrait) => secondTrait.score - firstTrait.score)[0]
}

const GAUGE_PIPS = 12

function AttributeRow({ icon, label, detail, value, fill, isStrongest = false }) {
  const lit = Math.round(Math.max(0, Math.min(1, Number(fill) || 0)) * GAUGE_PIPS)
  return (
    <li className={`profileAttribute ${isStrongest ? "isStrongest" : ""}`}>
      <span className="profileAttributeEmblem" aria-hidden="true">{icon}</span>
      <span className="profileAttributeLabel">
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
      <svg className="profileAttributeDial" viewBox="0 0 100 58" aria-hidden="true">
        <path className="profileDialTrack" d="M10 52 A40 40 0 0 1 90 52" pathLength="100" />
        <path className="profileDialFill" d="M10 52 A40 40 0 0 1 90 52" pathLength="100" strokeDasharray={`${(lit / GAUGE_PIPS) * 100} 100`} />
        {Array.from({ length: 11 }, (_, index) => (
          <line key={index} className="profileDialTick" x1="50" y1="5" x2="50" y2={index % 5 === 0 ? 13 : 10} transform={`rotate(${-90 + index * 18} 50 52)`} />
        ))}
        <line className="profileDialNeedle" x1="50" y1="52" x2="50" y2="18" transform={`rotate(${-90 + (lit / GAUGE_PIPS) * 180} 50 52)`} />
        <circle className="profileDialHub" cx="50" cy="52" r="5" />
      </svg>
      <strong className="profileAttributeValue">{value}</strong>
      {isStrongest ? <span className="profileInstrumentTag">Signature</span> : null}
    </li>
  )
}

export default function ProfilePage({
  onLogout,
  playerName = "Player",
  coins = 0,
  levelProgress = {},
  rankProgress = {},
  roundHistory = [],
  lifetimeStats = null,
  loadoutStats = [],
  equippedProfileImage = null,
  achievementStats = {},
  persistedAchievementIds = [],
}) {
  const { signalAction } = useActionFeedback()
  const [requestedCategoryKey, setRequestedCategoryKey] = useState(
    DEFAULT_ACHIEVEMENT_CATEGORY_KEY
  )
  const evaluatedAchievements = useMemo(
    () => evaluateAchievements(achievementStats, {
      persistedUnlockedIds: persistedAchievementIds,
    }),
    [achievementStats, persistedAchievementIds]
  )
  const categorySortIndexByKey = useMemo(
    () => new Map(ACHIEVEMENT_CATEGORIES.map((category, index) => [category.key, index])),
    []
  )
  const availableAchievementCategories = useMemo(
    () => ACHIEVEMENT_CATEGORIES.filter((category) => {
      if (category.key === "master") {
        return evaluatedAchievements.some(
          (achievement) => achievement.type === "categoryMaster" || achievement.type === "masterOfMasters"
        )
      }
      return evaluatedAchievements.some(
        (achievement) => achievement.categoryKey === category.key && achievement.type === "metric"
      )
    }),
    [evaluatedAchievements]
  )
  const selectedCategoryKey = useMemo(() => {
    const hasRequestedCategory = availableAchievementCategories.some(
      (category) => category.key === requestedCategoryKey
    )
    return hasRequestedCategory
      ? requestedCategoryKey
      : availableAchievementCategories[0]?.key ?? DEFAULT_ACHIEVEMENT_CATEGORY_KEY
  }, [availableAchievementCategories, requestedCategoryKey])
  const categoryMasterAchievements = useMemo(
    () => evaluatedAchievements
      .filter((achievement) => achievement.type === "categoryMaster")
      .sort((firstAchievement, secondAchievement) => {
        const firstIndex = categorySortIndexByKey.get(firstAchievement.masterCategoryKey) ?? 0
        const secondIndex = categorySortIndexByKey.get(secondAchievement.masterCategoryKey) ?? 0
        return firstIndex - secondIndex
      }),
    [categorySortIndexByKey, evaluatedAchievements]
  )
  const masterOfMastersAchievement = useMemo(
    () => evaluatedAchievements.find((achievement) => achievement.type === "masterOfMasters") ?? null,
    [evaluatedAchievements]
  )
  const featuredMasterAchievement = selectedCategoryKey === "master"
    ? masterOfMastersAchievement
    : categoryMasterAchievements.find(
      (achievement) => achievement.masterCategoryKey === selectedCategoryKey
    ) ?? null
  const carouselAchievements = selectedCategoryKey === "master"
    ? categoryMasterAchievements
    : evaluatedAchievements.filter(
      (achievement) => achievement.categoryKey === selectedCategoryKey && achievement.type === "metric"
    )

  const profileStats = buildProfileStatsFromLifetime(lifetimeStats, roundHistory)
  const reactionStats = buildCareerReactionStatsFromLifetime(lifetimeStats)
  const recentForm = buildRecentForm(roundHistory)
  const strongestTrait = getStrongestTrait(profileStats, reactionStats)
  const signatureBuild = (Array.isArray(loadoutStats) ? loadoutStats : [])
    .filter((entry) => toNumber(entry.totalRounds) > 0)
    .sort((firstBuild, secondBuild) => (
      toNumber(secondBuild.totalRounds) - toNumber(firstBuild.totalRounds)
      || toNumber(secondBuild.bestScore) - toNumber(firstBuild.bestScore)
    ))[0] ?? null
  const buildAttempts = signatureBuild
    ? toNumber(signatureBuild.totalHits) + toNumber(signatureBuild.totalMisses)
    : 0
  const buildAccuracy = buildAttempts > 0
    ? Math.round((toNumber(signatureBuild.totalHits) / buildAttempts) * 100)
    : 0
  const nearestAchievement = [...evaluatedAchievements]
    .filter((achievement) => !achievement.isUnlocked && achievement.isProgressAvailable !== false)
    .sort((firstAchievement, secondAchievement) => (
      toNumber(secondAchievement.percent) - toNumber(firstAchievement.percent)
    ))[0] ?? evaluatedAchievements.find((achievement) => achievement.isUnlocked) ?? null

  const rankLabel = rankProgress.tierLabel ?? "Unranked"
  const rankIconSrc = getRankImageSrc(rankLabel)
  const rankToneClass = getRankToneClassName(rankProgress)
  const levelValue = levelProgress.level ?? 1
  const xpToNextLevel = levelProgress.xpToNextLevel ?? 0
  const levelProgressPercent = Math.max(0, Math.min(100, levelProgress.progressPercent ?? 0))
  const nextLevelValue = levelValue + 1
  const playerTitle = getPlayerTitle({
    totalRounds: profileStats.totalRounds,
    rankedRounds: profileStats.rankedRounds,
    bestStreak: profileStats.bestStreak,
    rankLabel,
  })
  const hasProfileImage = Boolean(equippedProfileImage?.imageSrc)
  const avatarStyle = hasProfileImage ? undefined : getProfileAvatarStyle(playerName)
  const avatarClassName = `profileAvatar ${equippedProfileImage?.effectClass ?? ""} ${hasProfileImage ? "hasImage" : ""}`
  const rankGoal = rankProgress.isUnranked
    ? `${PLACEMENT_MATCH_COUNT} placements to calibrate`
    : rankProgress.isPlacement
      ? `${rankProgress.placementMatchesRemaining} matches to reveal rank`
      : rankProgress.isTopRank
        ? "Hold the summit"
        : `${formatNumber(rankProgress.mmrToNextTier ?? 0)} RR to ${rankProgress.nextTierLabel ?? "next rank"}`

  return (
    <div className="pageCenter profilePageCenter">
      <section className={`profileCockpit ${rankToneClass}`} aria-labelledby="profile-player-name">
        <div className="profileCockpitGrid" aria-hidden="true" />

        <div className="profileSheet">
          <aside className="profileCompetitorCard" aria-label={`${rankLabel} rank, level ${levelValue}`}>
            <div className="profileCardBanner">
              <span>Competitor card</span>
              <span className="profileOrbitLevel">LV {levelValue}</span>
            </div>
            <div className="profilePortraitSlab">
              <div className={avatarClassName} style={avatarStyle} aria-hidden="true">
                {hasProfileImage
                  ? <img className="profileAvatarImage" src={equippedProfileImage.imageSrc} alt="" width="512" height="512" decoding="async" />
                  : <PlayerPortrait name={playerName} size={176} />}
              </div>
              <div className={`profileRankCrest ${rankProgress.isUnranked ? "isUnranked" : ""}`} aria-hidden="true">
                {rankIconSrc
                  ? <img className="profileRankCrestImage" src={rankIconSrc} alt="" width="128" height="128" decoding="async" />
                  : <span className="profileRankCrestFallback">?</span>}
              </div>
            </div>
            <h1 className="profilePlayerName" id="profile-player-name">
              {playerName.charAt(0).toUpperCase() + playerName.slice(1)}
            </h1>
            <p className="profilePlayerTitle">{playerTitle}</p>
            <div className="profileDivisionPlate">
              <small>Division</small>
              <strong className="profileRankTitle">{rankLabel}</strong>
              <span>{getRankMetaText(rankProgress)}</span>
            </div>
            <p className="profileRankGoal"><span>Next rank</span> <strong>{rankGoal}</strong></p>
            <div className="profileXpReadout">
              <span><strong>{levelProgressPercent}%</strong> to LV {nextLevelValue}</span>
              <span>{formatNumber(xpToNextLevel)} XP</span>
              <span className="profileXpTrack" aria-hidden="true">
                <i style={{ width: `${Math.max(0, Math.min(100, levelProgressPercent))}%` }} />
              </span>
            </div>
            <div className="profileHeaderResources" aria-label="Player resources and actions">
              <span className="profileCoinReadout"><i aria-hidden="true" />{formatNumber(coins)} coins</span>
              <a className="profileTextAction" href="#achievement-constellation">View milestones</a>
              <button className="profileTextAction" type="button" onClick={onLogout}>Log out</button>
            </div>
          </aside>

          <div className="profileSheetMain">
            <section className="profileAttributes" aria-labelledby="performance-title">
              <div className="profilePanelHeading">
                <div>
                  <span className="profileSectionKicker">{getProfileTagline(profileStats)}</span>
                  <h2 id="performance-title">Attributes</h2>
                </div>
                <span className="profileStrengthCallout">Signature strength · {strongestTrait.label}</span>
              </div>
              <ul className="profileAttributeList">
                <AttributeRow
                  icon={<TargetIcon size={30} />}
                  label="Accuracy"
                  detail={`${formatNumber(profileStats.totalRounds)} career rounds`}
                  value={`${profileStats.accuracyPercent}%`}
                  fill={profileStats.accuracyPercent / 100}
                  isStrongest={strongestTrait.key === "precision"}
                />
                <AttributeRow
                  icon={<FlameIcon size={30} />}
                  label="Best streak"
                  detail="unbroken targets"
                  value={formatNumber(profileStats.bestStreak)}
                  fill={profileStats.bestStreak / 30}
                  isStrongest={strongestTrait.key === "chain"}
                />
                <AttributeRow
                  icon={<StopwatchIcon size={30} />}
                  label="Reaction"
                  detail={reactionStats.bestReactionMs ? `${formatReactionTime(reactionStats.bestReactionMs)} fastest` : "awaiting timed hits"}
                  value={formatReactionTime(reactionStats.avgReactionMs)}
                  fill={reactionStats.avgReactionMs ? (520 - reactionStats.avgReactionMs) / 360 : 0}
                  isStrongest={strongestTrait.key === "tempo"}
                />
                <AttributeRow
                  icon={<TrophyIcon size={30} />}
                  label="Peak score"
                  detail={`${formatNumber(profileStats.roundsThisWeek)} rounds this week`}
                  value={formatNumber(profileStats.bestScore)}
                  fill={profileStats.bestScore / 1500}
                />
              </ul>
            </section>

            <div className="profileSignalBand">
              <section className="profileFormPanel" aria-labelledby="recent-form-title">
                <div className="profileMiniHeading">
                  <div>
                    <span className="profileSectionKicker">Recent form</span>
                    <h2 id="recent-form-title">Last {recentForm.bars.length || 0} rounds</h2>
                  </div>
                  <strong className={recentForm.trendPercent >= 0 ? "isPositive" : "isNegative"}>
                    {recentForm.bars.length > 1 ? `${formatSignedValue(recentForm.trendPercent)}%` : "Calibrating"}
                  </strong>
                </div>
                <ol className="profileFormTokens" aria-label={`Average recent score ${recentForm.averageScore}`}>
                  {recentForm.bars.length > 0 ? recentForm.bars.map((bar) => (
                    <li
                      key={bar.id}
                      className={`profileFormToken ${bar.isRanked ? "isRanked" : ""} ${bar.rankDelta < 0 ? "isLoss" : ""}`}
                      title={`${formatNumber(bar.score)} score${bar.isRanked ? `, ${formatSignedValue(bar.rankDelta)} RR` : ""}`}
                    >
                      <span className="profileStampScore">{formatNumber(bar.score)}</span>
                      <span className="profileStampOutcome">{bar.isRanked ? `${formatSignedValue(bar.rankDelta)} RR` : "ROUND"}</span>
                    </li>
                  )) : <li className="profileEmptySignal">Play a round to establish form</li>}
                </ol>
              </section>

              <section className="profileBuildSignature" aria-labelledby="build-signature-title">
                <span className="profilePanelEmblem" aria-hidden="true"><ArmoryIcon size={30} /></span>
                <div>
                  <span className="profileSectionKicker">Top build</span>
                  <h2 id="build-signature-title">{signatureBuild?.loadoutName ?? "No field record"}</h2>
                  {signatureBuild ? (
                    <p className="profileBuildMetrics">
                      {formatNumber(signatureBuild.totalRounds)} rounds · {buildAccuracy}% acc · {formatNumber(signatureBuild.bestScore)} peak
                    </p>
                  ) : (
                    <p className="profileEmptySignal">Run a saved loadout to reveal your field signature.</p>
                  )}
                </div>
              </section>

              <section className="profileNearestGoal" aria-labelledby="nearest-goal-title">
                <span className="profilePanelEmblem" aria-hidden="true"><TrophyIcon size={30} /></span>
                <div>
                  <span className="profileSectionKicker">Nearest achievement</span>
                  <h2 id="nearest-goal-title">{nearestAchievement?.title ?? "Signal unavailable"}</h2>
                  <div className="profileGoalTrack" aria-hidden="true">
                    <span style={{ width: `${Math.max(0, Math.min(100, toNumber(nearestAchievement?.percent)))}%` }} />
                  </div>
                  <span className="profileGoalProgress">{nearestAchievement?.progressText ?? "Awaiting progress"}</span>
                </div>
              </section>
            </div>
          </div>
        </div>

        <section
          className="profileStatsSection profileAchievementsSection"
          id="achievement-constellation"
          aria-label="Achievement constellation"
        >
          <div className="achievementHeaderRow">
            <div className="achievementHeaderText">
              <span className="profileSectionKicker">Collection</span>
              <h2 className="profileStatsSectionTitle">Achievement constellation</h2>
            </div>
            <div className="achievementCategoryTabs" role="tablist" aria-label="Achievement categories">
              {availableAchievementCategories.map((category) => {
                const isSelected = category.key === selectedCategoryKey
                return (
                  <button
                    key={category.key}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    className={`achievementCategoryTab ${isSelected ? "isSelected" : ""}`}
                    onClick={(event) => {
                      setRequestedCategoryKey(category.key)
                      signalAction(event.currentTarget, {
                        eventName: FEEDBACK_EVENTS.FILTER,
                        eventId: `achievement-filter-${category.key}`,
                      })
                    }}
                  >
                    {category.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="achievementFeaturedBannerWrap" aria-label="Featured master achievement">
            {featuredMasterAchievement
              ? <AchievementTile achievement={featuredMasterAchievement} variant="featuredBanner" />
              : <p className="achievementsEmptyState">No master achievement found.</p>}
          </div>
          <div className="achievementsMainArea">
            <AchievementsCarousel
              key={`achievements-${selectedCategoryKey}`}
              achievements={carouselAchievements}
            />
          </div>
        </section>
      </section>
    </div>
  )
}
