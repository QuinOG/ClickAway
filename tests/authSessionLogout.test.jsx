import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"

import { useAuthSession } from "../src/app/useAuthSession.js"
import { fetchCurrentUser, logoutUser } from "../src/services/clickAwayHttpApiClient.js"

vi.mock("../src/services/clickAwayHttpApiClient.js", () => ({
  fetchCurrentUser: vi.fn(), logoutUser: vi.fn(), loginUser: vi.fn(), signupUser: vi.fn(),
}))

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

function mountSession() {
  const callbacks = { setIsAuthed: vi.fn(), applyAuthenticatedSession: vi.fn(), resetPlayerState: vi.fn() }
  return { ...renderHook(() => useAuthSession(callbacks)), callbacks }
}

for (const blocked of [false, true]) {
  test(`explicit logout clears the server session with storage ${blocked ? "blocked" : "working"}`, async () => {
    let session = { user: { id: 1 } }
    fetchCurrentUser.mockImplementation(async () => {
      if (!session) throw new Error("Unauthenticated")
      return session
    })
    logoutUser.mockImplementation(async () => { session = null })
    if (blocked) {
      for (const method of ["getItem", "setItem", "removeItem"]) {
        vi.spyOn(Storage.prototype, method).mockImplementation(() => { throw new Error("Blocked") })
      }
    }
    const first = mountSession()
    await waitFor(() => expect(first.result.current.authReady).toBe(true))
    await act(async () => first.result.current.handleLogout())
    expect(logoutUser).toHaveBeenCalledTimes(1)
    if (!blocked) expect(localStorage.getItem("clickaway.pending-logout")).toBeNull()
    first.unmount()
    const second = mountSession()
    await waitFor(() => expect(second.result.current.authReady).toBe(true))
    expect(second.callbacks.applyAuthenticatedSession).not.toHaveBeenCalled()
    expect(second.callbacks.setIsAuthed).toHaveBeenLastCalledWith(false)
    second.unmount()
    vi.restoreAllMocks()
  })
}

test("repeated explicit logouts share the request in flight", async () => {
  fetchCurrentUser.mockResolvedValue({ user: { id: 1 } })
  let finish
  logoutUser.mockImplementation(() => new Promise(resolve => { finish = resolve }))
  const hook = mountSession()
  await waitFor(() => expect(hook.result.current.authReady).toBe(true))
  act(() => {
    hook.result.current.handleLogout()
    hook.result.current.handleLogout()
  })
  expect(logoutUser).toHaveBeenCalledTimes(1)
  await act(async () => finish())
  hook.unmount()
})

test("startup retry rechecks the persisted flag inside the auth lock", async () => {
  localStorage.setItem("clickaway.pending-logout", "1")
  vi.stubGlobal("navigator", { locks: { request: async (_name, task) => {
    localStorage.removeItem("clickaway.pending-logout")
    return task()
  } } })
  const hook = mountSession()
  await waitFor(() => expect(hook.result.current.authReady).toBe(true))
  expect(logoutUser).not.toHaveBeenCalled()
  hook.unmount()
})
