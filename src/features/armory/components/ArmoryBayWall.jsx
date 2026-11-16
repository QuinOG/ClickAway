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

// A numbered class card keeps selection and field records together.
function ArmoryBay({ loadout, presentation, isActive, onActivate, bayApi, bayNumber }) {
  const identity = (presentation?.identity.label || "Balanced").toLowerCase()

  return (
    <div className={`armoryBay armoryCart ${isActive ? "isActive" : ""}`} data-identity={identity}>
      <button
        type="button"
        className="armoryBaySelect armoryCartBody"
        onClick={onActivate}
        aria-pressed={isActive}
      >
        <span className="armoryCartSpine" aria-hidden="true"><b>{bayNumber}</b></span>
        <span className="armoryCartStrip">
          <strong className="armoryCartName">{loadout.name}</strong>
          <span className="armoryCartLamp">{isActive ? "Active" : "Docked"}</span>
        </span>

        <ArmoryBayServicePlate stats={bayApi.loadoutStatsById?.[loadout.id]} />
      </button>

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
