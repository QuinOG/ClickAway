import assert from "node:assert/strict"
import { once } from "node:events"
import test, { after, before } from "node:test"

import { AUTH_COOKIE_MAX_AGE_MS, AUTH_COOKIE_NAME, signAuthToken } from "../../server/auth.js"
import { startTestDatabase } from "./testDatabase.js"

const jwtSecret = "integration-session-secret"
const password = "integration-password"
let database
let pool
let server

before(async () => {
  database = await startTestDatabase()
  process.env.JWT_SECRET = jwtSecret
  process.env.CLIENT_ORIGIN = "http://localhost:5173"
  process.env.TRUST_PROXY = "false"

  pool = (await import("../../server/db/pgPool.js")).default
  const { initializeSchema } = await import("../../server/playerMysqlDatabase.js")
  const { createApp } = await import("../../server/app.js")
  await initializeSchema()
  server = createApp().listen(0, "127.0.0.1")
  await once(server, "listening")
})

after(async () => {
  try {
    if (server) await new Promise((resolve) => server.close(resolve))
    await pool?.end()
  } finally {
    await database?.stop()
  }
})

function request(path, { method = "GET", cookie, body } = {}) {
  const headers = new Headers()
  if (cookie) headers.set("Cookie", cookie)
  if (body) headers.set("Content-Type", "application/json")
  return fetch(`http://127.0.0.1:${server.address().port}/api/auth/${path}`, {
    method,
    headers,
    body: JSON.stringify(body),
  })
}

async function authenticate(path, username, expectedStatus) {
  const response = await request(path, { method: "POST", body: { username, password } })
  const data = await response.json()
  assert.equal(response.status, expectedStatus, JSON.stringify(data))
  const cookie = response.headers.get("Set-Cookie")?.split(";")[0]
  assert.ok(cookie)
  return { ...data, cookie }
}

function assertClearedCookie(response) {
  assert.equal(response.headers.get("Set-Cookie")?.split(";")[0], `${AUTH_COOKIE_NAME}=`)
}

async function assertRevoked(cookie) {
  const response = await request("me", { cookie })
  assert.equal(response.status, 401)
  assert.deepEqual(await response.json(), { error: "Session has ended. Please log in again." })
  assertClearedCookie(response)
}

test("logout revokes the login cookie on the server", async () => {
  const { cookie: signupCookie } = await authenticate("signup", "LogoutPlayer", 201)
  const { cookie } = await authenticate("login", "LogoutPlayer", 200)
  assert.equal((await request("me", { cookie })).status, 200)

  const logout = await request("logout", { method: "POST", cookie })
  assert.equal(logout.status, 204)
  assertClearedCookie(logout)
  await assertRevoked(cookie)
  assert.equal((await request("me", { cookie: signupCookie })).status, 200)
})

test("logout-all revokes both login cookies and the original signup cookie", async () => {
  const { cookie: signupCookie } = await authenticate("signup", "LogoutAllPlayer", 201)
  const { cookie: first } = await authenticate("login", "LogoutAllPlayer", 200)
  const { cookie: second } = await authenticate("login", "LogoutAllPlayer", 200)
  assert.notEqual(first, second)
  assert.equal((await request("me", { cookie: first })).status, 200)
  assert.equal((await request("me", { cookie: second })).status, 200)

  const logout = await request("logout-all", { method: "POST", cookie: first })
  assert.equal(logout.status, 204)
  assertClearedCookie(logout)
  await assertRevoked(first)
  await assertRevoked(second)
  await assertRevoked(signupCookie)
})

test("a legacy token without a session ID works until expiry", async (t) => {
  const { user } = await authenticate("signup", "LegacyPlayer", 201)
  t.mock.timers.enable({ apis: ["Date"] })
  const cookie = `${AUTH_COOKIE_NAME}=${signAuthToken(user, jwtSecret)}`
  const me = await request("me", { cookie })
  assert.equal(me.status, 200)
  assert.deepEqual((await me.json()).user, user)

  t.mock.timers.tick(AUTH_COOKIE_MAX_AGE_MS)
  const expired = await request("me", { cookie })
  assert.equal(expired.status, 401)
  assert.deepEqual(await expired.json(), { error: "Invalid or expired authentication token." })
})
