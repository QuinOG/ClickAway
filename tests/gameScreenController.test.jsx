import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, test, vi } from "vitest"

import { ACTIVE_LOADOUT_ID_DEFAULT, DEFAULT_SAVED_LOADOUTS } from "../src/constants/buildcraft.js"
import { ROUND_END_SETTLE_MS, TIMER_TICK_MS } from "../src/constants/gameConstants.js"
import { useGameScreenController } from "../src/features/game/hooks/useGameScreenController.js"

vi.mock("../src/services/clickAwayHttpApiClient.js", () => ({
  requestRoundStart: vi.fn(() => Promise.resolve({ roundToken: "test-round-token", seed: 12345 })),
}))

describe("Game screen controller", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  test("keeps the combo hit cue on the last boosted hit", async () => {
    vi.useFakeTimers()
    const loadout = {
      ...DEFAULT_SAVED_LOADOUTS[0],
      moduleIds: { ...DEFAULT_SAVED_LOADOUTS[0].moduleIds, powerRigId: "power_reserve" },
      powerupIds: ["combo_surge", "size_boost", "freeze_movement"],
    }
    const { result } = renderHook(() => useGameScreenController({ activeLoadout: loadout }))
    result.current.arenaProps.arenaRef.current = {
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 600, height: 452 }),
    }
    await act(async () => result.current.readyOverlayProps.onStart("normal"))
    act(() => vi.advanceTimersByTime(3 * TIMER_TICK_MS))
    act(() => result.current.powerupTrayProps.onUsePowerup("combo_surge"))
    for (let hit = 0; hit < 4; hit += 1) {
      act(() => vi.advanceTimersByTime(100))
      act(() => result.current.arenaProps.onButtonClick({
        stopPropagation() {}, clientX: 300, clientY: 200,
      }))
      const feedback = result.current.arenaProps.clickFeedbackItems.at(-1)
      expect(feedback.type).toBe("hit comboHit")
    }
    expect(result.current.powerupTrayProps.powerupSlots[0].comboSurgeHitsRemaining).toBe(0)
    act(() => vi.advanceTimersByTime(100))
    act(() => result.current.arenaProps.onButtonClick({
      stopPropagation() {}, clientX: 300, clientY: 200,
    }))
    expect(result.current.arenaProps.clickFeedbackItems.at(-1).type).toBe("hit")
  })

  test("returns from results to a clean mode lobby without a stale entrance overlay", async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useGameScreenController({
      selectedModeId: "normal",
      savedLoadouts: DEFAULT_SAVED_LOADOUTS,
      activeLoadoutId: ACTIVE_LOADOUT_ID_DEFAULT,
    }))

    // Casual is reward-bearing, so the countdown starts once the round token arrives.
    await act(async () => {
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

  test.each(["throw", "reject", "missing", "undefined"])("reports %s save callbacks as failed", async (failure) => {
    vi.useFakeTimers()
    const onRoundComplete = failure === "missing" ? undefined : vi.fn(() => {
      if (failure === "throw") throw new Error("Save interrupted")
      if (failure === "reject") return Promise.reject(new Error("Save interrupted"))
      return undefined
    })
    const { result } = renderHook(() => useGameScreenController({ onRoundComplete, activeLoadout: DEFAULT_SAVED_LOADOUTS[0] }))
    result.current.arenaProps.arenaRef.current = {
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 600, height: 452 }),
    }
    await act(async () => result.current.readyOverlayProps.onStart("normal"))
    act(() => vi.advanceTimersByTime(3 * TIMER_TICK_MS))
    act(() => result.current.hudProps.onEndRound())
    act(() => vi.advanceTimersByTime(ROUND_END_SETTLE_MS))
    await act(async () => vi.advanceTimersByTimeAsync(1))
    expect(result.current.gameOverOverlayProps.roundSaveStatus).toBe("failed")
    expect(result.current.gameOverOverlayProps.roundSaveError).toBeTruthy()
  })
})

// Feedback must describe the simulation rather than the minimum cue lifetime.
test.each([["magnet_center", 400], ["freeze_movement", 1000]])("clears %s active feedback at expiry", async (powerupId, duration) => {
  vi.useFakeTimers()
  try {
    const loadout = { ...DEFAULT_SAVED_LOADOUTS[0], moduleIds: { ...DEFAULT_SAVED_LOADOUTS[0].moduleIds, powerRigId: "power_reserve" }, powerupIds: [powerupId, "size_boost", "time_boost"] }
    const { result, unmount } = renderHook(() => useGameScreenController({ activeLoadout: loadout }))
    await act(async () => result.current.readyOverlayProps.onStart("normal"))
    act(() => vi.advanceTimersByTime(3000))
    act(() => result.current.powerupTrayProps.onUsePowerup(powerupId))
    expect(result.current.arenaProps.activeEffect).toBe(powerupId)
    act(() => vi.advanceTimersByTime(duration - 1))
    expect(result.current.arenaProps.activeEffect).toBe(powerupId)
    act(() => vi.advanceTimersByTime(1))
    expect(result.current.arenaProps.activeEffect).toBeNull()
    unmount()
  } finally { vi.useRealTimers() }
})

test("passes untimed Practice rules to the power tray", () => {
  const { result } = renderHook(() => useGameScreenController({ selectedModeId: "easy", activeLoadout: DEFAULT_SAVED_LOADOUTS[0] }))
  expect(result.current.powerupTrayProps.isTimedRound).toBe(false)
})

test.each([[0, "Miss"], [1, "-1"]])("shows actual score loss from %i points", async (startingHits, expected) => {
  vi.useFakeTimers()
  try {
    const { result, unmount } = renderHook(() => useGameScreenController({ activeLoadout: DEFAULT_SAVED_LOADOUTS[0] }))
    result.current.arenaProps.arenaRef.current = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 600, height: 452 }) }
    await act(async () => result.current.readyOverlayProps.onStart("hard"))
    act(() => vi.advanceTimersByTime(3000))
    if (startingHits) {
      act(() => result.current.arenaProps.onButtonClick({ stopPropagation() {}, clientX: 300, clientY: 200 }))
      act(() => vi.advanceTimersByTime(100))
    }
    act(() => result.current.arenaProps.onArenaClick({ clientX: 0, clientY: 0 }))
    expect(result.current.hudProps.score).toBe(0)
    expect(result.current.arenaProps.clickFeedbackItems.at(-1).value).toBe(expected)
    unmount()
  } finally { vi.useRealTimers() }
})

test.each([
  ["a failed save", { ok: false, error: "Offline" }, 0],
  ["the server's award", { ok: true, rankDelta: -3 }, -3],
  ["no placement points", { ok: true, rankDelta: 40, rankProgress: { previous: { isPlacement: true } } }, 0],
])("session Net RR counts %s", async (_label, saveResult, expectedNetRR) => {
  vi.useFakeTimers()
  const { result } = renderHook(() => useGameScreenController({
    onRoundComplete: async () => saveResult,
    activeLoadout: DEFAULT_SAVED_LOADOUTS[0],
    playerRankMmr: 300, playerHasRankedHistory: true,
    playerRankedState: { rankSystemVersion: 4, placementMatchesPlayed: 5, demotionProtectionRounds: 0 },
  }))
  result.current.arenaProps.arenaRef.current = { getBoundingClientRect: () => ({ width: 600, height: 452, left: 0, top: 0 }) }
  await act(async () => result.current.readyOverlayProps.onStart("hard"))
  act(() => vi.advanceTimersByTime(3 * TIMER_TICK_MS))
  act(() => result.current.hudProps.onEndRound())
  act(() => vi.advanceTimersByTime(ROUND_END_SETTLE_MS))
  await act(async () => vi.advanceTimersByTimeAsync(1))
  act(() => result.current.gameOverOverlayProps.onChooseMode())
  expect(result.current.readyOverlayProps.sessionStats.netRR).toBe(expectedNetRR)
})
