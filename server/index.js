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

import { extractBearerToken, signAuthToken, verifyAuthToken } from "./auth.js"
import {
  createUser,
  findLeaderboardRows,
  findUserProgressByUserId,
  findUserById,
  findUserByUsername,
  saveUserProgress,
  updateUserPassword,
  initializeSchema,
  default as pool,
} from "./playerMysqlDatabase.js"
import { calculateRewards, simulateRound } from "./roundRewards.js"
import { createPlayerStateStore, PlayerStateError } from "./playerStateStore.js"

const app = express()
app.set("trust proxy", 1)
const playerStateStore = createPlayerStateStore()

const PORT = Number(process.env.PORT || 4000)
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173"
const JWT_SECRET = process.env.JWT_SECRET || ""
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ""

if (!JWT_SECRET) {
  throw new Error("Missing JWT_SECRET. Set it in your environment before starting the server.")
}

app.use(cors({
  origin: CLIENT_ORIGIN,
  credentials: false,
}))
app.use(express.json({ limit: "64kb" }))

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
})

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: "Too many requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
})

app.use("/api/auth", authLimiter)
app.use("/api", apiLimiter)

function sanitizeUsername(username = "") {
  return String(username).trim()
}

function validateUsername(username) {
  if (!username) return "Username is required."
  if (username.length < 3) return "Username must be at least 3 characters."
  if (username.length > 32) return "Username must be 32 characters or less."
  return ""
}

function validatePassword(password = "") {
  if (!password) return "Password is required."
  if (password.length < 8) return "Password must be at least 8 characters."
  return ""
}

const MAX_COINS = 100_000_000
const MAX_XP = 100_000_000
const MAX_MMR = 100_000

function clampProgressBounds(progress = {}) {
  return {
    ...progress,
    ...(progress.coins !== undefined && { coins: Math.min(progress.coins, MAX_COINS) }),
    ...(progress.levelXp !== undefined && { levelXp: Math.min(progress.levelXp, MAX_XP) }),
    ...(progress.rankMmr !== undefined && { rankMmr: Math.min(progress.rankMmr, MAX_MMR) }),
  }
}

function buildAuthPayload(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
  }
}

async function createAuthResponse(user) {
  return {
    token: signAuthToken(buildAuthPayload(user), JWT_SECRET),
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
  // coins, levelXp, rankMmr, and roundHistory are server-owned and never accepted from client.
  return {
    equippedButtonSkinId: body.equippedButtonSkinId,
    equippedArenaThemeId: body.equippedArenaThemeId,
    equippedProfileImageId: body.equippedProfileImageId,
    activeLoadoutId: body.activeLoadoutId,
    savedLoadouts: body.savedLoadouts,
    selectedModeId: body.selectedModeId,
    unlockedAchievementIds: body.unlockedAchievementIds,
    buildWalkthrough: body.buildWalkthrough,
  }
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

function handleRouteError(error, response) {
  if (error instanceof PlayerStateError) {
    response.status(error.status).json({ error: error.message })
    return
  }

  console.error(error)
  response.status(500).json({ error: "Unexpected server error." })
}

function requireAuth(request, response, next) {
  const token = extractBearerToken(request.headers.authorization || "")
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
  console.log(`Admin password refreshed for username "${existingAdmin.username}".`)
}

app.get("/api/health", (_request, response) => {
  response.json({ ok: true })
})

app.post("/api/auth/signup", async (request, response) => {
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
    response.status(201).json(await createAuthResponse(createdUser))
  } catch (error) {
    handleRouteError(error, response)
  }
})

app.post("/api/auth/login", async (request, response) => {
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
    response.json(await createAuthResponse(user))
  } catch (error) {
    handleRouteError(error, response)
  }
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
    response.json({
      rows: await findLeaderboardRows({ limit: 25 }),
    })
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

app.post("/api/round/complete", requireAuth, async (request, response) => {
  const user = await findUserById(request.auth.userId)
  if (!user) {
    response.status(401).json({ error: "Session is no longer valid." })
    return
  }

  const { modeId, events } = request.body ?? {}

  const simulation = simulateRound(events, modeId)
  if (!simulation.valid) {
    response.status(400).json({ error: simulation.reason })
    return
  }

  const { hits, misses, score, bestStreak } = simulation

  try {
    const { earnedCoins, earnedXp, rankDelta, progressionMode } = calculateRewards({
      modeId,
      hits,
      misses,
      score,
      bestStreak,
    })

    const currentProgress = await findUserProgressByUserId(user.id)

    const nextCoins = Math.min(MAX_COINS, Math.max(0, currentProgress.coins + earnedCoins))
    const nextLevelXp = Math.min(MAX_XP, Math.max(0, currentProgress.levelXp + earnedXp))
    const nextRankMmr = Math.min(MAX_MMR, Math.max(0, currentProgress.rankMmr + rankDelta))

    const historyEntry = {
      score,
      hits,
      misses,
      bestStreak,
      coinsEarned: earnedCoins,
      xpEarned: earnedXp,
      rankDelta,
      modeId,
      progressionMode,
      playedAtIso: new Date().toISOString(),
    }

    const nextRoundHistory = [historyEntry, ...currentProgress.roundHistory].slice(0, 100)

    const progress = await saveUserProgress({
      userId: user.id,
      coins: nextCoins,
      levelXp: nextLevelXp,
      rankMmr: nextRankMmr,
      ownedItemIds: currentProgress.ownedItemIds,
      equippedButtonSkinId: currentProgress.equippedButtonSkinId,
      equippedArenaThemeId: currentProgress.equippedArenaThemeId,
      equippedProfileImageId: currentProgress.equippedProfileImageId,
      selectedModeId: modeId,
      roundHistory: nextRoundHistory,
      unlockedAchievementIds: currentProgress.unlockedAchievementIds,
    })

    response.json({ progress, earnedCoins, earnedXp, rankDelta })
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

    // Whitelist achievement IDs against the catalog
    if (Array.isArray(incoming.unlockedAchievementIds)) {
      const [catalogRows] = await pool.query("SELECT id FROM achievements_catalog")
      const validIds = new Set(catalogRows.map((r) => r.id))
      incoming.unlockedAchievementIds = incoming.unlockedAchievementIds.filter(
        (id) => validIds.has(id)
      )
    }

    const nextProgress = clampProgressBounds(
      mergeProgressPayload(currentProgress, incoming)
    )

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
