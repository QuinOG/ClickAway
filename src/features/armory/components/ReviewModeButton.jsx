export default function ReviewModeButton({ mode, isActive = false, onClick }) {
  return (
    <button
      type="button"
      className={`armoryModeButton ${isActive ? "isActive" : ""}`}
      onClick={onClick}
    >
      <span className="armoryModeButtonLabel">{mode.label}</span>
      <span className="armoryModeButtonMeta">
        {mode.isTimedRound === false ? "No timer" : `${mode.durationSeconds}s`}
      </span>
    </button>
  )
}
