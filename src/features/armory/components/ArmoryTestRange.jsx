import { useEffect } from "react"

import GameArena from "../../game/components/GameArena.jsx"
import PowerupTray from "../../game/components/PowerupTray.jsx"
import { RANGE_PHASE, useArmoryRangeRound } from "../hooks/useArmoryRangeRound.js"

function RangeReadout({ range }) {
  return (
    <div className="armoryRangeReadout" aria-hidden="true">
      <div className="armoryRangeReadoutStat">
        <span className="armoryRangeReadoutLabel">Score</span>
        <strong className="armoryRangeReadoutValue">{range.score}</strong>
      </div>
      <div className="armoryRangeReadoutStat">
        <span className="armoryRangeReadoutLabel">Streak</span>
        <strong className="armoryRangeReadoutValue">
          {range.streak}
          {range.comboMultiplier > 1 ? <span className="armoryRangeCombo"> x{range.comboMultiplier}</span> : null}
        </strong>
      </div>
      <div className="armoryRangeReadoutStat">
        <span className="armoryRangeReadoutLabel">Time</span>
        <strong className="armoryRangeReadoutValue">{range.timeLeft}s</strong>
      </div>
    </div>
  )
}

// Last range sample per build+rules, kept for the session so a second run
// always has a baseline to compare against.
const rangeHistory = new Map()

function getAccuracyValue(results) {
  const total = results.hits + results.misses
  return total > 0 ? Math.round((results.hits / total) * 100) : 0
}

const RESULT_ROWS = [
  { key: "hits", label: "Hits", read: (r) => r.hits, format: (v) => v },
  { key: "bestStreak", label: "Best streak", read: (r) => r.bestStreak, format: (v) => v },
  { key: "accuracy", label: "Accuracy", read: getAccuracyValue, format: (v) => `${v}%` },
  { key: "chargesEarned", label: "Charges", read: (r) => r.chargesEarned, format: (v) => v },
]

function RangeResults({ results, previous, onRunAgain, onExit }) {
  return (
    <div className="armoryRangeResults" role="dialog" aria-label="Range results">
      <p className="armoryRangeResultsEyebrow">Range sample</p>
      <div className="armoryRangeResultsTable" role="table" aria-label="Latest run versus previous run">
        <div className="armoryRangeResultsRow isHead" role="row">
          <span role="columnheader">Stat</span>
          <span role="columnheader">Previous</span>
          <span role="columnheader">Latest</span>
          <span role="columnheader">Change</span>
        </div>
        {RESULT_ROWS.map((row) => {
          const latest = row.read(results)
          const before = previous ? row.read(previous) : null
          const delta = before === null ? null : latest - before
          const tone = delta === null || delta === 0 ? "is-same" : delta > 0 ? "is-gain" : "is-cost"
          return (
            <div key={row.key} className="armoryRangeResultsRow" role="row">
              <span role="cell" className="armoryRangeResultLabel">{row.label}</span>
              <span role="cell" className="armoryRangeResultPrev">{before === null ? "—" : row.format(before)}</span>
              <strong role="cell" className="armoryRangeResultValue">{row.format(latest)}</strong>
              <span role="cell" className={`armoryRangeResultDelta ${tone}`}>
                {delta === null ? "—" : `${delta > 0 ? "+" : delta < 0 ? "−" : "±"}${row.format(Math.abs(delta))}`}
              </span>
            </div>
          )
        })}
      </div>
      <p className="armoryRangeResultsNote">
        {previous ? "Compared with your last run on these exact rules." : "First sample on these rules — run again to get a baseline."}
        {" "}No XP, coins, or rank.
      </p>
      <div className="armoryRangeResultsActions">
        <button type="button" className="primaryButton" onClick={onRunAgain}>
          Run it again
        </button>
        <button type="button" className="secondaryButton" onClick={onExit}>
          Keep build
        </button>
      </div>
    </div>
  )
}

/**
 * The Test Range: clears the bench and runs a live 10-second sample of the
 * current build with the real engine, then reports an ephemeral, unrewarded
 * readout. It writes nothing to history, lifetime stats, or the server.
 */
export default function ArmoryTestRange({
  isOpen,
  roundRules,
  modeLabel,
  loadoutName,
  runToken,
  onRunAgain,
  onExit,
  buttonSkinClass = "",
  buttonSkinImageSrc = "",
  buttonSkinImageScale = 100,
  arenaThemeClass = "theme-default",
}) {
  const range = useArmoryRangeRound({ roundRules, isActive: isOpen, runToken, onExit })

  const historyKey = `${loadoutName}|${modeLabel}|${JSON.stringify(roundRules ?? {})}`
  const isRunDone = range.phase === RANGE_PHASE.DONE && Boolean(range.results)

  useEffect(() => {
    if (!isRunDone) return
    const entry = rangeHistory.get(historyKey)
    if (entry?.token === runToken) return
    rangeHistory.set(historyKey, { token: runToken, results: range.results, previous: entry?.results ?? null })
  }, [historyKey, isRunDone, range.results, runToken])

  if (!isOpen) return null

  const historyEntry = rangeHistory.get(historyKey)
  const previousResults = historyEntry?.token === runToken
    ? historyEntry.previous
    : historyEntry?.results ?? null
  const isDone = range.phase === RANGE_PHASE.DONE
  const isCountingDown = range.phase === RANGE_PHASE.COUNTDOWN

  return (
    <div className="armoryRange" role="group" aria-label="Test range">
      <header className="armoryRangeHeader">
        <div className="armoryRangeHeaderCopy">
          <p className="armoryRangeEyebrow">Test Range</p>
          <h2 className="armoryRangeTitle">{loadoutName} · {modeLabel}</h2>
        </div>
        <button type="button" className="secondaryButton" onClick={onExit}>
          Exit Range
        </button>
      </header>

      <div className="armoryRangeStage">
        <RangeReadout range={range} />

        <div className="armoryRangeArenaWrap">
          <GameArena
            {...range.arenaProps}
            arenaThemeClass={arenaThemeClass}
            buttonSkinClass={buttonSkinClass}
            buttonSkinImageSrc={buttonSkinImageSrc}
            buttonSkinImageScale={buttonSkinImageScale}
            roundOverlay={isCountingDown ? (
              <div className="armoryRangeCountdown" aria-hidden="true">
                <span className="armoryRangeCountdownValue">{range.countdownValue || "Go"}</span>
              </div>
            ) : null}
          />

          {isDone ? (
            <RangeResults results={range.results} previous={previousResults} onRunAgain={onRunAgain} onExit={onExit} />
          ) : null}
        </div>

        <PowerupTray {...range.powerupTrayProps} />
      </div>
    </div>
  )
}
