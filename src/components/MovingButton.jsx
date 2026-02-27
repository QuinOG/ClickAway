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
  skinImageSrc = "",
  skinImageScale = 100,
}) {
  const hasImage = Boolean(skinImageSrc)
  const buttonClassName = ["bigCircleButton", hasImage ? "hasImage" : ""]
    .filter(Boolean)
    .join(" ")

  return (
    <button
      className={buttonClassName}
      style={getButtonInlineStyle({ style, labelFontSize, hasImage, skinImageSrc, skinImageScale })}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  )
}
