import { BuildIdentityGlyph } from "../../buildcraft/loadoutBuildcraftGlyphIcons.jsx"
import { PartEmblem } from "../../../components/art/GameIcons.jsx"

// Bay miniatures echo the center-stage machine at wall scale, so build size
// differences stay readable even from across the room.
export const BAY_TARGET_SCALE = 0.32

// Field record strip: so a bay never has to be activated just to see how
// it has actually performed. Keyed on loadout.id (stable), never on the
// display name, so renames never orphan the record.
function ArmoryBayServicePlate({ stats }) {
  if (!stats || stats.totalRounds <= 0) {
    return <p className="armoryCartStats isEmpty" title="No field data yet">No runs yet</p>
  }

  const attempts = stats.totalHits + stats.totalMisses
  const accuracyPercent = attempts > 0 ? Math.round((stats.totalHits / attempts) * 100) : null

  const summary = `${stats.totalRounds} round${stats.totalRounds === 1 ? "" : "s"}`
    + `${accuracyPercent !== null ? `, ${accuracyPercent}% accuracy` : ""}, best streak ${stats.bestStreak}`

  return (
    <span className="armoryCartStats" role="img" aria-label={summary}>
      <span><b>{accuracyPercent ?? "—"}<i>%</i></b><small>acc</small></span>
      <span><b>{stats.totalRounds}</b><small>rounds</small></span>
      <span><b>{stats.bestStreak}</b><small>streak</small></span>
    </span>
  )
}

// A bay is a build cartridge: a numbered spine in the build's identity
// colour, an ID strip, a miniature of its machine (core, lens and rig in
// their r69 silhouettes around the target at wall scale) and its field record.
function ArmoryBay({ loadout, presentation, isActive, onActivate, bayApi, bayNumber }) {
  const identity = (presentation?.identity.label || "Balanced").toLowerCase()
  const miniTargetSize = Math.round(
    presentation.roundRules.initialButtonSize * BAY_TARGET_SCALE
  )

  return (
    <div className={`armoryBay armoryCart ${isActive ? "isActive" : ""}`} data-identity={identity}>
      <button
        type="button"
        className="armoryBaySelect armoryCartBody"
        onClick={onActivate}
        aria-pressed={isActive}
      >
        <span className="armoryCartSpine" aria-hidden="true"><b>{String(bayNumber).padStart(2, "0")}</b></span>
        <span className="armoryCartStrip">
          <strong className="armoryCartName">{loadout.name}</strong>
          <span className="armoryCartIdentity">
            <span className="armoryCartIdentityGlyph" aria-hidden="true">
              <BuildIdentityGlyph identity={presentation.identity.label} />
            </span>
            {presentation.identity.label}
          </span>
          <span className="armoryCartLamp">{isActive ? "Active" : "Docked"}</span>
        </span>

        <span className="armoryCartWindow" aria-hidden="true">
          <span className="armoryCartMachine">
            <span
              className="armoryBayMiniTarget armoryCartTarget"
              style={{ width: `${miniTargetSize}px`, height: `${miniTargetSize}px` }}
            />
            {presentation.moduleStack.map((module) => (
              <span key={module.slotId} className={`armoryCartPart part-${module.slotId}`}>
                <PartEmblem partId={module.moduleId} slotId={module.slotId} size={14} />
              </span>
            ))}
          </span>
        </span>

      </button>
      <div className="armoryCartFooter">
        <ArmoryBayServicePlate stats={bayApi.loadoutStatsById?.[loadout.id]} />
      {isActive ? null : (
        <button
          type="button"
          className="armoryCartCompare"
          aria-label="Compare with active"
          title="Compare with active build"
          onClick={() => bayApi.openBayCompare(loadout.id)}
        >
          Compare
        </button>
      )}
      </div>
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
