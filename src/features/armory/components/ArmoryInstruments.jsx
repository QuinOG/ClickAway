import { useEffect, useRef, useState } from "react"

// Calibrated instrument column (Phase 5): the five feel readouts rendered as
// segment dials instead of metric cards. While a part is being previewed the
// dials show current→previewed movement before anything is committed.

// Ordered worst→best along each gauge so a fill level and a direction arrow
// mean something. Values come from buildLoadoutPresentation's summaryStats.
const INSTRUMENT_SCALES = {
  "Aim Window": ["Tight", "Standard", "Slightly larger", "Forgiving"],
  "Shrink Pace": ["Faster", "Standard", "Slower"],
  "Combo Ramp": ["Slow ramp", "Standard", "Fast ramp"],
  "Miss Cost": ["Punishing", "Standard", "Forgiving"],
  "Power Tempo": ["Slow charge", "Standard", "Fast charge", "Starts charged"],
}

function getScaleIndex(scale, value) {
  const index = scale.indexOf(value)
  return index === -1 ? scale.indexOf("Standard") : index
}

function formatSigned(value, digits = 0, suffix = "") {
  const rounded = Number(value).toFixed(digits)
  return `${value > 0 ? "+" : ""}${rounded}${suffix}`
}

function getExactMetric(label, rules = {}) {
  if (label === "Aim Window") {
    return { value: Number(rules.initialButtonSize) || 0, text: `${Number(rules.initialButtonSize) || 0}px`, digits: 0, suffix: "px" }
  }
  if (label === "Shrink Pace") {
    const value = (1 - (Number(rules.shrinkFactor) || 1)) * 100
    return { value, text: `${value.toFixed(1)}% / hit`, digits: 1, suffix: "%" }
  }
  if (label === "Combo Ramp") {
    const value = Number(rules.comboStep) || 0
    return { value, text: `every ${value} hits`, digits: 0, suffix: " hits" }
  }
  if (label === "Miss Cost") {
    const value = Number(rules.missPenalty) || 0
    return { value, text: `${value} points`, digits: 0, suffix: " pts" }
  }

  const value = Number(rules.powerupAwardMultiplier) || 1
  const charges = Number(rules.startingPowerupCharges) || 0
  return {
    value,
    text: charges > 0 ? `x${value.toFixed(2)} · ${charges} ready` : `x${value.toFixed(2)} cadence`,
    digits: 2,
    suffix: "x",
  }
}

function InstrumentDial({ scale, currentIndex, previewIndex, compareIndex }) {
  const isPreviewing = previewIndex !== null && previewIndex !== currentIndex
  const litIndex = isPreviewing ? Math.min(currentIndex, previewIndex) : currentIndex

  return (
    <span className="armoryInstrumentDial" aria-hidden="true">
      {scale.map((step, index) => {
        const isLit = index <= litIndex
        const isGain = isPreviewing && index > currentIndex && index <= previewIndex
        const isLoss = isPreviewing && index > previewIndex && index <= currentIndex
        const isCompareMarker = compareIndex !== null && compareIndex !== undefined && index === compareIndex

        return (
          <span
            key={step}
            className={`armoryInstrumentSegment ${isLit ? "isLit" : ""} ${isGain ? "isGain" : ""} ${isLoss ? "isLoss" : ""} ${isCompareMarker ? "isCompareMarker" : ""}`}
          />
        )
      })}
    </span>
  )
}

/**
 * Calibrated instrument column. Two independent overlay modes share the same
 * dial: `previewPresentation` (Phase 5, pre-commit part hover — a single
 * gain/loss animation) and `comparePresentation` (Phase 8, Compare Bench — a
 * second named series read alongside the primary, no gain/loss framing since
 * neither build is "about to become" the other).
 */
export default function ArmoryInstruments({
  presentation,
  previewPresentation = null,
  comparePresentation = null,
  primaryLabel = "Active",
  compareLabel = "Ghost",
}) {
  const [announcement, setAnnouncement] = useState("")
  const announceTimeoutRef = useRef(null)

  const previewSummary = previewPresentation?.summaryStats
    ?.map((stat) => {
      const current = presentation?.summaryStats?.find((candidate) => candidate.label === stat.label)
      return current && current.value !== stat.value
        ? `${stat.label}: ${current.value} to ${stat.value}`
        : null
    })
    .filter(Boolean)
    .join(". ")

  // Debounced so rapid hover/focus movement across the gallery doesn't spam
  // the live region — only the settled preview gets announced.
  useEffect(() => {
    if (announceTimeoutRef.current) clearTimeout(announceTimeoutRef.current)
    announceTimeoutRef.current = setTimeout(
      () => setAnnouncement(previewSummary || ""),
      previewSummary ? 350 : 0
    )
    return () => clearTimeout(announceTimeoutRef.current)
  }, [previewSummary])

  if (!presentation) return null

  const isComparing = Boolean(comparePresentation)

  return (
    <section className="armoryInstruments" aria-label="Build instruments">
      <span className="armoryVisuallyHidden" role="status" aria-live="polite">{announcement}</span>
      {isComparing ? (
        <div className="armoryInstrumentsLegend">
          <span className="armoryInstrumentsLegendItem tone-primary">{primaryLabel}</span>
          <span className="armoryInstrumentsLegendItem tone-compare">{compareLabel}</span>
        </div>
      ) : null}

      {presentation.summaryStats.map((stat) => {
        const scale = INSTRUMENT_SCALES[stat.label] ?? [stat.value]
        const currentIndex = getScaleIndex(scale, stat.value)
        const previewStat = previewPresentation?.summaryStats?.find(
          (candidate) => candidate.label === stat.label
        )
        const previewIndex = previewStat ? getScaleIndex(scale, previewStat.value) : null
        const hasDelta = Boolean(previewStat) && previewStat.value !== stat.value
        const direction = hasDelta && previewIndex > currentIndex ? "up" : "down"

        const compareStat = comparePresentation?.summaryStats?.find(
          (candidate) => candidate.label === stat.label
        )
        const compareIndex = compareStat ? getScaleIndex(scale, compareStat.value) : null
        const currentExact = getExactMetric(stat.label, presentation.roundRules)
        const previewExact = previewPresentation
          ? getExactMetric(stat.label, previewPresentation.roundRules)
          : null
        const exactDelta = previewExact ? previewExact.value - currentExact.value : 0

        return (
          <article
            key={stat.label}
            className={`armoryInstrument ${hasDelta ? "isPreviewing" : ""} ${isComparing ? "isComparing" : ""}`}
          >
            <span className="armoryInstrumentLabel">{stat.label}</span>
            <InstrumentDial
              scale={scale}
              currentIndex={currentIndex}
              previewIndex={hasDelta ? previewIndex : null}
              compareIndex={isComparing ? compareIndex : null}
            />
            <span className="armoryInstrumentReadout">
              <span className="armoryInstrumentValue">{stat.value}</span>
              {hasDelta ? (
                <span className={`armoryInstrumentDelta delta-${direction}`}>
                  <span aria-hidden="true">{direction === "up" ? "▲" : "▼"}</span>
                  {" "}
                  {previewStat.value}
                </span>
              ) : null}
              {isComparing && compareStat ? (
                <span className="armoryInstrumentCompareValue">{compareStat.value}</span>
              ) : null}
            </span>
            <span className="armoryInstrumentExact">
              <span>{currentExact.text}</span>
              {hasDelta && previewExact ? (
                <span className="armoryInstrumentExactPreview">
                  <span aria-hidden="true">→</span> {previewExact.text}
                  <em>({formatSigned(exactDelta, currentExact.digits, currentExact.suffix)})</em>
                </span>
              ) : null}
            </span>
          </article>
        )
      })}
    </section>
  )
}
