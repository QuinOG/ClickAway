import { POWERUPS } from "../gameConfig.js"

export default function PowerupTray({ powerupCharges }) {
  return (
    <div className="powerupTray" aria-label="Power-ups">
      {POWERUPS.map((powerup) => {
        const charges = powerupCharges[powerup.id] ?? 0
        const hintText = charges > 0 ? `Press ${powerup.key}` : `Earn at streak ${powerup.awardEvery}`

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
