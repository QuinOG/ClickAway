import { PowerupGlyph } from "../../buildcraft/loadoutBuildcraftGlyphIcons.jsx"
import { getProfileStats } from "../armorySpecRatings.js"

/**
 * The build's service manual, slid out from the machine. It carries the plain-
 * language read the old Review step used to show — strengths, tradeoffs, hotbar
 * cadence — with the exact round values kept one calm toggle away.
 */
function ArmorySpecSheetProfile({ roundRules }) {
  return (
    <section className="armorySpecSheetPanel armorySpecProfile" aria-label="Performance profile">
      <span className="armorySpecSheetPanelTitle">Performance profile</span>
      {getProfileStats(roundRules).map((stat) => (
        <div
          key={stat.key}
          className={`armorySpecStat ${stat.rating >= 7 ? "isHigh" : stat.rating <= 3 ? "isLow" : ""}`}
        >
          <span className="armorySpecStatLabel">{stat.label}</span>
          <span className="armorySpecStatBar" aria-hidden="true">
            {Array.from({ length: 10 }, (_, index) => (
              <i key={index} className={index < stat.rating ? "isOn" : ""} />
            ))}
          </span>
          <span className="armorySpecStatValue">{stat.value}</span>
        </div>
      ))}
    </section>
  )
}

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
  const tiles = [
    { key: "best", label: "Best score", value: loadoutStats.bestScore.toLocaleString(), isHero: true },
    { key: "streak", label: "Best streak", value: loadoutStats.bestStreak },
    { key: "rounds", label: "Rounds", value: loadoutStats.totalRounds },
    accuracyPercent !== null ? { key: "acc", label: "Accuracy", value: `${accuracyPercent}%` } : null,
  ].filter(Boolean)

  return (
    <section className="armorySpecSheetPanel">
      <span className="armorySpecSheetPanelTitle">Field record</span>
      <div className="armorySpecRecordTiles">
        {tiles.map((tile) => (
          <div key={tile.key} className={`armorySpecRecordTile ${tile.isHero ? "isHero" : ""}`}>
            <strong>{tile.value}</strong>
            <span>{tile.label}</span>
          </div>
        ))}
      </div>
      {rankedWinRate !== null ? (
        <p className="armorySpecRecordNote">
          Ranked record {loadoutStats.rankedWins}/{loadoutStats.rankedRounds} ({rankedWinRate}%)
        </p>
      ) : null}
    </section>
  )
}

export default function ArmorySpecSheet({
  isOpen,
  onClose,
  loadoutName,
  modeLabel,
  presentation,
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

        <ArmorySpecSheetProfile roundRules={roundRules} />

        <section className="armorySpecSheetPanel">
          <span className="armorySpecSheetPanelTitle">Strengths &amp; tradeoffs</span>
          <div className="armoryChipRow">
            {presentation.strengths.map((item) => (
              <span key={item} className="armorySnapshotChip tone-good">{item}</span>
            ))}
            {presentation.tradeoffs.map((item) => (
              <span key={item} className="armorySnapshotChip tone-risk">{item}</span>
            ))}
          </div>
        </section>

        <section className="armorySpecSheetPanel">
          <span className="armorySpecSheetPanelTitle">Powerup timing</span>
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

      </aside>
    </>
  )
}
