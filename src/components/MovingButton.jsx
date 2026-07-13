import { useState } from "react"

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
  label = "Click",
  labelFontSize,
  skinClass = "skin-default",
  skinImageSrc = "",
  skinImageScale = 100,
}) {
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
      className={`bigCircleButton ${skinClassName} ${showImage ? "hasImage" : ""} ${imageFailed ? "imageFallback" : ""}`}
      style={getButtonInlineStyle({
        style,
        labelFontSize,
        hasImage: showImage,
        skinImageSrc,
        skinImageScale,
      })}
      onClick={onClick}
      disabled={disabled}
      aria-label="Precision target"
    >
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
      {label}
    </button>
  )
}
