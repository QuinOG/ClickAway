import { ModuleSlotGlyph, PowerupGlyph } from "../../buildcraft/loadoutBuildcraftGlyphIcons.jsx"

/**
 * The Unlock Ceremony (Phase 11): the next Armory visit after a level-up
 * crosses an unlock threshold opens with a short, skippable reveal per part —
 * queued if several unlocked at once — before the player can touch anything
 * else. Runs once per part (seen-state persisted by the controller).
 */
export default function ArmoryUnlockCeremony({ part, remainingCount, onInstallNow, onRackIt, onSkipAll }) {
  if (!part) return null

  const tone = part.kind === "module" ? part.slotId : "power"
  const queuedAfterThis = Math.max(0, remainingCount - 1)

  return (
    <>
      <div className="armoryCeremonyScrim" aria-hidden="true" />
      <section className="armoryUnlockCeremony" role="dialog" aria-label="Part unlocked">
        <p className="armoryCeremonyEyebrow">
          New part unlocked{queuedAfterThis > 0 ? ` · ${queuedAfterThis} more waiting` : ""}
        </p>

        <div className={`armoryCeremonyCase tone-${tone}`}>
          <span className={`armoryCeremonyGlyph tone-${tone}`} aria-hidden="true">
            {part.kind === "module" ? (
              <ModuleSlotGlyph slotId={part.slotId} />
            ) : (
              <PowerupGlyph powerupId={part.id} />
            )}
          </span>
        </div>

        <h2 className="armoryCeremonyTitle">{part.label}</h2>
        <p className="armoryCeremonyDescription">{part.description}</p>

        <div className="armoryCeremonyActions">
          <button type="button" className="primaryButton" onClick={() => onInstallNow(part)}>
            Install now
          </button>
          <button type="button" className="secondaryButton" onClick={() => onRackIt(part)}>
            Rack it for later
          </button>
        </div>

        {remainingCount > 1 ? (
          <button type="button" className="armoryCeremonySkipAll" onClick={onSkipAll}>
            Skip all ({remainingCount})
          </button>
        ) : null}
      </section>
    </>
  )
}
