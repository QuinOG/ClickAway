import { POWERUPS } from "../../../constants/gameConstants.js"

function getPowerupHintText(charges, powerup) {
  if (charges > 0) return `Ready: press ${powerup.key}`
  return `Unlock: streak ${powerup.awardEvery}`
}

export default function PowerupTray({ powerupCharges }) {
  return (
    <div className="powerupTray" aria-label="Power-ups">
      {POWERUPS.map((powerup) => {
        const charges = powerupCharges[powerup.id] ?? 0
        const hintText = getPowerupHintText(charges, powerup)

        return (
          <div key={powerup.id} className={`powerupItem ${charges > 0 ? "ready" : ""}`}>
            <div className="powerupTop">
              <div className="powerupKey">{powerup.key}</div>
              <div className="powerupCount">x{charges}</div>
            </div>
            <strong className="powerupLabel">{powerup.label}</strong>
            <span className="powerupHint">{hintText}</span>
          </div>
        )
      })}
    </div>
  )
}
