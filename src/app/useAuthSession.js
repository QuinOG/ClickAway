import { useCallback, useEffect, useState } from "react"

import { fetchCurrentUser, loginUser, logoutUser, signupUser } from "../services/clickAwayHttpApiClient.js"
import { normalizeUsername } from "./appAccountStateHelpers.js"

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
          await logoutUser()
          clearPendingLogout()
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
      const response = await loginUser({
        username: normalizedUsername,
        password,
      })

      clearPendingLogout()
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
      const response = await signupUser({
        username: normalizedUsername,
        password,
      })

      clearPendingLogout()
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
    resetPlayerState()
    setIsAuthed(false)
    markPendingLogout()
    logoutUser()
      .then(clearPendingLogout)
      .catch(() => {
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
