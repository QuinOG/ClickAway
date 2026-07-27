import { PowerupGlyph } from "../../buildcraft/loadoutBuildcraftGlyphIcons.jsx"

// The cadence timeline (Phase 6): a streak ruler from 1 to CADENCE_MAX_STREAK
// with a marker wherever each racked tool charges. awardEvery arrives already
// recomputed with the build's powerupAwardMultiplier (buildRoundRules), so the
// ruler is the primary cadence display, not the "Every N streak" text.

export const CADENCE_MAX_STREAK = 20

function getCadenceMarkerStreaks(awardEvery = 0, maxStreak = CADENCE_MAX_STREAK) {
  const normalizedEvery = Math.floor(Number(awardEvery))
  if (!Number.isFinite(normalizedEvery) || normalizedEvery < 1) return []

  const markerStreaks = []
  for (let streak = normalizedEvery; streak <= maxStreak; streak += normalizedEvery) {
    markerStreaks.push(streak)
  }

  return markerStreaks
}

function describeCadenceRow(keyNumber, slot, markerStreaks) {
  const cadenceText = markerStreaks.length
    ? `charges at streak ${markerStreaks.join(", ")}`
    : `first charges at streak ${slot.awardEvery}, past this ruler`
  return `Key ${keyNumber}: ${slot.label} ${cadenceText}`
}

export default function ArmoryCadenceTimeline({
  powerSlots = [],
  startingCharges = 0,
}) {
  return (
    <section className="armoryCadenceTimeline" aria-label="Charge cadence timeline">
      <header className="armoryCadenceHeader">
        <span className="armoryCadenceTitle">Powerup charges</span>
        <span className="armoryCadenceScale">
          {startingCharges > 0 ? `+${startingCharges} charge at start · ` : ""}
          streak 1–{CADENCE_MAX_STREAK}
        </span>
      </header>

      {powerSlots.map((powerSlot, index) => {
        const markerStreaks = getCadenceMarkerStreaks(powerSlot.awardEvery)
        const markerSet = new Set(markerStreaks)

        return (
          <div
            key={`${powerSlot.id}-${index + 1}`}
            className="armoryCadenceRow"
            role="img"
            aria-label={describeCadenceRow(index + 1, powerSlot, markerStreaks)}
          >
            <span className="armoryCadenceKey" aria-hidden="true">{index + 1}</span>
            <span className="armoryCadenceGlyph" aria-hidden="true">
              <PowerupGlyph powerupId={powerSlot.id} />
            </span>
            <span className="armoryCadenceLabel" aria-hidden="true">{powerSlot.label}</span>
            <span className="armoryCadenceTrack" aria-hidden="true">
              {startingCharges > 0 ? <span className="armoryCadenceStartPip" /> : null}
              {Array.from({ length: CADENCE_MAX_STREAK }, (_, tickIndex) => tickIndex + 1).map((streak) => (
                <span
                  key={streak}
                  className={`armoryCadenceTick ${markerSet.has(streak) ? "isCharge" : ""}`}
                />
              ))}
            </span>
            <span className="armoryCadenceEvery" aria-hidden="true">{powerSlot.cadenceLabel}</span>
          </div>
        )
      })}
    </section>
  )
}
