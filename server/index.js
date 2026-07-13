import "dotenv/config"

import bcrypt from "bcryptjs"
import cors from "cors"
import express from "express"
import { fileURLToPath } from "url"
import { dirname, join } from "path"
import { existsSync } from "fs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

import rateLimit from "express-rate-limit"

import {
  AUTH_COOKIE_MAX_AGE_MS,
  AUTH_COOKIE_NAME,
  extractCookieToken,
  signAuthToken,
  verifyAuthToken,
} from "./auth.js"
import {
  createUser,
  completeUserRound,
  createChallenge,
  findChallengesForUser,
  findCurrentSeason,
  findLeaderboardPage,
  findReplayById,
  findRoundHistoryPage,
  findUserByUsernameForChallenge,
  findUserProgressByUserId,
  findUserById,
  findUserByUsername,
  findUserReplays,
  insertRoundReplay,
  applyUserSeasonProgress,
  completeChallenge,
  respondToChallenge,
  saveUserProgress,
  updateUserPassword,
  updateUserRole,
  initializeSchema,
  LEADERBOARD_BOARDS,
} from "./playerMysqlDatabase.js"
import { calculateRoundRewards, simulateRound } from "./roundRewards.js"
import { createRoundSeed, signRoundToken, verifyRoundToken } from "./roundToken.js"
import { createPlayerStateStore, PlayerStateError } from "./playerStateStore.js"
import { sanitizeUsername, validatePassword, validateUsername } from "./validation.js"
import { getDifficultyById } from "../src/constants/gameModesConfig.js"
import {
  evaluateAchievements,
  getUnlockedAchievementIds,
} from "../src/game/achievements/evaluateAchievements.js"
import { getLevelProgress } from "../src/utils/progressionUtils.js"
import {
  applyRoundToLifetimeStats,
  buildAchievementStatsFromLifetime,
} from "../src/utils/lifetimeStatsUtils.js"
import { applyRankedMatchResult } from "../src/utils/rankUtils.js"
import { isRankedModeEntry } from "../src/utils/gameModeLabelsAndRankedFilters.js"

const app = express()
app.set("trust proxy", 1)
const playerStateStore = createPlayerStateStore()

const PORT = Number(process.env.PORT || 4000)
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173"
// Don't rely solely on NODE_ENV being set correctly by the deployment platform:
// an https:// CLIENT_ORIGIN on its own already implies the cookie must be Secure
// to ever reach the browser over that connection.
const IS_PRODUCTION = process.env.NODE_ENV === "production" || CLIENT_ORIGIN.startsWith("https://")
const JWT_SECRET = process.env.JWT_SECRET || ""
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ""

// Sanity ceilings for server-owned progression numbers. Both rank and level are
// designed to be uncapped in normal play, so these exist only to stop a corrupted
// or malicious payload from producing unbounded/overflowing values.
const MAX_COINS = 10_000_000
const MAX_XP = 10_000_000
const MAX_MMR = 100_000

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again later." },
})

// A legitimate round takes at least ~15 seconds plus countdown, so even a
// generous ceiling blocks scripted submission floods without ever touching
// real players (or several players behind one NAT).
const roundRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many rounds submitted. Please slow down." },
})

if (!JWT_SECRET) {
  throw new Error("Missing JWT_SECRET. Set it in your environment before starting the server.")
}

app.use(cors({
  origin: CLIENT_ORIGIN,
  credentials: true,
}))
app.use(express.json({ limit: "64kb" }))

function buildAuthPayload(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
  }
}

// The session token lives in an httpOnly cookie (never readable by page JS) instead
// of localStorage + an Authorization header, so it can't be exfiltrated by an XSS
// payload. SameSite=Lax also means the browser won't attach it to cross-site
// fetch/XHR requests, which is the main CSRF vector for a JSON-only API like this one.
function setAuthCookie(response, token) {
  response.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
  })
}

function clearAuthCookie(response) {
  response.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax",
    path: "/",
  })
}

async function createAuthResponse(user, response) {
  setAuthCookie(response, signAuthToken(buildAuthPayload(user), JWT_SECRET))

  return {
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
    progress: await findUserProgressByUserId(user.id),
  }
}

function normalizeProgressPayload(body = {}) {
  // Only allow safe client-controlled fields.
  // coins, levelXp, rankMmr, roundHistory, and unlockedAchievementIds are server-owned
  // and never accepted from the client — achievements are recomputed from trusted
  // progress data on every save (see resolveUnlockedAchievementIds).
  return {
    equippedButtonSkinId: body.equippedButtonSkinId,
    equippedArenaThemeId: body.equippedArenaThemeId,
    equippedProfileImageId: body.equippedProfileImageId,
    activeLoadoutId: body.activeLoadoutId,
    savedLoadouts: body.savedLoadouts,
    selectedModeId: body.selectedModeId,
    buildWalkthrough: body.buildWalkthrough,
    seenUnlockPartIds: body.seenUnlockPartIds,
  }
}

function resolveUnlockedAchievementIds(currentProgress) {
  const achievementStats = buildAchievementStatsFromLifetime({
    lifetimeStats: currentProgress.lifetimeStats,
    levelProgress: getLevelProgress(currentProgress.levelXp),
    coins: currentProgress.coins,
  })
  const evaluatedAchievements = evaluateAchievements(achievementStats, {
    persistedUnlockedIds: currentProgress.unlockedAchievementIds,
  })

  return getUnlockedAchievementIds(evaluatedAchievements)
}

function mergeProgressPayload(existingProgress = {}, nextProgress = {}) {
  return Object.entries(nextProgress).reduce(
    (mergedProgress, [key, value]) => (
      value === undefined
        ? mergedProgress
        : { ...mergedProgress, [key]: value }
    ),
    { ...existingProgress }
  )
}

function clampCoins(value) {
  return Math.min(MAX_COINS, Math.max(0, Number(value) || 0))
}

function clampXp(value) {
  return Math.min(MAX_XP, Math.max(0, Number(value) || 0))
}

function clampMmr(value) {
  return Math.min(MAX_MMR, Math.max(0, Number(value) || 0))
}

function clampProgressBounds(progress = {}) {
  return {
    ...progress,
    coins: clampCoins(progress.coins),
    levelXp: clampXp(progress.levelXp),
    rankMmr: clampMmr(progress.rankMmr),
  }
}

function handleRouteError(error, response) {
  if (error instanceof PlayerStateError) {
    response.status(error.status).json({ error: error.message })
    return
  }

  console.error(error)
  response.status(500).json({ error: "Unexpected server error." })
}

function requireAuth(request, response, next) {
  const token = extractCookieToken(request.headers.cookie || "")
  if (!token) {
    response.status(401).json({ error: "Missing authentication token." })
    return
  }

  try {
    const payload = verifyAuthToken(token, JWT_SECRET)
    request.auth = {
      userId: Number(payload.sub),
      username: payload.username,
      role: payload.role,
    }
    next()
  } catch {
    response.status(401).json({ error: "Invalid or expired authentication token." })
  }
}

async function seedAdminAccount() {
  if (!ADMIN_PASSWORD) {
    console.log("Admin seed skipped: set ADMIN_PASSWORD in .env to create/update admin.")
    return
  }

  const existingAdmin = await findUserByUsername(ADMIN_USERNAME)
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12)

  if (!existingAdmin) {
    await createUser({
      username: ADMIN_USERNAME,
      passwordHash,
      role: "admin",
    })
    console.log(`Admin account created for username "${ADMIN_USERNAME}".`)
    return
  }

  await updateUserPassword({
    id: existingAdmin.id,
    passwordHash,
  })
  if (existingAdmin.role !== "admin") {
    await updateUserRole({ id: existingAdmin.id, role: "admin" })
  }
  console.log(`Admin password refreshed for username "${existingAdmin.username}".`)
}

app.get("/api/health", (_request, response) => {
  response.json({ ok: true })
})

app.post("/api/auth/signup", authRateLimiter, async (request, response) => {
  const username = sanitizeUsername(request.body?.username)
  const password = String(request.body?.password || "")

  const usernameError = validateUsername(username)
  if (usernameError) {
    response.status(400).json({ error: usernameError })
    return
  }

  const passwordError = validatePassword(password)
  if (passwordError) {
    response.status(400).json({ error: passwordError })
    return
  }

  const existingUser = await findUserByUsername(username)
  if (existingUser) {
    response.status(409).json({ error: "That username is already taken." })
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const createdUser = await createUser({
    username,
    passwordHash,
    role: "player",
  })

  try {
    await playerStateStore.ensurePlayerUser(createdUser)
    response.status(201).json(await createAuthResponse(createdUser, response))
  } catch (error) {
    handleRouteError(error, response)
  }
})

app.post("/api/auth/login", authRateLimiter, async (request, response) => {
  const username = sanitizeUsername(request.body?.username)
  const password = String(request.body?.password || "")

  if (!username || !password) {
    response.status(400).json({ error: "Username and password are required." })
    return
  }

  const user = await findUserByUsername(username)
  if (!user) {
    response.status(401).json({ error: "Invalid username or password." })
    return
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash)
  if (!isValidPassword) {
    response.status(401).json({ error: "Invalid username or password." })
    return
  }

  try {
    await playerStateStore.ensurePlayerUser(user)
    response.json(await createAuthResponse(user, response))
  } catch (error) {
    handleRouteError(error, response)
  }
})

app.post("/api/auth/logout", (_request, response) => {
  clearAuthCookie(response)
  response.status(204).end()
})

app.get("/api/auth/me", requireAuth, async (request, response) => {
  const user = await findUserById(request.auth.userId)
  if (!user) {
    response.status(401).json({ error: "Session is no longer valid." })
    return
  }

  try {
    await playerStateStore.ensurePlayerUser(user)
    response.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      progress: await findUserProgressByUserId(user.id),
    })
  } catch (error) {
    handleRouteError(error, response)
  }
})

app.get("/api/player/state", requireAuth, async (request, response) => {
  const user = await findUserById(request.auth.userId)
  if (!user) {
    response.status(401).json({ error: "Session is no longer valid." })
    return
  }

  try {
    response.json(await playerStateStore.getPlayerState({ user }))
  } catch (error) {
    handleRouteError(error, response)
  }
})

app.get("/api/leaderboard", requireAuth, async (request, response) => {
  const user = await findUserById(request.auth.userId)
  if (!user) {
    response.status(401).json({ error: "Session is no longer valid." })
    return
  }

  try {
    const board = String(request.query?.board || LEADERBOARD_BOARDS.MMR)
    const page = Number(request.query?.page) || 1
    const limit = Number(request.query?.limit) || undefined
    const search = String(request.query?.search || "")
    const view = String(request.query?.view || "top")

    const [leaderboard, season] = await Promise.all([
      findLeaderboardPage({
        board,
        page,
        limit,
        search,
        userId: user.id,
        view,
      }),
      findCurrentSeason(),
    ])

    response.json({
      ...leaderboard,
      season,
    })
  } catch (error) {
    handleRouteError(error, response)
  }
})

app.get("/api/seasons/current", requireAuth, async (request, response) => {
  const user = await findUserById(request.auth.userId)
  if (!user) {
    response.status(401).json({ error: "Session is no longer valid." })
    return
  }

  try {
    response.json({
      season: await findCurrentSeason(),
    })
  } catch (error) {
    handleRouteError(error, response)
  }
})

app.get("/api/replays/:replayId", requireAuth, async (request, response) => {
  const user = await findUserById(request.auth.userId)
  if (!user) {
    response.status(401).json({ error: "Session is no longer valid." })
    return
  }

  try {
    const replay = await findReplayById(Number(request.params.replayId))
    if (!replay) {
      response.status(404).json({ error: "Replay not found." })
      return
    }

    if (replay.visibility === "private" && replay.userId !== user.id) {
      response.status(403).json({ error: "Replay is private." })
      return
    }

    response.json({ replay })
  } catch (error) {
    handleRouteError(error, response)
  }
})

app.get("/api/replays", requireAuth, async (request, response) => {
  const user = await findUserById(request.auth.userId)
  if (!user) {
    response.status(401).json({ error: "Session is no longer valid." })
    return
  }

  try {
    const limit = Number(request.query?.limit) || 10
    response.json({
      replays: await findUserReplays(user.id, { limit }),
    })
  } catch (error) {
    handleRouteError(error, response)
  }
})

app.get("/api/challenges", requireAuth, async (request, response) => {
  const user = await findUserById(request.auth.userId)
  if (!user) {
    response.status(401).json({ error: "Session is no longer valid." })
    return
  }

  try {
    const role = String(request.query?.role || "all")
    response.json({
      challenges: await findChallengesForUser(user.id, { role }),
    })
  } catch (error) {
    handleRouteError(error, response)
  }
})

app.post("/api/challenges", requireAuth, async (request, response) => {
  const user = await findUserById(request.auth.userId)
  if (!user) {
    response.status(401).json({ error: "Session is no longer valid." })
    return
  }

  try {
    const opponentUsername = String(request.body?.opponentUsername || "").trim()
    const replayId = Number(request.body?.replayId)
    const message = String(request.body?.message || "").trim()

    if (!opponentUsername || !replayId) {
      response.status(400).json({ error: "opponentUsername and replayId are required." })
      return
    }

    const opponent = await findUserByUsernameForChallenge(opponentUsername)
    if (!opponent) {
      response.status(404).json({ error: "Opponent not found." })
      return
    }
    if (opponent.id === user.id) {
      response.status(400).json({ error: "You cannot challenge yourself." })
      return
    }

    const replay = await findReplayById(replayId)
    if (!replay || replay.userId !== user.id) {
      response.status(400).json({ error: "Replay not found or does not belong to you." })
      return
    }

    const challenge = await createChallenge({
      challengerUserId: user.id,
      challengerUsername: user.username,
      opponentUserId: opponent.id,
      opponentUsername: opponent.username,
      replayId: replay.id,
      modeId: replay.modeId,
      message,
    })

    response.json({ challenge })
  } catch (error) {
    handleRouteError(error, response)
  }
})

app.post("/api/challenges/:challengeId/respond", requireAuth, async (request, response) => {
  const user = await findUserById(request.auth.userId)
  if (!user) {
    response.status(401).json({ error: "Session is no longer valid." })
    return
  }

  try {
    const action = String(request.body?.action || "")
    if (action !== "accept" && action !== "decline") {
      response.status(400).json({ error: "action must be accept or decline." })
      return
    }

    const result = await respondToChallenge({
      challengeId: Number(request.params.challengeId),
      userId: user.id,
      action,
    })

    if (!result.ok) {
      response.status(400).json({ error: result.reason })
      return
    }

    response.json({ challenge: result.challenge })
  } catch (error) {
    handleRouteError(error, response)
  }
})

app.post("/api/challenges/:challengeId/complete", requireAuth, async (request, response) => {
  const user = await findUserById(request.auth.userId)
  if (!user) {
    response.status(401).json({ error: "Session is no longer valid." })
    return
  }

  try {
    const opponentReplayId = Number(request.body?.opponentReplayId)
    const opponentScore = Number(request.body?.opponentScore) || 0

    if (!opponentReplayId) {
      response.status(400).json({ error: "opponentReplayId is required." })
      return
    }

    const result = await completeChallenge({
      challengeId: Number(request.params.challengeId),
      userId: user.id,
      opponentReplayId,
      opponentScore,
    })

    if (!result.ok) {
      response.status(400).json({ error: result.reason })
      return
    }

    response.json({
      challenge: result.challenge,
      challengerWon: result.challengerWon,
    })
  } catch (error) {
    handleRouteError(error, response)
  }
})

app.get("/api/history", requireAuth, async (request, response) => {
  const user = await findUserById(request.auth.userId)
  if (!user) {
    response.status(401).json({ error: "Session is no longer valid." })
    return
  }

  try {
    const page = Number(request.query?.page) || 1
    const limit = Number(request.query?.limit) || undefined
    const historyPage = await findRoundHistoryPage(user.id, { page, limit })
    response.json(historyPage)
  } catch (error) {
    handleRouteError(error, response)
  }
})

app.post("/api/shop/purchase", requireAuth, async (request, response) => {
  const user = await findUserById(request.auth.userId)
  if (!user) {
    response.status(401).json({ error: "Session is no longer valid." })
    return
  }

  try {
    response.json(await playerStateStore.purchaseItem({
      user,
      itemId: request.body?.itemId,
    }))
  } catch (error) {
    handleRouteError(error, response)
  }
})

app.post("/api/shop/equip", requireAuth, async (request, response) => {
  const user = await findUserById(request.auth.userId)
  if (!user) {
    response.status(401).json({ error: "Session is no longer valid." })
    return
  }

  try {
    response.json(await playerStateStore.equipItem({
      user,
      itemId: request.body?.itemId,
    }))
  } catch (error) {
    handleRouteError(error, response)
  }
})

// Reaction metrics are client-measured (they depend on button spawn times the
// server cannot reconstruct yet), so they are display-only stats: sanitized to
// plausible bounds and never fed into rewards or rank.
const MAX_REACTION_MS = 60_000

function sanitizeReactionMs(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.min(MAX_REACTION_MS, Math.round(n))
}

app.post("/api/round/start", requireAuth, roundRateLimiter, (request, response) => {
  const modeId = String(request.body?.modeId || "")
  const mode = getDifficultyById(modeId)
  if (!mode || mode.id !== modeId) {
    response.status(400).json({ error: "Invalid modeId." })
    return
  }

  const seed = createRoundSeed()
  const roundToken = signRoundToken(
    { userId: request.auth.userId, modeId, seed },
    JWT_SECRET
  )

  response.json({ roundToken, seed })
})

app.post("/api/round/complete", requireAuth, roundRateLimiter, async (request, response) => {
  const user = await findUserById(request.auth.userId)
  if (!user) {
    response.status(401).json({ error: "Session is no longer valid." })
    return
  }

  const { modeId, events, loadoutSnapshot, roundToken, arenaWidth, arenaHeight, drillId } = request.body ?? {}
  const mode = getDifficultyById(String(modeId || ""))

  if (!mode || mode.id !== String(modeId || "")) {
    response.status(400).json({ error: "Invalid modeId." })
    return
  }

  if (mode.allowsRankProgression && !roundToken) {
    response.status(400).json({ error: "Ranked rounds require a round token." })
    return
  }

  // Round tokens are optional for non-ranked modes during rollout, but when
  // present they must verify — a forged/expired token means a tampering client.
  let roundSeed = null
  if (roundToken) {
    const tokenCheck = verifyRoundToken(String(roundToken), {
      userId: request.auth.userId,
      modeId: String(modeId || ""),
    }, JWT_SECRET)

    if (!tokenCheck.valid) {
      response.status(400).json({ error: tokenCheck.reason })
      return
    }

    roundSeed = tokenCheck.seed
  }

  try {
    const currentProgress = await findUserProgressByUserId(user.id)
    const hasRankedHistory = (currentProgress.lifetimeStats?.rankedRounds ?? 0) > 0
      || currentProgress.roundHistory.some(isRankedModeEntry)
    const playerLevel = getLevelProgress(currentProgress.levelXp).level

    const simulation = simulateRound(events, modeId, {
      loadoutSnapshot: loadoutSnapshot ?? null,
      playerLevel,
      roundSeed,
      arenaWidth,
      arenaHeight,
    })
    if (!simulation.valid) {
      response.status(400).json({ error: simulation.reason })
      return
    }

    const { hits, misses, score, bestStreak } = simulation
    const avgReactionMs = hits > 0 ? sanitizeReactionMs(request.body?.avgReactionMs) : null
    const bestReactionMs = hits > 0 ? sanitizeReactionMs(request.body?.bestReactionMs) : null

    const { earnedCoins, earnedXp, progressionMode, baseRankDelta, placementMatchScore, allowsRankProgression } =
      calculateRoundRewards({
        modeId,
        hits,
        misses,
        score,
        bestStreak,
      })

    const rankOutcome = applyRankedMatchResult({
      currentMmr: currentProgress.rankMmr,
      currentRankedState: currentProgress.rankedState,
      hasRankedHistory,
      baseRankDelta,
      placementMatchScore,
      allowsRankProgression,
    })

    const nextCoins = clampCoins(currentProgress.coins + earnedCoins)
    const nextLevelXp = clampXp(currentProgress.levelXp + earnedXp)
    const nextRankMmr = clampMmr(rankOutcome.nextMmr)
    const rankDelta = rankOutcome.appliedRankDelta

    const historyEntry = {
      score,
      hits,
      misses,
      bestStreak,
      avgReactionMs,
      bestReactionMs,
      coinsEarned: earnedCoins,
      xpEarned: earnedXp,
      rankDelta,
      modeId,
      progressionMode,
      drillId: typeof drillId === "string" ? drillId : null,
      loadoutSnapshot: simulation.loadoutSnapshot,
      playedAtIso: new Date().toISOString(),
    }
    const nextLifetimeStats = applyRoundToLifetimeStats(
      currentProgress.lifetimeStats,
      historyEntry
    )

    const { progress } = await completeUserRound({
      userId: user.id,
      coins: nextCoins,
      levelXp: nextLevelXp,
      rankMmr: nextRankMmr,
      rankedState: rankOutcome.nextRankedState,
      ownedItemIds: currentProgress.ownedItemIds,
      equippedButtonSkinId: currentProgress.equippedButtonSkinId,
      equippedArenaThemeId: currentProgress.equippedArenaThemeId,
      equippedProfileImageId: currentProgress.equippedProfileImageId,
      activeLoadoutId: currentProgress.activeLoadoutId,
      savedLoadouts: currentProgress.savedLoadouts,
      selectedModeId: modeId,
      unlockedAchievementIds: resolveUnlockedAchievementIds({
        ...currentProgress,
        coins: nextCoins,
        levelXp: nextLevelXp,
        lifetimeStats: nextLifetimeStats,
      }),
      buildWalkthrough: currentProgress.buildWalkthrough,
      seenUnlockPartIds: currentProgress.seenUnlockPartIds,
      historyEntry,
    })

    let replay = null
    const submittedEvents = Array.isArray(events) ? events : []
    if (roundSeed !== null && submittedEvents.length > 0) {
      replay = await insertRoundReplay({
        userId: user.id,
        username: user.username,
        modeId,
        seed: roundSeed,
        events: submittedEvents,
        loadoutSnapshot: simulation.loadoutSnapshot,
        score,
        hits,
        misses,
        bestStreak,
      })
    }

    const seasonProgress = await applyUserSeasonProgress(user.id, {
      rankMmr: nextRankMmr,
      isRankedRound: progressionMode === "ranked",
    })

    const challengeId = Number(request.body?.challengeId) || null
    let completedChallenge = null
    if (challengeId && replay?.id) {
      const completion = await completeChallenge({
        challengeId,
        userId: user.id,
        opponentReplayId: replay.id,
        opponentScore: score,
      })
      if (completion.ok) {
        completedChallenge = completion.challenge
      }
    }

    response.json({
      progress,
      earnedCoins,
      earnedXp,
      rankDelta,
      replay,
      seasonProgress,
      completedChallenge,
    })
  } catch (error) {
    handleRouteError(error, response)
  }
})

app.put("/api/progress", requireAuth, async (request, response) => {
  const user = await findUserById(request.auth.userId)
  if (!user) {
    response.status(401).json({ error: "Session is no longer valid." })
    return
  }

  try {
    const currentProgress = await findUserProgressByUserId(user.id)
    const incoming = normalizeProgressPayload(request.body)

    const nextProgress = clampProgressBounds(
      mergeProgressPayload(currentProgress, incoming)
    )
    nextProgress.unlockedAchievementIds = resolveUnlockedAchievementIds(currentProgress)

    const progress = await saveUserProgress({
      userId: user.id,
      ...nextProgress,
    })

    response.json({ progress })
  } catch (error) {
    handleRouteError(error, response)
  }
})

const distPath = join(__dirname, "../dist")

if (existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get("/{*splat}", (_request, response) => {
    response.sendFile(join(distPath, "index.html"))
  })
}

async function startServer() {
  await initializeSchema()
  await seedAdminAccount()
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Auth server listening on http://0.0.0.0:${PORT}`)
  })
}

startServer().catch((error) => {
  console.error("Server failed to start:", error)
  process.exit(1)
})
