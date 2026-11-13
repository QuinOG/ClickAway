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
    // Storage unavailable; the logout request itself still runs.
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

function sendLogout() {
  if (!inFlightLogout) {
    inFlightLogout = logoutUser()
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

export function useAuthSession({
  setIsAuthed,
  applyAuthenticatedSession,
  resetPlayerState,
}) {
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    let isCancelled = false

    async function verifySession() {
      // A logout that never reached the server leaves its cookie valid. Retry it
      // here and stay logged out instead of restoring the previous player.
      if (hasPendingLogout()) {
        try {
          await sendLogout()
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
      await waitForLogoutToSettle()
      const response = await loginUser({
        username: normalizedUsername,
        password,
      })

      clearPendingLogout()
      startNewProgressSession()
      applyAuthenticatedSession(response)
      setIsAuthed(true)
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
      await waitForLogoutToSettle()
      const response = await signupUser({
        username: normalizedUsername,
        password,
      })

      clearPendingLogout()
      startNewProgressSession()
      applyAuthenticatedSession(response)
      setIsAuthed(true)
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: error.message || "Unable to create account.",
      }
    }
  }, [applyAuthenticatedSession, setIsAuthed])

  const handleLogout = useCallback(() => {
    startNewProgressSession()
    resetPlayerState()
    setIsAuthed(false)
    markPendingLogout()
    sendLogout().catch(() => {
      // Left pending: the next app load retries before restoring any session.
    })
  }, [resetPlayerState, setIsAuthed])

  return {
    authReady,
    handleLogin,
    handleSignup,
    handleLogout,
  }
}
