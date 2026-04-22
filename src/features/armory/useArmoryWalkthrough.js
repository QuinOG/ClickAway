import { useCallback, useEffect, useLayoutEffect } from "react"

import { measureSpotlightRect } from "./armoryWalkthroughGeometry.js"

/**
 * Positions the walkthrough spotlight over the active step region and keeps it in sync on scroll/resize.
 */
export function useArmoryWalkthrough({
  isWalkthroughVisible,
  currentWalkthroughStep,
  shellRef,
  workspaceRef,
  slotEditorRef,
  passiveLaneRef,
  hotbarEditorRef,
  reviewPanelRef,
  setWalkthroughSpotlightRect,
  spotlightLayoutKey,
}) {
  const measureWalkthroughTarget = useCallback(() => {
    if (!currentWalkthroughStep?.targetId) {
      setWalkthroughSpotlightRect(null)
      return
    }

    const shellElement = shellRef.current
    let targetElement = null

    if (currentWalkthroughStep.targetId === "slot") targetElement = slotEditorRef.current
    if (currentWalkthroughStep.targetId === "passives") targetElement = passiveLaneRef.current
    if (currentWalkthroughStep.targetId === "hotbar") targetElement = hotbarEditorRef.current
    if (currentWalkthroughStep.targetId === "review") targetElement = reviewPanelRef.current

    setWalkthroughSpotlightRect(measureSpotlightRect(shellElement, targetElement))
  }, [currentWalkthroughStep, setWalkthroughSpotlightRect, shellRef, slotEditorRef, passiveLaneRef, hotbarEditorRef, reviewPanelRef])

  useLayoutEffect(() => {
    if (!isWalkthroughVisible) {
      setWalkthroughSpotlightRect(null)
      return undefined
    }

    const frameId = window.requestAnimationFrame(() => {
      measureWalkthroughTarget()
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [
    isWalkthroughVisible,
    measureWalkthroughTarget,
    setWalkthroughSpotlightRect,
    spotlightLayoutKey,
  ])

  useEffect(() => {
    if (!isWalkthroughVisible) return undefined

    const handleReposition = () => measureWalkthroughTarget()
    const workspaceElement = workspaceRef.current

    window.addEventListener("resize", handleReposition)
    workspaceElement?.addEventListener("scroll", handleReposition, { passive: true })

    return () => {
      window.removeEventListener("resize", handleReposition)
      workspaceElement?.removeEventListener("scroll", handleReposition)
    }
  }, [isWalkthroughVisible, measureWalkthroughTarget, workspaceRef])
}
