import axios from "axios"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api"

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  // The session lives in an httpOnly cookie set by the server, so every request
  // (same-origin in production, proxied to same-origin in dev — see vite.config.js)
  // must include credentials for the browser to send/receive it.
  withCredentials: true,
})

function getErrorMessage(error, fallbackMessage) {
  return error?.response?.data?.error || fallbackMessage
}

export async function signupUser({ username, password }) {
  try {
    const response = await apiClient.post("/auth/signup", {
      username,
      password,
    })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to create account."))
  }
}

export async function loginUser({ username, password }) {
  try {
    const response = await apiClient.post("/auth/login", {
      username,
      password,
    })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to log in."))
  }
}

export async function logoutUser() {
  try {
    await apiClient.post("/auth/logout")
  } catch {
    // Logging out is best-effort: even if this request fails, the caller clears
    // local session state, and the cookie will simply expire on its own.
  }
}

export async function fetchCurrentUser() {
  try {
    const response = await apiClient.get("/auth/me")
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error, "Your session has expired."))
  }
}

export async function fetchLeaderboard() {
  try {
    const response = await apiClient.get("/leaderboard")
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to load leaderboard."))
  }
}

export async function updatePlayerProgress(progress = {}) {
  try {
    const response = await apiClient.put("/progress", progress)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to sync progress."))
  }
}

export async function purchaseShopItem(itemId) {
  try {
    const response = await apiClient.post("/shop/purchase", { itemId })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to unlock that item."))
  }
}

export async function equipShopItem(itemId) {
  try {
    const response = await apiClient.post("/shop/equip", { itemId })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to equip that item."))
  }
}

export async function requestRoundStart(modeId) {
  try {
    const response = await apiClient.post("/round/start", { modeId })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to start round."))
  }
}

export async function submitRound({
  modeId,
  events,
  loadoutSnapshot,
  avgReactionMs,
  bestReactionMs,
  roundToken,
}) {
  try {
    const response = await apiClient.post("/round/complete", {
      modeId,
      events,
      loadoutSnapshot,
      avgReactionMs,
      bestReactionMs,
      roundToken,
    })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to submit round."))
  }
}
