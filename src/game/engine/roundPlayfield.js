// The border is outside the absolutely positioned target's coordinate system.
export function measurePlayfield(element, bottomReserve = 0) {
  const rect = element.getBoundingClientRect()
  return {
    width: Math.max(0, rect.width - 2 * (element.clientLeft || 0)),
    height: Math.max(0, rect.height - 2 * (element.clientTop || 0) - bottomReserve),
  }
}

export function mapPlayfieldClick(event, element, dimensions, bottomReserve = 0) {
  if (!element) return null
  const rect = element.getBoundingClientRect()
  const display = measurePlayfield(element, bottomReserve)
  const scaleX = dimensions && display.width > 0 ? dimensions.arenaWidth / display.width : 1
  const scaleY = dimensions && display.height > 0 ? dimensions.arenaHeight / display.height : 1
  const round = (value) => Math.round(value * 100) / 100
  return {
    x: round((event.clientX - rect.left - (element.clientLeft || 0)) * scaleX),
    y: round((event.clientY - rect.top - (element.clientTop || 0)) * scaleY),
  }
}
