import { PowerupGlyph } from "../../buildcraft/loadoutBuildcraftGlyphIcons.jsx"

const SEGMENT_COUNT = 5

function getFilledSegments({ charges, streak, awardEvery }) {
  if (charges > 0) return SEGMENT_COUNT

  const safeAwardEvery = Math.max(1, Number(awardEvery) || 1)
  const hitsPerSegment = safeAwardEvery / SEGMENT_COUNT
  return Math.floor((streak % safeAwardEvery) / hitsPerSegment)
}

function getPowerupState(powerup, charges) {
  if (powerup.effectType === "combo_surge" && powerup.comboSurgeHitsRemaining > 0) {
    return {
      label: `${powerup.comboSurgeHitsRemaining} hits left`,
      tone: "active",
    }
  }

  if (powerup.effectType === "guard_charge" && powerup.isGuardActive) {
    return {
      label: "Guard active",
      tone: "active",
    }
  }

  if (charges > 0) {
    return {
      label: "Ready",
      tone: "ready",
    }
  }

  return {
    label: "Charging",
    tone: "idle",
  }
}

export default function PowerupTray({ powerupSlots = [], streak = 0, onUsePowerup }) {
  return (
    <div className="powerupTray" aria-label="Power hotbar">
      {powerupSlots.map((powerup) => {
        const charges = powerup.charges ?? 0
        const powerupState = getPowerupState(powerup, charges)
        const filledSegments = getFilledSegments({
          charges,
          streak,
          awardEvery: powerup.awardEvery,
        })

        return (
          <div
            key={powerup.slotKey}
            className={`powerupItem ${charges > 0 ? "ready" : ""} ${powerupState.tone === "active" ? "active" : ""}`}
            onClick={() => onUsePowerup?.(powerup.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && onUsePowerup?.(powerup.id)}
          >
            <div className="powerupTop">
              <div className="powerupHeading">
                <div className="powerupLead">
                  <div className="powerupSlotBadge" aria-hidden="true">
                    {powerup.slotKey}
                  </div>
                  <span className="powerupIconWrap" aria-hidden="true">
                    <PowerupGlyph powerupId={powerup.id} />
                  </span>
                </div>
                <div className="powerupHeadingCopy">
                  <strong className="powerupLabel">{powerup.label}</strong>
                  <span className={`powerupStateLabel powerupStateLabel-${powerupState.tone}`}>
                    {powerupState.label}
                  </span>
                </div>
              </div>
              {charges > 1 ? <div className="powerupCount">x{charges}</div> : null}
            </div>

            <div className="powerupBottom">
              <div className="powerupSegmentBar" aria-hidden="true">
                {Array.from({ length: SEGMENT_COUNT }, (_, index) => (
                  <div
                    key={index}
                    className={`powerupSegment ${index < filledSegments ? "filled" : ""}`}
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
