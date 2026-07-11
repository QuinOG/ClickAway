import { useCallback, useEffect, useState } from "react"

import { fetchCurrentUser, loginUser, logoutUser, signupUser } from "../services/clickAwayHttpApiClient.js"
import { normalizeUsername } from "./appAccountStateHelpers.js"

export function useAuthSession({
  setIsAuthed,
  applyAuthenticatedSession,
  resetPlayerState,
}) {
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    let isCancelled = false

    async function verifySession() {
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
    void logoutUser()
  }, [resetPlayerState, setIsAuthed])

  return {
    authReady,
    handleLogin,
    handleSignup,
    handleLogout,
  }
}
