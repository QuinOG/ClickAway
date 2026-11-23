import React from "react"
import { act, render, renderHook } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { useGoldTargetWindow } from "../src/features/game/hooks/useGoldTargetWindow.js"
import MovingButton from "../src/components/MovingButton.jsx"

afterEach(() => vi.useRealTimers())

test("Gold expiry follows the round clock without intermediate parent renders", () => {
  vi.useFakeTimers()
  let now = 500
  let renders = 0
  const spawn = { isGold: true, spawnedAtMs: 0 }
  const clock = () => now
  const { result } = renderHook(() => {
    renders++
    return useGoldTargetWindow(spawn, true, clock)
  })
  expect(result.current.goldRemainingMs).toBe(1000)
  act(() => vi.advanceTimersByTime(500))
  expect(renders).toBe(1)
  now = 1600
  act(() => document.dispatchEvent(new Event("visibilitychange")))
  expect(result.current.goldRemainingMs).toBe(0)
  expect(renders).toBe(2)
})

test("replacing a spawn cancels its old expiry", () => {
  vi.useFakeTimers()
  let now = 0
  const clock = () => now
  const { result, rerender, unmount } = renderHook(({ spawn }) => useGoldTargetWindow(spawn, true, clock), {
    initialProps: { spawn: { isGold: true, spawnedAtMs: 0 } },
  })
  now = 1000
  rerender({ spawn: { isGold: true, spawnedAtMs: 1000 } })
  act(() => vi.advanceTimersByTime(1500))
  expect(result.current.goldRemainingMs).toBe(1500)
  now = 2500
  act(() => window.dispatchEvent(new Event("focus")))
  expect(result.current.goldRemainingMs).toBe(0)
  unmount()
  expect(vi.getTimerCount()).toBe(0)
})

test("the ring reads the round clock directly on resumed animation frames", () => {
  let frame
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => { frame = callback; return 1 })
  const cancel = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {})
  let remaining = 1000
  const { container, unmount } = render(<MovingButton isGold goldRemainingMs={1000} getGoldRemainingMs={() => remaining} />)
  const ring = container.querySelector("circle")
  expect(Number(ring.style.strokeDashoffset)).toBeCloseTo(1 / 3)
  remaining = 250
  act(() => frame())
  expect(Number(ring.style.strokeDashoffset)).toBeCloseTo(5 / 6)
  remaining = 0
  act(() => frame())
  expect(Number(ring.style.strokeDashoffset)).toBe(1)
  unmount()
  expect(cancel).toHaveBeenCalledWith(1)
})
