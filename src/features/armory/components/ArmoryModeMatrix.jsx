import { buildLoadoutPresentation } from "../../../constants/buildcraftPresentation.js"

export default function ArmoryModeMatrix({
  modes = [],
  activeLoadout = null,
  selectedModeId = "",
  onModeChange,
}) {
  if (!activeLoadout) return null

  return (
    <section className="armoryModeMatrix" aria-label="Build preview across all modes">
      <h4 className="armoryModeMatrixTitle">All modes at a glance</h4>
      <p className="armoryModeMatrixLead">
        Tap a row to make that mode the active preview (same as the strip above).
      </p>
      <ul className="armoryModeMatrixList">
        {modes.map((mode) => {
          const pres = buildLoadoutPresentation(mode, activeLoadout)
          const isSelected = mode.id === selectedModeId
          const headline = pres.summaryStats.slice(0, 2).map((s) => `${s.label}: ${s.value}`).join(" · ")

          return (
            <li key={mode.id} className="armoryModeMatrixItem">
              <button
                type="button"
                className={`armoryModeMatrixRow ${isSelected ? "isActive" : ""}`}
                onClick={() => onModeChange?.(mode.id)}
                aria-pressed={isSelected}
              >
                <span className="armoryModeMatrixMode">{mode.label}</span>
                <span className="armoryModeMatrixFeel">{pres.glanceText}</span>
                <span className="armoryModeMatrixStats">{headline}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
