import { useMemo } from "react"
import { Link } from "react-router-dom"

import InfoStrip from "../components/InfoStrip.jsx"
import { buildLoadoutPresentation } from "../constants/buildcraftPresentation.js"
import {
  DIFFICULTY_IDS,
  PROGRESSION_MODE,
  getDifficultyById as getModeById,
} from "../constants/difficultyConfig.js"
import { HISTORY_INSIGHTS, HISTORY_PREVIEW_FIELDS } from "../features/history/historyData.js"
import { buildHistorySnapshot } from "../features/history/historyInsights.js"
import { formatPercent } from "../utils/gameMath.js"
import { formatPlayedAtLabel } from "../utils/historyUtils.js"
import { getModeLabelFromHistoryEntry, isRankedModeEntry } from "../utils/modeUtils.js"

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

function resolveHistoryModeId(round = {}) {
  if (round.modeId || round.difficultyId) {
    return round.modeId ?? round.difficultyId
  }

  if (round.progressionMode === PROGRESSION_MODE.RANKED) {
    return DIFFICULTY_IDS.HARD
  }

  if (round.progressionMode === PROGRESSION_MODE.PRACTICE) {
    return DIFFICULTY_IDS.EASY
  }

  return DIFFICULTY_IDS.NORMAL
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

export default function HistoryPage({ roundHistory = [] }) {
  const historyRows = useMemo(
    () => (Array.isArray(roundHistory) ? roundHistory : []),
    [roundHistory]
  )
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

    if (historySnapshot.bestScoreRound) {
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
    <div className="pageCenter">
      <section className="cardWide historyPageCard">
        <header className="historyHero">
          <div className="historyHeroText">
            <p className="historyEyebrow">Performance Timeline</p>
            <h1 className="cardTitle">Match History</h1>
            <p className="muted historyLead">
              Review how your recent rounds, standout performances, and ranked pushes are stacking up over time.
            </p>
          </div>
        </header>

        <InfoStrip
          title="How history works"
          points={HISTORY_INSIGHTS}
          collapsible
          defaultCollapsed
          summary="Practice stays training-only. Ranked is the only mode that moves rating."
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
            {highlightCards.length > 0 ? (
              <section className="historyHighlightsSection" aria-label="Round highlights">
                <div className="historySectionHeader">
                  <div>
                    <h2 className="historySectionTitle">Highlights</h2>
                    <p className="historySectionDescription">
                      Callouts that make the log easier to scan and more rewarding to revisit.
                    </p>
                  </div>
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
                <div>
                  <h2 className="historySectionTitle">Full Log</h2>
                  <p className="historySectionDescription">
                    Every saved round, ordered from newest to oldest.
                  </p>
                </div>
              </div>

              <div className="historyTableWrap">
                <table className="table helpTable historyTable">
                  <thead>
                    <tr>
                      <th>Played</th>
                      <th>Mode</th>
                      <th>Build</th>
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
                    {historyRows.map((round) => {
                      const rowMarkers = getRoundMarkers(round, historySnapshot)
                      const roundMode = getModeById(resolveHistoryModeId(round))
                      const loadoutPresentation = round.loadoutSnapshot
                        ? buildLoadoutPresentation(roundMode, round.loadoutSnapshot)
                        : null

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
                          <td className="historyBuildCell">
                            <strong className="historyBuildName">
                              {round.loadoutSnapshot?.loadoutName ?? "\u2014"}
                            </strong>
                            {loadoutPresentation?.titleLine ? (
                              <span className="historyBuildMeta">{loadoutPresentation.titleLine}</span>
                            ) : null}
                          </td>
                          <td className="historyNumericCell historyScoreCell">{formatNumber(round.score)}</td>
                          <td className="historyNumericCell">{formatNumber(round.hits)}</td>
                          <td className="historyNumericCell">{formatNumber(round.misses)}</td>
                          <td className="historyNumericCell historyAccuracyCell">
                            {formatPercent(round.accuracyPercent)}
                          </td>
                          <td className="historyNumericCell">{formatNumber(round.coinsEarned)}</td>
                          <td className="historyNumericCell">{formatNumber(round.xpEarned ?? 0)}</td>
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
            </section>
          </main>
        )}
      </section>
    </div>
  )
}
