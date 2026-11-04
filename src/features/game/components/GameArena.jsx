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
        <svg className="arenaHorizon" viewBox="0 0 1200 220" preserveAspectRatio="none">
          <path className="arenaHorizonStands" d="M0 220V150l80-20 70 8 90-34 110 18 80-26 120 30 100-22 120 24 90-30 110 20 80-14 150 30v86Z" />
          <g className="arenaHorizonArchitecture">
            <path d="M0 150V62h34v74M72 138V42h22v91M1128 137V42h22v96M1166 145V62h34v88" />
            <path d="M0 84h1200M0 99h1200M0 114h1200M0 129h1200" />
            <path d="M438 103V50h44v53M718 103V50h44v53M438 63h44M718 63h44" />
          </g>
          <g className="arenaHorizonCrowd">
            <path d="M0 92h1200M0 108h1200M0 124h1200" />
          </g>
          <g className="arenaHorizonPylons">
            <path d="M150 140V40M148 40h4M520 128V24M518 24h4M880 132V30M878 30h4M1080 140V46M1078 46h4" />
          </g>
          <g className="arenaHorizonLights">
            <circle cx="150" cy="40" r="6" />
            <circle cx="520" cy="24" r="6" />
            <circle cx="880" cy="30" r="6" />
            <circle cx="1080" cy="46" r="6" />
          </g>
        </svg>
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
