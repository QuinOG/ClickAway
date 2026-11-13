import { useCallback, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  ArrowRight,
  ClockCounterClockwise,
  Coins,
  Crosshair,
  Lightning,
  Target,
  TrendDown,
  TrendUp,
} from "@phosphor-icons/react"

import { CommandHeader } from "../components/RouteScene.jsx"
import { CoinIcon, GemIcon, ModeEmblem } from "../components/art/GameIcons.jsx"
import { HISTORY_PREVIEW_FIELDS } from "../features/history/historyPageTableFieldsAndInsights.js"
import { buildHistorySnapshot } from "../features/history/historyRoundsSnapshotBuilder.js"
import { fetchHistoryPage } from "../services/clickAwayHttpApiClient.js"
import { formatPercent } from "../utils/gameMath.js"
import { normalizeHistoryEntry } from "../utils/historyUtils.js"
import { formatPlayedAtLabel } from "../utils/historyUtils.js"
import { getModeLabelFromHistoryEntry, isRankedModeEntry } from "../utils/gameModeLabelsAndRankedFilters.js"

function formatRankDelta(rankDelta = 0) {
  const normalizedDelta = Number.isFinite(Number(rankDelta)) ? Number(rankDelta) : 0
  return `${normalizedDelta > 0 ? "+" : ""}${normalizedDelta}`
}

function formatNumber(value = 0) {
  return Number(value || 0).toLocaleString()
}

function getPlayedAtLabel(round = {}) {
  const playedAtDate = new Date(round.playedAtIso || Date.now())
  return Number.isNaN(playedAtDate.getTime())
    ? "\u2014"
    : formatPlayedAtLabel(playedAtDate)
}

function formatReactionTime(value) {
  const normalizedValue = Number(value)
  if (!Number.isFinite(normalizedValue) || normalizedValue <= 0) return "\u2014"
  return `${Math.round(normalizedValue)} ms`
}

function getModeToneClassName(round = {}) {
  const modeLabel = getModeLabelFromHistoryEntry(round).toLowerCase()

  if (modeLabel === "ranked") return "isRanked"
  if (modeLabel === "casual") return "isCasual"
  if (modeLabel === "practice") return "isPractice"
  return "isUnknown"
}

function getRankResultText(round = {}) {
  if (!isRankedModeEntry(round)) return "No change"

  const normalizedDelta = Number(round.rankDelta) || 0
  if (normalizedDelta === 0) return "Even"

  return `${formatRankDelta(normalizedDelta)} RR`
}

function getRankResultToneClassName(round = {}) {
  if (!isRankedModeEntry(round)) return "isNeutral"

  const normalizedDelta = Number(round.rankDelta) || 0
  if (normalizedDelta > 0) return "isPositive"
  if (normalizedDelta < 0) return "isNegative"
  return "isNeutral"
}

function getRoundMarkers(round = {}, historySnapshot = {}) {
  const markers = []

  if (historySnapshot.latestRound?.id === round.id) {
    markers.push("Latest")
  }

  if (historySnapshot.bestScoreRound?.id === round.id && Number(round.score) > 0) {
    markers.push("Peak score")
  }

  if (
    historySnapshot.cleanestRound?.id === round.id
    && Number(round.hits) + Number(round.misses) > 0
  ) {
    markers.push("Sharpest")
  }

  if (
    historySnapshot.bestRankGainRound?.id === round.id
    && Number(historySnapshot.bestRankGain) > 0
  ) {
    markers.push("Best climb")
  }

  return markers.slice(0, 2)
}

function HighlightCard({ eyebrow, title, value, meta, stats = [], tone = "neutral" }) {
  return (
    <article className={`historyHighlightCard tone-${tone}`}>
      <p className="historyHighlightEyebrow">{eyebrow}</p>
      <h3 className="historyHighlightTitle">{title}</h3>
      <p className="historyHighlightValue">{value}</p>
      <p className="historyHighlightMeta">{meta}</p>
      <div className="historyHighlightStats" aria-label={`${title} details`}>
        {stats.map((stat) => (
          <span key={stat} className="historyHighlightStat">
            {stat}
          </span>
        ))}
      </div>
    </article>
  )
}

const TRAJECTORY_MODES = [
  { id: "practice", label: "Practice" },
  { id: "casual", label: "Casual" },
  { id: "ranked", label: "Ranked" },
]

// Modes have different timers and scoring pressure, so the trend compares one
// mode at a time (defaulting to the latest round's mode) instead of drawing a
// single line through Practice, Casual and Ranked scores.
const LINE_TONES = { ranked: "#ffc94a", casual: "#4fb8ff", practice: "#3ee59a" }

// The trend follows the page's single mode choice. "All" can't be drawn as one
// line, so it falls back to the latest round's mode and says so.
function HistoryTrajectory({ rounds = [], selectedMode = "all" }) {
  const isFollowingLatest = selectedMode === "all"
  const modeFilter = isFollowingLatest ? (rounds[0] ? getModeTone(rounds[0]) : "casual") : selectedMode
  const modeLabel = TRAJECTORY_MODES.find((mode) => mode.id === modeFilter)?.label ?? "Casual"
  const plottedRounds = rounds.filter((round) => getModeTone(round) === modeFilter).slice(0, 8).reverse()
  const scores = plottedRounds.map((round) => Number(round.score) || 0)
  const highestScore = Math.max(...scores, 1)
  const minimumScore = scores.length > 0 ? Math.min(...scores) : 0
  // Start the scale just under the lowest run so real movement is visible.
  const lowestScore = Math.max(0, Math.floor((minimumScore - (highestScore - minimumScore) * 0.35) / 10) * 10)
  const scoreRange = Math.max(1, highestScore - lowestScore)
  const plotPoints = scores.map((value, index) => ({
    x: ((index + 0.5) / scores.length) * 100,
    y: 100 - (34 + ((value - lowestScore) / scoreRange) * 66),
  }))
  const scoreChange = scores.length > 1 ? scores.at(-1) - scores[0] : 0
  const trendIcon = scoreChange >= 0
    ? <TrendUp weight="bold" />
    : <TrendDown weight="bold" />

  return (
    <section
      className="historyTrajectory"
      aria-label={plottedRounds.length === 0
        ? `${modeLabel} score trajectory: no ${modeLabel} rounds in loaded history.`
        : `${modeLabel} score trajectory across ${plottedRounds.length} recent rounds. ${scoreChange >= 0 ? "Up" : "Down"} ${Math.abs(scoreChange)} points from first to latest.`}
    >
      <div className="historyTrajectoryCopy">
        <p className="commandHeaderEyebrow">Score trend</p>
        <h2>{modeLabel} trajectory</h2>
        <span className={`historyTrajectoryDelta ${scoreChange >= 0 ? "isPositive" : "isNegative"}`}>
          <span aria-hidden="true">{trendIcon}</span>
          {scoreChange > 0 ? "+" : ""}{formatNumber(scoreChange)}
        </span>
      </div>

      <ol className="historyClimb" aria-hidden="true">
        {plottedRounds.length === 0 ? <li className="historyClimbEmpty">No {modeLabel} rounds in loaded history</li> : null}
        {plottedRounds.length > 1 ? (
          <li className="historyClimbAxis">
            {[100, 67, 34].map((level) => (
              <span key={level} style={{ "--axis": `${level}%` }}>
                {formatNumber(Math.round(lowestScore + ((level - 34) / 66) * scoreRange))}
              </span>
            ))}
          </li>
        ) : null}
        {plottedRounds.length > 1 ? (
          <li className="historyClimbLine" style={{ "--line-tone": LINE_TONES[modeFilter] ?? "#4fb8ff" }}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">
              <polygon points={`${plotPoints[0].x},100 ${plotPoints.map((point) => `${point.x},${point.y}`).join(" ")} ${plotPoints.at(-1).x},100`} />
              <polyline points={plotPoints.map((point) => `${point.x},${point.y}`).join(" ")} />
            </svg>
          </li>
        ) : null}
        {plottedRounds.map((round, index) => {
          const value = Number(round.score) || 0
          const height = 34 + ((value - lowestScore) / scoreRange) * 66
          const isBest = value === highestScore
          const isLatest = index === plottedRounds.length - 1
          return (
            <li
              key={round.id}
              className={`historyClimbStep ${getModeToneClassName(round)} ${isBest ? "isBest" : ""} ${isLatest ? "isLatest" : ""}`}
              style={{ "--climb": `${height}%` }}
            >
              <span className="historyClimbMedal">{isBest ? <i className="historyClimbCrown" /> : null}{formatNumber(value)}</span>
              <span className="historyClimbPillar" />
              <span className="historyClimbLabel">{isLatest ? "Latest" : `#${index + 1}`}</span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function getModeTone(round) {
  const label = getModeLabelFromHistoryEntry(round).toLowerCase()
  return label === "ranked" ? "ranked" : label === "practice" ? "practice" : "casual"
}

// Practice never pays coins or XP, so its record says so instead of showing
// reward numbers that contradict the rules.
function isPracticeRound(round) {
  return round.progressionMode === "practice" || (!round.progressionMode && round.modeId === "easy")
}

function HistoryRoundCard({ round, markers = [] }) {
  const isPractice = isPracticeRound(round)
  return (
    <article className={`historyRoundCard ${getModeToneClassName(round)}`}>
      <div className="historyRoundCardSignal" aria-hidden="true"><ModeEmblem tone={getModeTone(round)} size={40} /></div>
      <div className="historyRoundCardMain">
        <div className="historyRoundCardTopline">
          <span className={`historyModeBadge ${getModeToneClassName(round)}`}>
            {getModeLabelFromHistoryEntry(round)}
          </span>
          <time>{getPlayedAtLabel(round)}</time>
        </div>
        <strong className="historyRoundCardScore">{formatNumber(round.score)}</strong>
        <span className="historyRoundCardScoreLabel">score</span>
        <div className="historyRoundCardMeters">
          <span><Target weight="bold" aria-hidden="true" /> {formatPercent(round.accuracyPercent)}</span>
          <span><Crosshair weight="bold" aria-hidden="true" /> {formatNumber(round.hits)}/{formatNumber(Number(round.hits) + Number(round.misses))}</span>
          {isPractice ? (
            <span className="historyNoStakes">No stakes</span>
          ) : (
            <>
              <span><CoinIcon size={16} /> {formatNumber(round.coinsEarned)}</span>
              <span><GemIcon size={16} /> {formatNumber(round.xpEarned ?? 0)}</span>
            </>
          )}
        </div>
      </div>
      <div className="historyRoundCardOutcome">
        <span className={`historyRankBadge ${getRankResultToneClassName(round)}`}>{getRankResultText(round)}</span>
        {markers.map((marker) => <small key={marker}>{marker}</small>)}
      </div>
    </article>
  )
}

export default function HistoryPage({
  roundHistory = [],
  totalRoundCount = 0,
}) {
  const [logModeFilter, setLogModeFilter] = useState("all")
  const [extraHistoryRows, setExtraHistoryRows] = useState([])
  const [historyPage, setHistoryPage] = useState(1)
  const [hasMoreHistory, setHasMoreHistory] = useState(false)
  const [isLoadingMoreHistory, setIsLoadingMoreHistory] = useState(false)
  const [historyLoadError, setHistoryLoadError] = useState("")

  const historyRows = useMemo(() => {
    const baseRows = Array.isArray(roundHistory) ? roundHistory : []
    const mergedRows = [...baseRows]

    extraHistoryRows.forEach((entry) => {
      if (!mergedRows.some((row) => row.id === entry.id)) {
        mergedRows.push(entry)
      }
    })

    return mergedRows
  }, [extraHistoryRows, roundHistory])

  const filteredHistoryRows = useMemo(
    () => logModeFilter === "all"
      ? historyRows
      : historyRows.filter((round) => getModeLabelFromHistoryEntry(round).toLowerCase() === logModeFilter),
    [historyRows, logModeFilter]
  )
  const logModeLabel = TRAJECTORY_MODES.find((mode) => mode.id === logModeFilter)?.label ?? "All"
  const latestModeLabel = historyRows[0]
    ? TRAJECTORY_MODES.find((mode) => mode.id === getModeTone(historyRows[0]))?.label
    : null

  const resolvedTotalRoundCount = Math.max(
    totalRoundCount,
    historyRows.length
  )
  const canLoadMoreHistory = hasMoreHistory
    || (resolvedTotalRoundCount > historyRows.length && historyPage === 1)

  const handleLoadMoreHistory = useCallback(async () => {
    const nextPage = historyPage + 1
    setIsLoadingMoreHistory(true)
    setHistoryLoadError("")

    try {
      const historyResponse = await fetchHistoryPage({ page: nextPage })
      const nextEntries = (Array.isArray(historyResponse?.entries) ? historyResponse.entries : [])
        .map(normalizeHistoryEntry)

      setExtraHistoryRows((currentRows) => {
        const mergedRows = [...currentRows]
        nextEntries.forEach((entry) => {
          if (!mergedRows.some((row) => row.id === entry.id)) {
            mergedRows.push(entry)
          }
        })
        return mergedRows
      })
      setHistoryPage(nextPage)
      setHasMoreHistory(Boolean(historyResponse?.hasMore))
    } catch (error) {
      setHistoryLoadError(error?.message || "Unable to load older rounds.")
    } finally {
      setIsLoadingMoreHistory(false)
    }
  }, [historyPage])
  const hasHistory = historyRows.length > 0
  const historySnapshot = useMemo(
    () => buildHistorySnapshot(historyRows),
    [historyRows]
  )
  const highlightCards = useMemo(() => {
    const cards = []

    if (historySnapshot.latestRound) {
      cards.push({
        eyebrow: "Latest Run",
        title: `${getModeLabelFromHistoryEntry(historySnapshot.latestRound)} round`,
        value: `${formatNumber(historySnapshot.latestRound.score)} score`,
        meta: getPlayedAtLabel(historySnapshot.latestRound),
        stats: [
          `${formatPercent(historySnapshot.latestRound.accuracyPercent)} accuracy`,
          `${formatNumber(historySnapshot.latestRound.hits)} hits`,
          `${formatNumber(historySnapshot.latestRound.coinsEarned)} coins`,
        ],
        tone: "latest",
      })
    }

    const isLatestAlsoPeak = Boolean(
      historySnapshot.latestRound
      && historySnapshot.bestScoreRound
      && historySnapshot.latestRound.id === historySnapshot.bestScoreRound.id
    )

    if (isLatestAlsoPeak && cards[0]) {
      cards[0].eyebrow = "Latest run · Personal best"
    }

    if (historySnapshot.bestScoreRound && !isLatestAlsoPeak) {
      cards.push({
        eyebrow: "Peak Score",
        title: historySnapshot.bestScoreRound.loadoutSnapshot?.loadoutName || "Saved loadout",
        value: `${formatNumber(historySnapshot.bestScoreRound.score)} score`,
        meta: `${getModeLabelFromHistoryEntry(historySnapshot.bestScoreRound)} on ${getPlayedAtLabel(historySnapshot.bestScoreRound)}`,
        stats: [
          `${formatPercent(historySnapshot.bestScoreRound.accuracyPercent)} accuracy`,
          `${formatNumber(historySnapshot.bestScoreRound.bestStreak)} best streak`,
          formatReactionTime(historySnapshot.bestScoreRound.bestReactionMs),
        ],
        tone: "score",
      })
    }

    if (historySnapshot.bestRankGainRound && historySnapshot.bestRankGain > 0) {
      cards.push({
        eyebrow: "Ranked Surge",
        title: historySnapshot.bestRankGainRound.loadoutSnapshot?.loadoutName || "Ranked push",
        value: `${formatRankDelta(historySnapshot.bestRankGainRound.rankDelta)} RR`,
        meta: getPlayedAtLabel(historySnapshot.bestRankGainRound),
        stats: [
          `${formatNumber(historySnapshot.bestRankGainRound.score)} score`,
          `${formatPercent(historySnapshot.bestRankGainRound.accuracyPercent)} accuracy`,
          `${formatNumber(historySnapshot.bestRankGainRound.bestStreak)} streak`,
        ],
        tone: "rank",
      })
    } else if (historySnapshot.cleanestRound) {
      cards.push({
        eyebrow: "Accuracy Highlight",
        title: historySnapshot.cleanestRound.loadoutSnapshot?.loadoutName || "Sharpest round",
        value: formatPercent(historySnapshot.cleanestRound.accuracyPercent),
        meta: `${getModeLabelFromHistoryEntry(historySnapshot.cleanestRound)} on ${getPlayedAtLabel(historySnapshot.cleanestRound)}`,
        stats: [
          `${formatNumber(historySnapshot.cleanestRound.score)} score`,
          `${formatNumber(historySnapshot.cleanestRound.hits)} hits`,
          `${formatNumber(historySnapshot.cleanestRound.misses)} misses`,
        ],
        tone: "accuracy",
      })
    }

    return cards
  }, [historySnapshot])

  return (
    <div className="pageCenter historyPageScene">
      <section className="cardWide historyPageCard">
        <CommandHeader
          routeId="history"
          eyebrow="Replay archive"
          title="Match history"
          subtitle="See the shape of your progress, then inspect every run."
          status={(
            <span className="historyArchiveCount">
              <ClockCounterClockwise weight="bold" aria-hidden="true" />
              <strong>{formatNumber(resolvedTotalRoundCount)}</strong>
              <small>saved rounds</small>
            </span>
          )}
        />

        {!hasHistory ? (
          <section className="historyEmptyState" role="status" aria-live="polite">
            <p className="historyEmptyEyebrow">No rounds logged</p>
            <h2 className="historyEmptyTitle">Your match history will appear here after your first run.</h2>
            <p className="historyEmptyLead">
              Finish a round to start tracking score, accuracy, rewards, and ranked results over time.
            </p>
            <div className="historyEmptyActions">
              <Link className="primaryButton" to="/game">
                Play a Round
              </Link>
            </div>
            <div className="historyPreviewWrap" aria-label="History fields preview">
              <p className="historyPreviewTitle">What gets tracked</p>
              <div className="historyPreviewGrid">
                {HISTORY_PREVIEW_FIELDS.map((field) => (
                  <span key={field} className="historyPreviewChip">
                    {field}
                  </span>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <main className="historyContent">
            <div className="historyModeFilters" role="group" aria-label="Mode for score trend and match log">
              <span className="historyModeFilterLabel">Mode · score trend and match log</span>
              {[{ id: "all", label: "All" }, ...TRAJECTORY_MODES].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  className="secondaryButton"
                  data-mode={mode.id}
                  aria-pressed={logModeFilter === mode.id}
                  onClick={() => setLogModeFilter(mode.id)}
                >
                  {mode.label}
                </button>
              ))}
              {logModeFilter === "all" && latestModeLabel ? (
                <p className="historyModeFilterNote">
                  With All, the score trend shows your latest mode ({latestModeLabel}).
                </p>
              ) : null}
            </div>

            <HistoryTrajectory rounds={historyRows} selectedMode={logModeFilter} />

            {highlightCards.length > 0 ? (
              <section className="historyHighlightsSection" aria-label="Round highlights">
                <div className="historySectionHeader">
                  <h2 className="historySectionTitle">Highlights</h2>
                </div>
                <div className="historyHighlightsGrid">
                  {highlightCards.map((card) => (
                    <HighlightCard
                      key={`${card.eyebrow}-${card.title}-${card.value}`}
                      eyebrow={card.eyebrow}
                      title={card.title}
                      value={card.value}
                      meta={card.meta}
                      stats={card.stats}
                      tone={card.tone}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            <section className="historyLogSection" aria-label="Full match log">
              <div className="historySectionHeader">
                <h2 className="historySectionTitle">Full Log</h2>
              </div>

              <p className="historySectionDescription" role="status" aria-live="polite" aria-atomic="true">
                Showing {formatNumber(filteredHistoryRows.length)} of {formatNumber(historyRows.length)} loaded rounds
                {logModeFilter === "all" ? " · All modes" : ` · ${logModeLabel}`}
              </p>
              {canLoadMoreHistory ? (
                <p className="historySectionDescription">
                  Older rounds aren't loaded yet. Use Load older rounds below the list to include them.
                </p>
              ) : null}

              {filteredHistoryRows.length === 0 ? (
                <div className="historyLogNoMatches">
                  <p>No {logModeLabel} rounds in the loaded matches.</p>
                  <button type="button" className="secondaryButton" onClick={() => setLogModeFilter("all")}>
                    Show all rounds
                  </button>
                </div>
              ) : (
                <>
                  <div className="historyTableWrap">
                    <table className="table helpTable historyTable">
                      <thead>
                        <tr>
                          <th>Played</th>
                          <th>Mode</th>
                          <th className="historyNumericColumn">Score</th>
                          <th className="historyNumericColumn">Hits</th>
                          <th className="historyNumericColumn">Misses</th>
                          <th className="historyNumericColumn">Accuracy</th>
                          <th className="historyNumericColumn">Coins</th>
                          <th className="historyNumericColumn">XP</th>
                          <th className="historyNumericColumn">Rank Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredHistoryRows.map((round) => {
                          const rowMarkers = getRoundMarkers(round, historySnapshot)

                          return (
                            <tr key={round.id} className="historyTableRow">
                              <td className="historyPlayedCell">
                                <div className="historyPlayedPrimary">{getPlayedAtLabel(round)}</div>
                                {rowMarkers.length > 0 ? (
                                  <div className="historyRowMarkers" aria-label="Round highlights">
                                    {rowMarkers.map((marker) => (
                                      <span key={marker} className="historyRowMarker">
                                        {marker}
                                      </span>
                                    ))}
                                  </div>
                                ) : null}
                              </td>
                              <td>
                                <span className={`historyModeBadge ${getModeToneClassName(round)}`}>
                                  {getModeLabelFromHistoryEntry(round)}
                                </span>
                              </td>
                              <td className="historyNumericCell historyScoreCell">{formatNumber(round.score)}</td>
                              <td className="historyNumericCell">{formatNumber(round.hits)}</td>
                              <td className="historyNumericCell">{formatNumber(round.misses)}</td>
                              <td className="historyNumericCell historyAccuracyCell">
                                {formatPercent(round.accuracyPercent)}
                              </td>
                              <td className="historyNumericCell">{isPracticeRound(round) ? "—" : formatNumber(round.coinsEarned)}</td>
                              <td className="historyNumericCell">{isPracticeRound(round) ? "—" : formatNumber(round.xpEarned ?? 0)}</td>
                              <td className="historyNumericCell">
                                <span className={`historyRankBadge ${getRankResultToneClassName(round)}`}>
                                  {getRankResultText(round)}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="historyRoundDeck" aria-label="Match cards">
                    {filteredHistoryRows.map((round) => (
                      <HistoryRoundCard
                        key={round.id}
                        round={round}
                        markers={getRoundMarkers(round, historySnapshot)}
                      />
                    ))}
                  </div>
                </>
              )}

              {canLoadMoreHistory ? (
                <div className="historyPagination">
                  <button
                    type="button"
                    className="secondaryButton"
                    onClick={handleLoadMoreHistory}
                    disabled={isLoadingMoreHistory}
                  >
                    {isLoadingMoreHistory ? "Loading older rounds..." : "Load older rounds"}
                  </button>
                  {historyLoadError ? (
                    <p className="historyPaginationError" role="alert">
                      {historyLoadError}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </section>

            {historySnapshot.recentSampleSize >= 3 ? (
              <section className="historyTrendStrip" aria-label="Recent performance trend">
                <p className="historyTrendLabel">
                  Last {historySnapshot.recentSampleSize} rounds
                </p>
                <div className="historyTrendStats">
                  <span className="historyTrendStat">
                    <span className="historyTrendStatLabel">Avg Score</span>
                    <strong className="historyTrendStatValue">
                      {formatNumber(historySnapshot.recentAverageScore)}
                    </strong>
                  </span>
                  <span className="historyTrendStat">
                    <span className="historyTrendStatLabel">Avg Accuracy</span>
                    <strong className="historyTrendStatValue">
                      {formatPercent(historySnapshot.recentAccuracyPercent)}
                    </strong>
                  </span>
                  {historySnapshot.recentRankedSampleSize > 0 ? (
                    <span className="historyTrendStat">
                      <span className="historyTrendStatLabel">Net RR</span>
                      <strong className={`historyTrendStatValue ${historySnapshot.recentRankDelta > 0 ? "isTrendPositive" : historySnapshot.recentRankDelta < 0 ? "isTrendNegative" : ""}`}>
                        {historySnapshot.recentRankDelta > 0 ? "+" : ""}{historySnapshot.recentRankDelta} RR
                      </strong>
                    </span>
                  ) : null}
                </div>
              </section>
            ) : null}
          </main>
        )}
      </section>
    </div>
  )
}
