import MovingButton from "../../../components/MovingButton.jsx"
import ClickFeedbackLayer from "./ClickFeedbackLayer.jsx"

export default function GameArena({
  arenaRef,
  arenaThemeClass,
  onArenaClick,
  buttonStyle,
  onButtonClick,
  isButtonDisabled,
  buttonLabel,
  buttonLabelFontSize,
  buttonSkinClass,
  buttonSkinImageSrc,
  buttonSkinImageScale,
  clickFeedbackItems,
  targetSpawnSequence = 0,
  isTargetVisible = true,
  roundOverlay = null,
}) {
  return (
    <div className={`arena ${arenaThemeClass}`} ref={arenaRef} onClick={onArenaClick}>
      {isTargetVisible ? (
        <MovingButton
          key={`target-spawn-${targetSpawnSequence}`}
          style={buttonStyle}
          onClick={onButtonClick}
          disabled={isButtonDisabled}
          label={buttonLabel}
          labelFontSize={buttonLabelFontSize}
          skinClass={buttonSkinClass}
          skinImageSrc={buttonSkinImageSrc}
          skinImageScale={buttonSkinImageScale}
        />
      ) : null}

      <ClickFeedbackLayer clickFeedbackItems={clickFeedbackItems} />
      {roundOverlay}
    </div>
  )
}
