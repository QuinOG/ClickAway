import { getExactMetric } from "../armoryExactMetrics.js"
import { getProfileStats } from "../armorySpecRatings.js"

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

const GAUGE_STAT_KEYS = {
  "Aim Window": "size",
  "Shrink Pace": "shrink",
  "Combo Ramp": "combo",
  "Miss Cost": "miss",
  "Power Tempo": "charge",
}

function getGaugeRating(label, roundRules) {
  if (!roundRules) return null
  const stat = getProfileStats(roundRules).find((candidate) => candidate.key === GAUGE_STAT_KEYS[label])
  return stat ? stat.rating : null
}

// A 180-degree dial: filled arc + needle at the 1-10 rating, ten ticks, and an
// optional ghost needle for the compared build.
function InstrumentGauge({ rating, compareRating = null }) {
  const needleAngle = (value) => -90 + (value / 10) * 180
  return (
    <svg className="armoryInstrumentGauge" viewBox="0 0 100 58" aria-hidden="true">
      <path className="armoryGaugeTrack" d="M10 52 A40 40 0 0 1 90 52" pathLength="100" />
      <path className="armoryGaugeFill" d="M10 52 A40 40 0 0 1 90 52" pathLength="100" strokeDasharray={`${rating * 10} 100`} />
      {Array.from({ length: 11 }, (_, index) => (
        <line key={index} className="armoryGaugeTick" x1="50" y1="6" x2="50" y2={index % 5 === 0 ? 13 : 10} transform={`rotate(${-90 + index * 18} 50 52)`} />
      ))}
      {compareRating !== null ? (
        <line className="armoryGaugeNeedle isCompare" x1="50" y1="52" x2="50" y2="20" transform={`rotate(${needleAngle(compareRating)} 50 52)`} />
      ) : null}
      <line className="armoryGaugeNeedle" x1="50" y1="52" x2="50" y2="18" transform={`rotate(${needleAngle(rating)} 50 52)`} />
      <circle className="armoryGaugeHub" cx="50" cy="52" r="4.5" />
    </svg>
  )
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
        const rating = getGaugeRating(stat.label, presentation.roundRules)
        const compareRating = isComparing ? getGaugeRating(stat.label, comparePresentation.roundRules) : null
        const toneClass = rating === null ? "" : rating >= 7 ? "isHigh" : rating <= 3 ? "isLow" : "isMid"

        return (
          <article
            key={stat.label}
            className={`armoryInstrument ${isComparing ? "isComparing" : ""} ${rating !== null ? `hasGauge ${toneClass}` : ""}`}
          >
            <span className="armoryInstrumentLabel">{stat.label}</span>
            {rating !== null ? (
              <InstrumentGauge rating={rating} compareRating={compareRating} />
            ) : (
              <InstrumentDial
                scale={scale}
                currentIndex={currentIndex}
                compareIndex={isComparing ? compareIndex : null}
              />
            )}
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
