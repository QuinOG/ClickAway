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

function getAuthErrorMessage(error, fallbackMessage) {
  if (!error?.response) {
    return "You appear to be offline. Check your connection and try again."
  }
  if (error.response.status === 429) {
    return "Too many attempts. Wait a moment, then try again."
  }
  return getErrorMessage(error, fallbackMessage)
}

export async function signupUser({ username, password }) {
  try {
    const response = await apiClient.post("/auth/signup", {
      username,
      password,
    })
    return response.data
  } catch (error) {
    throw new Error(getAuthErrorMessage(error, "Unable to create account."))
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
    throw new Error(getAuthErrorMessage(error, "Unable to log in."))
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

export async function fetchLeaderboard({
  board = "mmr",
  page = 1,
  limit,
  search = "",
  view = "top",
} = {}) {
  try {
    const response = await apiClient.get("/leaderboard", {
      params: {
        board,
        page,
        view,
        ...(limit ? { limit } : {}),
        ...(search ? { search } : {}),
      },
    })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to load leaderboard."))
  }
}

export async function fetchCurrentSeason() {
  try {
    const response = await apiClient.get("/seasons/current")
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to load season."))
  }
}

export async function fetchReplay(replayId) {
  try {
    const response = await apiClient.get(`/replays/${replayId}`)
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to load replay."))
  }
}

export async function fetchUserReplays({ limit = 10 } = {}) {
  try {
    const response = await apiClient.get("/replays", {
      params: { limit },
    })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to load replays."))
  }
}

export async function fetchChallenges({ role = "all" } = {}) {
  try {
    const response = await apiClient.get("/challenges", {
      params: { role },
    })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to load challenges."))
  }
}

export async function sendChallenge({ opponentUsername, replayId, message = "" }) {
  try {
    const response = await apiClient.post("/challenges", {
      opponentUsername,
      replayId,
      message,
    })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to send challenge."))
  }
}

export async function respondToChallenge(challengeId, action) {
  try {
    const response = await apiClient.post(`/challenges/${challengeId}/respond`, {
      action,
    })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to respond to challenge."))
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

export async function fetchHistoryPage({ page = 1, limit } = {}) {
  try {
    const response = await apiClient.get("/history", {
      params: {
        page,
        ...(limit ? { limit } : {}),
      },
    })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to load round history."))
  }
}

export async function submitRound({
  modeId,
  events,
  loadoutSnapshot,
  avgReactionMs,
  bestReactionMs,
  roundToken,
  arenaWidth,
  arenaHeight,
  challengeId,
  drillId,
}) {
  try {
    const response = await apiClient.post("/round/complete", {
      modeId,
      events,
      loadoutSnapshot,
      avgReactionMs,
      bestReactionMs,
      roundToken,
      arenaWidth,
      arenaHeight,
      challengeId,
      drillId,
    })
    return response.data
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to submit round."))
  }
}
