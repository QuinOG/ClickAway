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
