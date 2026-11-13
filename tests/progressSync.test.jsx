import { act, render, renderHook, waitFor } from "@testing-library/react"
import { useEffect } from "react"
import { afterEach, describe, expect, test, vi } from "vitest"

import toast from "react-hot-toast"
import { startNewProgressSession } from "../src/app/progressResponseGuard.js"
import { useProgressSync } from "../src/app/useProgressSync.js"
import { fetchCurrentUser, updatePlayerProgress } from "../src/services/clickAwayHttpApiClient.js"

vi.mock("../src/services/clickAwayHttpApiClient.js", () => ({
  updatePlayerProgress: vi.fn(),
  fetchCurrentUser: vi.fn(),
}))

vi.mock("react-hot-toast", () => ({ default: { error: vi.fn() } }))
afterEach(() => startNewProgressSession())

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


test("failed save queue waits for reconciliation and drops its optimistic overlay", async () => {
  let resolveRead
  fetchCurrentUser.mockReturnValueOnce(new Promise(resolve => { resolveRead = resolve }))
  updatePlayerProgress.mockRejectedValueOnce(new Error("offline"))
  const apply = vi.fn()
  const { result } = renderHook(() => useProgressSync({ isAuthed: true, applyProgress: apply }))
  let completed = false
  const save = result.current.persistIntent({ activeLoadoutId: "loadout_2" }).then(() => { completed = true })
  await waitFor(() => expect(resolveRead).toBeDefined())
  expect(completed).toBe(false)
  resolveRead({ progress: { activeLoadoutId: "loadout_1" } })
  await save
  await result.current.waitForPendingProgress()
  expect(apply).toHaveBeenLastCalledWith({ activeLoadoutId: "loadout_1" })
})


test("failed reconciliation is visible and a later explicit save can recover", async () => {
  const applyProgress = vi.fn()
  updatePlayerProgress.mockRejectedValueOnce(Error("offline"))
  fetchCurrentUser.mockRejectedValueOnce(Error("offline"))
  const { result } = renderHook(() => useProgressSync({ isAuthed: true, applyProgress }))
  await result.current.persistIntent({ activeLoadoutId: "loadout_2" })
  expect(toast.error.mock.calls.some(([message]) => message.includes("Build not saved, retry"))).toBe(true)
  updatePlayerProgress.mockResolvedValueOnce({ progress: { activeLoadoutId: "loadout_2" } })
  await result.current.persistIntent({ activeLoadoutId: "loadout_2" })
  expect(applyProgress).toHaveBeenLastCalledWith({ activeLoadoutId: "loadout_2" })
})

test("old-session failed saves never reconcile or announce an error", async () => {
  let rejectSave
  updatePlayerProgress.mockReturnValueOnce(new Promise((_, reject) => { rejectSave = reject }))
  const applyProgress = vi.fn()
  const { result } = renderHook(() => useProgressSync({ isAuthed: true, applyProgress }))
  const pending = result.current.persistIntent({ activeLoadoutId: "loadout_2" })
  await waitFor(() => expect(rejectSave).toBeDefined())
  startNewProgressSession()
  rejectSave(Error("old account offline"))
  await pending
  expect(fetchCurrentUser).not.toHaveBeenCalled()
  expect(applyProgress).not.toHaveBeenCalled()
  expect(toast.error).not.toHaveBeenCalled()
})
