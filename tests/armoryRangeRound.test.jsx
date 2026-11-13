import { act, renderHook } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { buildRoundRules, DEFAULT_SAVED_LOADOUTS } from "../src/constants/buildcraft.js"
import { DIFFICULTIES } from "../src/constants/gameModesConfig.js"
import { useArmoryRangeRound } from "../src/features/armory/hooks/useArmoryRangeRound.js"

afterEach(() => vi.useRealTimers())

test("Second Wind keeps a range streak without showing a streak break", () => {
  vi.useFakeTimers()
  const roundRules = buildRoundRules(DIFFICULTIES[1], {
    ...DEFAULT_SAVED_LOADOUTS[0],
    moduleIds: { ...DEFAULT_SAVED_LOADOUTS[0].moduleIds, powerRigId: "power_balanced" },
    powerupIds: ["second_wind", "size_boost", "freeze_movement"],
  })
  roundRules.startingPowerupCharges = 1
  const { result } = renderHook(() => useArmoryRangeRound({ roundRules, isActive: true, runToken: 1 }))
  result.current.arenaProps.arenaRef.current = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 600, height: 400 }) }
  act(() => vi.advanceTimersByTime(3000))
  const click = { stopPropagation() {}, clientX: 100, clientY: 100 }
  act(() => result.current.arenaProps.onButtonClick(click))
  act(() => result.current.powerupTrayProps.onUsePowerup("second_wind"))
  act(() => vi.advanceTimersByTime(100))
  act(() => result.current.arenaProps.onArenaClick(click))
  expect(result.current.streak).toBe(1)
  const feedback = result.current.arenaProps.clickFeedbackItems.at(-1)
  expect(feedback.type).toBe("miss")
  expect(feedback.detail).toBe("Streak saved")
})
