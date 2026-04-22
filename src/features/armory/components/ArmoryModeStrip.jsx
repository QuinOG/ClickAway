import ReviewModeButton from "./ReviewModeButton.jsx"

export default function ArmoryModeStrip({
  modes = [],
  selectedModeId = "",
  onModeChange,
}) {
  return (
    <header className="armoryModeStrip" aria-label="Preview tuning for game mode">
      <div className="armoryModeStripCopy">
        <p className="armoryModeStripEyebrow">Mode preview</p>
        <p className="armoryModeStripHint">
          Passive summaries, hotbar cadence, and review numbers all use the mode you pick here.
        </p>
      </div>
      <div className="armoryModeStripControls" role="group" aria-label="Select mode for Armory preview">
        {modes.map((mode) => (
          <ReviewModeButton
            key={mode.id}
            mode={mode}
            isActive={mode.id === selectedModeId}
            onClick={() => onModeChange?.(mode.id)}
          />
        ))}
      </div>
    </header>
  )
}
