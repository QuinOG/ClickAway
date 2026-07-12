import { useLayoutEffect, useRef, useEffect } from "react"
import { useSearchParams } from "react-router-dom"

import { BUILD_WALKTHROUGH_STATUS } from "../../constants/buildWalkthrough.js"
import { ARMORY_STEP_IDS, LEGACY_ARMORY_STEP_ALIASES } from "./armoryConstants.js"

const LANE_IDS = new Set(["tempoCore", "streakLens", "powerRig"])

function parsePowerSlot(raw) {
  if (raw === "1" || raw === "2" || raw === "3") return Number(raw) - 1
  return null
}

/**
 * Reads ?step= & ?lane= & ?powerSlot= & ?bay= once URL init is allowed; then keeps the query string in sync (replace).
 * First-time walkthrough (NOT_STARTED): skips reading the URL so deep links do not fight the tour; writes begin after init completes.
 * `?bay=<loadoutId>` focuses a bay (e.g. a Game Over "Workshop notes" link) — validated against the player's saved loadouts, silently ignored otherwise.
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
  savedLoadoutIds = [],
  activateLoadout,
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

    const rawStep = searchParams.get("step")
    const step = LEGACY_ARMORY_STEP_ALIASES[rawStep] ?? rawStep
    if (step && ARMORY_STEP_IDS.has(step)) setActiveStepId(step)

    const lane = searchParams.get("lane")
    if (lane && LANE_IDS.has(lane)) setActiveModuleSlotId(lane)

    const ps = searchParams.get("powerSlot")
    const idx = parsePowerSlot(ps)
    if (idx !== null) setEditingPowerSlotIndex(idx)

    const bay = searchParams.get("bay")
    if (bay && savedLoadoutIds.includes(bay)) activateLoadout?.(bay)

    urlInitDone.current = true
  }, [
    activateLoadout,
    buildWalkthroughStatus,
    isWalkthroughVisible,
    savedLoadoutIds,
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

    // `?bay=` is a one-shot focus deep link; drop it once its job (setting
    // activeLoadoutId) is done so it doesn't linger as a stale param.
    next.delete("bay")

    const same =
      searchParams.get("step") === next.get("step")
      && (searchParams.get("lane") ?? "") === (next.get("lane") ?? "")
      && (searchParams.get("powerSlot") ?? "") === (next.get("powerSlot") ?? "")
      && !searchParams.get("bay")

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
