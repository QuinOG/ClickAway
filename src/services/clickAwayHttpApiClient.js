import axios from "axios"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api"

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
})

function buildAuthHeader(token = "") {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

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

export async function fetchCurrentUser(token) {
  try {
    const response = await apiClient.get("/auth/me", {
      headers: buildAuthHeader(token),
    })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error, "Your session has expired."))
  }
}

export async function fetchLeaderboard(token) {
  try {
    const response = await apiClient.get("/leaderboard", {
      headers: buildAuthHeader(token),
    })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to load leaderboard."))
  }
}

export async function updatePlayerProgress(token, progress = {}) {
  try {
    const response = await apiClient.put("/progress", progress, {
      headers: buildAuthHeader(token),
    })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to sync progress."))
  }
}

export async function purchaseShopItem(token, itemId) {
  try {
    const response = await apiClient.post(
      "/shop/purchase",
      { itemId },
      { headers: buildAuthHeader(token) }
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to unlock that item."))
  }
}

export async function equipShopItem(token, itemId) {
  try {
    const response = await apiClient.post(
      "/shop/equip",
      { itemId },
      { headers: buildAuthHeader(token) }
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to equip that item."))
  }
}

export async function submitRound(token, { modeId, events }) {
  try {
    const response = await apiClient.post(
      "/round/complete",
      { modeId, events },
      { headers: buildAuthHeader(token) }
    )
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to submit round."))
  }
}
