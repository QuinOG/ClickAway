import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Crown, Crosshair, MagnifyingGlass, Trophy } from "@phosphor-icons/react"

import { CommandHeader } from "../components/RouteScene.jsx"
import { CrestIcon, CrownIcon } from "../components/art/GameIcons.jsx"
import PlayerPortrait from "../components/art/PlayerPortrait.jsx"
import "../styles/social-menus-art.css"

function getCrestTone(rankLabel = "") {
  const tier = String(rankLabel).split(" ")[0].toLowerCase()
  return ["gold", "silver", "bronze", "platinum", "diamond"].includes(tier) ? tier : "unranked"
}
import { FEEDBACK_EVENTS } from "../constants/feedbackEvents.js"
import { useActionFeedback } from "../hooks/useActionFeedback.js"
import PlayerHoverCard from "../components/PlayerHoverCard.jsx"
import TierBadge from "../components/TierBadge.jsx"
import { fetchLeaderboard } from "../services/clickAwayHttpApiClient.js"
import { formatPercent, normalizePercentValue } from "../utils/gameMath.js"
import { buildPlayerLeaderboardStats } from "../utils/historyUtils.js"
import { isRankedModeEntry } from "../utils/gameModeLabelsAndRankedFilters.js"
import { getLevelProgress } from "../utils/progressionUtils.js"
import { normalizeSeasonRecord, getSeasonRewardTier } from "../utils/seasonUtils.js"
import {
  PLACEMENT_MATCH_COUNT,
  getRankProgressWithPlacement,
} from "../utils/rankUtils.js"

function positionLadderCard(wrap) {
  const card = wrap.querySelector(".ladderPlayerHoverCard")
  if (!card) return
  const anchor = wrap.getBoundingClientRect()
  const row = wrap.closest(".ladderPlate").getBoundingClientRect()
  const width = card.offsetWidth
  const height = card.offsetHeight
  let left = anchor.right + 12
  if (left + width > window.innerWidth - 12) left = anchor.left - width - 12
  left = Math.max(12, Math.min(left, window.innerWidth - width - 12))
  let top = row.top + (row.height - height) / 2
  if (top + height > window.innerHeight - 12) top = row.top - height - 12
  top = Math.max(12, Math.min(top, window.innerHeight - height - 12))
  card.style.left = `${left - anchor.left}px`
  card.style.top = `${top - anchor.top}px`
}

const BOARD_OPTIONS = [
  { key: "mmr", label: "Rating" },
  { key: "bestScore", label: "Best Score" },
  { key: "bestStreak", label: "Best Streak" },
  { key: "accuracy", label: "Accuracy" },
  { key: "reaction", label: "Reaction" },
]

const SORTABLE_COLUMNS = [
  { key: "mmr", label: "Rating" },
  { key: "bestScore", label: "Best Score" },
  { key: "bestStreak", label: "Best Streak" },
  { key: "accuracyPercent", label: "Accuracy" },
  { key: "bestReactionMs", label: "Reaction" },
]

const DEFAULT_SORT = { key: "mmr", direction: "desc" }
const LEADERBOARD_PAGE_SIZE = 25
const LEADERBOARD_SKELETON_ROW_COUNT = 8

function formatNumericValue(value) {
  const normalizedValue = Number(value)
  if (!Number.isFinite(normalizedValue)) return "0"
  return Math.max(0, normalizedValue).toLocaleString()
}

function getSortLabel(sortKey) {
  return SORTABLE_COLUMNS.find((column) => column.key === sortKey)?.label ?? "Rating"
}

function getSortableValue(player, sortKey) {
  const numericValue = Number(player?.[sortKey])
  return Number.isFinite(numericValue) ? numericValue : 0
}

function isCurrentUserRow(player, currentUserId, currentUsername) {
  const normalizedCurrentUserId = String(currentUserId ?? "").trim()
  const normalizedRowUserId = String(player?.userId ?? "").trim()

  if (normalizedCurrentUserId && normalizedCurrentUserId === normalizedRowUserId) {
    return true
  }

  const normalizedCurrentUsername = String(currentUsername ?? "").trim().toLowerCase()
  const normalizedRowUsername = String(player?.username ?? "").trim().toLowerCase()
  return Boolean(
    !normalizedCurrentUserId &&
    normalizedCurrentUsername &&
    normalizedCurrentUsername === normalizedRowUsername
  )
}

function normalizeLeaderboardRow(row = {}, rowIndex = 0) {
  const rankedRounds = Math.max(0, Number(row.rankedRounds) || 0)
  const mmr = Math.max(0, Number(row.mmr) || 0)
  const accuracyPercent = normalizePercentValue(row.accuracyPercent)
  const levelXp = Math.max(0, Number(row.levelXp) || 0)
  const level = getLevelProgress(levelXp).level
  const rankProgress = getRankProgressWithPlacement({
    mmr,
    hasRankedHistory: rankedRounds > 0,
    rankedState: { placementMatchesPlayed: PLACEMENT_MATCH_COUNT },
  })

  return {
    rank: Math.max(1, Number(row.rank) || (rowIndex + 1)),
    rowIndex,
    userId: String(row.userId ?? ""),
    username: String(row.username || "Player"),
    mmr,
    coins: Math.max(0, Number(row.coins) || 0),
    level,
    bestScore: Math.max(0, Number(row.bestScore) || 0),
    bestStreak: Math.max(0, Number(row.bestStreak) || 0),
    accuracyPercent,
    bestReactionMs: row.bestReactionMs ?? null,
    rankedRounds,
    rankProgress,
    rankLabel: rankProgress.tierLabel,
  }
}

async function requestLeaderboardPage({
  board = "mmr",
  page = 1,
  search = "",
  view = "top",
} = {}) {
  const response = await fetchLeaderboard({ board, page, limit: LEADERBOARD_PAGE_SIZE, search, view })
  return {
    rows: (Array.isArray(response?.rows) ? response.rows : []).map(normalizeLeaderboardRow),
    page: Math.max(1, Number(response?.page) || 1),
    totalPages: Math.max(0, Number(response?.totalPages) || 0),
    totalCount: Math.max(0, Number(response?.totalCount) || 0),
    selfRank: response?.selfRank ?? null,
    board: response?.board || board,
    view: response?.view || view,
    season: normalizeSeasonRecord(response?.season),
  }
}

function LeaderboardTableSkeleton() {
  return (
    <div
      className="leaderboardSkeletonWrap"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading leaderboard standings"
    >
      <div className="leaderboardSkeletonIntro">
        <div className="skeletonBlock skeletonBlock--pill" aria-hidden="true" />
      </div>
      <table className="table helpTable leaderboardTable leaderboardSkeletonTable">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Player</th>
            <th scope="col">Tier</th>
            {SORTABLE_COLUMNS.map((column) => (
              <th key={column.key} scope="col" className="leaderboardNumeric">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: LEADERBOARD_SKELETON_ROW_COUNT }, (_, rowIndex) => (
            <tr
              key={`leaderboard-skeleton-${rowIndex}`}
              className="leaderboardTableRow leaderboardSkeletonRow"
            >
              <td>
                <div className="skeletonBlock skeletonBlock--rank" aria-hidden="true" />
              </td>
              <td>
                <div className="skeletonBlock skeletonBlock--md leaderboardSkeletonPlayer" aria-hidden="true" />
              </td>
              <td>
                <div className="skeletonBlock skeletonBlock--tier" aria-hidden="true" />
              </td>
              {SORTABLE_COLUMNS.map((column) => (
                <td key={column.key} className="leaderboardNumeric">
                  <div className="skeletonBlock skeletonBlock--num" aria-hidden="true" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatLadderStat(player, key) {
  if (key === "accuracyPercent") return formatPercent(player.accuracyPercent)
  if (key === "bestReactionMs") return player.bestReactionMs ? `${formatNumericValue(player.bestReactionMs)} ms` : "—"
  if (key === "mmr") return formatNumericValue(player.mmr)
  return formatNumericValue(player[key])
}

function RankDisplay({ rank = 0 }) {
  const normalizedRank = Math.max(1, Number(rank) || 1)
  const isTopThree = normalizedRank <= 3

  if (!isTopThree) {
    return <span className="leaderboardRankText">{formatNumericValue(normalizedRank)}</span>
  }

  return (
    <span className={`leaderboardRankBadge is-rank${normalizedRank}`}>
      {normalizedRank}
    </span>
  )
}

function LeaderboardStandingPanel({
  currentVisiblePlayer = null,
  currentRankProgress = null,
  currentLeaderboardStats = {},
  rankedRounds = 0,
  selfRank = null,
  totalCount = 0,
  season = null,
}) {
  const normalizedRankedRounds = Math.max(0, Number(rankedRounds) || 0)
  const placementMatchesRemaining = Math.max(
    0,
    Number(currentRankProgress?.placementMatchesRemaining) || 0
  )
  const displaySpot = currentVisiblePlayer
    ? `#${currentVisiblePlayer.rank}`
    : selfRank
      ? `#${selfRank}`
      : currentRankProgress?.isPlacement
        ? "PLACEMENT"
        : currentRankProgress?.isUnranked
          ? "--"
          : "UNRANKED"

  let title = "Your ladder rank"
  let lead = totalCount > 0
    ? `You are ranked #${formatNumericValue(selfRank ?? 0)} out of ${formatNumericValue(totalCount)} placed players.`
    : "Complete placement to appear on the global ladder."

  if (currentVisiblePlayer) {
    title = null
    lead = null
  } else if (currentRankProgress?.isPlacement) {
    title = "Placement in progress"
    lead = placementMatchesRemaining > 0
      ? `${formatNumericValue(placementMatchesRemaining)} placement matches remain before your first visible rank is revealed.`
      : "Your initial rank is being finalized."
  } else if (currentRankProgress?.isUnranked) {
    title = "Play Ranked to place"
    lead = `Complete ${PLACEMENT_MATCH_COUNT} placement matches to unlock your visible ladder standing.`
  } else if (!selfRank) {
    title = "Outside the placed ladder"
    lead = "Finish placement to receive a global rank."
  }

  const rewardTier = getSeasonRewardTier(currentRankProgress?.mmr)

  const statItems = [
    {
      label: "Rating",
      value: formatNumericValue(currentRankProgress?.mmr),
    },
    {
      label: "Best Score",
      value: formatNumericValue(currentLeaderboardStats.bestScore),
    },
    {
      label: "Best Streak",
      value: formatNumericValue(currentLeaderboardStats.bestStreak),
    },
    {
      label: "Accuracy",
      value: formatPercent(currentLeaderboardStats.accuracyPercent),
    },
    {
      label: "Games",
      value: formatNumericValue(normalizedRankedRounds),
    },
  ]

  return (
    <section className="leaderboardStandingPanel" aria-label="Your leaderboard standing">
      <div className="leaderboardStandingMain">
        <div className="leaderboardStandingText">
          <p className="leaderboardSectionEyebrow">Your Standing</p>
          <div className="leaderboardStandingHeading">
            {title ? (
              <div className="leaderboardStandingTitleGroup">
                <h2 className="cardH2 leaderboardStandingTitle">{title}</h2>
                <p className="leaderboardStandingLead">{lead}</p>
              </div>
            ) : null}
            <TierBadge
              tierLabel={currentRankProgress?.tierLabel || "Unranked"}
              className="leaderboardStandingTierBadge"
            />
          </div>
        </div>

        <div className="leaderboardStandingSpotlight standingShield" aria-label="Visible ladder spot">
          <span className="leaderboardStandingSpotlightLabel">Spot</span>
          <strong className="leaderboardStandingSpotlightValue">{displaySpot}</strong>
        </div>
      </div>

      <p className="leaderboardStandingScope">Ranked rounds only · this season</p>
      <div className="leaderboardStandingStats" aria-label="Your ranked summary">
        {statItems.map((item) => (
          <article key={item.label} className="leaderboardStandingStat">
            <span className="leaderboardStandingStatLabel">{item.label}</span>
            <strong className="leaderboardStandingStatValue">{item.value}</strong>
          </article>
        ))}
        {season ? (
          <article className="leaderboardStandingStat">
            <span className="leaderboardStandingStatLabel">Reward</span>
            <strong className="leaderboardStandingStatValue">{rewardTier.tier > 0 ? rewardTier.label : "None yet"}</strong>
          </article>
        ) : null}
      </div>
    </section>
  )
}

function SeasonBanner({ season = null }) {
  if (!season) return null

  return (
    <section className="leaderboardSeasonBanner" aria-label="Current season">
      <div className="leaderboardSeasonIdentity">
        <p className="leaderboardSectionEyebrow">Current season</p>
        <h2 className="leaderboardSeasonName">{season.name}</h2>
      </div>
      <div className="leaderboardSeasonMeter">
        <p className="leaderboardSeasonMeta">
          {season.daysRemaining > 0
            ? <><strong>{season.daysRemaining} days</strong> remaining · {season.progressPercent}% complete</>
            : "Season ending soon"}
        </p>
        <div className="leaderboardSeasonProgress" aria-hidden="true">
          <span style={{ width: `${season.progressPercent}%` }} />
        </div>
      </div>
    </section>
  )
}

function LeaderboardControls({
  board,
  onBoardChange,
  search,
  onSearchChange,
  view,
  onViewChange,
  page,
  totalPages,
  onPageChange,
  sortControl,
}) {
  return (
    <div className="leaderboardControls">
      <div className="leaderboardBoardTabs" role="tablist" aria-label="Ladder boards">
        {BOARD_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            role="tab"
            aria-selected={board === option.key}
            className={`leaderboardBoardTab${board === option.key ? " isActive" : ""}`}
            onClick={(event) => onBoardChange(option.key, event.currentTarget)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="leaderboardControlRow">
        <label className="gfField leaderboardSearchField">
          <span className="gfFieldCap" aria-hidden="true"><MagnifyingGlass weight="bold" /></span>
          <input
            type="search"
            className="leaderboardSearchInput"
            placeholder="Search players"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            aria-label="Search Ladder players"
          />
        </label>

        <div className="leaderboardViewToggle" role="group" aria-label="Ladder view">
          <button
            type="button"
            className={`secondaryButton${view === "top" ? " isActive" : ""}`}
            aria-pressed={view === "top"}
            onClick={(event) => onViewChange("top", event.currentTarget)}
          >
            Top Players
          </button>
          <button
            type="button"
            className={`secondaryButton${view === "aroundMe" ? " isActive" : ""}`}
            aria-pressed={view === "aroundMe"}
            onClick={(event) => onViewChange("aroundMe", event.currentTarget)}
          >
            Around Me
          </button>
        </div>
        {sortControl}
      </div>

      {view === "top" && totalPages > 1 ? (
        <div className="leaderboardPagination" aria-label="Ladder pagination">
          <button
            type="button"
            className="secondaryButton"
            disabled={page <= 1}
            onClick={(event) => onPageChange(page - 1, event.currentTarget)}
          >
            Previous
          </button>
          <span className="muted">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="secondaryButton"
            disabled={page >= totalPages}
            onClick={(event) => onPageChange(page + 1, event.currentTarget)}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  )
}

function PodiumStage({ rows = [], currentUserId, currentUsername }) {
  const podiumRows = [...rows]
    .filter((player) => player.rank >= 1 && player.rank <= 3)
    .sort((leftPlayer, rightPlayer) => leftPlayer.rank - rightPlayer.rank)

  if (podiumRows.length === 0) return null

  return (
    <section className="leaderboardPodium" aria-label="Top ranked players">
      <div className="leaderboardPodiumSignal" aria-hidden="true">
        <span /><span /><Crosshair weight="duotone" />
      </div>
      <div className="leaderboardPodiumHeader">
        <div>
          <p className="leaderboardSectionEyebrow">Season leaders</p>
          <h2>Players to beat</h2>
        </div>
        <Crown weight="duotone" aria-hidden="true" />
      </div>
      <div className={`leaderboardPodiumDeck count-${podiumRows.length}`}>
        <span className="podiumSpotlight" aria-hidden="true" />
        {podiumRows.map((player) => {
          const isCurrentUser = isCurrentUserRow(player, currentUserId, currentUsername)
          return (
            <article
              key={`podium-${player.userId}-${player.rank}`}
              className={`leaderboardPodiumPlayer isRank${player.rank} ${isCurrentUser ? "isCurrentUser" : ""}`}
            >
              <span className="podiumFigure">
              <span className="leaderboardPodiumIdentity">
                <PlayerPortrait name={player.username} size={player.rank === 1 ? 58 : 50} />
                <span className="leaderboardPodiumCrest" role="img" aria-label={`${player.rankLabel} rank`}>
                  <CrestIcon tone={getCrestTone(player.rankLabel)} size={30} />
                </span>
                {player.rank === 1 ? <span className="leaderboardPodiumCrown"><CrownIcon size={30} /></span> : null}
              </span>
              <strong>{player.username}</strong>
              <span className="leaderboardPodiumTier">{player.rankLabel}</span>
              <span className="leaderboardPodiumRating">{formatNumericValue(player.mmr)} <small>RR</small></span>
              </span>
              <span className="podiumStep">
                <span className="leaderboardPodiumRank">{player.rank}<small>{player.rank === 1 ? "st" : player.rank === 2 ? "nd" : "rd"}</small></span>
              </span>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function NearMeSection({ rows = [], selfRank = null, mmrGap = 0 }) {
  return (
    <section className="leaderboardNearMeSection" aria-label="Players around your rank">
      <div className="leaderboardNearMeHeader">
        <p className="leaderboardSectionEyebrow">Around You</p>
        <p className="leaderboardNearMeLead">
          {selfRank
            ? `Your global rank is #${formatNumericValue(selfRank)}`
            : "Your rank window"}
          {mmrGap > 0
            ? ` · ${formatNumericValue(mmrGap)} RR to the next spot above`
            : ""}
        </p>
      </div>
      <div className="leaderboardNearMeRows">
        {rows.map((player) => (
          <div key={`${player.userId}-near`} className="leaderboardNearMeRow">
            <span className="leaderboardNearMeRank">#{formatNumericValue(player.rank)}</span>
            <span className="leaderboardNearMeName">{player.username}</span>
            <span className="leaderboardNearMeTier">{player.rankLabel}</span>
            <span className="leaderboardNearMeMmr">{formatNumericValue(player.mmr)} RR</span>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function LeaderboardPage({
  isAuthed = false,
  currentUserId = "",
  currentUsername = "",
  currentRankProgress = null,
  roundHistory = [],
}) {
  useEffect(() => {
    const update = () => {
      document.querySelectorAll(".ladderPlate .leaderboardEntryHoverWrap:hover, .ladderPlate .leaderboardEntryHoverWrap:focus-within").forEach(positionLadderCard)
    }
    window.addEventListener("scroll", update, true)
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("scroll", update, true)
      window.removeEventListener("resize", update)
    }
  }, [])
  const navigate = useNavigate()
  const { signalAction } = useActionFeedback()
  const [sortConfig, setSortConfig] = useState(DEFAULT_SORT)
  const [leaderboardRows, setLeaderboardRows] = useState([])
  const [board, setBoard] = useState("mmr")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [selfRank, setSelfRank] = useState(null)
  const [season, setSeason] = useState(null)
  const [searchInput, setSearchInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [view, setView] = useState("top")
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearchQuery(searchInput.trim())
      setPage(1)
    }, 250)

    return () => window.clearTimeout(timeoutId)
  }, [searchInput])

  const loadLeaderboard = useCallback(async () => {
    if (!isAuthed) {
      setLeaderboardRows([])
      setLoadError("You must be logged in to view the leaderboard.")
      setIsLoading(false)
      return false
    }

    setIsLoading(true)
    setLoadError("")

    try {
      const response = await requestLeaderboardPage({
        board,
        page,
        search: searchQuery,
        view,
      })
      setLeaderboardRows(response.rows)
      setTotalPages(response.totalPages)
      setTotalCount(response.totalCount)
      setSelfRank(response.selfRank)
      setSeason(response.season)
      return true
    } catch (error) {
      setLeaderboardRows([])
      setLoadError(error.message || "Unable to load leaderboard.")
      return false
    } finally {
      setIsLoading(false)
    }
  }, [board, isAuthed, page, searchQuery, view])

  useEffect(() => {
    loadLeaderboard()
  }, [loadLeaderboard])

  const sortedRows = useMemo(() => {
    return [...leaderboardRows].sort((firstRow, secondRow) => {
      const firstValue = getSortableValue(firstRow, sortConfig.key)
      const secondValue = getSortableValue(secondRow, sortConfig.key)
      const directionMultiplier = sortConfig.direction === "asc" ? 1 : -1

      if (firstValue !== secondValue) {
        return (firstValue - secondValue) * directionMultiplier
      }

      return firstRow.rowIndex - secondRow.rowIndex
    })
  }, [leaderboardRows, sortConfig])

  const rankedRounds = useMemo(
    () => (Array.isArray(roundHistory) ? roundHistory : []).filter(isRankedModeEntry),
    [roundHistory]
  )
  const currentLeaderboardStats = useMemo(
    () => buildPlayerLeaderboardStats(rankedRounds),
    [rankedRounds]
  )
  const currentVisiblePlayer = useMemo(
    () => leaderboardRows.find((player) => isCurrentUserRow(player, currentUserId, currentUsername)) ?? null,
    [currentUserId, currentUsername, leaderboardRows]
  )
  const activeSortLabel = getSortLabel(sortConfig.key)

  const nearMeData = useMemo(() => {
    if (view !== "aroundMe") return null
    if (!selfRank || leaderboardRows.length === 0) return null

    const sortedRows = [...leaderboardRows].sort((a, b) => a.rank - b.rank)
    const rowAbove = sortedRows.find((player) => player.rank === selfRank - 1)
    const userRow = sortedRows.find((player) => isCurrentUserRow(player, currentUserId, currentUsername))
    const mmrGap = rowAbove && userRow ? Math.max(0, rowAbove.mmr - userRow.mmr) : 0

    return { rows: sortedRows, selfRank, mmrGap }
  }, [currentUserId, currentUsername, leaderboardRows, selfRank, view])

  function handleBoardChange(nextBoard, source) {
    setBoard(nextBoard)
    setPage(1)
    setSortConfig({
      key: nextBoard === "reaction" ? "bestReactionMs" : nextBoard === "accuracy" ? "accuracyPercent" : nextBoard,
      direction: nextBoard === "reaction" ? "asc" : "desc",
    })
    signalAction(source, {
      eventName: FEEDBACK_EVENTS.FILTER,
      eventId: `ladder-board-${nextBoard}`,
    })
  }

  function handleViewChange(nextView, source) {
    setView(nextView)
    setPage(1)
    signalAction(source, {
      eventName: FEEDBACK_EVENTS.FILTER,
      eventId: `ladder-view-${nextView}`,
    })
  }

  function handlePageChange(nextPage, source) {
    setPage(nextPage)
    signalAction(source, {
      eventName: FEEDBACK_EVENTS.SELECTION,
      eventId: `ladder-page-${nextPage}`,
    })
  }

  function handleSort(columnKey) {
    setSortConfig((currentSort) => {
      if (currentSort.key === columnKey) {
        return {
          ...currentSort,
          direction: currentSort.direction === "desc" ? "asc" : "desc",
        }
      }

      return { key: columnKey, direction: "desc" }
    })
  }

  function handleProfileOpen(isCurrentUser) {
    if (!isCurrentUser) return
    navigate("/profile")
  }

  return (
    <div className="pageCenter leaderboardPageScene">
      <section className="card leaderboardPageCard">
        <CommandHeader
          routeId="ladder"
          eyebrow="Season ladder"
          title="Climb the field"
          subtitle="See who leads, find your nearest rival, and take the next position."
          status={(
            <span className="leaderboardFieldCount">
              <Trophy weight="fill" aria-hidden="true" />
              <strong>{formatNumericValue(totalCount)}</strong>
              <small>ranked</small>
            </span>
          )}
        />

        <SeasonBanner season={season} />

        <div className="leaderboardTopRow">
          {!isLoading && !loadError && view === "top" && page === 1 && !searchQuery ? (
            <PodiumStage
              rows={leaderboardRows}
              currentUserId={currentUserId}
              currentUsername={currentUsername}
            />
          ) : null}
          <LeaderboardStandingPanel
            currentVisiblePlayer={currentVisiblePlayer}
            currentRankProgress={currentRankProgress}
            currentLeaderboardStats={currentLeaderboardStats}
            rankedRounds={rankedRounds.length}
            selfRank={selfRank}
            totalCount={totalCount}
            season={season}
          />
        </div>

        <LeaderboardControls
          board={board}
          onBoardChange={handleBoardChange}
          search={searchInput}
          onSearchChange={setSearchInput}
          view={view}
          onViewChange={handleViewChange}
          page={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          sortControl={!isLoading && !loadError && sortedRows.length > 0 ? (
            <button type="button" className="ladderSortFlip" aria-label={`Sorted by ${activeSortLabel}, flip order`} onClick={() => handleSort(sortConfig.key)}>
              {sortConfig.direction === "asc" ? "Low to high ?" : "High to low ?"}
            </button>
          ) : null}
        />

        {isLoading ? <LeaderboardTableSkeleton /> : null}

        {!isLoading && loadError ? (
          <div className="leaderboardStatusCard" role="alert">
            <p className="leaderboardStatusTitle">Ladder unavailable</p>
            <p className="muted">{loadError}</p>
            <button type="button" className="leaderboardRetryButton" onClick={async (event) => {
              const source = event.currentTarget
              signalAction(source, { state: "pending", eventName: FEEDBACK_EVENTS.RETRY })
              const succeeded = await loadLeaderboard()
              signalAction(source, {
                state: succeeded ? "confirmed" : "denied",
                eventName: succeeded ? FEEDBACK_EVENTS.ACTION_CONFIRM : FEEDBACK_EVENTS.ACTION_DENY,
              })
            }}>
              Retry
            </button>
          </div>
        ) : null}

        {!isLoading && !loadError && sortedRows.length === 0 ? (
          <div className="leaderboardStatusCard" role="status" aria-live="polite">
            <p className="leaderboardStatusTitle">No ranked players yet.</p>
            <p className="muted">Finish your placement matches to start populating the ladder.</p>
          </div>
        ) : null}

        {nearMeData ? (
          <NearMeSection
            rows={nearMeData.rows}
            selfRank={nearMeData.selfRank}
            mmrGap={nearMeData.mmrGap}
          />
        ) : null}

        {!isLoading && !loadError && sortedRows.length > 0 ? (
          <>
            <ol className="ladderPlates" aria-label={`Ladder sorted by ${activeSortLabel}`}>
              {sortedRows.map((player) => {
                const isCurrentUser = isCurrentUserRow(player, currentUserId, currentUsername)
                const isPodium = player.rank <= 3
                const plateClassName = [
                  "ladderPlate",
                  isPodium ? `isRank${player.rank}` : "",
                  isCurrentUser ? "isCurrentUser" : "",
                ].filter(Boolean).join(" ")
                const stats = SORTABLE_COLUMNS.map((column) => ({
                  ...column,
                  value: formatLadderStat(player, column.key),
                }))
                const heroStat = stats.find((stat) => stat.key === sortConfig.key) ?? stats[0]

                return (
                  <li key={`${player.userId}-${player.rank}`} className={plateClassName}>
                    <span className="ladderPlateRank"><RankDisplay rank={player.rank} /></span>
                    <div className="leaderboardEntryHoverWrap ladderPlateIdentity" onMouseEnter={(event) => positionLadderCard(event.currentTarget)} onFocus={(event) => positionLadderCard(event.currentTarget)}>
                      {isCurrentUser ? (
                        <button
                          type="button"
                          className="leaderboardPlayerName"
                          onClick={() => handleProfileOpen(true)}
                          aria-label={`Open ${player.username} profile`}
                        >
                          <PlayerPortrait name={player.username} size={44} className="leaderboardPlayerPortrait" />
                          {player.username}
                          <span className="leaderboardYouBadge">YOU</span>
                        </button>
                      ) : (
                        <span className="leaderboardPlayerName" tabIndex={0} aria-label={`${player.username} player details`}>
                          <PlayerPortrait name={player.username} size={44} className="leaderboardPlayerPortrait" />
                          {player.username}
                        </span>
                      )}
                      <TierBadge tierLabel={player.rankLabel} className="leaderboardTierBadge" />
                      <div className="leaderboardEntryHoverCard">
                        <PlayerHoverCard
                          username={player.username}
                          className="ladderPlayerHoverCard"
                          ladder
                          rankProgress={player.rankProgress}
                          rankLabel={player.rankLabel}
                          rankMmr={player.mmr}
                          coins={player.coins}
                          level={player.level}
                          accuracyPercent={player.accuracyPercent}
                          bestScore={player.bestScore}
                          bestStreak={player.bestStreak}
                          rankedRounds={player.rankedRounds}
                        />
                      </div>
                    </div>
                    <dl className="ladderPlateStats">
                      {stats.filter((stat) => stat.key !== heroStat.key).map((stat) => (
                        <div key={stat.key} className="ladderPlateStat">
                          <dt>{stat.label}</dt>
                          <dd>{stat.value}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="ladderPlateHero">
                      <strong>{heroStat.value}</strong>
                      <small>{heroStat.label}</small>
                    </div>
                  </li>
                )
              })}
            </ol>
          </>
        ) : null}

      </section>
    </div>
  )
}
