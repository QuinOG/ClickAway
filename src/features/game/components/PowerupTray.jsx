import { PowerEmblem } from "../../../components/art/GameIcons.jsx"

const SEGMENT_COUNT = 5

function getFilledSegments({ charges, streak, awardEvery }) {
  if (charges > 0) return SEGMENT_COUNT

  const safeAwardEvery = Math.max(1, Number(awardEvery) || 1)
  const hitsPerSegment = safeAwardEvery / SEGMENT_COUNT
  return Math.floor((streak % safeAwardEvery) / hitsPerSegment)
}

function getPowerupState(powerup, charges, isTimedRound) {
  if (!isTimedRound && powerup.effectType === "time_boost") {
    return { label: "No timer", tone: "idle" }
  }

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
    label: powerup.isPlaying ? "Charging" : "Unavailable",
    tone: "idle",
  }
}

export default function PowerupTray({
  powerupSlots = [],
  streak = 0,
  isPlaying = false,
  isTimedRound = true,
  activatedPowerup = null,
  onUsePowerup,
}) {
  const isUsable = (powerup) => isTimedRound || powerup.effectType !== "time_boost"
  const readyPowerup = powerupSlots.find((powerup) => isUsable(powerup) && (powerup.charges ?? 0) > 0)
  const coachMessage = activatedPowerup?.id
    ? `${activatedPowerup.label} activated — watch the arena cue.`
    : readyPowerup && isPlaying
      ? `${readyPowerup.label} ready — press ${readyPowerup.slotKey} or tap its slot.`
      : ""

  return (
    <section className="powerupHotbar" aria-label="Power hotbar">
      <div className="powerupTray">
        {powerupSlots.map((powerup) => {
        const charges = powerup.charges ?? 0
        const isActive = powerup.effectType === "combo_surge"
          ? powerup.comboSurgeHitsRemaining > 0
          : powerup.effectType === "guard_charge" && powerup.isGuardActive
        const canUse = isPlaying && isUsable(powerup) && charges > 0
        const isRecentlyActivated = activatedPowerup?.id === powerup.id
        const isTimedActive = isRecentlyActivated && activatedPowerup.durationMs > 0
        const powerupState = isTimedActive
          ? { label: "Active", tone: "active" }
          : getPowerupState({ ...powerup, isPlaying }, charges, isTimedRound)
        const filledSegments = getFilledSegments({
          charges,
          streak,
          awardEvery: powerup.awardEvery,
        })

        return (
          <button
            key={powerup.slotKey}
            type="button"
            className={`powerupItem power-${powerup.id} ${canUse ? "ready" : ""} ${isActive ? "active" : ""} ${isRecentlyActivated ? "justActivated" : ""} ${isTimedActive ? "timedActive" : ""}`}
            style={isTimedActive ? { "--active-ms": `${activatedPowerup.durationMs}ms` } : undefined}
            onClick={() => onUsePowerup?.(powerup.id)}
            aria-label={`${powerup.label}: ${powerupState.label}${charges > 1 ? `, ${charges} charges` : ""}. Shortcut ${powerup.slotKey}`}
            aria-keyshortcuts={powerup.slotKey}
            disabled={!canUse}
          >
            {isTimedActive ? (
              <span key={activatedPowerup.sequence} className="powerupActiveFlag" aria-hidden="true">
                <i className="powerupActiveRing" />
                Active
              </span>
            ) : null}
            <div className="powerupTop">
              <div className="powerupHeading">
                <div className="powerupLead">
                  <div className="powerupSlotBadge" aria-hidden="true">
                    {powerup.slotKey}
                  </div>
                  <span className="powerupIconWrap" aria-hidden="true">
                    <PowerEmblem powerupId={powerup.id} size={30} />
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
          </button>
        )
        })}
      </div>
      <p className="powerupCoach" aria-live="polite" aria-atomic="true">
        {coachMessage}
      </p>
    </section>
  )
}
