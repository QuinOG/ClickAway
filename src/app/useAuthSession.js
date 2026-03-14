import { useCallback, useEffect, useState } from "react"

import { fetchCurrentUser, loginUser, signupUser } from "../services/api.js"
import { normalizeUsername } from "./appStateHelpers.js"

export function useAuthSession({
  authToken,
  setAuthToken,
  setIsAuthed,
  setPlayerUsername,
}) {
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    let isCancelled = false

    async function verifySession() {
      if (!authToken) {
        if (!isCancelled) {
          setIsAuthed(false)
          setAuthReady(true)
        }
        return
      }

      try {
        const profile = await fetchCurrentUser(authToken)
        if (isCancelled) return

        setPlayerUsername(profile.username)
        setIsAuthed(true)
      } catch {
        if (isCancelled) return
        setAuthToken("")
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
  }, [authToken, setAuthToken, setIsAuthed, setPlayerUsername])

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
      setPlayerUsername(response.user.username)
      setIsAuthed(true)
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: error.message || "Unable to log in with those details.",
      }
    }
  }, [setAuthToken, setIsAuthed, setPlayerUsername])

  const handleSignup = useCallback(async (username = "", password = "") => {
    const normalizedUsername = normalizeUsername(username) || "Player"

    try {
      const response = await signupUser({
        username: normalizedUsername,
        password,
      })

      setAuthToken(response.token)
      setPlayerUsername(response.user.username)
      setIsAuthed(true)
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: error.message || "Unable to create account.",
      }
    }
  }, [setAuthToken, setIsAuthed, setPlayerUsername])

  const handleLogout = useCallback(() => {
    setAuthToken("")
    setIsAuthed(false)
  }, [setAuthToken, setIsAuthed])

  return {
    authReady,
    handleLogin,
    handleSignup,
    handleLogout,
  }
}
