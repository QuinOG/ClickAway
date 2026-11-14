function clampPercent(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return 0
  return Math.max(0, Math.min(100, Math.floor(numericValue)))
}

export default function ProgressBar({
  percent = 0,
  isUnlocked = false,
  isUnavailable = false,
  progressText = "",
  percentText = "",
}) {
  const showUnavailable = isUnavailable && !isUnlocked
  const normalizedPercent = showUnavailable
    ? 0
    : (isUnlocked ? 100 : clampPercent(percent))

  return (
    <div className={`achievementProgress ${showUnavailable ? "isUnavailable" : ""}`}>
      <div className="achievementProgressTrack" aria-hidden="true">
        <span
          className={`achievementProgressFill ${isUnlocked ? "isUnlocked" : ""}`}
          style={{ width: `${normalizedPercent}%` }}
        />
      </div>
      <div className="achievementProgressMeta">
        <span className="achievementProgressText">{progressText}</span>
        <strong className="achievementPercentText">{showUnavailable ? "N/A" : percentText}</strong>
      </div>
    </div>
  )
}
