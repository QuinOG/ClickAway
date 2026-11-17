import { motion as Motion, useReducedMotion } from "motion/react"
import "../../styles/components/game-progress.css"

export default function ProgressBar({
  percent = 0,
  isUnlocked = false,
  isUnavailable = false,
  progressText = "",
  percentText = "",
  label = "Achievement progress",
}) {
  const reducedMotion = useReducedMotion()
  const showUnavailable = isUnavailable && !isUnlocked
  const numeric = Number(percent)
  const value = showUnavailable ? 0 : isUnlocked ? 100 : Math.max(0, Math.min(100, Number.isFinite(numeric) ? numeric : 0))
  const valueText = showUnavailable ? "N/A" : percentText || `${Math.floor(value)}%`

  return (
    <div className={`gameProgress ${showUnavailable ? "isUnavailable" : ""} ${isUnlocked ? "isUnlocked" : ""}`}>
      <div className="gameProgressTrack" role="progressbar" aria-label={label}
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}
        aria-valuetext={[progressText, valueText].filter(Boolean).join(", ")}>
        <Motion.span className="gameProgressFill"
          initial={reducedMotion ? false : { scaleX: 0 }}
          animate={{ scaleX: value / 100 }}
          transition={{ duration: reducedMotion ? 0 : 0.65, ease: [0.22, 1, 0.36, 1] }} />
        <strong className="gameProgressValue" aria-hidden="true">{valueText}</strong>
      </div>
      {progressText && <span className="gameProgressText">{progressText}</span>}
    </div>
  )
}
