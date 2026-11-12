import { useEffect, useRef, useState } from "react"

import { getModuleDeltaChips, getUnlockText } from "../armoryUtils.js"
import { getProfileStats } from "../armorySpecRatings.js"
import ArmoryStateEmblem from "./ArmoryStateEmblem.jsx"
import ArmorySegmentGauge from "./ArmorySegmentGauge.jsx"

// The parts gallery (Phases 5â€“6): a lane's modules â€” or the tool rack's powers â€”
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

// What a swap does to the build's measured rules: each stat that changes,
// with its current and proposed values.
function getSwapImpact(currentRules, nextRules) {
  if (!currentRules || !nextRules) return []
  const nextByKey = Object.fromEntries(getProfileStats(nextRules).map((stat) => [stat.key, stat]))
  return getProfileStats(currentRules).flatMap((stat) => {
    const next = nextByKey[stat.key]
    if (!next || next.value === stat.value) return []
    return [{ key: stat.key, label: stat.label, from: stat, to: next }]
  })
}

// A swap report: the actual measurements before and after, one aligned row
// per changed stat, edged mint when the change helps and coral when it costs.
const REPORT_LABELS = {
  size: "Aim window",
  floor: "Floor size",
  shrink: "Shrink pace",
  combo: "Combo ramp",
  miss: "Miss cost",
  charge: "Power tempo",
  payout: "Score payout",
}

function formatReportValue(key, value) {
  if (key === "miss") return value === "0" ? "0 points" : `${value.replace("-", "")} point${value === "-1" ? "" : "s"}`
  if (key === "combo") return `${value.replace("every ", "")} hits`
  if (key === "shrink") return `${((1 - Number(value.replace("x", ""))) * 100).toFixed(1)}% / hit`
  return value
}

function SwapImpact({ rows, title = "Swap report", fromLabel = "Current", toLabel = "Proposed", isPreview = false }) {
  return (
    <div className="armorySwapReport" role="table" aria-label={title}>
      <div className="armorySwapReportHead" role="row">
        <span role="columnheader">{title}</span>
        <span role="columnheader">{fromLabel}</span>
        <span role="columnheader">{toLabel}{isPreview ? <em className="armorySwapReportPreview">Preview</em> : null}</span>
      </div>
      {rows.map(({ key, label, from, to }) => {
        const delta = to.rating - from.rating
        const tone = delta > 0 ? "isGain" : delta < 0 ? "isLoss" : "isEven"
        const verdict = delta > 0 ? "better" : delta < 0 ? "worse" : "no change"
        return (
          <div key={key} className={`armorySwapReportRow ${tone}`} role="row" aria-label={`${REPORT_LABELS[key] ?? label}: ${formatReportValue(key, from.value)} to ${formatReportValue(key, to.value)}, ${verdict}`}>
            <span className="armorySwapReportLabel" role="rowheader"><span className="armorySwapReportName">{REPORT_LABELS[key] ?? label}</span><ArmorySegmentGauge rating={from.rating} next={to.rating} className="armorySwapReportGauge" /></span>
            <span className="armorySwapReportFrom" role="cell">{formatReportValue(key, from.value)}</span>
            <b className="armorySwapReportTo" role="cell">{formatReportValue(key, to.value)}</b>
          </div>
        )
      })}
    </div>
  )
}

function ModCartridgePlate({ part, installed, rules, nextRules, confirmed, renderPartGlyph, install }) {
  const current = rules ? getProfileStats(rules) : []
  const next = nextRules ? getProfileStats(nextRules) : current
  const changes = Object.fromEntries((confirmed?.rows ?? []).map((row) => [row.key, row]))
  const order = ["size", "floor", "shrink", "combo", "miss", "charge", "payout"]
  return <section className="armoryCartridgePlate" aria-label="Mod cartridge">
    <div className="armoryCartridgePlateHeader">
      <span className="armoryCartridgePlateEmblem">{part && renderPartGlyph?.(part, 64)}</span>
      <div><small>{confirmed || !nextRules ? "Installed in this build" : `Swap in for ${installed?.label ?? "current mod"}`}</small><strong>{part?.label ?? "No mod selected"}</strong><p>{part?.description}</p></div>
      {!confirmed && nextRules && part ? <button type="button" className="primaryButton" onClick={() => install(part.id)}>Install {part.label}</button> : null}
    </div>
    <div className="armoryCartridgePlateChannels">
      {order.map((key) => {
        const base = current.find((stat) => stat.key === key)
        const change = changes[key]
        const from = change?.from ?? base
        const to = change?.to ?? next.find((stat) => stat.key === key) ?? base
        const different = from && to && from.value !== to.value
        return <div className="armoryCartridgePlateChannel" key={key}><span>{REPORT_LABELS[key]}</span><div>{from ? formatReportValue(key, from.value) : "\u2014"}{different ? <> <i>{"\u2192"}</i> <b>{formatReportValue(key, to.value)}</b></> : null}</div><ArmorySegmentGauge rating={from?.rating} next={to?.rating} /></div>
      })}
      <div className="armoryCartridgePlateLegend"><b>{confirmed ? "BEFORE \u2192 NOW" : "CURRENT \u2192 PREVIEW"}</b><span><i /> Gain <i /> Cost</span></div>
    </div>
    <div className="armoryCartridgePlateStatus">{confirmed || !nextRules ? `\u2713 Installed ${part?.label ?? ""}` : "Preview \u00b7 not fitted"}</div>
  </section>
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
      <span className="armoryChargeRhythmTitle">Charge rhythm Â· streak 1â€“{RHYTHM_STREAKS}</span>
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
  // Hover only re-features a part after a short dwell, so sweeping the pointer
  // across other tiles on the way to Install cannot swap the candidate.
  const hoverTimerRef = useRef(null)
  useEffect(() => () => clearTimeout(hoverTimerRef.current), [])
  // After an install the card holds on the part just fitted, with the changes
  // it applied, until the player deliberately points at another part.
  const [confirmed, setConfirmed] = useState(null)
  const featureHover = (partId) => {
    clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = setTimeout(() => {
      setHoveredPartId(partId)
      setConfirmed((current) => (current && current.partId !== partId ? null : current))
    }, 140)
  }
  const cancelHover = () => clearTimeout(hoverTimerRef.current)
  const candidateParts = unlockedParts.filter((part) => part.id !== installedPartId)
  const featuredPart = candidateParts.find((part) => part.id === hoveredPartId)
    ?? candidateParts.find((part) => part.id === rovingPartId)
    ?? candidateParts[0]
    ?? null
  const featuredChips = featuredPart?.effects ? getModuleDeltaChips(featuredPart, installedPart) : []
  const featuredGains = featuredChips.filter((chip) => chip.tone === "gain")
  const featuredCosts = featuredChips.filter((chip) => chip.tone === "cost")
  // The featured candidate is always previewed, so the measurement strip
  // shows where it would move each stat without the player hovering first.
  const confirmedPart = confirmed && confirmed.partId === installedPartId ? installedPart : null
  const previewPartId = !confirmedPart ? featuredPart?.id ?? null : null
  useEffect(() => {
    onPreviewPart?.(previewPartId)
  }, [onPreviewPart, previewPartId])
  useEffect(() => () => onPreviewPart?.(null), [onPreviewPart])

  const installPart = (partId) => {
    cancelHover()
    const rows = getCandidateRules ? getSwapImpact(currentRules, getCandidateRules(partId)) : []
    setConfirmed({ partId, rows })
    setHoveredPartId(null)
    onInstallPart?.(partId)
  }

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
      {currentRules ? <ModCartridgePlate part={confirmedPart ?? featuredPart ?? installedPart} installed={installedPart} rules={currentRules} nextRules={!confirmedPart && featuredPart && getCandidateRules ? getCandidateRules(featuredPart.id) : null} confirmed={confirmedPart ? confirmed : null} renderPartGlyph={renderPartGlyph} install={installPart} /> : confirmedPart ? (
        <div className={`armoryPartFeature tone-${tone} isConfirmed`} aria-label={`Installed: ${confirmedPart.label}`}>
          <span className={`armoryPartFeatureGlyph tone-${tone}`} aria-hidden="true">
            {renderPartGlyph?.(confirmedPart)}
          </span>
          <div className="armoryPartFeatureHead">
            <span className="armoryPartFeatureEyebrow">Installed in this build</span>
            <strong className="armoryPartFeatureName">{confirmedPart.label}</strong>
            <span className="armoryPartFeatureFeel">{confirmedPart.description}</span>
          </div>
          {confirmed.rows.length ? <SwapImpact rows={confirmed.rows} title="Applied changes" fromLabel="Before" toLabel="Now" /> : null}
          <span className="armoryPartFeatureInstalled" role="status">Installed {"âœ“"}</span>
        </div>
      ) : featuredPart ? (
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
          {swapImpact.length ? <SwapImpact rows={swapImpact} toLabel={`With ${featuredPart.label}`} isPreview /> : featuredPart.effects ? (
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
            onClick={() => installPart(featuredPart.id)}
          >
            Install {featuredPart.label}
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
              className={`armoryPartCard tone-${tone} ${isInstalled ? "isInstalled" : ""} ${isLocked ? "isLocked" : ""} ${!confirmedPart && part.id === featuredPart?.id ? "isFeatured" : ""}`}
              disabled={isLocked}
              tabIndex={isLocked ? undefined : (part.id === tabStopPartId ? 0 : -1)}
              aria-pressed={isInstalled}
              onMouseEnter={() => {
                if (isLocked) onInspectLockedPart?.(part.id)
                else featureHover(part.id)
              }}
              onMouseLeave={cancelHover}
              onFocus={() => {
                setRovingPartId(part.id)
                setConfirmed((current) => (current && current.partId !== part.id ? null : current))
              }}
              onClick={() => {
                if (!isInstalled) installPart(part.id)
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
