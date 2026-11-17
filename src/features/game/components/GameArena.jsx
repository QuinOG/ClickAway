import { useLayoutEffect, useRef } from "react"
import { measurePlayfield } from "../../../game/engine/roundPlayfield.js"
import MovingButton from "../../../components/MovingButton.jsx"
import ArenaWorldArt from "../../../components/art/ArenaWorldArt.jsx"
import ClickFeedbackLayer from "./ClickFeedbackLayer.jsx"
import "./arena-focus.css"

export default function GameArena({
  arenaRef,
  logicalDimensions = null,
  bottomReserve = 0,
  arenaThemeClass,
  onArenaClick,
  buttonStyle,
  isGold = false,
  goldRemainingMs = 0,
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
  finalSeconds = null,
  activeEffect = null,
}) {
  const playfieldRef = useRef(null)
  useLayoutEffect(() => {
    if (!logicalDimensions || !arenaRef.current || !playfieldRef.current) return undefined
    const arena = arenaRef.current
    const syncScale = () => {
      const display = measurePlayfield(arena, bottomReserve)
      playfieldRef.current.style.transform = `scale(${display.width / logicalDimensions.arenaWidth}, ${display.height / logicalDimensions.arenaHeight})`
    }
    syncScale()
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(syncScale)
    observer?.observe(arena)
    window.addEventListener("resize", syncScale)
    return () => {
      observer?.disconnect()
      window.removeEventListener("resize", syncScale)
    }
  }, [arenaRef, bottomReserve, logicalDimensions])
  const isFinalSeconds = finalSeconds !== null
  return (
    <div
      className={`arena ${arenaThemeClass} ${isFinalSeconds ? `isFinalSeconds${finalSeconds <= 3 ? " isFinalDanger" : ""}` : ""} ${activeEffect ? `hasActiveEffect effect-${activeEffect}` : ""}`}
      ref={arenaRef}
      onClick={onArenaClick}
    >
      <div className="arenaStage" aria-hidden="true">
        <ArenaWorldArt />
        <span className="arenaFloor" />
        <span className="arenaHeatGlow" />
        <span className="arenaGameplayBackdrop" />
        <span className="arenaStreakMark" />
        {isFinalSeconds ? (
          <span key={`final-${finalSeconds}`} className="arenaFinalCount">{finalSeconds}</span>
        ) : null}
        <span className="arenaCorner isTL" />
        <span className="arenaCorner isTR" />
        <span className="arenaCorner isBL" />
        <span className="arenaCorner isBR" />
      </div>
      <div ref={playfieldRef} style={logicalDimensions ? {
        position: "absolute", left: 0, top: 0,
        width: logicalDimensions.arenaWidth, height: logicalDimensions.arenaHeight,
        transformOrigin: "top left", pointerEvents: "none",
      } : { display: "contents" }}>
        {isTargetVisible ? (
          <MovingButton
            key={`target-spawn-${targetSpawnSequence}`}
            style={{ ...buttonStyle, pointerEvents: "auto" }}
            onClick={onButtonClick}
            disabled={isButtonDisabled}
            isGold={isGold}
            goldRemainingMs={goldRemainingMs}
            label={buttonLabel}
            labelFontSize={buttonLabelFontSize}
            skinClass={buttonSkinClass}
            skinImageSrc={buttonSkinImageSrc}
            skinImageScale={buttonSkinImageScale}
          />
        ) : null}

      </div>
      <ClickFeedbackLayer clickFeedbackItems={clickFeedbackItems} />
      {roundOverlay}
    </div>
  )
}
