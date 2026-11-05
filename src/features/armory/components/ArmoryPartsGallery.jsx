import { useEffect, useRef, useState } from "react"

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
        const delta = to.rating - from.rating
        const steps = Math.min(5, Math.abs(delta))
        const tone = delta > 0 ? "isGain" : delta < 0 ? "isLoss" : "isEven"
        return (
          <div key={key} className={`armorySwapImpactRow ${tone}`}>
            <span className="armorySwapImpactLabel">{label}</span>
            <span className="armorySwapImpactDiverge" aria-hidden="true">
              <span className="armorySwapImpactSide isLossSide">
                {Array.from({ length: 5 }, (_, index) => (
                  <i key={index} className={delta < 0 && index < steps ? "isLost" : ""} />
                ))}
              </span>
              <em className="armorySwapImpactAxis" />
              <span className="armorySwapImpactSide isGainSide">
                {Array.from({ length: 5 }, (_, index) => (
                  <i key={index} className={delta > 0 && index < steps ? "isGained" : ""} />
                ))}
              </span>
              <b className="armorySwapImpactDelta">{delta > 0 ? `+${delta}` : delta < 0 ? `−${Math.abs(delta)}` : "±0"}</b>
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

const RHYTHM_STREAKS = 20

// Powerup swap as two streak rulers (1-20): where the installed tool charges
// versus where the candidate would, so cadence is compared at a glance.
function ChargeRhythm({ candidate, installed, multiplier }) {
  const every = (part) => Math.max(1, Math.round(Number(part.awardEvery) * multiplier))
  const rows = [
    installed ? { key: "installed", label: installed.label, every: every(installed), isCandidate: false } : null,
    { key: "candidate", label: candidate.label, every: every(candidate), isCandidate: true },
  ].filter(Boolean)
  const counts = rows.map((row) => Math.floor(RHYTHM_STREAKS / row.every))
  const tone = rows.length < 2 ? "isEven" : counts[1] > counts[0] ? "isGain" : counts[1] < counts[0] ? "isLoss" : "isEven"

  return (
    <div className={`armoryChargeRhythm ${tone}`} aria-label="Charge rhythm">
      <span className="armoryChargeRhythmTitle">Charge rhythm · streak 1–{RHYTHM_STREAKS}</span>
      {rows.map((row, rowIndex) => (
        <div key={row.key} className={`armoryChargeRhythmRow ${row.isCandidate ? "isCandidate" : "isInstalled"}`}>
          <span className="armoryChargeRhythmLabel">{row.label}</span>
          <span className="armoryChargeRhythmTrack" aria-hidden="true">
            {Array.from({ length: RHYTHM_STREAKS }, (_, index) => (
              <i key={index} className={(index + 1) % row.every === 0 ? "isCharge" : ""} />
            ))}
          </span>
          <span className="armoryChargeRhythmCount">
            <b>{counts[rowIndex]}</b> charge{counts[rowIndex] === 1 ? "" : "s"}
          </span>
        </div>
      ))}
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
  chargeMultiplier = null,
  onPreviewPart = null,
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
  // While the pointer or focus is inside the gallery, the featured candidate
  // is "previewed" so the instrument gauges can show where it would move them.
  const [isPreviewing, setIsPreviewing] = useState(false)
  const previewPartId = isPreviewing ? featuredPart?.id ?? null : null
  useEffect(() => {
    onPreviewPart?.(previewPartId)
  }, [onPreviewPart, previewPartId])
  useEffect(() => () => onPreviewPart?.(null), [onPreviewPart])

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
      onMouseEnter={() => setIsPreviewing(true)}
      onMouseLeave={() => setIsPreviewing(false)}
      onFocus={() => setIsPreviewing(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsPreviewing(false)
      }}
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
          {chargeMultiplier !== null && featuredPart.awardEvery ? (
            <ChargeRhythm candidate={featuredPart} installed={installedPart} multiplier={chargeMultiplier} />
          ) : null}
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
