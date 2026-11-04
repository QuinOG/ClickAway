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
      <div className="arenaStage" aria-hidden="true">
        <span className="arenaFloor" />
        <span className="arenaCorner isTL" />
        <span className="arenaCorner isTR" />
        <span className="arenaCorner isBL" />
        <span className="arenaCorner isBR" />
      </div>
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
