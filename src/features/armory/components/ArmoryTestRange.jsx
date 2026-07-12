import GameArena from "../../game/components/GameArena.jsx"
import PowerupTray from "../../game/components/PowerupTray.jsx"
import { formatAccuracy } from "../../../utils/gameMath.js"
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

function RangeResults({ results, onRunAgain, onExit }) {
  return (
    <div className="armoryRangeResults" role="dialog" aria-label="Range results">
      <p className="armoryRangeResultsEyebrow">Range sample</p>
      <div className="armoryRangeResultsGrid">
        <div className="armoryRangeResultStat">
          <span className="armoryRangeResultLabel">Hits</span>
          <strong className="armoryRangeResultValue">{results.hits}</strong>
        </div>
        <div className="armoryRangeResultStat">
          <span className="armoryRangeResultLabel">Best streak</span>
          <strong className="armoryRangeResultValue">{results.bestStreak}</strong>
        </div>
        <div className="armoryRangeResultStat">
          <span className="armoryRangeResultLabel">Accuracy</span>
          <strong className="armoryRangeResultValue">{formatAccuracy(results.hits, results.misses)}</strong>
        </div>
        <div className="armoryRangeResultStat">
          <span className="armoryRangeResultLabel">Charges earned</span>
          <strong className="armoryRangeResultValue">{results.chargesEarned}</strong>
        </div>
      </div>
      <p className="armoryRangeResultsNote">No XP, no coins, no rank — this is the range.</p>
      <div className="armoryRangeResultsActions">
        <button type="button" className="primaryButton" onClick={onRunAgain}>
          Run it again
        </button>
        <button type="button" className="secondaryButton" onClick={onExit}>
          Back to Bench
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

  if (!isOpen) return null

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
            <RangeResults results={range.results} onRunAgain={onRunAgain} onExit={onExit} />
          ) : null}
        </div>

        <PowerupTray {...range.powerupTrayProps} />
      </div>
    </div>
  )
}
