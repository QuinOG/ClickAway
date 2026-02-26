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
}) {
  return (
    <div className={`arena ${arenaThemeClass}`} ref={arenaRef} onClick={onArenaClick}>
      <MovingButton
        style={buttonStyle}
        onClick={onButtonClick}
        disabled={isButtonDisabled}
        label={buttonLabel}
        labelFontSize={buttonLabelFontSize}
        skinClass={buttonSkinClass}
        skinImageSrc={buttonSkinImageSrc}
        skinImageScale={buttonSkinImageScale}
      />

      <ClickFeedbackLayer clickFeedbackItems={clickFeedbackItems} />
    </div>
  )
}
