import { useState } from "react"
import { MODULE_SLOTS, LOADOUT_POWERUPS, PASSIVE_LOADOUT_MODULES } from "../../../constants/buildcraft.js"
import { ModuleSlotGlyph, PowerupGlyph } from "../../buildcraft/loadoutBuildcraftGlyphIcons.jsx"
import { getUnlockText } from "../armoryUtils.js"
import ArmoryStateEmblem from "./ArmoryStateEmblem.jsx"
import { PartEmblem } from "../../../components/art/GameIcons.jsx"
import { useOverlayDismiss } from "../useOverlayDismiss.js"

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
              title={part.description}
            >
              <span className={`armoryPartGlyph tone-${tone}`} aria-hidden="true">{renderPartGlyph(part)}</span>
              <span className="armoryUnlockWallItemBody">
                <strong className="armoryUnlockWallItemLabel">{part.label}</strong>
                <span className="armoryUnlockWallItemMeta">{part.description}</span>
                <span className="armoryUnlockWallItemLock" aria-label={getUnlockText(part.unlockLevel)}>
                    Lv {part.unlockLevel}
                  </span>
              </span>
              {isInstalled ? <ArmoryStateEmblem state="installed" label="Installed" compact /> : null}
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
const WALL_TABS = [{ id: "all", label: "All" }, ...MODULE_SLOTS.map((slot) => ({ id: slot.id, label: slot.label })), { id: "power", label: "Power Tools" }]

export default function ArmoryUnlockWall({ isOpen, onClose, playerLevel, activeLoadout }) {
  const [activeTab, setActiveTab] = useState("all")
  const dialogRef = useOverlayDismiss(isOpen, onClose)
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
      <section className="armoryUnlockWall unlockWallRebuild" ref={dialogRef} tabIndex={-1} aria-modal="true" role="dialog" aria-label="Unlock wall">
        <header className="armoryUnlockWallHeader">
          <div>
            <p className="armoryUnlockWallEyebrow">Unlock Wall</p>
            <h2 className="armoryUnlockWallTitle">Every part in the workshop</h2>
          </div>
          <button type="button" className="secondaryButton" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="armoryUnlockWallTop">
        <section className="armoryCollectionSummary" aria-label="Parts collection summary">
          <div
            className="unlockWallGauge"
            role="progressbar"
            aria-label="Parts collected"
            aria-valuemin="0"
            aria-valuemax={allParts.length}
            aria-valuenow={ownedCount}
            style={{ "--wall-progress": `${collectionPercent}%` }}
          >
            <strong>{collectionPercent}%</strong><span className="unlockWallGaugeTrack" aria-hidden="true"><span /></span>
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

        {nextUnlock ? (
          <section className="armoryUnlockWallNext" aria-label="Next unlock">
            <span className="armoryUnlockWallNextIcon" aria-hidden="true">
              {LOADOUT_POWERUPS.includes(nextUnlock) ? <PowerupGlyph powerupId={nextUnlock.id} /> : <PartEmblem partId={nextUnlock.id} slotId={nextUnlock.slotId} size={48} />}
            </span>
            <span className="armoryUnlockWallNextCopy">
              <span className="armoryUnlockWallEyebrow">Next unlock · Level {nextUnlock.unlockLevel}</span>
              <strong>{nextUnlock.label}</strong>
              <span>{nextUnlock.description}</span>
            </span>
            <span className="armoryUnlockWallNextGap">
              <b>{Math.max(1, nextUnlock.unlockLevel - playerLevel)}</b>
              <small>{nextUnlock.unlockLevel - playerLevel === 1 ? "level away" : "levels away"}</small>
            </span>
          </section>
        ) : null}
        </div>

        <div className="armoryUnlockWallTabs" role="tablist" aria-label="Part categories">
          {WALL_TABS.map((tab) => (
            <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} className={`armoryUnlockWallTab ${activeTab === tab.id ? "isActive" : ""}`} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className={`armoryUnlockWallGrid tab-${activeTab}`}>
          {MODULE_SLOTS.filter((slot) => activeTab === "all" || activeTab === slot.id).map((slot) => (
            <ArmoryUnlockWallPanel
              key={slot.id}
              tone={slot.id}
              label={slot.label}
              description={slot.description}
              headerGlyph={<ModuleSlotGlyph slotId={slot.id} />}
              renderPartGlyph={(part) => <PartEmblem partId={part.id} slotId={slot.id} size={30} />}
              parts={PASSIVE_LOADOUT_MODULES.filter((module) => module.slotId === slot.id)}
              playerLevel={playerLevel}
              installedPartIds={installedPartIds}
            />
          ))}

          {activeTab === "all" || activeTab === "power" ? <ArmoryUnlockWallPanel
            tone="power"
            label="Power Tools"
            description="Powerups you can equip to keys 1, 2, and 3."
            headerGlyph={<PowerupGlyph powerupId="" />}
            renderPartGlyph={(part) => <PowerupGlyph powerupId={part.id} />}
            parts={LOADOUT_POWERUPS}
            playerLevel={playerLevel}
            installedPartIds={installedPartIds}
          /> : null}
        </div>
      </section>
    </>
  )
}
