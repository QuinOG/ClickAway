import { BuildIdentityGlyph } from "../../buildcraft/loadoutBuildcraftGlyphIcons.jsx"
import { PartEmblem } from "../../../components/art/GameIcons.jsx"

// Bay miniatures echo the center-stage machine at wall scale, so build size
// differences stay readable even from across the room.
export const BAY_TARGET_SCALE = 0.32

// Etched service plate: a one-line field record so a bay never has to be
// activated just to see how it's actually performed. Keyed on loadout.id
// (stable), never on the display name, so renames never orphan the record.
function ArmoryBayServicePlate({ stats }) {
  if (!stats || stats.totalRounds <= 0) {
    return <p className="armoryBayServicePlate isEmpty">No field data yet — take it to the arena.</p>
  }

  const attempts = stats.totalHits + stats.totalMisses
  const accuracyPercent = attempts > 0 ? Math.round((stats.totalHits / attempts) * 100) : null

  const summary = `${stats.totalRounds} round${stats.totalRounds === 1 ? "" : "s"}`
    + `${accuracyPercent !== null ? `, ${accuracyPercent}% accuracy` : ""}, best streak ${stats.bestStreak}`

  return (
    <div className="armoryBayServicePlate isTiles" role="img" aria-label={summary}>
      <span className="armoryBayServiceRing" style={{ "--acc": `${accuracyPercent ?? 0}%` }}>
        <b>{accuracyPercent ?? "—"}</b>
        <small>acc</small>
      </span>
      <span className="armoryBayServiceTile"><b>{stats.totalRounds}</b><small>rounds</small></span>
      <span className="armoryBayServiceTile isStreak"><b>{stats.bestStreak}</b><small>streak</small></span>
    </div>
  )
}

function ArmoryBay({ loadout, presentation, isActive, onActivate, bayApi, bayNumber }) {
  const identity = (presentation?.identity.label || "Balanced").toLowerCase()
  const miniTargetSize = Math.round(
    presentation.roundRules.initialButtonSize * BAY_TARGET_SCALE
  )

  return (
    <div className={`armoryBay ${isActive ? "isActive" : ""}`} data-identity={identity}>
      <button
        type="button"
        className="armoryBaySelect"
        onClick={onActivate}
        aria-pressed={isActive}
      >
        <span className="armoryBayNumber" aria-hidden="true">{String(bayNumber).padStart(2, "0")}</span>
        <span className="armoryBayHeader">
          <span className="armoryBayLamp" aria-hidden="true" />
          <span className="armoryBayLampLabel">{isActive ? "Active" : "Docked"}</span>
        </span>

        <span className="armoryBayMini" aria-hidden="true">
          <span
            className="armoryBayMiniTarget"
            style={{ width: `${miniTargetSize}px`, height: `${miniTargetSize}px` }}
          />
          <span className="armoryBayMiniModules">
            {presentation.moduleStack.map((module) => (
              <span key={module.slotId} className={`armoryBayMiniModule tone-${module.slotId}`}>
                <PartEmblem partId={module.moduleId} slotId={module.slotId} size={22} />
              </span>
            ))}
          </span>
        </span>

        <span className="armoryBayNameplate">
          <strong className="armoryBayName">{loadout.name}</strong>
          <span className="armoryBayIdentity">
            <span className="armoryBayIdentityGlyph" aria-hidden="true">
              <BuildIdentityGlyph identity={presentation.identity.label} />
            </span>
            {presentation.identity.label}
          </span>
        </span>

        <ArmoryBayServicePlate stats={bayApi.loadoutStatsById?.[loadout.id]} />
      </button>

      {isActive ? null : (
        <div className="armoryBayFooter">
          <button
            type="button"
            className="armoryBayAction"
            onClick={() => bayApi.openBayCompare(loadout.id)}
          >
            Compare with active
          </button>
        </div>
      )}
    </div>
  )
}

export default function ArmoryBayWall({ bayApi }) {
  return (
    <div className="armoryBayWall" aria-label="Build bays">
      {bayApi.savedLoadouts.map((loadout, index) => (
        <ArmoryBay
          key={loadout.id}
          bayNumber={index + 1}
          loadout={loadout}
          presentation={bayApi.loadoutPresentations[loadout.id]}
          isActive={loadout.id === bayApi.activeLoadoutId}
          onActivate={() => bayApi.activateLoadout(loadout.id)}
          bayApi={bayApi}
        />
      ))}

    </div>
  )
}
