import { PowerupGlyph } from "../../buildcraft/loadoutBuildcraftGlyphIcons.jsx"
import { formatSignedPercent } from "../armoryUtils.js"

/**
 * The build's service manual, slid out from the machine. It carries the plain-
 * language read the old Review step used to show — strengths, tradeoffs, hotbar
 * cadence — with the exact round values kept one calm toggle away.
 */
function ArmorySpecSheetFieldRecord({ loadoutStats }) {
  if (!loadoutStats || loadoutStats.totalRounds <= 0) {
    return (
      <section className="armorySpecSheetPanel">
        <span className="armorySpecSheetPanelTitle">Field record</span>
        <p className="armorySpecSheetEmptyRecord">No field data yet — take it to the arena.</p>
      </section>
    )
  }

  const attempts = loadoutStats.totalHits + loadoutStats.totalMisses
  const accuracyPercent = attempts > 0 ? Math.round((loadoutStats.totalHits / attempts) * 100) : null
  const rankedWinRate = loadoutStats.rankedRounds > 0
    ? Math.round((loadoutStats.rankedWins / loadoutStats.rankedRounds) * 100)
    : null

  return (
    <section className="armorySpecSheetPanel">
      <span className="armorySpecSheetPanelTitle">Field record</span>
      <div className="armoryDetailRows">
        <div className="armoryDetailRow">
          <span className="armoryDetailLabel">Rounds played</span>
          <span className="armoryDetailValue">{loadoutStats.totalRounds}</span>
        </div>
        <div className="armoryDetailRow">
          <span className="armoryDetailLabel">Best score</span>
          <span className="armoryDetailValue">{loadoutStats.bestScore.toLocaleString()}</span>
        </div>
        <div className="armoryDetailRow">
          <span className="armoryDetailLabel">Best streak</span>
          <span className="armoryDetailValue">{loadoutStats.bestStreak}</span>
        </div>
        {accuracyPercent !== null ? (
          <div className="armoryDetailRow">
            <span className="armoryDetailLabel">Accuracy</span>
            <span className="armoryDetailValue">{accuracyPercent}%</span>
          </div>
        ) : null}
        {rankedWinRate !== null ? (
          <div className="armoryDetailRow">
            <span className="armoryDetailLabel">Ranked record</span>
            <span className="armoryDetailValue">
              {loadoutStats.rankedWins}/{loadoutStats.rankedRounds} ({rankedWinRate}%)
            </span>
          </div>
        ) : null}
      </div>
    </section>
  )
}

export default function ArmorySpecSheet({
  isOpen,
  onClose,
  loadoutName,
  modeLabel,
  presentation,
  showDetails,
  onToggleDetails,
  loadoutStats = null,
}) {
  if (!isOpen) return null

  const { roundRules } = presentation

  return (
    <>
      <div className="armorySpecSheetScrim" onClick={onClose} aria-hidden="true" />
      <aside className="armorySpecSheet" role="dialog" aria-label="Build spec sheet">
        <header className="armorySpecSheetHeader">
          <div>
            <p className="armorySpecSheetEyebrow">Spec sheet · {modeLabel}</p>
            <h2 className="armorySpecSheetTitle">{loadoutName}</h2>
          </div>
          <button type="button" className="secondaryButton" onClick={onClose}>
            Close
          </button>
        </header>

        <p className="armorySpecSheetLead">{presentation.glanceText}</p>
        <p className="armorySpecSheetNote">{presentation.bestFor}</p>

        <section className="armorySpecSheetPanel">
          <span className="armorySpecSheetPanelTitle">Strengths</span>
          <div className="armoryChipRow">
            {presentation.strengths.map((item) => (
              <span key={item} className="armorySnapshotChip tone-good">{item}</span>
            ))}
          </div>
        </section>

        <section className="armorySpecSheetPanel">
          <span className="armorySpecSheetPanelTitle">Tradeoffs</span>
          <div className="armoryChipRow">
            {presentation.tradeoffs.map((item) => (
              <span key={item} className="armorySnapshotChip tone-risk">{item}</span>
            ))}
          </div>
        </section>

        <section className="armorySpecSheetPanel">
          <span className="armorySpecSheetPanelTitle">Hotbar cadence</span>
          <div className="armoryReviewPowerList">
            {presentation.powerSlots.map((powerSlot, index) => (
              <div key={`${powerSlot.id}-${index + 1}`} className="armoryReviewPowerItem">
                <span className="armoryReviewPowerKey">{index + 1}</span>
                <span className="armoryReviewPowerGlyph" aria-hidden="true">
                  <PowerupGlyph powerupId={powerSlot.id} />
                </span>
                <span className="armoryReviewPowerBody">
                  <strong className="armoryReviewPowerLabel">{powerSlot.label}</strong>
                  <span className="armoryReviewPowerMeta">{powerSlot.cadenceLabel}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        <ArmorySpecSheetFieldRecord loadoutStats={loadoutStats} />

        <button
          type="button"
          className="secondaryButton armoryReviewToggle"
          onClick={() => onToggleDetails((current) => !current)}
          aria-expanded={showDetails}
        >
          {showDetails ? "Hide Exact Values" : "Show Exact Values"}
        </button>

        {showDetails ? (
          <section className="armoryReviewDetails">
            <div className="armoryDetailRows">
              <div className="armoryDetailRow">
                <span className="armoryDetailLabel">Start size</span>
                <span className="armoryDetailValue">{roundRules.initialButtonSize}</span>
              </div>
              <div className="armoryDetailRow">
                <span className="armoryDetailLabel">Min size</span>
                <span className="armoryDetailValue">{roundRules.minButtonSize}</span>
              </div>
              <div className="armoryDetailRow">
                <span className="armoryDetailLabel">Shrink factor</span>
                <span className="armoryDetailValue">{Number(roundRules.shrinkFactor).toFixed(2)}</span>
              </div>
              <div className="armoryDetailRow">
                <span className="armoryDetailLabel">Combo step</span>
                <span className="armoryDetailValue">{roundRules.comboStep}</span>
              </div>
              <div className="armoryDetailRow">
                <span className="armoryDetailLabel">Miss penalty</span>
                <span className="armoryDetailValue">{roundRules.missPenalty}</span>
              </div>
              <div className="armoryDetailRow">
                <span className="armoryDetailLabel">Score multiplier</span>
                <span className="armoryDetailValue">{formatSignedPercent(roundRules.scoreMultiplier)}</span>
              </div>
              <div className="armoryDetailRow">
                <span className="armoryDetailLabel">Charge rate</span>
                <span className="armoryDetailValue">x{Number(roundRules.powerupAwardMultiplier).toFixed(2)}</span>
              </div>
              <div className="armoryDetailRow">
                <span className="armoryDetailLabel">Starting charges</span>
                <span className="armoryDetailValue">{roundRules.startingPowerupCharges}</span>
              </div>
            </div>
          </section>
        ) : null}
      </aside>
    </>
  )
}
