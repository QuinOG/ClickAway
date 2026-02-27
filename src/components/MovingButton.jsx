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
  const skinClassName = hasImage ? "" : skinClass

  return (
    <button
      className={`bigCircleButton ${skinClassName} ${hasImage ? "hasImage" : ""}`}
      style={getButtonInlineStyle({ style, labelFontSize, hasImage, skinImageSrc, skinImageScale })}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  )
}
