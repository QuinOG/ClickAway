import assert from "node:assert/strict"
import { once } from "node:events"
import { existsSync, readdirSync } from "node:fs"
import test, { after, before } from "node:test"

import { AUTH_COOKIE_NAME } from "../../server/auth.js"
import { getDifficultyById } from "../../src/constants/gameModesConfig.js"
import { PLACEMENT_MATCH_COUNT, RANK_SYSTEM_VERSION } from "../../src/utils/rankUtils.js"
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
  const { user, cookie, progress } = await signup(request, "RankedPlayer")
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
  assert.equal(complete.data.progress.rankedState.placementMatchesPlayed, progress.rankedState.placementMatchesPlayed + 1)
  const [pending] = await pool.query("SELECT 1 FROM pending_ranked_rounds WHERE user_id = ?", [user.id])
  assert.deepEqual(pending, [])

  const duplicate = await request("/api/round/complete", submission)
  assert.equal(duplicate.status, 409, JSON.stringify(duplicate.data))
  const state = await request("/api/player/state", { cookie })
  assert.equal(state.status, 200, JSON.stringify(state.data))
  assert.equal(state.data.progress.rankMmr, complete.data.progress.rankMmr)
  assert.deepEqual(state.data.progress.rankedState, complete.data.progress.rankedState)

  const history = await request("/api/history", { cookie })
  assert.equal(history.status, 200, JSON.stringify(history.data))
  assert.equal(history.data.totalCount, 1)
  assert.equal(history.data.entries.length, 1)
  assert.equal(history.data.entries[0].modeId, modeId)
  assert.equal(history.data.entries[0].misses, 1)
  assert.equal(history.data.entries[0].outcome, "completed")
})

test("starting another ranked round forfeits the first and leaves one pending round", async (t) => {
  const request = await startTestApp(t)
  const { user, cookie, progress } = await signup(request, "ForfeitPlayer")
  await pool.execute(
    "UPDATE users SET mmr = ?, rank_system_version = ?, placement_matches_played = ? WHERE id = ?",
    [400, RANK_SYSTEM_VERSION, PLACEMENT_MATCH_COUNT, user.id]
  )
  t.mock.timers.enable({ apis: ["Date"] })
  const rankedStart = { method: "POST", cookie, body: { modeId: "hard" } }
  const first = await request("/api/round/start", rankedStart)
  assert.equal(first.status, 200, JSON.stringify(first.data))
  const [firstPending] = await pool.query("SELECT round_id FROM pending_ranked_rounds WHERE user_id = ?", [user.id])
  assert.equal(firstPending.length, 1)

  const second = await request("/api/round/start", rankedStart)
  assert.equal(second.status, 200, JSON.stringify(second.data))
  const [pending] = await pool.query("SELECT round_id FROM pending_ranked_rounds WHERE user_id = ?", [user.id])
  assert.equal(pending.length, 1)
  assert.notEqual(pending[0].round_id, firstPending[0].round_id)
  const [consumed] = await pool.query("SELECT token_id FROM consumed_round_tokens WHERE user_id = ?", [user.id])
  assert.deepEqual(consumed, [{ token_id: firstPending[0].round_id }])

  const [history] = await pool.query(
    "SELECT outcome, progression_mode, score, rank_delta, coins_earned, xp_earned FROM round_history WHERE user_id = ?",
    [user.id]
  )
  assert.deepEqual(history, [{
    outcome: "forfeit", progression_mode: "ranked", score: 0, rank_delta: -22, coins_earned: 0, xp_earned: 0,
  }])
  const state = await request("/api/player/state", { cookie })
  assert.equal(state.status, 200, JSON.stringify(state.data))
  assert.equal(state.data.progress.rankMmr, 378)
  assert.equal(state.data.progress.coins, progress.coins)
  assert.equal(state.data.progress.levelXp, progress.levelXp)
  assert.equal(state.data.progress.lifetimeStats.totalRounds, progress.lifetimeStats.totalRounds)
  assert.equal(state.data.progress.roundHistory[0].outcome, "forfeit")
  const historyPage = await request("/api/history", { cookie })
  assert.equal(historyPage.status, 200, JSON.stringify(historyPage.data))
  assert.equal(historyPage.data.entries[0].outcome, "forfeit")

  t.mock.timers.tick(getDifficultyById("hard").durationSeconds * 1000)
  const submitForfeit = await request("/api/round/complete", {
    method: "POST",
    cookie,
    body: { modeId: "hard", roundToken: first.data.roundToken, events: [], arenaWidth: 640, arenaHeight: 400 },
  })
  assert.equal(submitForfeit.status, 409, JSON.stringify(submitForfeit.data))
  assert.equal(submitForfeit.data.error, "This ranked round was already counted as a loss because a new one was started.")
  const afterSubmit = await request("/api/player/state", { cookie })
  assert.equal(afterSubmit.status, 200, JSON.stringify(afterSubmit.data))
  for (const key of ["rankMmr", "rankedState", "coins", "levelXp", "roundHistory", "lifetimeStats"]) {
    assert.deepEqual(afterSubmit.data.progress[key], state.data.progress[key])
  }
  const [pendingAfterSubmit] = await pool.query("SELECT round_id FROM pending_ranked_rounds WHERE user_id = ?", [user.id])
  assert.deepEqual(pendingAfterSubmit, pending)
})

for (const [endpoint, username] of [["/api/player/state", "ExpiredState"], ["/api/auth/me", "ExpiredSession"]]) {
  test(`${endpoint} settles expired ranked rounds and keeps fresh rounds pending`, async (t) => {
    const request = await startTestApp(t)
    const { user, cookie, progress } = await signup(request, username)
    const start = await request("/api/round/start", { method: "POST", cookie, body: { modeId: "hard" } })
    assert.equal(start.status, 200, JSON.stringify(start.data))

    const freshState = await request(endpoint, { cookie })
    assert.equal(freshState.status, 200, JSON.stringify(freshState.data))
    assert.equal(freshState.data.progress.totalRoundCount, 0)
    await pool.execute(
      `INSERT INTO pending_ranked_rounds (round_id, user_id, mode_id, issued_at)
       VALUES (?, ?, 'hard', now() - interval '61 minutes')`,
      [`expired-${user.id}`, user.id]
    )

    const state = await request(endpoint, { cookie })
    assert.equal(state.status, 200, JSON.stringify(state.data))
    assert.equal(state.data.progress.totalRoundCount, 1)
    assert.equal(state.data.progress.roundHistory[0].outcome, "forfeit")
    assert.equal(state.data.progress.rankedState.placementMatchesPlayed, progress.rankedState.placementMatchesPlayed + 1)
    const [pending] = await pool.query("SELECT round_id FROM pending_ranked_rounds WHERE user_id = ?", [user.id])
    assert.equal(pending.length, 1)
    assert.notEqual(pending[0].round_id, `expired-${user.id}`)
    const [history] = await pool.query("SELECT outcome FROM round_history WHERE user_id = ?", [user.id])
    assert.deepEqual(history, [{ outcome: "forfeit" }])

    const reload = await request(endpoint, { cookie })
    assert.equal(reload.status, 200, JSON.stringify(reload.data))
    assert.equal(reload.data.progress.totalRoundCount, 1)
  })
}

test("practice, casual, and duel starts do not create pending ranked rounds", async (t) => {
  const request = await startTestApp(t)
  const { user, cookie } = await signup(request, "DuelOpponent")
  const { user: challenger } = await signup(request, "DuelChallenger")

  for (const modeId of ["easy", "normal"]) {
    const start = await request("/api/round/start", { method: "POST", cookie, body: { modeId } })
    assert.equal(start.status, 200, JSON.stringify(start.data))
    const [pending] = await pool.query("SELECT 1 FROM pending_ranked_rounds WHERE user_id = ?", [user.id])
    assert.deepEqual(pending, [])
  }

  const [[replay]] = await pool.query(
    `INSERT INTO round_replays (user_id, username, mode_id, seed, events_json, loadout_snapshot_json)
     VALUES (?, ?, 'hard', 42, '[]', '{"arenaWidth":640,"arenaHeight":400}') RETURNING id`,
    [challenger.id, challenger.username]
  )
  const [[challenge]] = await pool.query(
    `INSERT INTO challenges (challenger_user_id, challenger_username, opponent_user_id, opponent_username, replay_id, mode_id, status)
     VALUES (?, ?, ?, ?, ?, 'hard', 'accepted') RETURNING id`,
    [challenger.id, challenger.username, user.id, user.username, replay.id]
  )
  t.mock.timers.enable({ apis: ["Date"] })
  const duel = await request("/api/round/start", {
    method: "POST", cookie, body: { modeId: "hard", challengeId: Number(challenge.id) },
  })
  assert.equal(duel.status, 200, JSON.stringify(duel.data))
  assert.equal(duel.data.replayId, Number(replay.id))
  const [pending] = await pool.query("SELECT 1 FROM pending_ranked_rounds WHERE user_id = ?", [user.id])
  assert.deepEqual(pending, [])

  t.mock.timers.tick(getDifficultyById("hard").durationSeconds * 1000)
  const complete = await request("/api/round/complete", {
    method: "POST",
    cookie,
    body: { modeId: "hard", roundToken: duel.data.roundToken, events: [], arenaWidth: 640, arenaHeight: 400 },
  })
  assert.equal(complete.status, 200, JSON.stringify(complete.data))
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
