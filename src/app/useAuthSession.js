import { useCallback, useEffect, useState } from "react"

import { fetchCurrentUser, loginUser, logoutUser, signupUser } from "../services/clickAwayHttpApiClient.js"
import { normalizeUsername } from "./appAccountStateHelpers.js"
import { startNewProgressSession } from "./progressResponseGuard.js"

const PENDING_LOGOUT_KEY = "clickaway.pending-logout"

function hasPendingLogout() {
  try {
    return localStorage.getItem(PENDING_LOGOUT_KEY) === "1"
  } catch {
    return false
  }
}

function markPendingLogout() {
  try {
    localStorage.setItem(PENDING_LOGOUT_KEY, "1")
  } catch {
    // Storage unavailable; explicit logout does not depend on this retry flag.
  }
}

function clearPendingLogout() {
  try {
    localStorage.removeItem(PENDING_LOGOUT_KEY)
  } catch {
    // Nothing to clear.
  }
}

// The logout request clears the auth cookie when its response arrives. If a new
// login lands first, a late logout response would wipe the new session, so login
// and signup wait for any logout still in flight.
let inFlightLogout = null

// Login, sign-up and logout all set or clear the shared auth cookie. Running
// them one at a time across every open tab (Web Locks, where supported) stops
// one tab's late logout from clearing another tab's fresh login.
function withAuthLock(task) {
  const locks = typeof navigator !== "undefined" ? navigator.locks : null
  return locks?.request ? locks.request("clickaway-auth", task) : task()
}

function sendLogout(retryPending = false) {
  if (!inFlightLogout) {
    inFlightLogout = withAuthLock(() => (!retryPending || hasPendingLogout() ? logoutUser() : Promise.resolve()))
      .then(() => {
        clearPendingLogout()
      })
      .finally(() => {
        inFlightLogout = null
      })
  }
  return inFlightLogout
}

async function waitForLogoutToSettle() {
  if (!inFlightLogout) return
  try {
    await inFlightLogout
  } catch {
    // A failed logout stays pending and is retried on the next load.
  }
}

// One login or sign-up at a time, and a logout always wins: if the player logs
// out while one is still in flight, its result is discarded and the session it
// created is logged out again.
let authAttemptInFlight = false
let authGeneration = 0

// Other open tabs share the same login cookie. When this tab logs in or out,
// they reload so they never keep showing (and saving as) the previous player.
const AUTH_CHANGE_KEY = "clickaway.auth-change"

let authAnnouncementPrefix
let authAnnouncementSequence = 0

function announceAuthChange() {
  try {
    authAnnouncementPrefix ??= `${Date.now()}-${Math.random()}-${Math.random()}`
    const value = globalThis.crypto?.randomUUID?.()
      ?? `${authAnnouncementPrefix}-${++authAnnouncementSequence}`
    localStorage.setItem(AUTH_CHANGE_KEY, value)
  } catch {
    // Storage unavailable; other tabs pick up the change on their next load.
  }
}

async function runAuthAttempt(request) {
  if (authAttemptInFlight) {
    return { ok: false, error: "Already signing in. One moment." }
  }
  authAttemptInFlight = true
  const generation = authGeneration
  try {
    await waitForLogoutToSettle()
    const response = await withAuthLock(request)
    if (generation !== authGeneration) {
      // Logged out while this was in flight: undo the session it just created.
      markPendingLogout()
      sendLogout().catch(() => {})
      return { ok: false, error: "You logged out before sign-in finished." }
    }
    return { ok: true, response }
  } finally {
    authAttemptInFlight = false
  }
}

export function useAuthSession({
  setIsAuthed,
  applyAuthenticatedSession,
  resetPlayerState,
}) {
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    function handleStorage(event) {
      if (event.key === AUTH_CHANGE_KEY) {
        window.location.reload()
      }
    }
    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  useEffect(() => {
    let isCancelled = false

    async function verifySession() {
      // A logout that never reached the server leaves its cookie valid. Retry it
      // here and stay logged out instead of restoring the previous player.
      if (hasPendingLogout()) {
        try {
          await sendLogout(true)
        } catch {
          // Still pending; try again on the next load.
        }
        if (isCancelled) return
        resetPlayerState()
        setIsAuthed(false)
        setAuthReady(true)
        return
      }

      try {
        const session = await fetchCurrentUser()
        if (isCancelled) return

        applyAuthenticatedSession(session)
        setIsAuthed(true)
      } catch {
        if (isCancelled) return
        resetPlayerState()
        setIsAuthed(false)
      } finally {
        if (!isCancelled) {
          setAuthReady(true)
        }
      }
    }

    verifySession()

    return () => {
      isCancelled = true
    }
  }, [applyAuthenticatedSession, resetPlayerState, setIsAuthed])

  const handleLogin = useCallback(async (username = "", password = "") => {
    const normalizedUsername = normalizeUsername(username)

    if (!normalizedUsername || !password) {
      return {
        ok: false,
        error: "Enter your username and password.",
      }
    }

    try {
      const attempt = await runAuthAttempt(() => loginUser({
        username: normalizedUsername,
        password,
      }))
      if (!attempt.ok) return attempt

      clearPendingLogout()
      startNewProgressSession()
      applyAuthenticatedSession(attempt.response)
      setIsAuthed(true)
      announceAuthChange()
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: error.message || "Unable to log in with those details.",
      }
    }
  }, [applyAuthenticatedSession, setIsAuthed])

  const handleSignup = useCallback(async (username = "", password = "") => {
    const normalizedUsername = normalizeUsername(username) || "Player"

    try {
      const attempt = await runAuthAttempt(() => signupUser({
        username: normalizedUsername,
        password,
      }))
      if (!attempt.ok) return attempt

      clearPendingLogout()
      startNewProgressSession()
      applyAuthenticatedSession(attempt.response)
      setIsAuthed(true)
      announceAuthChange()
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: error.message || "Unable to create account.",
      }
    }
  }, [applyAuthenticatedSession, setIsAuthed])

  const handleLogout = useCallback(() => {
    authGeneration += 1
    startNewProgressSession()
    resetPlayerState()
    setIsAuthed(false)
    markPendingLogout()
    sendLogout().catch(() => {
      // Left pending: the next app load retries before restoring any session.
    })
    announceAuthChange()
  }, [resetPlayerState, setIsAuthed])

  return {
    authReady,
    handleLogin,
    handleSignup,
    handleLogout,
  }
}
