import "dotenv/config"

import bcrypt from "bcryptjs"
import cors from "cors"
import express from "express"

import { extractBearerToken, signAuthToken, verifyAuthToken } from "./auth.js"
import {
  createUser,
  findUserById,
  findUserByUsername,
  updateUserPassword,
} from "./db.js"

const app = express()

const PORT = Number(process.env.PORT || 4000)
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173"
const JWT_SECRET = process.env.JWT_SECRET || ""
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ""
const BREACHED_PASSWORDS = new Set([
  "123456", "12345678", "123456789", "12345", "1234", "123", 
  "1234567", "111111", "000000", "123123", "1234567890",
  "654321", "112233", "12345678910", "987654321",

  "admin", "password", "Password", "admin123", "user", 
  "guest", "root", "toor", "secret", "welcome", "Welcome1",

  "qwerty", "qwerty123", "qwerasdf", "zxcvbnm", "1q2w3e4r",

  "iloveyou", "minecraft", "dragon", "monkey", "sunshine", 
  "princess", "football", "starwars", "batman", "superman",

  "P@ssw0rd", "Pass@123", "Aa123456", "Admin@123", "Password1!",
  "Abcd@1234", "Aa@123456", "password123", "Password123"
]);


if (!JWT_SECRET) {
  throw new Error("Missing JWT_SECRET. Set it in your environment before starting the server.")
}

app.use(cors({
  origin: CLIENT_ORIGIN,
  credentials: false,
}))
app.use(express.json())

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
  if (!password) return "Password is required.";

  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  if (BREACHED_PASSWORDS.has(password)) {
    return "Password is too simple."
  }

  return ""
}

function buildAuthPayload(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role || "player",
  }
}

function createAuthResponse(user) {
  return {
    token: signAuthToken(buildAuthPayload(user), JWT_SECRET),
    user: {
      username: user.username,
      role: user.role || "player",
    },
  }
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
  })

  response.status(201).json(createAuthResponse(createdUser))
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

  response.json(createAuthResponse(user))
})

app.get("/api/auth/me", requireAuth, async (request, response) => {
  const user = await findUserById(request.auth.userId)
  if (!user) {
    response.status(401).json({ error: "Session is no longer valid." })
    return
  }

  response.json({
    user: {
      username: user.username,
      role: user.role,
    },
  })
})

async function startServer() {
  await seedAdminAccount()
  app.listen(PORT, () => {
    console.log(`Auth server listening on http://localhost:${PORT}`)
  })
}

startServer().catch((error) => {
  console.error("Server failed to start:", error)
  process.exit(1)
})
