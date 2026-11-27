import { act, fireEvent, render, renderHook, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { FeedbackPreferencesProvider } from "../src/app/FeedbackPreferencesContext.jsx"
import { startNewProgressSession } from "../src/app/progressResponseGuard.js"
import { usePlayerProgressionUpdates } from "../src/app/usePlayerProgressionUpdates.js"
import { DEFAULT_SAVED_LOADOUTS } from "../src/constants/buildcraft.js"
import { ROUND_END_SETTLE_MS, TIMER_TICK_MS } from "../src/constants/gameConstants.js"
import { GameOverFlow } from "../src/features/game/components/roundOverlays/GameOverFlow.jsx"
import { useGameScreenController } from "../src/features/game/hooks/useGameScreenController.js"
import { fetchCurrentUser, requestRoundStart, submitRound } from "../src/services/clickAwayHttpApiClient.js"

vi.mock("../src/services/clickAwayHttpApiClient.js", () => ({
  fetchCurrentUser: vi.fn(),
  requestRoundStart: vi.fn(),
  submitRound: vi.fn(),
}))

function GameOverRetryHarness({ modeId = "normal", onRoundComplete }) {
  const game = useGameScreenController({
    selectedModeId: modeId,
    activeLoadout: DEFAULT_SAVED_LOADOUTS[0],
    onRoundComplete,
  })

  if (game.phase === "game_over") {
    return (
      <MemoryRouter>
        <FeedbackPreferencesProvider>
          <GameOverFlow {...game.gameOverOverlayProps} />
        </FeedbackPreferencesProvider>
      </MemoryRouter>
    )
  }

  return (
    <div>
      <button type="button" onClick={() => game.readyOverlayProps.onStart(modeId)}>Start Round</button>
      <button type="button" onClick={() => game.hudProps.onEndRound()}>Finish Round</button>
    </div>
  )
}

async function finishRoundToGameOver({ modeId = "normal", onRoundComplete }) {
  render(<GameOverRetryHarness modeId={modeId} onRoundComplete={onRoundComplete} />)
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Start Round" }))
  })
  act(() => {
    vi.advanceTimersByTime(3 * TIMER_TICK_MS)
  })
  act(() => {
    fireEvent.click(screen.getByRole("button", { name: "Finish Round" }))
    vi.advanceTimersByTime(ROUND_END_SETTLE_MS)
  })
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1)
  })
}

beforeEach(() => {
  startNewProgressSession()
  requestRoundStart.mockReset()
  requestRoundStart.mockResolvedValue({ roundToken: "round-token-1", seed: 12345 })
  submitRound.mockReset()
  fetchCurrentUser.mockReset()
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

afterEach(() => {
  localStorage.clear()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("usePlayerProgressionUpdates round recovery", () => {
  test("marks network and 5xx failures retryable only when a round token is present", async () => {
    const { result } = renderHook(() => usePlayerProgressionUpdates({ isAuthed: true, applyProgress: vi.fn() }))

    submitRound.mockRejectedValueOnce(Object.assign(new Error("Network Error"), { isNetworkError: true, retryable: true, status: null }))
    expect(await result.current.handleRoundComplete({ modeId: "normal", roundToken: "tok-1" })).toEqual({
      ok: false,
      error: "Network Error",
      retryable: true,
    })

    submitRound.mockRejectedValueOnce(Object.assign(new Error("Gateway timeout"), { isNetworkError: false, retryable: true, status: 504 }))
    expect(await result.current.handleRoundComplete({ modeId: "normal", roundToken: "tok-1" })).toEqual({
      ok: false,
      error: "Gateway timeout",
      retryable: true,
    })

    submitRound.mockRejectedValueOnce(Object.assign(new Error("This ranked round was already counted as a loss."), { isNetworkError: false, retryable: false, status: 409 }))
    expect(await result.current.handleRoundComplete({ modeId: "hard", roundToken: "tok-1" })).toEqual({
      ok: false,
      error: "This ranked round was already counted as a loss.",
    })

    submitRound.mockRejectedValueOnce(Object.assign(new Error("Network Error"), { isNetworkError: true, retryable: true, status: null }))
    expect(await result.current.handleRoundComplete({ modeId: "easy", roundToken: null })).toEqual({
      ok: false,
      error: "Network Error",
    })
  })

  test("treats an alreadySaved replay with omitted breakdown fields as a normal save", async () => {
    const applyProgress = vi.fn()
    const progress = { coins: 120, levelXp: 340, snapshotAtMs: Date.now() }
    submitRound.mockResolvedValueOnce({
      alreadySaved: true,
      historyEntry: { id: "r-9", outcome: "completed", coinsEarned: 16, xpEarned: 80, rankDelta: 12 },
      progress,
      earnedCoins: 16,
      earnedXp: 80,
      rankDelta: 12,
    })
    const { result } = renderHook(() => usePlayerProgressionUpdates({ isAuthed: true, applyProgress }))
    const outcome = await result.current.handleRoundComplete({ modeId: "hard", roundToken: "tok-1" })

    expect(outcome.ok).toBe(true)
    expect(outcome.alreadySaved).toBe(true)
    expect(outcome.earnedCoins).toBe(16)
    expect(outcome.earnedXp).toBe(80)
    expect(outcome.rankDelta).toBe(12)
    expect(outcome.dailyBonusXp).toBe(0)
    expect(outcome.rankProgress).toBeNull()
    expect(applyProgress).toHaveBeenCalledWith(progress)
  })
})

describe("GameOverOverlay round save retry", () => {
  test("network error shows retry button and clicking it resolves to saved state", async () => {
    vi.useFakeTimers()
    const onRoundComplete = vi.fn()
      .mockRejectedValueOnce(new Error("Network Error"))
      .mockResolvedValueOnce({
        ok: true,
        earnedCoins: 18,
        earnedXp: 95,
        rankDelta: 0,
      })

    await finishRoundToGameOver({ onRoundComplete })

    const alert = screen.getByRole("alert")
    expect(alert.textContent).toContain("This round hasn't been confirmed yet. Check your connection and try again.")
    const retryButton = screen.getByRole("button", { name: "Try saving again" })
    expect(retryButton.className).toContain("resultSecondary")

    await act(async () => {
      fireEvent.click(retryButton)
      await Promise.resolve()
    })

    expect(onRoundComplete).toHaveBeenCalledTimes(2)
    expect(onRoundComplete.mock.calls[1][0]).toBe(onRoundComplete.mock.calls[0][0])
    expect(screen.queryByRole("alert")).toBeNull()
    expect(screen.queryByRole("button", { name: "Try saving again" })).toBeNull()
    const rewards = screen.getByLabelText("Round rewards")
    expect(rewards.textContent).toContain("+18")
    expect(rewards.textContent).toContain("+95")
    expect(rewards.textContent).not.toContain("pending")
  })

  test("alreadySaved response after retry shows saved state even without daily bonus or rankProgress", async () => {
    vi.useFakeTimers()
    const onRoundComplete = vi.fn()
      .mockResolvedValueOnce({ ok: false, error: "Temporary outage", retryable: true })
      .mockResolvedValueOnce({
        ok: true,
        alreadySaved: true,
        historyEntry: { id: "r-42", outcome: "completed", coinsEarned: 22, xpEarned: 110, rankDelta: 0 },
        earnedCoins: 22,
        earnedXp: 110,
        rankDelta: 0,
        rankProgress: null,
      })

    await finishRoundToGameOver({ onRoundComplete })

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Try saving again" }))
      await Promise.resolve()
    })

    expect(screen.queryByRole("alert")).toBeNull()
    const rewards = screen.getByLabelText("Round rewards")
    expect(rewards.textContent).toContain("+22")
    expect(rewards.textContent).toContain("+110")
  })

  test("shows retry button for 5xx failures but hides it for 4xx failures and tokenless rounds", async () => {
    vi.useFakeTimers()

    const serverErrorSave = vi.fn().mockRejectedValueOnce(Object.assign(new Error("Server error"), { status: 503 }))
    const first = render(<GameOverRetryHarness onRoundComplete={serverErrorSave} />)
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Start Round" }))
    })
    act(() => vi.advanceTimersByTime(3 * TIMER_TICK_MS))
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Finish Round" }))
      vi.advanceTimersByTime(ROUND_END_SETTLE_MS)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(screen.getByRole("button", { name: "Try saving again" })).not.toBeNull()
    first.unmount()

    const clientErrorSave = vi.fn().mockRejectedValueOnce(Object.assign(new Error("This round has already been submitted."), { status: 409 }))
    const second = render(<GameOverRetryHarness onRoundComplete={clientErrorSave} />)
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Start Round" }))
    })
    act(() => vi.advanceTimersByTime(3 * TIMER_TICK_MS))
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Finish Round" }))
      vi.advanceTimersByTime(ROUND_END_SETTLE_MS)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(screen.queryByRole("button", { name: "Try saving again" })).toBeNull()
    expect(screen.getByRole("alert").textContent).toContain("This round couldn't be saved, so its rewards weren't added.")
    second.unmount()

    requestRoundStart.mockRejectedValueOnce(new Error("Offline"))
    const tokenlessSave = vi.fn().mockRejectedValueOnce(new Error("Network Error"))
    render(<GameOverRetryHarness modeId="easy" onRoundComplete={tokenlessSave} />)
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Start Round" }))
    })
    act(() => vi.advanceTimersByTime(3 * TIMER_TICK_MS))
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Finish Round" }))
      vi.advanceTimersByTime(ROUND_END_SETTLE_MS)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(tokenlessSave.mock.calls[0][0].roundToken).toBeNull()
    expect(screen.queryByRole("button", { name: "Try saving again" })).toBeNull()
  })

  test("hides the retry button after 3 failed manual retries", async () => {
    vi.useFakeTimers()
    const onRoundComplete = vi.fn().mockRejectedValue(new Error("Network Error"))

    await finishRoundToGameOver({ onRoundComplete })

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const button = screen.getByRole("button", { name: "Try saving again" })
      await act(async () => {
        fireEvent.click(button)
        await Promise.resolve()
      })
    }

    expect(onRoundComplete).toHaveBeenCalledTimes(4)
    expect(screen.queryByRole("button", { name: "Try saving again" })).toBeNull()
    expect(screen.getByRole("alert").textContent).toContain("This round couldn't be saved, so its rewards weren't added.")
  })
})
