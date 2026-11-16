import { renderHook } from "@testing-library/react"
import { beforeEach, expect, test, vi } from "vitest"

import { startNewProgressSession } from "../src/app/progressResponseGuard.js"
import { usePlayerProgressionUpdates } from "../src/app/usePlayerProgressionUpdates.js"
import { fetchCurrentUser, submitRound } from "../src/services/clickAwayHttpApiClient.js"

vi.mock("../src/services/clickAwayHttpApiClient.js", () => ({
  fetchCurrentUser: vi.fn(),
  submitRound: vi.fn(),
}))

beforeEach(() => startNewProgressSession())

test("reports stale totals as well as a server follow-up failure after saving", async () => {
  submitRound.mockResolvedValue({
    progress: null,
    earnedCoins: 12,
    earnedXp: 20,
    followUpError: "Your round was saved, but its replay couldn't be stored.",
  })
  fetchCurrentUser.mockRejectedValue(new Error("Offline"))
  const applyProgress = vi.fn()
  const { result } = renderHook(() => usePlayerProgressionUpdates({ isAuthed: true, applyProgress }))

  const outcome = await result.current.handleRoundComplete({ modeId: "normal" })

  expect(outcome.ok).toBe(true)
  expect(outcome.earnedCoins).toBe(12)
  expect(outcome.followUpError).toContain("its replay couldn't be stored")
  expect(outcome.followUpError).toContain("Reload to see your updated totals.")
  expect(applyProgress).not.toHaveBeenCalled()
})


test.each([undefined, 0, 2])("reads server gold count %s while leaving missing counts for the client fallback", async (goldHits) => {
  submitRound.mockResolvedValue({ progress: null, goldHits })
  fetchCurrentUser.mockRejectedValue(new Error("Offline"))
  const { result } = renderHook(() => usePlayerProgressionUpdates({ isAuthed: true, applyProgress: vi.fn() }))
  const outcome = await result.current.handleRoundComplete({ modeId: "normal" })
  expect(outcome.goldHits).toBe(goldHits ?? null)
})

test("sends the round's seed and arena so a tokenless round can be scored with Bullseye and Gold", async () => {
  submitRound.mockResolvedValue({ progress: null })
  fetchCurrentUser.mockRejectedValue(new Error("Offline"))
  const { result } = renderHook(() => usePlayerProgressionUpdates({ isAuthed: true, applyProgress: vi.fn() }))
  await result.current.handleRoundComplete({ modeId: "practice", seed: 38, arenaWidth: 600, arenaHeight: 400 })
  expect(submitRound).toHaveBeenLastCalledWith(expect.objectContaining({ roundToken: null, seed: 38, arenaWidth: 600, arenaHeight: 400 }))
})
