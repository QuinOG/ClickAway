import { MODULE_SLOTS, LOADOUT_POWERUPS, PASSIVE_LOADOUT_MODULES } from "../../../constants/buildcraft.js"
import { ModuleSlotGlyph, PowerupGlyph } from "../../buildcraft/loadoutBuildcraftGlyphIcons.jsx"
import { getUnlockText } from "../armoryUtils.js"

// A wall panel is a lane's parts sorted by level, so "what's next" reads top
// to bottom as a ladder rather than a shuffled grid.
function ArmoryUnlockWallPanel({ tone, label, description, headerGlyph, renderPartGlyph, parts, playerLevel }) {
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

          return (
            <li
              key={part.id}
              className={`armoryUnlockWallItem tone-${tone} ${isOwned ? "isOwned" : "isLocked"}`}
            >
              <span className={`armoryPartGlyph tone-${tone}`} aria-hidden="true">{renderPartGlyph(part)}</span>
              <span className="armoryUnlockWallItemBody">
                <strong className="armoryUnlockWallItemLabel">{part.label}</strong>
                <span className="armoryUnlockWallItemMeta">
                  {isOwned ? part.description : getUnlockText(part.unlockLevel)}
                </span>
              </span>
              {isOwned ? null : <span className="armoryUnlockWallItemLevel">Lv {part.unlockLevel}</span>}
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
export default function ArmoryUnlockWall({ isOpen, onClose, playerLevel }) {
  if (!isOpen) return null

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
          />
        </div>
      </section>
    </>
  )
}
