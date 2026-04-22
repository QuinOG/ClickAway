export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export function measureSpotlightRect(shellElement, targetElement) {
  if (!shellElement || !targetElement) return null

  const shellRect = shellElement.getBoundingClientRect()
  const targetRect = targetElement.getBoundingClientRect()
  const padding = 14
  const left = clamp(targetRect.left - shellRect.left - padding, 8, shellRect.width - 8)
  const top = clamp(targetRect.top - shellRect.top - padding, 8, shellRect.height - 8)
  const right = clamp(targetRect.right - shellRect.left + padding, 8, shellRect.width - 8)
  const bottom = clamp(targetRect.bottom - shellRect.top + padding, 8, shellRect.height - 8)

  return {
    left,
    top,
    right,
    bottom,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  }
}
