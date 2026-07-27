import { useRef, useState } from "react"

import { getUnlockText } from "../armoryUtils.js"
import ArmoryStateEmblem from "./ArmoryStateEmblem.jsx"

// The parts gallery (Phases 5–6): a lane's modules — or the tool rack's powers —
// laid out as machined parts. Clicking an unlocked card equips it immediately.

function getPartStateLabel({ part, isLocked, isInstalled }) {
  if (isLocked) return getUnlockText(part.unlockLevel)
  if (isInstalled) return "Installed"
  if (part.rackedOnKey) {
    return `On key ${part.rackedOnKey}`
  }
  return "Available"
}

function getPartVisualState({ part, isLocked, isInstalled }) {
  if (isLocked) return "locked"
  if (isInstalled) return "installed"
  if (part.rackedOnKey) return "racked"
  return "available"
}

export default function ArmoryPartsGallery({
  tone = "",
  galleryLabel = "Parts",
  parts = [],
  playerLevel = 1,
  installedPartId = "",
  renderPartGlyph,
  onInstallPart,
  onInspectLockedPart,
  footer = null,
}) {
  const cardRefs = useRef({})
  // Roving tabindex: one gallery tab stop; arrows walk the unlocked parts.
  const [rovingPartId, setRovingPartId] = useState(null)
  const tabStopPartId = rovingPartId ?? installedPartId

  const unlockedParts = parts.filter((part) => playerLevel >= part.unlockLevel)

  const moveFocus = (offset) => {
    if (!unlockedParts.length) return
    const activeIndex = unlockedParts.findIndex(
      (part) => part.id === document.activeElement?.dataset?.partId
    )
    const nextIndex = activeIndex === -1
      ? 0
      : (activeIndex + offset + unlockedParts.length) % unlockedParts.length
    const nextPart = unlockedParts[nextIndex]
    setRovingPartId(nextPart.id)
    cardRefs.current[nextPart.id]?.focus()
  }

  const handleGalleryKeyDown = (event) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault()
      moveFocus(1)
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault()
      moveFocus(-1)
    }
  }

  return (
    <div
      className="armoryPartsGallery"
      role="group"
      aria-label={galleryLabel}
      onKeyDown={handleGalleryKeyDown}
    >
      <div className={`armoryPartsShelf tone-${tone}`}>
        {parts.map((part) => {
          const isLocked = playerLevel < part.unlockLevel
          const isInstalled = part.id === installedPartId
          const stateLabel = getPartStateLabel({ part, isLocked, isInstalled })
          const visualState = getPartVisualState({ part, isLocked, isInstalled })

          return (
            <button
              key={part.id}
              type="button"
              ref={(element) => { cardRefs.current[part.id] = element }}
              data-part-id={part.id}
              data-armory-state={visualState}
              className={`armoryPartCard tone-${tone} ${isInstalled ? "isInstalled" : ""} ${isLocked ? "isLocked" : ""}`}
              disabled={isLocked}
              tabIndex={isLocked ? undefined : (part.id === tabStopPartId ? 0 : -1)}
              aria-pressed={isInstalled}
              onMouseEnter={() => {
                if (isLocked) onInspectLockedPart?.(part.id)
              }}
              onFocus={() => {
                setRovingPartId(part.id)
              }}
              onClick={() => {
                if (!isInstalled) onInstallPart?.(part.id)
              }}
            >
              <span className={`armoryPartGlyph tone-${tone}`} aria-hidden="true">
                {renderPartGlyph?.(part)}
              </span>
              <span className="armoryPartBody">
                <strong className="armoryPartLabel">{part.label}</strong>
                <span className="armoryPartFeel">{part.description}</span>
              </span>
              <ArmoryStateEmblem state={visualState} label={stateLabel} compact />
              {isLocked ? <span className="armoryPartGlass" aria-hidden="true" /> : null}
            </button>
          )
        })}
      </div>

      {footer ? <div className="armoryGalleryFooter">{footer}</div> : null}
    </div>
  )
}
