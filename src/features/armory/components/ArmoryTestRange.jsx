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
  { key: "score", label: "Score", read: (r) => r.score ?? 0, format: (v) => v },
  { key: "hits", label: "Hits", read: (r) => r.hits, format: (v) => v },
  { key: "bestStreak", label: "Best streak", read: (r) => r.bestStreak, format: (v) => v },
  { key: "accuracy", label: "Accuracy", read: getAccuracyValue, format: (v) => `${v}%` },
  { key: "chargesEarned", label: "Charges", read: (r) => r.chargesEarned, format: (v) => v },
]

function getVerdict(results, previous) {
  if (!previous) return { tone: "is-same", text: "Baseline recorded" }
  const delta = (results.score ?? 0) - (previous.score ?? 0)
  if (delta > 0) return { tone: "is-gain", text: `+${delta} score vs last run` }
  if (delta < 0) return { tone: "is-cost", text: `−${Math.abs(delta)} score vs last run` }
  return { tone: "is-same", text: "Even with last run" }
}

function RangeResults({ results, previous, partsChanged, runNumber, loadoutName, modeLabel, onRunAgain, onExit }) {
  const verdict = getVerdict(results, previous)
  const prevLabel = previous ? (partsChanged ? "Old parts" : `Run ${runNumber - 1}`) : "Previous"
  const latestLabel = previous && partsChanged ? "New parts" : `Run ${runNumber}`
  return (
    <div className="armoryRangeResults" role="dialog" aria-label="Range results">
      <p className="armoryRangeResultsEyebrow">Test complete · Run {runNumber}</p>
      <div className={`armoryRangeDuel ${verdict.tone}`} aria-hidden="true">
        <div className={`armoryRangeDuelPlate isPrev ${previous ? "" : "isEmpty"}`}>
          <span className="armoryRangeDuelLabel">{prevLabel}</span>
          <strong className="armoryRangeDuelScore">{previous ? previous.score ?? 0 : "—"}</strong>
        </div>
        <span className="armoryRangeDuelVs">VS</span>
        <div className="armoryRangeDuelPlate isLatest">
          <span className="armoryRangeDuelLabel">{latestLabel}</span>
          <strong className="armoryRangeDuelScore">{results.score ?? 0}</strong>
        </div>
      </div>
      <p className={`armoryRangeResultsVerdict ${verdict.tone}`}>{verdict.text}</p>
      <p className="armoryRangeResultsBuild">
        <strong>{loadoutName}</strong> · {modeLabel} rules
        <span className={`armoryRangeResultsMode ${partsChanged ? "isAB" : ""}`}>
          {!previous ? "First sample" : partsChanged ? "A/B: parts changed" : "Repeat: same parts"}
        </span>
      </p>
      <div className="armoryRangeResultsTable" role="table" aria-label="Latest run versus previous run">
        <div className="armoryRangeResultsRow isHead" role="row">
          <span role="columnheader">Stat</span>
          <span role="columnheader">{prevLabel}</span>
          <span role="columnheader">{latestLabel}</span>
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
        {!previous ? "Run again for a baseline, or swap a part and test to compare builds." : partsChanged ? "Compared with this build's last run before the part swap." : "Swap a part and test again to compare builds."}
        {" "}No XP, coins, or rank.
      </p>
      <div className="armoryRangeResultsActions">
        <button type="button" className="primaryButton" onClick={onRunAgain}>
          Run it again
        </button>
        <button type="button" className="secondaryButton" onClick={onExit}>
          Adjust build
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

  const historyKey = `${loadoutName}|${modeLabel}`
  const rulesKey = JSON.stringify(roundRules ?? {})
  const isRunDone = range.phase === RANGE_PHASE.DONE && Boolean(range.results)

  useEffect(() => {
    if (!isRunDone) return
    const entry = rangeHistory.get(historyKey)
    if (entry?.token === runToken) return
    rangeHistory.set(historyKey, { token: runToken, results: range.results, rulesKey, previous: entry?.results ?? null, previousRulesKey: entry?.rulesKey ?? null, count: (entry?.count ?? 0) + 1 })
  }, [historyKey, rulesKey, isRunDone, range.results, runToken])

  if (!isOpen) return null

  const historyEntry = rangeHistory.get(historyKey)
  const previousResults = historyEntry?.token === runToken
    ? historyEntry.previous
    : historyEntry?.results ?? null
  const previousRulesKey = historyEntry?.token === runToken ? historyEntry.previousRulesKey : historyEntry?.rulesKey ?? null
  const partsChanged = Boolean(previousResults) && previousRulesKey !== null && previousRulesKey !== rulesKey
  const runNumber = historyEntry?.token === runToken ? historyEntry.count : (historyEntry?.count ?? 0) + 1
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
            <RangeResults results={range.results} previous={previousResults} partsChanged={partsChanged} runNumber={runNumber} loadoutName={loadoutName} modeLabel={modeLabel} onRunAgain={onRunAgain} onExit={onExit} />
          ) : null}
        </div>

        <PowerupTray {...range.powerupTrayProps} />
      </div>
    </div>
  )
}
