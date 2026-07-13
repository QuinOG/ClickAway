import { useRef, useState } from "react"

import { getUnlockText } from "../armoryUtils.js"

// The parts gallery (Phases 5–6): a lane's modules — or the tool rack's powers —
// laid out as machined parts. Pointer hover and keyboard focus preview a part
// (never persisted, purely for the inspection footer); a click or Enter always
// installs it immediately. In power mode a part racked on another key stays
// live and installs as a one-action key swap.

function getPartStateLabel({ part, isLocked, isInstalled, isPreviewed }) {
  if (isLocked) return getUnlockText(part.unlockLevel)
  if (isInstalled) return "Installed"
  if (part.rackedOnKey) {
    return isPreviewed ? `Swap with key ${part.rackedOnKey}` : `On key ${part.rackedOnKey}`
  }
  if (isPreviewed) return "Previewing"
  return ""
}

export default function ArmoryPartsGallery({
  tone = "",
  galleryLabel = "Parts",
  parts = [],
  playerLevel = 1,
  installedPartId = "",
  previewedPartId = null,
  renderPartGlyph,
  onPreviewPart,
  onClearPreview,
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
    if (event.key === "Escape") {
      onClearPreview?.()
    }
  }

  const handleGalleryBlur = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) onClearPreview?.()
  }

  return (
    <div
      className="armoryPartsGallery"
      role="group"
      aria-label={galleryLabel}
      onKeyDown={handleGalleryKeyDown}
      onMouseLeave={() => onClearPreview?.()}
      onBlur={handleGalleryBlur}
    >
      <div className={`armoryPartsShelf tone-${tone}`}>
        {parts.map((part) => {
          const isLocked = playerLevel < part.unlockLevel
          const isInstalled = part.id === installedPartId
          const isPreviewed = part.id === previewedPartId && !isInstalled
          const stateLabel = getPartStateLabel({ part, isLocked, isInstalled, isPreviewed })

          return (
            <button
              key={part.id}
              type="button"
              ref={(element) => { cardRefs.current[part.id] = element }}
              data-part-id={part.id}
              className={`armoryPartCard tone-${tone} ${isInstalled ? "isInstalled" : ""} ${isPreviewed ? "isPreviewed" : ""} ${isLocked ? "isLocked" : ""}`}
              disabled={isLocked}
              tabIndex={isLocked ? undefined : (part.id === tabStopPartId ? 0 : -1)}
              aria-pressed={isInstalled}
              onMouseEnter={() => {
                if (isLocked) onInspectLockedPart?.(part.id)
                else onPreviewPart?.(part.id)
              }}
              onFocus={() => {
                setRovingPartId(part.id)
                onPreviewPart?.(part.id)
              }}
              onClick={() => {
                if (isInstalled) return
                onInstallPart?.(part.id)
              }}
            >
              <span className={`armoryPartGlyph tone-${tone}`} aria-hidden="true">
                {renderPartGlyph?.(part)}
              </span>
              <span className="armoryPartBody">
                <strong className="armoryPartLabel">{part.label}</strong>
                <span className="armoryPartFeel">{part.description}</span>
              </span>
              {part.rackedOnKey ? (
                <span className="armoryPartKey" aria-hidden="true">{part.rackedOnKey}</span>
              ) : null}
              {stateLabel ? <span className="armoryPartState">{stateLabel}</span> : null}
              {isLocked ? <span className="armoryPartGlass" aria-hidden="true" /> : null}
            </button>
          )
        })}
      </div>

      {footer ? <div className="armoryGalleryFooter">{footer}</div> : null}
    </div>
  )
}
