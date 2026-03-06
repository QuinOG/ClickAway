import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import InfoStrip from "../components/InfoStrip.jsx"
import PlayerHoverCard from "../components/PlayerHoverCard.jsx"
import {
  LEADERBOARD_INSIGHTS,
  MOCK_LEADERBOARD,
} from "../features/leaderboard/leaderboardData.js"
import { buildPlayerLeaderboardStats } from "../utils/historyUtils.js"
import { isRankedModeEntry } from "../utils/modeUtils.js"
import { getRankImageSrc } from "../utils/rankUtils.js"

const SORTABLE_COLUMNS = [
  { key: "mmr", label: "MMR" },
  { key: "bestScore", label: "Best Score" },
  { key: "bestStreak", label: "Best Streak" },
  { key: "accuracy", label: "Accuracy" },
]

const DEFAULT_SORT = { key: "mmr", direction: "desc" }

function getRankedHistory(roundHistory) {
  if (!Array.isArray(roundHistory)) return []
  return roundHistory.filter(isRankedModeEntry)
}

function parseAccuracyPercent(accuracy) {
  if (typeof accuracy === "number" && Number.isFinite(accuracy)) {
    return Math.max(0, Math.min(100, Math.round(accuracy)))
  }

  const parsedValue = Number.parseInt(String(accuracy ?? "").replace("%", ""), 10)
  return Number.isFinite(parsedValue) ? Math.max(0, Math.min(100, parsedValue)) : 0
}

function formatAccuracyPercent(accuracy) {
  return `${parseAccuracyPercent(accuracy)}%`
}

function formatNumericValue(value) {
  const normalizedValue = Number(value)
  if (!Number.isFinite(normalizedValue)) return "0"
  return Math.max(0, normalizedValue).toLocaleString()
}

function getSortableValue(player, sortKey) {
  if (sortKey === "accuracy") {
    return parseAccuracyPercent(player.accuracy)
  }

  const numericValue = Number(player?.[sortKey])
  return Number.isFinite(numericValue) ? numericValue : 0
}

function isCurrentUserRow(player, currentUserId, currentUsername) {
  const rowName = String(player?.username ?? "").trim().toLowerCase()
  if (rowName === "you") return true

  const normalizedCurrentUserId = String(currentUserId ?? "").trim().toLowerCase()
  const rowUserId = String(player?.userId ?? "").trim().toLowerCase()
  if (normalizedCurrentUserId && rowUserId === normalizedCurrentUserId) {
    return true
  }

  const normalizedCurrentUsername = String(currentUsername ?? "").trim().toLowerCase()
  return Boolean(normalizedCurrentUsername && rowName === normalizedCurrentUsername)
}

function getLeaderboardRows(
  roundHistory,
  playerRankLabel,
  playerRankMmr,
  playerCoins,
  playerLevel,
  currentUserId,
) {
  const rankedHistory = getRankedHistory(roundHistory)
  const playerStats = buildPlayerLeaderboardStats(rankedHistory)
  const mergedRows = [
    {
      username: "You",
      userId: currentUserId || "local-player",
      bestScore: playerStats.bestScore,
      bestStreak: playerStats.bestStreak,
      accuracy: playerStats.accuracy,
      rankLabel: playerRankLabel,
      mmr: playerRankMmr,
      coins: playerCoins,
      level: playerLevel,
    },
    ...MOCK_LEADERBOARD,
  ]

  return mergedRows
    .sort((firstRow, secondRow) => secondRow.bestScore - firstRow.bestScore)
    .slice(0, 5)
}

function SortableHeader({ label, columnKey, sortConfig, onSort }) {
  const isActive = sortConfig.key === columnKey
  const ariaSort = isActive
    ? (sortConfig.direction === "asc" ? "ascending" : "descending")
    : "none"

  return (
    <th className="leaderboardNumeric" aria-sort={ariaSort}>
      <button
        type="button"
        className={`leaderboardSortButton${isActive ? " isActive" : ""}`}
        onClick={() => onSort(columnKey)}
      >
        <span>{label}</span>
        {isActive ? (
          <span className="leaderboardSortIndicator" aria-hidden="true">
            <span className={sortConfig.direction === "asc" ? "isActive" : ""}>{"\u25B2"}</span>
            <span className={sortConfig.direction === "desc" ? "isActive" : ""}>{"\u25BC"}</span>
          </span>
        ) : null}
      </button>
    </th>
  )
}

function TierBadge({ tierLabel = "Unranked" }) {
  const normalizedLabel = String(tierLabel || "Unranked").trim()
  const tierVariant = normalizedLabel.toLowerCase()
  const rankImageSrc = getRankImageSrc(normalizedLabel)

  return (
    <span className={`leaderboardTierBadge is-${tierVariant}`}>
      {rankImageSrc ? <img src={rankImageSrc} alt="" className="leaderboardTierBadgeIcon" /> : null}
      <span>{normalizedLabel}</span>
    </span>
  )
}

export default function LeaderboardPage({
  roundHistory = [],
  playerRankLabel = "Unranked",
  playerRankMmr = 0,
  playerCoins = 0,
  playerLevel = 1,
  currentUserId = "",
  currentUsername = "",
}) {
  const navigate = useNavigate()
  const [sortConfig, setSortConfig] = useState(DEFAULT_SORT)

  const leaderboardRows = useMemo(
    () =>
      getLeaderboardRows(
        roundHistory,
        playerRankLabel,
        playerRankMmr,
        playerCoins,
        playerLevel,
        currentUserId,
      ).map((row, rowIndex) => ({ ...row, rowIndex })),
    [currentUserId, playerCoins, playerLevel, playerRankLabel, playerRankMmr, roundHistory],
  )

  const sortedRows = useMemo(() => {
    return [...leaderboardRows].sort((firstRow, secondRow) => {
      const firstValue = getSortableValue(firstRow, sortConfig.key)
      const secondValue = getSortableValue(secondRow, sortConfig.key)
      const directionMultiplier = sortConfig.direction === "asc" ? 1 : -1

      if (firstValue !== secondValue) {
        return (firstValue - secondValue) * directionMultiplier
      }

      // Stable fallback preserves source order when values are tied.
      return firstRow.rowIndex - secondRow.rowIndex
    })
  }, [leaderboardRows, sortConfig])

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

  function handleProfileOpen(player, isCurrentUser) {
    if (isCurrentUser) {
      navigate("/profile")
      return
    }

    console.log(`[Leaderboard] Open profile requested for: ${player.username}`)
  }

  function handleRowKeyDown(event, player, isCurrentUser) {
    if (event.key !== "Enter" && event.key !== " ") return
    event.preventDefault()
    handleProfileOpen(player, isCurrentUser)
  }

  return (
    <div className="pageCenter">
      <section className="card">
        <h1 className="cardTitle">Leaderboard</h1>
        <p className="muted">
          Ranked leaderboard. Only Ranked mode rounds affect rank/MMR placement.
        </p>

        <InfoStrip
          points={LEADERBOARD_INSIGHTS}
          collapsible
          defaultCollapsed
          summary={LEADERBOARD_INSIGHTS[0]}
        />

        <table className="table helpTable leaderboardTable">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Tier</th>
              {SORTABLE_COLUMNS.map((column) => (
                <SortableHeader
                  key={column.key}
                  label={column.label}
                  columnKey={column.key}
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((player, index) => {
              const isCurrentUser = isCurrentUserRow(player, currentUserId, currentUsername)

              return (
                <tr
                  key={`${player.username}-${player.rowIndex}`}
                  className={`leaderboardTableRow${isCurrentUser ? " isCurrentUser" : ""}`}
                  tabIndex={0}
                  onClick={() => handleProfileOpen(player, isCurrentUser)}
                  onKeyDown={(event) => handleRowKeyDown(event, player, isCurrentUser)}
                  aria-label={`Open ${player.username} profile`}
                >
                  <td>{index + 1}</td>
                  <td>
                    <div className="leaderboardEntryHoverWrap">
                      <span className="leaderboardPlayerName">
                        {player.username}
                        {isCurrentUser ? <span className="leaderboardYouBadge">YOU</span> : null}
                      </span>
                      <div className="leaderboardEntryHoverCard">
                        <PlayerHoverCard
                          rankLabel={player.rankLabel}
                          rankMmr={player.mmr}
                          coins={player.coins}
                          level={player.level}
                          accuracy={player.accuracy}
                        />
                      </div>
                    </div>
                  </td>
                  <td><TierBadge tierLabel={player.rankLabel} /></td>
                  <td className="leaderboardNumeric">{formatNumericValue(player.mmr)}</td>
                  <td className="leaderboardNumeric">{formatNumericValue(player.bestScore)}</td>
                  <td className="leaderboardNumeric">{formatNumericValue(player.bestStreak)}</td>
                  <td className="leaderboardNumeric">{formatAccuracyPercent(player.accuracy)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </div>
  )
}
