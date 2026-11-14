import { useCallback, useEffect, useLayoutEffect } from "react"

import { measureSpotlightRect } from "./armoryUtils.js"

/**
 * Positions the walkthrough spotlight over the active step region and keeps it in sync on scroll/resize.
 */
export function useArmoryWalkthrough({
  isWalkthroughVisible,
  currentWalkthroughStep,
  shellRef,
  workspaceRef,
  nameplateRef,
  machineRef,
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

    if (currentWalkthroughStep.targetId === "machine") targetElement = machineRef.current
    if (currentWalkthroughStep.targetId === "nameplate") targetElement = nameplateRef.current
    if (currentWalkthroughStep.targetId === "passives") targetElement = passiveLaneRef.current
    if (currentWalkthroughStep.targetId === "hotbar") targetElement = hotbarEditorRef.current
    if (currentWalkthroughStep.targetId === "review") targetElement = reviewPanelRef.current

    setWalkthroughSpotlightRect(measureSpotlightRect(shellElement, targetElement))
  }, [
    currentWalkthroughStep,
    hotbarEditorRef,
    machineRef,
    nameplateRef,
    passiveLaneRef,
    reviewPanelRef,
    setWalkthroughSpotlightRect,
    shellRef,
  ])

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

  // On phones the Armory is far taller than the screen, so bring each step's
  // target to the top; the tour card is pinned to the bottom of the screen.
  const targetId = currentWalkthroughStep?.targetId ?? null
  useEffect(() => {
    if (!isWalkthroughVisible || !targetId || window.innerWidth > 820) return
    const targets = { machine: machineRef, nameplate: nameplateRef, passives: passiveLaneRef, hotbar: hotbarEditorRef, review: reviewPanelRef }
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
    targets[targetId]?.current?.scrollIntoView?.({ block: "start", behavior: reduceMotion ? "auto" : "smooth" })
  }, [hotbarEditorRef, isWalkthroughVisible, machineRef, nameplateRef, passiveLaneRef, reviewPanelRef, targetId])

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
