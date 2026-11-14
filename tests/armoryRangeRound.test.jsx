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

test.each([['hit', 'freeze_movement'], ['freeze_movement', 'hit'], ['hit', 'magnet_center']])('range geometry is synchronous: %j', (...steps) => {
  vi.useFakeTimers()
  vi.spyOn(Math, 'random').mockReturnValue(0.25)
  const rules = buildRoundRules(DIFFICULTIES[1], { ...DEFAULT_SAVED_LOADOUTS[0], powerupIds: ['freeze_movement', 'magnet_center', 'size_boost'] })
  rules.startingPowerupCharges = 1
  const { result, rerender } = renderHook(({ token }) => useArmoryRangeRound({ roundRules: rules, isActive: true, runToken: token }), { initialProps: { token: 1 } })
  result.current.arenaProps.arenaRef.current = { getBoundingClientRect: () => ({ width: 600, height: 400, left: 0, top: 0 }) }
  act(() => vi.advanceTimersByTime(3000))
  expect(result.current.arenaProps.buttonStyle.left).toBe('125px')
  act(() => {
    for (const step of steps) {
      if (step === 'hit') result.current.arenaProps.onButtonClick({ stopPropagation() {}, clientX: 175, clientY: 125 })
      else result.current.powerupTrayProps.onUsePowerup(step)
    }
  })
  expect(result.current.arenaProps.buttonStyle.left).toBe(steps.includes('magnet_center') ? '250px' : steps[0] === 'hit' ? '126px' : '125px')
  act(() => vi.advanceTimersByTime(1))
  expect(result.current.arenaProps.buttonStyle.left).toBe(steps.includes('magnet_center') ? '250px' : steps[0] === 'hit' ? '126px' : '125px')
  rerender({ token: 2 })
  act(() => vi.advanceTimersByTime(3000))
  expect(result.current.arenaProps.buttonStyle.left).toBe('125px')
  vi.restoreAllMocks()
})
