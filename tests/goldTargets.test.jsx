import { act, renderHook, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { DEFAULT_SAVED_LOADOUTS } from "../src/constants/buildcraft.js"
import { useGameScreenController } from "../src/features/game/hooks/useGameScreenController.js"
import MovingButton from "../src/components/MovingButton.jsx"
vi.mock("../src/services/clickAwayHttpApiClient.js", () => ({ requestRoundStart: vi.fn(async () => ({ roundToken: "token", seed: 38 })) }))
afterEach(() => vi.useRealTimers())

test.each([[100, false], [100, true], [1501, false]])("live gold spawn at reaction %sms scores and expires with the round clock", async (delay, bullseye) => {
  vi.useFakeTimers()
  const { result, unmount } = renderHook(() => useGameScreenController({ activeLoadout: DEFAULT_SAVED_LOADOUTS[0] }))
  result.current.arenaProps.arenaRef.current = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 600, height: 452 }) }
  await act(async () => result.current.readyOverlayProps.onStart("normal"))
  act(() => vi.advanceTimersByTime(3000))
  const click = () => {
    const style = result.current.arenaProps.buttonStyle
    result.current.arenaProps.onButtonClick({ stopPropagation() {}, clientX: parseFloat(style.left) + parseFloat(style.width) * (bullseye ? 0.5 : 0.9), clientY: parseFloat(style.top) + parseFloat(style.width) / 2 })
  }
  act(click)
  expect(result.current.arenaProps.isGold).toBe(true)
  act(() => vi.advanceTimersByTime(delay))
  // The visible window expires on a 50ms clock tick.
  if (delay > 1500) expect(result.current.arenaProps.isGold).toBe(false)
  const before = result.current.gameOverOverlayProps.score
  act(click)
  expect(result.current.gameOverOverlayProps.score - before).toBe(delay <= 1500 ? (bullseye ? 6 : 3) : 1)
  expect(result.current.gameOverOverlayProps.goldHits).toBe(delay <= 1500 ? 1 : 0)
  expect(result.current.arenaProps.clickFeedbackItems.some(item => item.detail === (bullseye ? "Gold Bullseye \u00d76" : "Gold \u00d73") && item.type.includes("gold"))).toBe(delay <= 1500)
  unmount()
})

test("gold ring renders over image skins and disappears on expiry", () => {
  const { container, rerender } = render(<MovingButton isGold goldRemainingMs={750} skinImageSrc="/target.png" />)
  expect(screen.getByRole("button", { name: "Gold target" })).toBeTruthy()
  expect(container.querySelector(".goldTargetRing circle").style.strokeDashoffset).toBe("0.5")
  rerender(<MovingButton isGold={false} goldRemainingMs={0} skinImageSrc="/target.png" />)
  expect(container.querySelector(".goldTargetRing")).toBeNull()
})
