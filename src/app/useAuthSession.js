import { useCallback, useEffect, useState } from "react"

import { fetchCurrentUser, loginUser, signupUser } from "../services/clickAwayHttpApiClient.js"
import { normalizeUsername } from "./appAccountStateHelpers.js"

export function useAuthSession({
  authToken,
  setAuthToken,
  setIsAuthed,
  applyAuthenticatedSession,
  resetPlayerState,
}) {
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    let isCancelled = false

    async function verifySession() {
      if (!authToken) {
        if (!isCancelled) {
          resetPlayerState()
          setIsAuthed(false)
          setAuthReady(true)
        }
        return
      }

      try {
        const session = await fetchCurrentUser(authToken)
        if (isCancelled) return

        applyAuthenticatedSession(session)
        setIsAuthed(true)
      } catch {
        if (isCancelled) return
        setAuthToken("")
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
  }, [
    authToken,
    applyAuthenticatedSession,
    resetPlayerState,
    setAuthToken,
    setAuthReady,
    setIsAuthed,
  ])

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

      setAuthToken(response.token)
      applyAuthenticatedSession(response)
      setIsAuthed(true)
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: error.message || "Unable to log in with those details.",
      }
    }
  }, [applyAuthenticatedSession, setAuthToken, setIsAuthed])

  const handleSignup = useCallback(async (username = "", password = "") => {
    const normalizedUsername = normalizeUsername(username) || "Player"

    try {
      const response = await signupUser({
        username: normalizedUsername,
        password,
      })

      setAuthToken(response.token)
      applyAuthenticatedSession(response)
      setIsAuthed(true)
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: error.message || "Unable to create account.",
      }
    }
  }, [applyAuthenticatedSession, setAuthToken, setIsAuthed])

  const handleLogout = useCallback(() => {
    setAuthToken("")
    resetPlayerState()
    setIsAuthed(false)
  }, [resetPlayerState, setAuthToken, setIsAuthed])

  return {
    authReady,
    handleLogin,
    handleSignup,
    handleLogout,
  }
}
