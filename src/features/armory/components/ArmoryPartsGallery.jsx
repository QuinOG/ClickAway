import { useRef, useState } from "react"

import { getModuleDeltaChips, getUnlockText } from "../armoryUtils.js"
import { getProfileStats } from "../armorySpecRatings.js"
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

// What a swap does to the build's rated profile: one 10-segment bar per stat
// that changes, with gained segments lit green and lost segments struck red.
function getSwapImpact(currentRules, nextRules) {
  if (!currentRules || !nextRules) return []
  const nextByKey = Object.fromEntries(getProfileStats(nextRules).map((stat) => [stat.key, stat]))
  return getProfileStats(currentRules).flatMap((stat) => {
    const next = nextByKey[stat.key]
    if (!next || next.value === stat.value) return []
    return [{ key: stat.key, label: stat.label, from: stat, to: next }]
  })
}

function SwapImpact({ rows }) {
  return (
    <div className="armorySwapImpact" aria-label="Swap impact">
      <span className="armorySwapImpactTitle">Swap impact</span>
      {rows.map(({ key, label, from, to }) => {
        const low = Math.min(from.rating, to.rating)
        const high = Math.max(from.rating, to.rating)
        const tone = to.rating > from.rating ? "isGain" : to.rating < from.rating ? "isLoss" : "isEven"
        return (
          <div key={key} className={`armorySwapImpactRow ${tone}`}>
            <span className="armorySwapImpactLabel">{label}</span>
            <span className="armorySwapImpactBar" aria-hidden="true">
              {Array.from({ length: 10 }, (_, index) => {
                const segment = index < low ? "isOn" : index < high ? (to.rating > from.rating ? "isGained" : "isLost") : ""
                return <i key={index} className={segment} />
              })}
            </span>
            <span className="armorySwapImpactValue">
              <s>{from.value}</s> {"→"} <b>{to.value}</b>
            </span>
          </div>
        )
      })}
    </div>
  )
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
  currentRules = null,
  getCandidateRules = null,
}) {
  const cardRefs = useRef({})
  const installedPart = parts.find((part) => part.id === installedPartId) ?? null
  // Roving tabindex: one gallery tab stop; arrows walk the unlocked parts.
  const [rovingPartId, setRovingPartId] = useState(null)
  const tabStopPartId = rovingPartId ?? installedPartId

  const unlockedParts = parts.filter((part) => playerLevel >= part.unlockLevel)
  // One candidate is always featured large with its trade-off: whatever the
  // player points at, else the first unlocked part they could swap in.
  const [hoveredPartId, setHoveredPartId] = useState(null)
  const candidateParts = unlockedParts.filter((part) => part.id !== installedPartId)
  const featuredPart = candidateParts.find((part) => part.id === hoveredPartId)
    ?? candidateParts.find((part) => part.id === rovingPartId)
    ?? candidateParts[0]
    ?? null
  const featuredChips = featuredPart?.effects ? getModuleDeltaChips(featuredPart, installedPart) : []
  const featuredGains = featuredChips.filter((chip) => chip.tone === "gain")
  const featuredCosts = featuredChips.filter((chip) => chip.tone === "cost")
  const swapImpact = featuredPart && getCandidateRules
    ? getSwapImpact(currentRules, getCandidateRules(featuredPart.id))
    : []

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
      {featuredPart ? (
        <div className={`armoryPartFeature tone-${tone}`} aria-label={`Featured: ${featuredPart.label}`}>
          <span className={`armoryPartFeatureGlyph tone-${tone}`} aria-hidden="true">
            {renderPartGlyph?.(featuredPart)}
          </span>
          <div className="armoryPartFeatureHead">
            <span className="armoryPartFeatureEyebrow">
              {installedPart ? `Swap in for ${installedPart.label}` : "Candidate"}
            </span>
            <strong className="armoryPartFeatureName">{featuredPart.label}</strong>
            <span className="armoryPartFeatureFeel">{featuredPart.description}</span>
          </div>
          {swapImpact.length ? <SwapImpact rows={swapImpact} /> : featuredPart.effects ? (
            <div className="armoryPartFeatureTrade">
              <div className="armoryPartFeatureSide is-gain">
                <span className="armoryPartFeatureSideLabel">You gain</span>
                {featuredGains.length ? featuredGains.map((chip) => (
                  <span key={chip.key} className="armoryPartFeatureChip"><b>{chip.label}</b> {chip.value}</span>
                )) : <span className="armoryPartFeatureChip is-none">Nothing</span>}
              </div>
              <div className="armoryPartFeatureSide is-cost">
                <span className="armoryPartFeatureSideLabel">You give up</span>
                {featuredCosts.length ? featuredCosts.map((chip) => (
                  <span key={chip.key} className="armoryPartFeatureChip"><b>{chip.label}</b> {chip.value}</span>
                )) : <span className="armoryPartFeatureChip is-none">Nothing</span>}
              </div>
            </div>
          ) : null}
          <button
            type="button"
            className="primaryButton armoryPartFeatureInstall"
            tabIndex={-1}
            onClick={() => onInstallPart?.(featuredPart.id)}
          >
            Install
          </button>
        </div>
      ) : null}

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
              className={`armoryPartCard tone-${tone} ${isInstalled ? "isInstalled" : ""} ${isLocked ? "isLocked" : ""} ${part.id === featuredPart?.id ? "isFeatured" : ""}`}
              disabled={isLocked}
              tabIndex={isLocked ? undefined : (part.id === tabStopPartId ? 0 : -1)}
              aria-pressed={isInstalled}
              onMouseEnter={() => {
                if (isLocked) onInspectLockedPart?.(part.id)
                else setHoveredPartId(part.id)
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
                {part.effects ? (() => {
                  const chips = isInstalled ? [] : getModuleDeltaChips(part, installedPart)
                  const gains = chips.filter((chip) => chip.tone === "gain")
                  const costs = chips.filter((chip) => chip.tone === "cost")
                  const renderRow = (label, tone, items, emptyText) => (
                    <span className={`armoryPartTradeRow is-${tone}`}>
                      <span className="armoryPartTradeLabel">{label}</span>
                      {items.length ? items.map((chip) => (
                        <span key={chip.key} className={`armoryPartDelta is-${chip.tone}`}>
                          <b>{chip.label}</b> {chip.value}
                        </span>
                      )) : <span className="armoryPartDelta is-same">{emptyText}</span>}
                    </span>
                  )
                  return (
                    <span className="armoryPartDeltas" aria-label="Compared with installed part">
                      {isInstalled ? (
                        <span className="armoryPartTradeRow is-base">
                          <span className="armoryPartTradeLabel">Installed</span>
                          <span className="armoryPartDelta is-same">Baseline for comparisons</span>
                        </span>
                      ) : (
                        <>
                          {renderRow("Gain", "gain", gains, "None")}
                          {renderRow("Cost", "cost", costs, "None")}
                        </>
                      )}
                    </span>
                  )
                })() : null}
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
