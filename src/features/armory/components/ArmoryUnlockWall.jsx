import { MODULE_SLOTS, LOADOUT_POWERUPS, PASSIVE_LOADOUT_MODULES } from "../../../constants/buildcraft.js"
import { ModuleSlotGlyph, PowerupGlyph } from "../../buildcraft/loadoutBuildcraftGlyphIcons.jsx"
import { getUnlockText } from "../armoryUtils.js"
import ArmoryStateEmblem from "./ArmoryStateEmblem.jsx"

// A wall panel is a lane's parts sorted by level, so "what's next" reads top
// to bottom as a ladder rather than a shuffled grid.
function ArmoryUnlockWallPanel({
  tone,
  label,
  description,
  headerGlyph,
  renderPartGlyph,
  parts,
  playerLevel,
  installedPartIds,
}) {
  const sortedParts = [...parts].sort((a, b) => a.unlockLevel - b.unlockLevel)

  return (
    <section className={`armoryUnlockWallPanel tone-${tone}`}>
      <header className="armoryUnlockWallPanelHeader">
        <span className={`armoryPartGlyph tone-${tone}`} aria-hidden="true">{headerGlyph}</span>
        <div>
          <h3 className="armoryUnlockWallPanelTitle">{label}</h3>
          <p className="armoryUnlockWallPanelLead">{description}</p>
        </div>
      </header>

      <ul className="armoryUnlockWallList">
        {sortedParts.map((part) => {
          const isOwned = playerLevel >= part.unlockLevel
          const isInstalled = installedPartIds.has(part.id)
          const visualState = isInstalled ? "installed" : isOwned ? "owned" : "locked"

          return (
            <li
              key={part.id}
              className={`armoryUnlockWallItem tone-${tone} ${isOwned ? "isOwned" : "isLocked"} ${isInstalled ? "isInstalled" : ""}`}
              data-armory-state={visualState}
            >
              <span className={`armoryPartGlyph tone-${tone}`} aria-hidden="true">{renderPartGlyph(part)}</span>
              <span className="armoryUnlockWallItemBody">
                <strong className="armoryUnlockWallItemLabel">{part.label}</strong>
                <span className="armoryUnlockWallItemMeta">
                  {isOwned ? part.description : getUnlockText(part.unlockLevel)}
                </span>
              </span>
              <ArmoryStateEmblem
                state={visualState}
                label={isOwned ? (isInstalled ? "Installed" : "Collected") : `Lv ${part.unlockLevel}`}
                compact
              />
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/**
 * The Unlock Wall (Phase 11): every module and power in the game in one
 * browsable destination — owned parts lit, locked parts silhouetted behind
 * glass with their level requirement, so "what's next" isn't a disabled
 * card discovered by accident.
 */
export default function ArmoryUnlockWall({ isOpen, onClose, playerLevel, activeLoadout }) {
  if (!isOpen) return null

  const allParts = [...PASSIVE_LOADOUT_MODULES, ...LOADOUT_POWERUPS]
  const ownedCount = allParts.filter((part) => playerLevel >= part.unlockLevel).length
  const collectionPercent = allParts.length > 0 ? Math.round((ownedCount / allParts.length) * 100) : 0
  const nextUnlock = allParts
    .filter((part) => playerLevel < part.unlockLevel)
    .sort((a, b) => a.unlockLevel - b.unlockLevel)[0] ?? null
  const installedPartIds = new Set([
    ...Object.values(activeLoadout?.moduleIds ?? {}),
    ...(activeLoadout?.powerupIds ?? []),
  ])

  return (
    <>
      <div className="armoryUnlockWallScrim" onClick={onClose} aria-hidden="true" />
      <section className="armoryUnlockWall" role="dialog" aria-label="Unlock wall">
        <header className="armoryUnlockWallHeader">
          <div>
            <p className="armoryUnlockWallEyebrow">Unlock Wall</p>
            <h2 className="armoryUnlockWallTitle">Every part in the workshop</h2>
          </div>
          <button type="button" className="secondaryButton" onClick={onClose}>
            Close
          </button>
        </header>

        <section className="armoryCollectionSummary" aria-label="Parts collection summary">
          <div
            className="armoryCollectionRing"
            role="progressbar"
            aria-label="Parts collected"
            aria-valuemin="0"
            aria-valuemax={allParts.length}
            aria-valuenow={ownedCount}
            style={{ "--armory-collection-progress": `${collectionPercent * 3.6}deg` }}
          >
            <strong>{collectionPercent}%</strong>
          </div>
          <div className="armoryCollectionSummaryCopy">
            <span className="armoryUnlockWallEyebrow">Workshop collection</span>
            <strong>{ownedCount} of {allParts.length} parts online</strong>
            <span>
              {nextUnlock
                ? `Next: ${nextUnlock.label} at Level ${nextUnlock.unlockLevel}`
                : "Collection complete — every housing is open."}
            </span>
          </div>
          <div className="armoryCollectionLegend" aria-label="Part state legend">
            <ArmoryStateEmblem state="installed" compact />
            <ArmoryStateEmblem state="owned" compact />
            <ArmoryStateEmblem state="locked" compact />
          </div>
        </section>

        <div className="armoryUnlockWallGrid">
          {MODULE_SLOTS.map((slot) => (
            <ArmoryUnlockWallPanel
              key={slot.id}
              tone={slot.id}
              label={slot.label}
              description={slot.description}
              headerGlyph={<ModuleSlotGlyph slotId={slot.id} />}
              renderPartGlyph={() => <ModuleSlotGlyph slotId={slot.id} />}
              parts={PASSIVE_LOADOUT_MODULES.filter((module) => module.slotId === slot.id)}
              playerLevel={playerLevel}
              installedPartIds={installedPartIds}
            />
          ))}

          <ArmoryUnlockWallPanel
            tone="power"
            label="Power Tools"
            description="The keyed tools that fill your hotbar."
            headerGlyph={<PowerupGlyph powerupId="" />}
            renderPartGlyph={(part) => <PowerupGlyph powerupId={part.id} />}
            parts={LOADOUT_POWERUPS}
            playerLevel={playerLevel}
            installedPartIds={installedPartIds}
          />
        </div>
      </section>
    </>
  )
}
