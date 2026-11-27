import assert from "node:assert/strict"
import { once } from "node:events"
import { existsSync, readdirSync } from "node:fs"
import test, { after, before } from "node:test"

import { AUTH_COOKIE_NAME } from "../../server/auth.js"
import { getDifficultyById } from "../../src/constants/gameModesConfig.js"
import { startTestDatabase } from "./testDatabase.js"

let database
let pool
let initializeSchema
let createApp

before(async () => {
  database = await startTestDatabase()
  process.env.JWT_SECRET = "integration-test-secret"
  process.env.CLIENT_ORIGIN = "http://localhost:5173"
  process.env.TRUST_PROXY = "false"

  pool = (await import("../../server/db/pgPool.js")).default
  initializeSchema = (await import("../../server/playerMysqlDatabase.js")).initializeSchema
  createApp = (await import("../../server/app.js")).createApp
  await initializeSchema()
})

after(async () => {
  try {
    await pool?.end()
  } finally {
    await database?.stop()
  }
})

async function startTestApp(t) {
  const server = createApp().listen(0, "127.0.0.1")
  await once(server, "listening")
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve())
  }))
  const baseUrl = `http://127.0.0.1:${server.address().port}`

  return async (path, { method = "GET", body, cookie } = {}) => {
    const headers = new Headers()
    if (cookie) headers.set("Cookie", cookie)
    if (body !== undefined) headers.set("Content-Type", "application/json")
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: JSON.stringify(body),
    })
    const contentType = response.headers.get("Content-Type")
    const data = contentType?.includes("application/json") ? await response.json() : await response.text()
    return { status: response.status, data, headers: response.headers, setCookie: response.headers.get("Set-Cookie") }
  }
}

async function signup(request, username) {
  const { status, data, setCookie } = await request("/api/auth/signup", {
    method: "POST",
    body: { username, password: "integration-password" },
  })
  assert.equal(status, 201, JSON.stringify(data))
  assert.ok(setCookie, "signup should set a session cookie")
  return { ...data, setCookie, cookie: setCookie.split(";")[0] }
}

test("the server's pool can query the test database", async () => {
  const [rows] = await pool.query("SELECT 1 AS value")
  assert.deepEqual(rows, [{ value: 1 }])
})

test("initializeSchema can run a second time", async () => {
  await assert.doesNotReject(initializeSchema)
})

test("unknown API routes return a JSON 404 for GET and POST", async (t) => {
  const request = await startTestApp(t)
  for (const method of ["GET", "POST"]) {
    const { status, data } = await request("/api/nope", { method })
    assert.equal(status, 404)
    assert.deepEqual(data, { error: "Not found." })
  }
})

test("the app sends security headers and omits X-Powered-By", async (t) => {
  const request = await startTestApp(t)
  const { headers } = await request("/api/health")
  assert.match(headers.get("Content-Security-Policy"), /frame-ancestors 'none'/)
  assert.equal(headers.get("X-Powered-By"), null)
})

test("built assets are immutable and SPA HTML requires revalidation", async (t) => {
  const assetsPath = new URL("../../dist/assets/", import.meta.url)
  if (!existsSync(assetsPath)) {
    t.skip("Run npm run build to verify production cache headers.")
    return
  }
  const asset = readdirSync(assetsPath).find((name) => name.endsWith(".js"))
  assert.ok(asset, "the build should contain a JavaScript asset")

  const request = await startTestApp(t)
  const script = await request(`/assets/${asset}`)
  assert.equal(script.status, 200)
  assert.match(script.headers.get("Cache-Control"), /max-age=31536000/)
  assert.match(script.headers.get("Cache-Control"), /immutable/)

  for (const path of ["/", "/index.html", "/some-client-route"]) {
    const html = await request(path)
    assert.equal(html.status, 200)
    assert.equal(html.headers.get("Cache-Control"), "no-cache")
  }
})

test("signup sets an httpOnly cookie that authenticates /api/auth/me", async (t) => {
  const request = await startTestApp(t)
  const { user, setCookie, cookie } = await signup(request, "CookiePlayer")
  assert.ok(cookie.startsWith(`${AUTH_COOKIE_NAME}=`))
  assert.match(setCookie, /; HttpOnly(?:;|$)/i)

  const me = await request("/api/auth/me", { cookie })
  assert.equal(me.status, 200)
  assert.deepEqual(me.data.user, user)
})

test("logout clears the session cookie", async (t) => {
  const request = await startTestApp(t)
  const { cookie } = await signup(request, "LogoutPlayer")

  const logout = await request("/api/auth/logout", { method: "POST", cookie })
  assert.equal(logout.status, 204)
  assert.equal(logout.setCookie?.split(";")[0], `${AUTH_COOKIE_NAME}=`)
  assert.match(logout.setCookie, /; Expires=Thu, 01 Jan 1970 00:00:00 GMT(?:;|$)/i)
})

test("PUT /api/progress ignores client-supplied coins", async (t) => {
  const request = await startTestApp(t)
  const { cookie, progress } = await signup(request, "ProgressPlayer")
  const forgedCoins = progress.coins + 1_000_000

  const save = await request("/api/progress", {
    method: "PUT",
    cookie,
    body: { coins: forgedCoins },
  })
  assert.equal(save.status, 200, JSON.stringify(save.data))
  assert.equal(save.data.progress.coins, progress.coins)

  const me = await request("/api/auth/me", { cookie })
  assert.equal(me.status, 200)
  assert.equal(me.data.progress.coins, progress.coins)
})

test("a ranked token saves one history entry and rejects reuse", async (t) => {
  const request = await startTestApp(t)
  const { cookie } = await signup(request, "RankedPlayer")
  const modeId = "hard"
  t.mock.timers.enable({ apis: ["Date"] })

  const start = await request("/api/round/start", {
    method: "POST",
    cookie,
    body: { modeId },
  })
  assert.equal(start.status, 200, JSON.stringify(start.data))
  const { roundToken } = start.data
  assert.equal(typeof roundToken, "string")
  assert.ok(roundToken.length > 0)

  // Advance the clock past the ranked timer while leaving HTTP and SQL real.
  t.mock.timers.tick(getDifficultyById(modeId).durationSeconds * 1000)
  const submission = {
    method: "POST",
    cookie,
    body: {
      modeId,
      roundToken,
      arenaWidth: 640,
      arenaHeight: 400,
      events: [{ type: "miss", t: 120, x: 20, y: 20 }],
    },
  }
  const complete = await request("/api/round/complete", submission)
  assert.equal(complete.status, 200, JSON.stringify(complete.data))

  const duplicate = await request("/api/round/complete", submission)
  assert.equal(duplicate.status, 409, JSON.stringify(duplicate.data))

  const history = await request("/api/history", { cookie })
  assert.equal(history.status, 200, JSON.stringify(history.data))
  assert.equal(history.data.totalCount, 1)
  assert.equal(history.data.entries.length, 1)
  assert.equal(history.data.entries[0].modeId, modeId)
  assert.equal(history.data.entries[0].misses, 1)
})

test("the auth rate limiter returns 429 on the 21st login attempt", async (t) => {
  const request = await startTestApp(t)
  const attempt = { method: "POST", body: { username: "UnknownPlayer", password: "wrong-password" } }
  for (let i = 1; i <= 20; i += 1) {
    const login = await request("/api/auth/login", attempt)
    assert.equal(login.status, 401, `attempt ${i}`)
  }
  const limited = await request("/api/auth/login", attempt)
  assert.equal(limited.status, 429)
})
