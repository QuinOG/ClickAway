import { getExactMetric } from "../armoryExactMetrics.js"

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
              <span className="armoryInstrumentValue">{currentExact.text}</span>
              {isComparing && compareStat ? (
                <span className="armoryInstrumentCompareValue">{compareStat.value}</span>
              ) : null}
            </span>
            <span className="armoryInstrumentExact">
              <span>{stat.value}</span>
            </span>
          </article>
        )
      })}
    </section>
  )
}
