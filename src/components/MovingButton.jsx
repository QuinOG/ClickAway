import { GOLD_TARGET_WINDOW_MS } from "../game/engine/roundGeometry.js"
import { useEffect, useRef, useState } from "react"

const failedTargetSkinSources = new Set()

function getButtonInlineStyle({ style, labelFontSize, hasImage, skinImageSrc, skinImageScale }) {
  return {
    ...style,
    fontSize: `${labelFontSize}px`,
    backgroundImage: hasImage ? `url(${skinImageSrc})` : undefined,
    backgroundSize: hasImage ? `${skinImageScale}%` : undefined,
  }
}

export default function MovingButton({
  style,
  onClick,
  disabled,
  isGold = false,
  goldRemainingMs = 0,
  getGoldRemainingMs,
  label = "Click",
  labelFontSize,
  skinClass = "skin-default",
  skinImageSrc = "",
  skinImageScale = 100,
}) {
  const ringRef = useRef(null)
  useEffect(() => {
    if (!isGold || !getGoldRemainingMs) return undefined
    let frame
    const draw = () => {
      const remaining = getGoldRemainingMs()
      if (ringRef.current) ringRef.current.style.strokeDashoffset = 1 - remaining / GOLD_TARGET_WINDOW_MS
      if (remaining > 0) frame = window.requestAnimationFrame(draw)
    }
    draw()
    return () => window.cancelAnimationFrame(frame)
  }, [isGold, getGoldRemainingMs])
  const hasImage = Boolean(skinImageSrc)
  const [failedImageSrc, setFailedImageSrc] = useState(() => (
    failedTargetSkinSources.has(skinImageSrc) ? skinImageSrc : ""
  ))
  const imageFailed = hasImage
    && (failedImageSrc === skinImageSrc || failedTargetSkinSources.has(skinImageSrc))
  const showImage = hasImage && !imageFailed
  const skinClassName = showImage ? "" : skinClass

  return (
    <button
      className={`bigCircleButton ${skinClassName} ${isGold ? "isGoldTarget" : ""} ${showImage ? "hasImage" : ""} ${imageFailed ? "imageFallback" : ""}`}
      style={getButtonInlineStyle({
        style,
        labelFontSize,
        hasImage: showImage,
        skinImageSrc,
        skinImageScale,
      })}
      onClick={onClick}
      disabled={disabled}
      // Out of the tab order: Space/Enter can't aim, so the target is pointer only.
      tabIndex={-1}
      aria-label={isGold ? "Gold target" : "Precision target"}
    >
      {isGold ? <svg className="goldTargetRing" viewBox="0 0 100 100" aria-hidden="true"><circle ref={ringRef} cx="50" cy="50" r="47" pathLength="1" style={{ strokeDashoffset: 1 - goldRemainingMs / GOLD_TARGET_WINDOW_MS }} /></svg> : null}
      {showImage ? (
        <img
          className="targetSkinProbe"
          src={skinImageSrc}
          alt=""
          width="512"
          height="512"
          decoding="async"
          onError={() => {
            failedTargetSkinSources.add(skinImageSrc)
            setFailedImageSrc(skinImageSrc)
          }}
        />
      ) : null}
      {showImage ? null : (
        <span className="targetFace" aria-hidden="true">
          <i className="targetFaceRing" />
          <i className="targetFaceCore" />
        </span>
      )}
      <span className="uiVisuallyHidden">{label}</span>
    </button>
  )
}
