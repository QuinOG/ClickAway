import { act, render, renderHook } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { buildRoundRules, DEFAULT_SAVED_LOADOUTS } from "../src/constants/buildcraft.js"
import { DIFFICULTIES } from "../src/constants/gameModesConfig.js"
import { ROUND_END_SETTLE_MS } from "../src/constants/gameConstants.js"
import { useGameScreenController } from "../src/features/game/hooks/useGameScreenController.js"
import { useArmoryRangeRound } from "../src/features/armory/hooks/useArmoryRangeRound.js"
import GameArena from "../src/features/game/components/GameArena.jsx"
import { validateRoundGeometry } from "../src/game/engine/roundGeometry.js"
import { simulateRound } from "../server/roundRewards.js"

vi.mock("../src/services/clickAwayHttpApiClient.js", () => ({
  requestRoundStart: vi.fn(async () => ({ roundToken: "token", seed: 12345 })),
}))
afterEach(() => vi.useRealTimers())
const loadout = { ...DEFAULT_SAVED_LOADOUTS[0], moduleIds: { ...DEFAULT_SAVED_LOADOUTS[0].moduleIds, powerRigId: "power_reserve" }, powerupIds: ["time_boost", "freeze_movement", "magnet_center"] }
const click = { stopPropagation() {}, clientX: 300, clientY: 200 }
async function startGame(onRoundComplete) {
  const hook = renderHook(() => useGameScreenController({ activeLoadout: loadout, onRoundComplete }))
  hook.result.current.arenaProps.arenaRef.current = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 600, height: 452 }) }
  await act(async () => hook.result.current.readyOverlayProps.onStart("normal"))
  act(() => vi.advanceTimersByTime(3000))
  return hook
}

test.each(["visibility", "hit", "miss", "power"])("a suspended live timer rejects expired input and catches up on %s", async (wake) => {
  vi.useFakeTimers()
  const { result } = await startGame()
  const duration = result.current.hudProps.timeLeft
  vi.setSystemTime(Date.now() + (duration + 3) * 1000)
  act(() => {
    if (wake === "visibility") document.dispatchEvent(new Event("visibilitychange"))
    if (wake === "hit") result.current.arenaProps.onButtonClick(click)
    if (wake === "miss") result.current.arenaProps.onArenaClick(click)
    if (wake === "power") result.current.powerupTrayProps.onUsePowerup("time_boost")
  })
  expect(result.current.hudProps.timeLeft).toBe(0)
  expect(result.current.hudProps.score).toBe(0)
  act(() => vi.advanceTimersByTime(ROUND_END_SETTLE_MS))
  expect(result.current.phase).toBe("game_over")
})

test("fractional Time Boost and Freeze keep the client deadline in agreement with server replay", async () => {
  vi.useFakeTimers()
  const onRoundComplete = vi.fn(() => ({ ok: true }))
  const { result } = await startGame(onRoundComplete)
  const durationMs = result.current.hudProps.timeLeft * 1000
  act(() => vi.advanceTimersByTime(1250))
  act(() => result.current.powerupTrayProps.onUsePowerup("time_boost"))
  act(() => result.current.powerupTrayProps.onUsePowerup("freeze_movement"))
  const rules = buildRoundRules(DIFFICULTIES[1], loadout)
  const deadline = 1250 + Math.min(rules.maxTimeBufferSeconds * 1000, durationMs - 1250 + 2000)
  act(() => vi.advanceTimersByTime(deadline - 1250 - 1))
  expect(result.current.phase).toBe("playing")
  expect(result.current.hudProps.timeLeft).toBe(1)
  act(() => vi.advanceTimersByTime(1))
  expect(result.current.hudProps.timeLeft).toBe(0)
  act(() => vi.advanceTimersByTime(ROUND_END_SETTLE_MS + 1))
  act(() => vi.advanceTimersByTime(1))
  const recorded = onRoundComplete.mock.calls[0][0]
  expect(recorded.events.map(e => e.t)).toEqual([1250, 1250])
  const replay = simulateRound(recorded.events, recorded.modeId, { ...recorded, roundSeed: recorded.seed, playerLevel: 99 })
  expect(replay.valid).toBe(true)
  expect(replay.roundEndMs).toBe(deadline)
})

test("resize preserves logical target positions, maps border-corrected hits and misses, and submits replayable geometry", async () => {
  vi.useFakeTimers()
  const onRoundComplete = vi.fn(() => ({ ok: true }))
  const { result } = await startGame(onRoundComplete)
  let rect = { left: 20, top: 40, width: 304, height: 256 }
  result.current.arenaProps.arenaRef.current = { clientLeft: 2, clientTop: 2, getBoundingClientRect: () => rect }
  // Half-size display of the original 600 x 400 playfield.
  const before = result.current.arenaProps.buttonStyle
  act(() => window.dispatchEvent(new Event("resize")))
  expect(result.current.arenaProps.buttonStyle).toEqual(before)
  act(() => result.current.arenaProps.onButtonClick({ stopPropagation() {}, clientX: 172, clientY: 142 }))
  act(() => vi.advanceTimersByTime(100))
  rect = { left: 20, top: 40, width: 1204, height: 856 }
  act(() => result.current.powerupTrayProps.onUsePowerup("magnet_center"))
  act(() => result.current.arenaProps.onButtonClick({ stopPropagation() {}, clientX: 622, clientY: 442 }))
  act(() => vi.advanceTimersByTime(100))
  act(() => result.current.arenaProps.onArenaClick({ clientX: 22, clientY: 42 }))
  act(() => result.current.hudProps.onEndRound())
  act(() => vi.advanceTimersByTime(ROUND_END_SETTLE_MS + 1))
  act(() => vi.advanceTimersByTime(1))
  const recorded = onRoundComplete.mock.calls[0][0]
  expect([recorded.arenaWidth, recorded.arenaHeight]).toEqual([600, 400])
  expect(recorded.events.filter(e => e.type === "hit").map(e => [e.x, e.y])).toEqual([[300, 200], [300, 200]])
  expect(validateRoundGeometry(buildRoundRules(DIFFICULTIES[1], loadout), recorded.events, recorded).valid).toBe(true)
})

test.each(["visibility", "hit", "miss", "power"])("range catches up after suspension on %s", (wake) => {
  vi.useFakeTimers()
  const rules = buildRoundRules(DIFFICULTIES[1], loadout)
  const { result } = renderHook(() => useArmoryRangeRound({ roundRules: rules, isActive: true, runToken: 1 }))
  act(() => vi.advanceTimersByTime(3000))
  vi.setSystemTime(Date.now() + 11000)
  act(() => {
    if (wake === "visibility") document.dispatchEvent(new Event("visibilitychange"))
    if (wake === "hit") result.current.arenaProps.onButtonClick(click)
    if (wake === "miss") result.current.arenaProps.onArenaClick(click)
    if (wake === "power") result.current.powerupTrayProps.onUsePowerup("time_boost")
  })
  expect(result.current.timeLeft).toBe(0)
  expect(result.current.hits + result.current.misses).toBe(0)
  act(() => vi.advanceTimersByTime(ROUND_END_SETTLE_MS))
  expect(result.current.phase).toBe("done")
})

test("arena scales target display in both axes without changing its logical style", () => {
  let rect = { width: 604, height: 456 }
  const arenaRef = { current: null }
  const props = { arenaRef, logicalDimensions: { arenaWidth: 600, arenaHeight: 400 }, bottomReserve: 52, buttonStyle: { left: "250px", top: "150px", width: "100px", height: "100px" }, clickFeedbackItems: [] }
  const { container } = render(<GameArena {...props} />)
  arenaRef.current.getBoundingClientRect = () => rect
  Object.defineProperty(arenaRef.current, "clientLeft", { value: 2 })
  Object.defineProperty(arenaRef.current, "clientTop", { value: 2 })
  act(() => window.dispatchEvent(new Event("resize")))
  const target = container.querySelector(".bigCircleButton")
  expect(target.parentElement.style.transform).toBe("scale(1, 1)")
  rect = { width: 304, height: 156 }
  act(() => window.dispatchEvent(new Event("resize")))
  expect(target.parentElement.style.transform).toBe("scale(0.5, 0.25)")
  expect(target.style.left).toBe("250px")
  expect(target.style.width).toBe("100px")
})


test("range Time Boost uses the fractional deadline and keeps fixed geometry after a resize", () => {
  vi.useFakeTimers()
  const rules = buildRoundRules(DIFFICULTIES[1], loadout)
  const { result } = renderHook(() => useArmoryRangeRound({ roundRules: rules, isActive: true, runToken: 1 }))
  let width = 600
  result.current.arenaProps.arenaRef.current = { getBoundingClientRect: () => ({ left: 0, top: 0, width, height: 400 }) }
  act(() => vi.advanceTimersByTime(3000))
  act(() => vi.advanceTimersByTime(1250))
  act(() => result.current.powerupTrayProps.onUsePowerup("time_boost"))
  width = 300
  act(() => result.current.powerupTrayProps.onUsePowerup("magnet_center"))
  expect(result.current.arenaProps.logicalDimensions).toEqual({ arenaWidth: 600, arenaHeight: 400 })
  expect(result.current.arenaProps.buttonStyle.left).toBe("250px")
  act(() => vi.advanceTimersByTime(10749))
  expect(result.current.timeLeft).toBe(1)
  act(() => vi.advanceTimersByTime(1))
  expect(result.current.timeLeft).toBe(0)
})
