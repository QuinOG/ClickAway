import { useLayoutEffect, useRef, useEffect } from "react"
import { useSearchParams } from "react-router-dom"

import { BUILD_WALKTHROUGH_STATUS } from "../../constants/buildWalkthrough.js"
import { ARMORY_STEP_IDS } from "./armorySteps.js"

const LANE_IDS = new Set(["tempoCore", "streakLens", "powerRig"])

function parsePowerSlot(raw) {
  if (raw === "1" || raw === "2" || raw === "3") return Number(raw) - 1
  return null
}

/**
 * Reads ?step= & ?lane= & ?powerSlot= once URL init is allowed; then keeps the query string in sync (replace).
 * First-time walkthrough (NOT_STARTED): skips reading the URL so deep links do not fight the tour; writes begin after init completes.
 */
export function useArmoryUrlState({
  buildWalkthroughStatus,
  isWalkthroughVisible,
  activeStepId,
  setActiveStepId,
  activeModuleSlotId,
  setActiveModuleSlotId,
  editingPowerSlotIndex,
  setEditingPowerSlotIndex,
}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlInitDone = useRef(false)

  useLayoutEffect(() => {
    if (urlInitDone.current) return

    if (buildWalkthroughStatus === BUILD_WALKTHROUGH_STATUS.NOT_STARTED) {
      if (!isWalkthroughVisible) return
      urlInitDone.current = true
      return
    }

    const step = searchParams.get("step")
    if (step && ARMORY_STEP_IDS.has(step)) setActiveStepId(step)

    const lane = searchParams.get("lane")
    if (lane && LANE_IDS.has(lane)) setActiveModuleSlotId(lane)

    const ps = searchParams.get("powerSlot")
    const idx = parsePowerSlot(ps)
    if (idx !== null) setEditingPowerSlotIndex(idx)

    urlInitDone.current = true
  }, [
    buildWalkthroughStatus,
    isWalkthroughVisible,
    searchParams,
    setActiveStepId,
    setActiveModuleSlotId,
    setEditingPowerSlotIndex,
  ])

  useEffect(() => {
    if (!urlInitDone.current) return

    const next = new URLSearchParams(searchParams)
    next.set("step", activeStepId)

    if (activeStepId === "passives") {
      next.set("lane", activeModuleSlotId)
    } else {
      next.delete("lane")
    }

    if (activeStepId === "hotbar") {
      next.set("powerSlot", String(editingPowerSlotIndex + 1))
    } else {
      next.delete("powerSlot")
    }

    const same =
      searchParams.get("step") === next.get("step")
      && (searchParams.get("lane") ?? "") === (next.get("lane") ?? "")
      && (searchParams.get("powerSlot") ?? "") === (next.get("powerSlot") ?? "")

    if (same) return

    setSearchParams(next, { replace: true })
  }, [
    activeModuleSlotId,
    activeStepId,
    editingPowerSlotIndex,
    searchParams,
    setSearchParams,
  ])
}
