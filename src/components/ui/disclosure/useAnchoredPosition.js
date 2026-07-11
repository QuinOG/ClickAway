import { useLayoutEffect } from "react"

const VIEWPORT_MARGIN = 8

function getCoordinates(anchorRect, floatingRect, placement, offset) {
  const anchorCenterX = anchorRect.left + (anchorRect.width / 2)
  const anchorCenterY = anchorRect.top + (anchorRect.height / 2)

  switch (placement) {
    case "bottom-start":
      return { left: anchorRect.left, top: anchorRect.bottom + offset }
    case "bottom-end":
      return { left: anchorRect.right - floatingRect.width, top: anchorRect.bottom + offset }
    case "bottom":
      return { left: anchorCenterX - (floatingRect.width / 2), top: anchorRect.bottom + offset }
    case "left":
      return { left: anchorRect.left - floatingRect.width - offset, top: anchorCenterY - (floatingRect.height / 2) }
    case "right":
      return { left: anchorRect.right + offset, top: anchorCenterY - (floatingRect.height / 2) }
    case "top-start":
      return { left: anchorRect.left, top: anchorRect.top - floatingRect.height - offset }
    case "top-end":
      return { left: anchorRect.right - floatingRect.width, top: anchorRect.top - floatingRect.height - offset }
    case "top":
    default:
      return { left: anchorCenterX - (floatingRect.width / 2), top: anchorRect.top - floatingRect.height - offset }
  }
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum))
}

export function useAnchoredPosition({
  open,
  anchorRef,
  floatingRef,
  placement = "top",
  offset = 8,
}) {
  useLayoutEffect(() => {
    if (!open) return undefined

    const anchor = anchorRef.current
    const floating = floatingRef.current
    if (!anchor || !floating) return undefined

    function updatePosition() {
      const anchorRect = anchor.getBoundingClientRect()
      const floatingRect = floating.getBoundingClientRect()
      const viewportWidth = document.documentElement.clientWidth || window.innerWidth
      const viewportHeight = document.documentElement.clientHeight || window.innerHeight
      const coordinates = getCoordinates(anchorRect, floatingRect, placement, offset)
      const viewportLeft = clamp(
        coordinates.left,
        VIEWPORT_MARGIN,
        viewportWidth - floatingRect.width - VIEWPORT_MARGIN
      )
      const viewportTop = clamp(
        coordinates.top,
        VIEWPORT_MARGIN,
        viewportHeight - floatingRect.height - VIEWPORT_MARGIN
      )
      const portalContainer = floating.parentElement
      const isBodyPortal = portalContainer === document.body
      const containerRect = isBodyPortal
        ? { left: 0, top: 0 }
        : portalContainer.getBoundingClientRect()

      floating.style.position = isBodyPortal ? "fixed" : "absolute"
      floating.style.left = `${Math.round(viewportLeft - containerRect.left)}px`
      floating.style.top = `${Math.round(viewportTop - containerRect.top)}px`
      floating.dataset.placement = placement
    }

    updatePosition()
    window.addEventListener("resize", updatePosition)
    window.addEventListener("scroll", updatePosition, true)

    const resizeObserver = typeof ResizeObserver === "function"
      ? new ResizeObserver(updatePosition)
      : null
    resizeObserver?.observe(anchor)
    resizeObserver?.observe(floating)

    return () => {
      window.removeEventListener("resize", updatePosition)
      window.removeEventListener("scroll", updatePosition, true)
      resizeObserver?.disconnect()
    }
  }, [anchorRef, floatingRef, offset, open, placement])
}
