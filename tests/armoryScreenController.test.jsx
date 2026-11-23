import { act, renderHook } from "@testing-library/react"
import { StrictMode, useState } from "react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, expect, test, vi } from "vitest"
import { DEFAULT_SAVED_LOADOUTS } from "../src/constants/buildcraft.js"
import { DIFFICULTIES } from "../src/constants/gameModesConfig.js"
import { useArmoryScreenController } from "../src/features/armory/hooks/useArmoryScreenController.js"
import { ARMORY_FIRST_TOUCH_TIPS_STORAGE_KEY } from "../src/features/armory/armoryFirstTouchTips.js"

function mountController(url = "/armory", overrides = {}, strict = false) {
  return renderHook(() => {
    const [loadoutState, setLoadoutState] = useState({ savedLoadouts: DEFAULT_SAVED_LOADOUTS, activeLoadoutId: "loadout_1" })
    return useArmoryScreenController({
    modes: DIFFICULTIES, selectedModeId: "normal", playerLevel: 5,
    ...loadoutState, onLoadoutStateChange: setLoadoutState,
    buildWalkthrough: { status: "dismissed" }, ...overrides,
  })
  }, { wrapper: ({ children }) => {
    const router = <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
    return strict ? <StrictMode>{router}</StrictMode> : router
  } })
}

afterEach(() => { localStorage.clear(); vi.restoreAllMocks() })

test("preserves a power slot deep link to another bay and resets it on a manual switch", () => {
  const { result } = mountController("/armory?step=hotbar&bay=loadout_2&powerSlot=2")
  expect(result.current.bayApi.activeLoadoutId).toBe("loadout_2")
  expect(result.current.hotbarApi.editingPowerSlotIndex).toBe(1)
  act(() => result.current.bayApi.activateLoadout("loadout_3"))
  expect(result.current.hotbarApi.editingPowerSlotIndex).toBe(0)
})

test("holds unlock ceremonies while the walkthrough launches the live range", () => {
  const { result } = mountController()
  expect(result.current.ceremonyApi.parts.length).toBeGreaterThan(0)
  act(() => result.current.walkthroughApi.open())
  for (let step = 0; step < 4; step += 1) {
    act(() => result.current.walkthroughApi.goNext())
  }
  act(() => result.current.walkthroughApi.runRange())
  expect(result.current.rangeApi.isOpen).toBe(true)
  expect(result.current.ceremonyApi.part).toBeNull()
  act(() => result.current.rangeApi.close())
  expect(result.current.ceremonyApi.part).not.toBeNull()
})

test("persists each first-touch tip once under StrictMode and repeated batched triggers", () => {
  const save = vi.spyOn(Storage.prototype, "setItem")
  const { result } = mountController("/armory", {}, true)
  act(() => {
    result.current.firstTouchApi.notifyLockedPart()
    result.current.firstTouchApi.notifyLockedPart()
  })
  expect(result.current.firstTouchApi.activeTipId).toBe("lockedPart")
  expect(save.mock.calls.filter(([key]) => key === ARMORY_FIRST_TOUCH_TIPS_STORAGE_KEY)).toEqual([
    [ARMORY_FIRST_TOUCH_TIPS_STORAGE_KEY, JSON.stringify(["lockedPart"])],
  ])
  act(() => result.current.firstTouchApi.dismiss())
  act(() => result.current.firstTouchApi.notifyLockedPart())
  expect(result.current.firstTouchApi.activeTipId).toBeNull()
})
