import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"

import { ACTIVE_LOADOUT_ID_DEFAULT, DEFAULT_SAVED_LOADOUTS } from "../src/constants/buildcraft.js"
import { ROUND_END_SETTLE_MS, TIMER_TICK_MS } from "../src/constants/gameConstants.js"
import { useGameScreenController } from "../src/features/game/hooks/useGameScreenController.js"

vi.mock("../src/services/clickAwayHttpApiClient.js", () => ({
  requestRoundStart: vi.fn(() => Promise.resolve({ roundToken: null, seed: 12345 })),
}))

describe("Game screen controller", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  test("returns from results to a clean mode lobby without a stale entrance overlay", () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useGameScreenController({
      selectedModeId: "normal",
      savedLoadouts: DEFAULT_SAVED_LOADOUTS,
      activeLoadoutId: ACTIVE_LOADOUT_ID_DEFAULT,
    }))

    act(() => {
      result.current.readyOverlayProps.onStart("normal")
    })
    expect(result.current.entranceOverlayProps?.startStatus).toBe("countdown")

    act(() => {
      vi.advanceTimersByTime(3 * TIMER_TICK_MS)
    })
    expect(result.current.phase).toBe("playing")

    act(() => {
      result.current.hudProps.onEndRound()
      vi.advanceTimersByTime(ROUND_END_SETTLE_MS)
    })
    expect(result.current.phase).toBe("game_over")

    act(() => {
      result.current.gameOverOverlayProps.onChooseMode()
    })

    expect(result.current.phase).toBe("ready")
    expect(result.current.entranceOverlayProps).toBeNull()
    expect(result.current.readyOverlayProps.selectedModeId).toBe("normal")
  })
})
