import { POWERUPS } from "../../../constants/gameConstants.js"

const SEGMENT_COUNT = 5

export default function PowerupTray({ powerupCharges, streak = 0 }) {
  return (
    <div className="powerupTray" aria-label="Power-ups">
      {POWERUPS.map((powerup) => {
        const charges = powerupCharges[powerup.id] ?? 0
        const hitsPerSegment = powerup.awardEvery / SEGMENT_COUNT
        const filledSegments = charges > 0
          ? SEGMENT_COUNT
          : Math.floor((streak % powerup.awardEvery) / hitsPerSegment)

        return (
          <div key={powerup.id} className={`powerupItem ${charges > 0 ? "ready" : ""}`}>
            <div className="powerupTop">
              <strong className="powerupLabel">{powerup.label}</strong>
              <div className="powerupCount">x{charges}</div>
            </div>
            <div className="powerupBottom">
              <img src={powerup.icon} alt="" className="powerupIcon" />
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
