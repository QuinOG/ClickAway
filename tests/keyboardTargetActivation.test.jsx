import { act, render, renderHook, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, expect, test, vi } from "vitest"

import { DEFAULT_SAVED_LOADOUTS, buildRoundRules } from "../src/constants/buildcraft.js"
import { DIFFICULTIES } from "../src/constants/gameModesConfig.js"
import GameArena from "../src/features/game/components/GameArena.jsx"
import { useGameScreenController } from "../src/features/game/hooks/useGameScreenController.js"
import { isKeyboardActivation } from "../src/game/engine/roundPlayfield.js"
import { validateRoundGeometry } from "../src/game/engine/roundGeometry.js"

vi.mock("../src/services/clickAwayHttpApiClient.js", () => ({
  requestRoundStart: vi.fn(async () => ({ roundToken: "token", seed: 12345 })),
}))

afterEach(() => vi.useRealTimers())

const rect = () => ({ left: 0, top: 0, width: 600, height: 452 })

async function startRound(onRoundComplete) {
  const loadout = DEFAULT_SAVED_LOADOUTS[0]
  const hook = renderHook(() => useGameScreenController({ activeLoadout: loadout, onRoundComplete }))
  hook.result.current.arenaProps.arenaRef.current = { getBoundingClientRect: rect }
  await act(async () => hook.result.current.readyOverlayProps.onStart("normal"))
  act(() => vi.advanceTimersByTime(3000))
  return { ...hook, loadout }
}

test("keyboard-style activation is recognised only without a pointer position", () => {
  expect(isKeyboardActivation({ detail: 0, clientX: 0, clientY: 0 })).toBe(true)
  // A real click at the screen origin still has a click count.
  expect(isKeyboardActivation({ detail: 1, clientX: 0, clientY: 0 })).toBe(false)
  expect(isKeyboardActivation({ detail: 0, clientX: 140, clientY: 90 })).toBe(false)
  expect(isKeyboardActivation({ clientX: 0, clientY: 0 })).toBe(false)
})

test("Enter and Space on the target neither score nor record a click, and the round still replays", async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  const onRoundComplete = vi.fn(() => ({ ok: true }))
  const { result, loadout } = await startRound(onRoundComplete)
  render(<GameArena {...result.current.arenaProps} />)
  result.current.arenaProps.arenaRef.current.getBoundingClientRect = rect

  const target = screen.getByRole("button", { name: "Precision target" })
  expect(target.tabIndex).toBe(-1)
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  target.focus()
  await user.keyboard("{Enter}")
  await user.keyboard(" ")
  expect(result.current.hudProps.score).toBe(0)

  act(() => result.current.hudProps.onEndRound())
  await act(async () => vi.advanceTimersByTimeAsync(261))
  await act(async () => vi.advanceTimersByTimeAsync(1))
  const round = onRoundComplete.mock.calls[0][0]
  expect(round.events.filter((event) => event.type === "hit" || event.type === "miss")).toEqual([])
  expect(validateRoundGeometry(buildRoundRules(DIFFICULTIES[1], loadout), round.events, round).valid).toBe(true)
})

test("a pointer hit on the target still scores", async () => {
  vi.useFakeTimers()
  const { result } = await startRound(vi.fn(() => ({ ok: true })))
  act(() => result.current.arenaProps.onButtonClick({ stopPropagation() {}, detail: 1, clientX: 300, clientY: 200 }))
  expect(result.current.hudProps.score).toBeGreaterThan(0)
})
