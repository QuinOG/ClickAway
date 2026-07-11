import { useMemo, useState } from "react"

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
import { getProfileAvatarStyle, getProfileInitials } from "../utils/profileAvatarStyling.js"
import {
  PLACEMENT_MATCH_COUNT,
  getRankImageSrc,
  getRankToneClassName,
} from "../utils/rankUtils.js"

function buildRankedInsights(roundHistory = []) {
  const rankedRounds = (Array.isArray(roundHistory) ? roundHistory : [])
    .filter((round) => isRankedModeEntry(round))
  const recentRankedRounds = rankedRounds.slice(0, 10)
  const recentRankDelta = recentRankedRounds.reduce(
    (sum, round) => sum + (Number(round.rankDelta) || 0),
    0
  )
  const positiveDeltaRounds = recentRankedRounds.filter(
    (round) => (Number(round.rankDelta) || 0) > 0
  ).length
  const recentWinRate = recentRankedRounds.length > 0
    ? Math.round((positiveDeltaRounds / recentRankedRounds.length) * 100)
    : 0

  return {
    recentSampleSize: recentRankedRounds.length,
    recentRankDelta,
    recentWinRate,
  }
}

function formatNumber(value = 0) {
  return Number(value).toLocaleString()
}

function formatReactionTime(value) {
  const normalizedValue = Number(value)
  if (!Number.isFinite(normalizedValue) || normalizedValue <= 0) return "\u2014"
  return `${Math.round(normalizedValue)} ms`
}

function getProfileTagline({ totalRounds, overallAccuracyPercent, bestStreak }) {
  if (totalRounds === 0) return "No rounds logged yet. Queue up and start your run."
  if (overallAccuracyPercent >= 85 && bestStreak >= 10) {
    return "Precision specialist. Your tempo is locked in."
  }
  if (overallAccuracyPercent >= 70) return "Strong fundamentals. Keep building consistency."
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
    return `${rankProgress.tierLabel} • ${rankProgress.placementMatchesRemaining} matches remaining`
  }

  if (rankProgress.isTopRank) {
    return `${formatNumber(rankProgress.mmr)} rating`
  }

  return `${formatNumber(rankProgress.rr)} / ${formatNumber(rankProgress.rrMax)} RR`
}

function StatCard({ label, value, tooltip = "", tone = "neutral", isFeatured = false }) {
  const ariaDescription = tooltip ? `${label}: ${value}. ${tooltip}` : `${label}: ${value}`

  return (
    <article
      className={`profileStatCard tone-${tone} ${isFeatured ? "isFeatured" : ""}`}
      data-tooltip={tooltip || undefined}
      aria-label={ariaDescription}
      tabIndex={0}
    >
      <p className="profileStatLabel">{label}</p>
      <p className="profileStatValue">{value}</p>
    </article>
  )
}

function StatsSection({ title, stats = [], gridClassName = "" }) {
  return (
    <section className="profileStatsSection" aria-label={title}>
      <header className="profileStatsSectionHeader">
        <h2 className="profileStatsSectionTitle">{title}</h2>
      </header>
      <div className={`profileStatsGrid ${gridClassName}`.trim()}>
        {stats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            tooltip={stat.tooltip}
            tone={stat.tone}
            isFeatured={stat.isFeatured}
          />
        ))}
      </div>
    </section>
  )
}

function formatSignedValue(value = 0) {
  const normalized = Number(value) || 0
  return `${normalized > 0 ? "+" : ""}${normalized}`
}

const REACTION_UNAVAILABLE_TOOLTIP =
  "Reaction time appears after at least one recorded hit in a timed round."

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
    () =>
      ACHIEVEMENT_CATEGORIES.filter((category) => {
        if (category.key === "master") {
          return evaluatedAchievements.some(
            (achievement) =>
              achievement.type === "categoryMaster" || achievement.type === "masterOfMasters"
          )
        }

        return evaluatedAchievements.some(
          (achievement) =>
            achievement.categoryKey === category.key && achievement.type === "metric"
        )
      }),
    [evaluatedAchievements]
  )
  const selectedCategoryKey = useMemo(() => {
    const hasRequestedCategory = availableAchievementCategories.some(
      (category) => category.key === requestedCategoryKey
    )
    if (hasRequestedCategory) return requestedCategoryKey

    return availableAchievementCategories[0]?.key ?? DEFAULT_ACHIEVEMENT_CATEGORY_KEY
  }, [availableAchievementCategories, requestedCategoryKey])
  const categoryMasterAchievements = useMemo(
    () =>
      evaluatedAchievements
        .filter((achievement) => achievement.type === "categoryMaster")
        .sort((firstAchievement, secondAchievement) => {
          const firstIndex = categorySortIndexByKey.get(firstAchievement.masterCategoryKey) ?? 0
          const secondIndex = categorySortIndexByKey.get(secondAchievement.masterCategoryKey) ?? 0
          return firstIndex - secondIndex
        }),
    [categorySortIndexByKey, evaluatedAchievements]
  )
  const masterOfMastersAchievement = useMemo(
    () =>
      evaluatedAchievements.find((achievement) => achievement.type === "masterOfMasters") ?? null,
    [evaluatedAchievements]
  )
  const featuredMasterAchievement = useMemo(() => {
    if (selectedCategoryKey === "master") {
      return masterOfMastersAchievement
    }

    return categoryMasterAchievements.find(
      (achievement) => achievement.masterCategoryKey === selectedCategoryKey
    ) ?? null
  }, [categoryMasterAchievements, masterOfMastersAchievement, selectedCategoryKey])
  const carouselAchievements = useMemo(() => {
    if (selectedCategoryKey === "master") {
      return categoryMasterAchievements
    }

    return evaluatedAchievements.filter(
      (achievement) =>
        achievement.categoryKey === selectedCategoryKey && achievement.type === "metric"
    )
  }, [categoryMasterAchievements, evaluatedAchievements, selectedCategoryKey])

  const profileStats = buildProfileStatsFromLifetime(lifetimeStats, roundHistory)
  const reactionStats = buildCareerReactionStatsFromLifetime(lifetimeStats)
  const rankedInsights = buildRankedInsights(roundHistory)
  const buildPerformanceStats = (Array.isArray(loadoutStats) ? loadoutStats : [])
    .filter((entry) => entry.totalRounds > 0)
    .slice(0, 3)
  const rankLabel = rankProgress.tierLabel ?? "Unranked"
  const rankIconSrc = getRankImageSrc(rankLabel)
  const rankToneClass = getRankToneClassName(rankProgress)
  const levelValue = levelProgress.level ?? 1
  const xpIntoLevel = levelProgress.xpIntoLevel ?? 0
  const xpToNextLevel = levelProgress.xpToNextLevel ?? 0
  const xpForNextLevel = xpIntoLevel + xpToNextLevel
  const levelProgressPercent = levelProgress.progressPercent ?? 0
  const nextLevelValue = levelValue + 1
  const profileTagline = getProfileTagline(profileStats)
  const playerTitle = getPlayerTitle({
    totalRounds: profileStats.totalRounds,
    rankedRounds: profileStats.rankedRounds,
    bestStreak: profileStats.bestStreak,
    rankLabel,
  })
  const playerInitials = getProfileInitials(playerName)
  const hasProfileImage = Boolean(equippedProfileImage?.imageSrc)
  const avatarStyle = hasProfileImage ? undefined : getProfileAvatarStyle(playerName)
  const avatarClassName = `profileAvatar ${equippedProfileImage?.effectClass ?? ""} ${hasProfileImage ? "hasImage" : ""}`

  const nextRankGoalStat = (() => {
    if (rankProgress.isUnranked || rankProgress.isPlacement || rankProgress.isTopRank) return null
    const mmrToNext = rankProgress.mmrToNextTier ?? 0
    if (mmrToNext <= 0) return null
    return {
      label: "Next Rank",
      value: `${formatNumber(mmrToNext)} RR`,
      tooltip: `${formatNumber(mmrToNext)} RR needed to reach ${rankProgress.nextTierLabel}.`,
      tone: "score",
    }
  })()

  const playerProgressStats = [
    {
      label: "Coins",
      value: formatNumber(coins),
      tooltip: "Current coin balance available for shop purchases.",
      tone: "coins",
    },
    {
      label: "Level",
      value: `Lv ${levelValue}`,
      tooltip: "Your long-term account progression level.",
      tone: "level",
    },
    {
      label: "XP In Level",
      value: `${formatNumber(xpIntoLevel)} / ${formatNumber(xpForNextLevel)}`,
      tooltip: `XP progress in the current level. ${formatNumber(xpToNextLevel)} XP remaining.`,
      tone: "level",
    },
    {
      label: "Total Rounds",
      value: formatNumber(profileStats.totalRounds),
      tooltip: "Total rounds played across all modes.",
      tone: "neutral",
    },
    {
      label: "This Week",
      value: formatNumber(profileStats.roundsThisWeek),
      tooltip: "Rounds played in the last 7 days.",
      tone: "neutral",
    },
    ...(nextRankGoalStat ? [nextRankGoalStat] : []),
  ]

  const performanceStats = [
    {
      label: "Best Score",
      value: formatNumber(profileStats.bestScore),
      tooltip: "Highest score achieved in any single round.",
      tone: "score",
      isFeatured: true,
    },
    {
      label: "Best Streak",
      value: formatNumber(profileStats.bestStreak),
      tooltip: "Longest uninterrupted combo chain.",
      tone: "streak",
      isFeatured: true,
    },
    {
      label: "Avg Reaction",
      value: formatReactionTime(reactionStats.avgReactionMs),
      tooltip: reactionStats.avgReactionMs === null
        ? REACTION_UNAVAILABLE_TOOLTIP
        : "Average reaction time across recorded rounds with hit data.",
      tone: "score",
    },
    {
      label: "Best Reaction",
      value: formatReactionTime(reactionStats.bestReactionMs),
      tooltip: reactionStats.bestReactionMs === null
        ? REACTION_UNAVAILABLE_TOOLTIP
        : "Fastest recorded hit response in saved round history.",
      tone: "level",
    },
  ]
  const combinedSummaryStats = [...playerProgressStats, ...performanceStats]

  return (
    <div className="pageCenter">
      <section className="card profileCard">
        <header className="profileHero">
          <div className="profileHeroMain">
            <div className="profileIdentityRow">
              <div className={avatarClassName} style={avatarStyle} aria-hidden="true">
                {hasProfileImage ? (
                  <img className="profileAvatarImage" src={equippedProfileImage.imageSrc} alt="" />
                ) : (
                  playerInitials
                )}
              </div>
              <div className="profileIdentityText">
                <p className="profilePlayerName">{playerName.charAt(0).toUpperCase() + playerName.slice(1)}</p>
                <p className="profilePlayerTitle">{playerTitle}</p>
              </div>
            </div>

            <p className="profileLead">
              {profileTagline}
            </p>

            <div className="profileLevelProgress">
              <div className="profileLevelProgressTop">
                <div className="profileLevelProgressTitleGroup">
                  <span className="profileLevelProgressLabel">Progression Level</span>
                  <strong className="profileLevelProgressPercent">{levelProgressPercent}%</strong>
                </div>
                <span className="profileLevelProgressXpSummary">
                  {formatNumber(xpToNextLevel)} XP to Level {nextLevelValue}
                </span>
              </div>
              <div className="profileLevelProgressEnds" aria-hidden="true">
                <span>Lv {levelValue}</span>
                <span>Lv {nextLevelValue}</span>
              </div>
              <div className="profileLevelProgressTrack">
                <span
                  className="profileLevelProgressFill"
                  style={{ width: `${Math.max(0, Math.min(100, levelProgressPercent))}%` }}
                />
              </div>
            </div>
          </div>

          <aside className={`profileRankShowcase ${rankToneClass}`}>
            <div className="profileRankPrimary">
              <div className={`profileRankCrest ${rankProgress.isUnranked ? "isUnranked" : ""}`}>
                {rankIconSrc ? (
                  <img className="profileRankCrestImage" src={rankIconSrc} alt="" />
                ) : (
                  <span className="profileRankCrestFallback">?</span>
                )}
              </div>
              <div className="profileRankPrimaryText">
                <p className="profileRankLabel">Ranked Division</p>
                <h2 className="profileRankTitle">{rankLabel}</h2>
                <p className="profileRankMeta">
                  {getRankMetaText(rankProgress)}
                </p>
              </div>
            </div>
            <div className="profileRankInsights" aria-label="Recent ranked trend">
              <article className="profileRankInsightItem">
                <span className="profileRankInsightLabel">Last 10 Movement</span>
                <strong className="profileRankInsightValue">
                  {formatSignedValue(rankedInsights.recentRankDelta)}
                </strong>
              </article>
              <article className="profileRankInsightItem">
                <span className="profileRankInsightLabel">Positive Rounds</span>
                <strong className="profileRankInsightValue">
                  {rankedInsights.recentSampleSize > 0
                    ? `${rankedInsights.recentWinRate}%`
                    : "N/A"}
                </strong>
              </article>
              <article className="profileRankInsightItem">
                <span className="profileRankInsightLabel">Sample Size</span>
                <strong className="profileRankInsightValue">
                  {rankedInsights.recentSampleSize}/10
                </strong>
              </article>
            </div>
            <div className="profileRankActionsDivider" />
            <button className="secondaryButton profileLogoutButton" type="button" onClick={onLogout}>
              Logout
            </button>
          </aside>
        </header>

        <div className="profileStatsSections">
          <StatsSection
            title="Player Summary"
            stats={combinedSummaryStats}
            gridClassName="isSummaryGrid"
          />

          {buildPerformanceStats.length > 0 ? (
            <section className="profileStatsSection" aria-label="Build performance">
              <div className="profileStatsSectionHeader">
                <h2 className="profileStatsSectionTitle">Build Performance</h2>
                <p className="profileStatsSectionLead">
                  Lifetime results by saved loadout.
                </p>
              </div>
              <div className="profileBuildStatsGrid">
                {buildPerformanceStats.map((buildStat) => {
                  const attempts = buildStat.totalHits + buildStat.totalMisses
                  const winRate = buildStat.rankedRounds > 0
                    ? Math.round((buildStat.rankedWins / buildStat.rankedRounds) * 100)
                    : null

                  return (
                    <article key={buildStat.loadoutId} className="profileBuildStatCard">
                      <p className="profileBuildStatEyebrow">{buildStat.loadoutName}</p>
                      <strong className="profileBuildStatValue">
                        {formatNumber(buildStat.bestScore)} peak score
                      </strong>
                      <p className="profileBuildStatMeta">
                        {formatNumber(buildStat.totalRounds)} rounds
                        {winRate !== null ? ` · ${winRate}% ranked wins` : ""}
                      </p>
                      <p className="profileBuildStatDetail">
                        {formatNumber(buildStat.bestStreak)} best streak
                        {attempts > 0
                          ? ` · ${Math.round((buildStat.totalHits / attempts) * 100)}% accuracy`
                          : ""}
                      </p>
                    </article>
                  )
                })}
              </div>
            </section>
          ) : null}

          <section className="profileStatsSection profileAchievementsSection" aria-label="Achievements">
            <div className="achievementHeaderRow">
              <div className="achievementHeaderText">
                <h2 className="profileStatsSectionTitle">Achievements</h2>
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
                        onClick={() => setRequestedCategoryKey(category.key)}
                      >
                        {category.label}
                      </button>
                    )
                  })}
                </div>
            </div>

            <div className="achievementFeaturedBannerWrap" aria-label="Featured master achievement">
              {featuredMasterAchievement ? (
                <AchievementTile achievement={featuredMasterAchievement} variant="featuredBanner" />
              ) : (
                <p className="achievementsEmptyState">No master achievement found.</p>
              )}
            </div>

            <div className="achievementsMainArea">
              <AchievementsCarousel
                key={`achievements-${selectedCategoryKey}`}
                achievements={carouselAchievements}
              />
            </div>
          </section>
        </div>
      </section>
    </div>
  )
}
