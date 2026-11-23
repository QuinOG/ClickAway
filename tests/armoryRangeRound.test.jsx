import { act, fireEvent, render, renderHook, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { buildRoundRules, DEFAULT_SAVED_LOADOUTS } from "../src/constants/buildcraft.js"
import { DIFFICULTIES } from "../src/constants/gameModesConfig.js"
import ArmoryTestRange from "../src/features/armory/components/ArmoryTestRange.jsx"
import { useArmoryRangeRound } from "../src/features/armory/hooks/useArmoryRangeRound.js"

import { createGeometrySimulation } from "../src/game/engine/roundGeometry.js"
import { createSeededRng } from "../src/game/engine/seededRng.js"
import { getRandomPosition } from "../src/utils/gameMath.js"

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
  const rng = createSeededRng(Math.floor(0.25 * 0xffffffff))
  const geometry = createGeometrySimulation({ roundRules: rules, arenaWidth: 600, arenaHeight: 400, rng,
    initialPosition: getRandomPosition({ width: 600, height: 400 }, rules.initialButtonSize, rng) })
  const initialLeft = `${geometry.getState().position.x}px`
  expect(result.current.arenaProps.buttonStyle.left).toBe(initialLeft)
  act(() => {
    for (const step of steps) {
      if (step === 'hit') result.current.arenaProps.onButtonClick({ stopPropagation() {}, clientX: 175, clientY: 125 })
      else result.current.powerupTrayProps.onUsePowerup(step)
      if (step === 'hit') geometry.applyHit(0)
      else geometry.applyPowerup(step, 0)
    }
  })
  expect(result.current.arenaProps.buttonStyle.left).toBe(`${geometry.getState().position.x}px`)
  act(() => vi.advanceTimersByTime(1))
  expect(result.current.arenaProps.buttonStyle.left).toBe(`${geometry.getState().position.x}px`)
  rerender({ token: 2 })
  act(() => vi.advanceTimersByTime(3000))
  expect(result.current.arenaProps.buttonStyle.left).toBe(initialLeft)
  vi.restoreAllMocks()
})

test("Practice test range passes isTimedRound=false so Time +2s is disabled with No timer", () => {
  vi.useFakeTimers()
  const loadout = {
    ...DEFAULT_SAVED_LOADOUTS[0],
    powerupIds: ["time_boost", "size_boost", "freeze_movement"],
  }
  const practiceRules = buildRoundRules(DIFFICULTIES[0], loadout)
  practiceRules.startingPowerupCharges = 1
  const casualRules = buildRoundRules(DIFFICULTIES[1], loadout)
  casualRules.startingPowerupCharges = 1

  const { result: practiceHook } = renderHook(() =>
    useArmoryRangeRound({ roundRules: practiceRules, isActive: true, runToken: 1 })
  )
  expect(practiceHook.current.powerupTrayProps.isTimedRound).toBe(false)

  const { result: casualHook } = renderHook(() =>
    useArmoryRangeRound({ roundRules: casualRules, isActive: true, runToken: 1 })
  )
  expect(casualHook.current.powerupTrayProps.isTimedRound).toBe(true)

  const { rerender } = render(
    <ArmoryTestRange
      isOpen
      roundRules={practiceRules}
      modeLabel="Practice"
      loadoutName="Starter"
      runToken={1}
      onRunAgain={() => {}}
      onExit={() => {}}
    />
  )
  act(() => vi.advanceTimersByTime(3000))

  const practiceTimeBtn = screen.getByRole("button", { name: /Time \+2s/i })
  expect(practiceTimeBtn.disabled).toBe(true)
  expect(practiceTimeBtn.textContent).toContain("No timer")

  rerender(
    <ArmoryTestRange
      isOpen
      roundRules={casualRules}
      modeLabel="Casual"
      loadoutName="Starter"
      runToken={2}
      onRunAgain={() => {}}
      onExit={() => {}}
    />
  )
  act(() => vi.advanceTimersByTime(3000))

  const casualTimeBtn = screen.getByRole("button", { name: /Time \+2s/i })
  expect(casualTimeBtn.disabled).toBe(false)
  expect(casualTimeBtn.textContent).toContain("Ready")
})

test.each([["overclock", "Overclock", 5000], ["freeze_movement", "Freeze 1s", 1000]])(
  "timed powerup %s exposes durationMs and renders Active in ArmoryTestRange",
  (powerupId, label, durationMs) => {
    vi.useFakeTimers()
    const roundRules = buildRoundRules(DIFFICULTIES[1], {
      ...DEFAULT_SAVED_LOADOUTS[0],
      powerupIds: [powerupId, "size_boost", "time_boost"],
    })
    roundRules.startingPowerupCharges = 1

    const { result } = renderHook(() => useArmoryRangeRound({ roundRules, isActive: true, runToken: 1 }))
    result.current.arenaProps.arenaRef.current = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 600, height: 400 }) }
    act(() => vi.advanceTimersByTime(3000))
    act(() => result.current.powerupTrayProps.onUsePowerup(powerupId))
    expect(result.current.powerupTrayProps.activatedPowerup).toMatchObject({
      id: powerupId,
      label,
      effectType: powerupId,
      durationMs,
    })
    act(() => vi.advanceTimersByTime(durationMs - 1))
    expect(result.current.powerupTrayProps.activatedPowerup).not.toBeNull()
    act(() => vi.advanceTimersByTime(1))
    expect(result.current.powerupTrayProps.activatedPowerup).toBeNull()

    render(
      <ArmoryTestRange
        isOpen
        roundRules={roundRules}
        modeLabel="Casual"
        loadoutName="Starter"
        runToken={1}
        onRunAgain={() => {}}
        onExit={() => {}}
      />
    )
    act(() => vi.advanceTimersByTime(3000))
    const powerBtn = screen.getByRole("button", { name: new RegExp(label, "i") })
    fireEvent.click(powerBtn)
    expect(powerBtn.getAttribute("aria-label")).toContain(`${label}: Active`)
    expect(powerBtn.classList.contains("timedActive")).toBe(true)
    act(() => vi.advanceTimersByTime(durationMs))
    expect(powerBtn.classList.contains("timedActive")).toBe(false)
  }
)

test.each(["miss", "expiry"])("Second Wind renders Wind active in ArmoryTestRange until %s", (trigger) => {
  vi.useFakeTimers()
  const roundRules = buildRoundRules(DIFFICULTIES[1], {
    ...DEFAULT_SAVED_LOADOUTS[0],
    powerupIds: ["second_wind", "size_boost", "time_boost"],
  })
  roundRules.startingPowerupCharges = 1

  const { container } = render(
    <ArmoryTestRange
      isOpen
      roundRules={roundRules}
      modeLabel="Casual"
      loadoutName="Starter"
      runToken={1}
      onRunAgain={() => {}}
      onExit={() => {}}
    />
  )
  act(() => vi.advanceTimersByTime(3000))
  const windBtn = screen.getByRole("button", { name: /Second Wind/i })
  fireEvent.click(windBtn)
  expect(windBtn.getAttribute("aria-label")).toContain("Second Wind: Wind active")
  expect(windBtn.classList.contains("active")).toBe(true)

  if (trigger === "expiry") {
    act(() => vi.advanceTimersByTime(4999))
    expect(windBtn.classList.contains("active")).toBe(true)
    act(() => vi.advanceTimersByTime(1))
  } else {
    act(() => vi.advanceTimersByTime(100))
    fireEvent.click(container.querySelector(".arena"), { detail: 1, clientX: 50, clientY: 50 })
  }
  expect(windBtn.classList.contains("active")).toBe(false)
  expect(windBtn.getAttribute("aria-label")).not.toContain("Wind active")
})
function startRange(powerupIds = ["guard_charge", "second_wind", "overclock"], overrides = {}) {
  vi.useFakeTimers()
  const roundRules = {
    ...buildRoundRules(DIFFICULTIES[1], { ...DEFAULT_SAVED_LOADOUTS[0], powerupIds }),
    startingPowerupCharges: 1,
    ...overrides,
  }
  const hook = renderHook(({ isActive }) => useArmoryRangeRound({ roundRules, isActive, runToken: 1 }), {
    initialProps: { isActive: true },
  })
  hook.result.current.arenaProps.arenaRef.current = {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 600, height: 400 }),
  }
  act(() => vi.advanceTimersByTime(3000))
  return hook
}

test("closing the range clears active powers, feedback, timers and pending results", () => {
  const { result, rerender } = startRange()
  act(() => {
    for (const id of ["guard_charge", "second_wind", "overclock"]) {
      result.current.powerupTrayProps.onUsePowerup(id)
    }
  })
  expect(result.current.powerupTrayProps.activatedPowerup).not.toBeNull()
  expect(result.current.arenaProps.clickFeedbackItems.length).toBeGreaterThan(0)
  act(() => result.current.endRound())
  expect(result.current.phase).toBe("playing")
  expect(result.current.isPlaying).toBe(false)
  expect(result.current.arenaProps.isButtonDisabled).toBe(true)
  rerender({ isActive: false })
  expect(result.current.phase).toBe("countdown")
  expect(result.current.isPlaying).toBe(false)
  expect(result.current.powerupTrayProps.activatedPowerup).toBeNull()
  expect(result.current.arenaProps.clickFeedbackItems).toEqual([])
  expect(result.current.powerupTrayProps.powerupSlots.every((slot) => !slot.isGuardActive && !slot.isSecondWindActive)).toBe(true)
  expect(vi.getTimerCount()).toBe(0)
  act(() => vi.advanceTimersByTime(10000))
  expect(result.current.completedRunToken).toBeNull()
  rerender({ isActive: true })
  expect(result.current.phase).toBe("countdown")
  act(() => vi.advanceTimersByTime(3000))
  expect(result.current.isPlaying).toBe(true)
})

test("closing completed results resets phase before reopening", () => {
  const { result, rerender } = startRange()
  act(() => result.current.endRound())
  act(() => vi.advanceTimersByTime(1000))
  expect(result.current.phase).toBe("done")
  rerender({ isActive: false })
  expect(result.current.phase).toBe("countdown")
  rerender({ isActive: true })
  expect(result.current.phase).toBe("countdown")
  expect(result.current.completedRunToken).toBeNull()
})

test("a miss at zero score shows Miss without claiming a score loss", () => {
  const { result } = startRange()
  act(() => result.current.arenaProps.onArenaClick({ clientX: 10, clientY: 10 }))
  expect(result.current.score).toBe(0)
  expect(result.current.misses).toBe(1)
  expect(result.current.arenaProps.clickFeedbackItems.at(-1).value).toBe("Miss")
})

test.each([[11, "+1s"], [10, "+0s"]])("time boost reports its actual clamped addition at cap %s", (cap, feedback) => {
  const { result } = startRange(["time_boost", "size_boost", "freeze_movement"], { maxTimeBufferSeconds: cap })
  act(() => result.current.powerupTrayProps.onUsePowerup("time_boost"))
  expect(result.current.timeLeft).toBe(cap)
  expect(result.current.arenaProps.clickFeedbackItems.at(-1).value).toBe(feedback)
})

test("arena receives timed active effects and final seconds only during play", () => {
  const { result } = startRange()
  expect(result.current.arenaProps.activeEffect).toBeNull()
  expect(result.current.arenaProps.finalSeconds).toBeNull()
  act(() => result.current.powerupTrayProps.onUsePowerup("overclock"))
  expect(result.current.arenaProps.activeEffect).toBe("overclock")
  act(() => vi.advanceTimersByTime(5000))
  expect(result.current.arenaProps.activeEffect).toBeNull()
  expect(result.current.arenaProps.finalSeconds).toBe(5)
  act(() => result.current.endRound())
  expect(result.current.arenaProps.finalSeconds).toBeNull()
})

test("closing during a gold window removes its focus and visibility listeners", () => {
  vi.spyOn(Math, "random").mockReturnValue(0.25)
  const addDocument = vi.spyOn(document, "addEventListener")
  const removeDocument = vi.spyOn(document, "removeEventListener")
  const addWindow = vi.spyOn(window, "addEventListener")
  const removeWindow = vi.spyOn(window, "removeEventListener")
  const { result, rerender } = startRange()
  for (let hit = 0; !result.current.arenaProps.isGold && hit < 60; hit += 1) {
    act(() => vi.advanceTimersByTime(80))
    act(() => result.current.arenaProps.onButtonClick({ stopPropagation() {}, clientX: 100, clientY: 100 }))
  }
  expect(result.current.arenaProps.isGold).toBe(true)
  const visibilityListener = addDocument.mock.calls.filter(([name]) => name === "visibilitychange").at(-1)[1]
  const focusListener = addWindow.mock.calls.filter(([name]) => name === "focus").at(-1)[1]
  rerender({ isActive: false })
  expect(removeDocument).toHaveBeenCalledWith("visibilitychange", visibilityListener)
  expect(removeWindow).toHaveBeenCalledWith("focus", focusListener)
  expect(result.current.arenaProps.goldRemainingMs).toBe(0)
  expect(vi.getTimerCount()).toBe(0)
})
