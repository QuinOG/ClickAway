import { PowerupGlyph } from "../../buildcraft/buildcraftGlyphs.jsx"

const SEGMENT_COUNT = 5

function getFilledSegments({ charges, streak, awardEvery }) {
  if (charges > 0) return SEGMENT_COUNT

  const safeAwardEvery = Math.max(1, Number(awardEvery) || 1)
  const hitsPerSegment = safeAwardEvery / SEGMENT_COUNT
  return Math.floor((streak % safeAwardEvery) / hitsPerSegment)
}

function getActiveLabel(powerup) {
  if (powerup.effectType === "combo_surge" && powerup.comboSurgeHitsRemaining > 0) {
    return `${powerup.comboSurgeHitsRemaining} surge hits`
  }

  if (powerup.effectType === "guard_charge" && powerup.isGuardActive) {
    return "Guard active"
  }

  return powerup.description
}

function getStateLabel(powerup, charges) {
  if (powerup.effectType === "combo_surge" && powerup.comboSurgeHitsRemaining > 0) {
    return { label: "Active", tone: "active" }
  }

  if (powerup.effectType === "guard_charge" && powerup.isGuardActive) {
    return { label: "Active", tone: "active" }
  }

  if (charges > 0) {
    return { label: "Ready", tone: "ready" }
  }

  return null
}

export default function PowerupTray({ powerupSlots = [], streak = 0 }) {
  return (
    <div className="powerupTray" aria-label="Power-ups">
      {powerupSlots.map((powerup) => {
        const charges = powerup.charges ?? 0
        const stateLabel = getStateLabel(powerup, charges)
        const filledSegments = getFilledSegments({
          charges,
          streak,
          awardEvery: powerup.awardEvery,
        })

        return (
          <div
            key={powerup.slotKey}
            className={`powerupItem ${charges > 0 ? "ready" : ""} ${stateLabel?.tone === "active" ? "active" : ""}`}
          >
            <div className="powerupTop">
              <div className="powerupHeading">
                <span className="powerupIconWrap" aria-hidden="true">
                  <PowerupGlyph powerupId={powerup.id} />
                </span>
                <div className="powerupHeadingCopy">
                  <strong className="powerupLabel">{powerup.label}</strong>
                  <span className="powerupChargeRule">Every {powerup.awardEvery} streak</span>
                </div>
              </div>
              <div className="powerupMeta">
                {stateLabel ? (
                  <span className={`powerupReadyCue powerupReadyCue-${stateLabel.tone}`}>
                    {stateLabel.label}
                  </span>
                ) : null}
                <div className="powerupCount">x{charges}</div>
              </div>
            </div>
            <p className="powerupDescription">{getActiveLabel(powerup)}</p>
            <div className="powerupBottom">
              <div className="powerupSlotBadge" aria-hidden="true">
                {powerup.slotKey}
              </div>
              <div className="powerupSegmentBar">
                {Array.from({ length: SEGMENT_COUNT }, (_, i) => (
                  <div
                    key={i}
                    className={`powerupSegment ${i < filledSegments ? "filled" : ""}`}
                  />
                ))}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
