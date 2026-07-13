import { ModuleSlotGlyph, PowerupGlyph } from "../../buildcraft/loadoutBuildcraftGlyphIcons.jsx"
import ArmoryStateEmblem from "./ArmoryStateEmblem.jsx"

function CeremonyGlyph({ part }) {
  return part.kind === "module" ? (
    <ModuleSlotGlyph slotId={part.slotId} />
  ) : (
    <PowerupGlyph powerupId={part.id} />
  )
}

/**
 * Unseen unlocks arrive as one collection drop. Players can inspect and
 * install parts individually, or clear the rest into their collection in one
 * action. This keeps a returning player's first workshop visit from becoming
 * a long serial queue while preserving the optional install moment.
 */
export default function ArmoryUnlockCeremony({
  part,
  parts = [],
  remainingCount,
  onInstallNow,
  onRackIt,
  onSkipAll,
}) {
  if (!part) return null

  const tone = part.kind === "module" ? part.slotId : "power"
  const batchSize = Math.max(parts.length, remainingCount)
  const inspectedIndex = Math.max(0, batchSize - remainingCount)
  const isBatch = batchSize > 1

  return (
    <>
      <div className="armoryCeremonyScrim" aria-hidden="true" />
      <section
        className={`armoryUnlockCeremony${isBatch ? " isBatch" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Part unlocked"
      >
        <p className="armoryCeremonyEyebrow">
          {isBatch ? `Collection drop · ${batchSize} parts online` : "New part unlocked"}
        </p>

        {isBatch ? (
          <div
            className="armoryCeremonyBatch"
            role="group"
            aria-label={`Unlock ${inspectedIndex + 1} of ${batchSize}`}
          >
            {parts.map((batchPart, index) => {
              const batchTone = batchPart.kind === "module" ? batchPart.slotId : "power"
              const isCurrent = batchPart.id === part.id
              const isProcessed = index < inspectedIndex

              return (
                <span
                  key={batchPart.id}
                  className={`armoryCeremonyBatchPart tone-${batchTone}${isCurrent ? " isCurrent" : ""}${isProcessed ? " isProcessed" : ""}`}
                  title={batchPart.label}
                  aria-hidden="true"
                >
                  <CeremonyGlyph part={batchPart} />
                </span>
              )
            })}
          </div>
        ) : null}

        <div className={`armoryCeremonyCase tone-${tone}`}>
          <span className={`armoryCeremonyGlyph tone-${tone}`} aria-hidden="true">
            <CeremonyGlyph part={part} />
          </span>
        </div>

        <h2 className="armoryCeremonyTitle">{part.label}</h2>
        <p className="armoryCeremonyDescription">{part.description}</p>
        <ArmoryStateEmblem state="owned" label="Added to collection" />
        <p className="armoryCeremonyOwnershipNote">Already yours. Installing only changes the active build.</p>

        <div className="armoryCeremonyActions">
          <button type="button" className="primaryButton" onClick={() => onInstallNow(part)}>
            Install now
          </button>
          <button type="button" className="secondaryButton" onClick={() => onRackIt(part)}>
            Keep for later
          </button>
        </div>

        {isBatch && remainingCount > 0 ? (
          <button type="button" className="armoryCeremonySkipAll" onClick={onSkipAll}>
            Keep all {remainingCount} parts in collection
          </button>
        ) : null}
      </section>
    </>
  )
}
