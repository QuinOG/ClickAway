import { act, render, waitFor } from "@testing-library/react"
import { useEffect } from "react"
import { describe, expect, test, vi } from "vitest"

import { useProgressSync } from "../src/app/useProgressSync.js"
import { updatePlayerProgress } from "../src/services/clickAwayHttpApiClient.js"

vi.mock("../src/services/clickAwayHttpApiClient.js", () => ({
  updatePlayerProgress: vi.fn(),
}))

function ProgressSyncHarness({ applyProgress, onReady }) {
  const progressSync = useProgressSync({ isAuthed: true, applyProgress })

  useEffect(() => {
    onReady(progressSync)
  }, [onReady, progressSync])

  return null
}

describe("progress intent synchronization", () => {
  test("does not apply an older response over a newer queued intent", async () => {
    const requests = []
    updatePlayerProgress.mockImplementation((payload) => new Promise((resolve) => {
      requests.push({ payload, resolve })
    }))

    const applyProgress = vi.fn()
    let progressSync
    render(
      <ProgressSyncHarness
        applyProgress={applyProgress}
        onReady={(value) => { progressSync = value }}
      />
    )
    await waitFor(() => expect(progressSync).toBeDefined())

    let firstSave
    let secondSave
    act(() => {
      firstSave = progressSync.persistIntent({ activeLoadoutId: "loadout_2" })
      secondSave = progressSync.persistIntent({ activeLoadoutId: "loadout_3" })
    })

    await waitFor(() => expect(requests).toHaveLength(1))
    await act(async () => {
      requests[0].resolve({ progress: { activeLoadoutId: "loadout_2" } })
      await firstSave
    })
    expect(applyProgress).not.toHaveBeenCalled()

    await waitFor(() => expect(requests).toHaveLength(2))
    await act(async () => {
      requests[1].resolve({ progress: { activeLoadoutId: "loadout_3" } })
      await secondSave
    })

    expect(applyProgress).toHaveBeenCalledOnce()
    expect(applyProgress).toHaveBeenCalledWith({ activeLoadoutId: "loadout_3" })
  })
})
