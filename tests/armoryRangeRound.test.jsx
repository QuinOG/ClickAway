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
