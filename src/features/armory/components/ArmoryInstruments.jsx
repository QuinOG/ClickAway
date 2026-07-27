// Calibrated instrument column (Phase 5): the five feel readouts rendered as
// segment dials instead of metric cards.

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

function InstrumentDial({ scale, currentIndex, compareIndex }) {
  return (
    <span className="armoryInstrumentDial" aria-hidden="true">
      {scale.map((step, index) => {
        const isLit = index <= currentIndex
        const isCompareMarker = compareIndex !== null && compareIndex !== undefined && index === compareIndex

        return (
          <span
            key={step}
            className={`armoryInstrumentSegment ${isLit ? "isLit" : ""} ${isCompareMarker ? "isCompareMarker" : ""}`}
          />
        )
      })}
    </span>
  )
}

/**
 * Calibrated instrument column. Compare mode adds a second named series
 * alongside the active build.
 */
export default function ArmoryInstruments({
  presentation,
  comparePresentation = null,
  primaryLabel = "Active",
  compareLabel = "Ghost",
}) {
  if (!presentation) return null

  const isComparing = Boolean(comparePresentation)

  return (
    <section className="armoryInstruments" aria-label="Build instruments">
      {isComparing ? (
        <div className="armoryInstrumentsLegend">
          <span className="armoryInstrumentsLegendItem tone-primary">{primaryLabel}</span>
          <span className="armoryInstrumentsLegendItem tone-compare">{compareLabel}</span>
        </div>
      ) : null}

      {presentation.summaryStats.map((stat) => {
        const scale = INSTRUMENT_SCALES[stat.label] ?? [stat.value]
        const currentIndex = getScaleIndex(scale, stat.value)
        const compareStat = comparePresentation?.summaryStats?.find(
          (candidate) => candidate.label === stat.label
        )
        const compareIndex = compareStat ? getScaleIndex(scale, compareStat.value) : null
        const currentExact = getExactMetric(stat.label, presentation.roundRules)

        return (
          <article
            key={stat.label}
            className={`armoryInstrument ${isComparing ? "isComparing" : ""}`}
          >
            <span className="armoryInstrumentLabel">{stat.label}</span>
            <InstrumentDial
              scale={scale}
              currentIndex={currentIndex}
              compareIndex={isComparing ? compareIndex : null}
            />
            <span className="armoryInstrumentReadout">
              <span className="armoryInstrumentValue">{stat.value}</span>
              {isComparing && compareStat ? (
                <span className="armoryInstrumentCompareValue">{compareStat.value}</span>
              ) : null}
            </span>
            <span className="armoryInstrumentExact">
              <span>{currentExact.text}</span>
            </span>
          </article>
        )
      })}
    </section>
  )
}
