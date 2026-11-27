import assert from "node:assert/strict"
import { once } from "node:events"
import test, { after, before } from "node:test"

import { startTestDatabase } from "./testDatabase.js"

let database
let pool
let server
let insertRoundReplay

before(async () => {
  database = await startTestDatabase()
  process.env.JWT_SECRET = "integration-test-secret"
  process.env.CLIENT_ORIGIN = "http://localhost:5173"
  process.env.TRUST_PROXY = "false"

  pool = (await import("../../server/db/pgPool.js")).default
  const db = await import("../../server/playerMysqlDatabase.js")
  insertRoundReplay = db.insertRoundReplay
  const { createApp } = await import("../../server/app.js")
  await db.initializeSchema()
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

async function post(path, body, cookie) {
  const headers = new Headers({ "Content-Type": "application/json" })
  if (cookie) headers.set("Cookie", cookie)
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })
  return { status: response.status, data: await response.json(), headers: response.headers }
}

async function signup(username) {
  const { status, data, headers } = await post("auth/signup", { username, password: "integration-password" })
  assert.equal(status, 201, JSON.stringify(data))
  const cookie = headers.get("Set-Cookie")?.split(";")[0]
  assert.ok(cookie)
  return { ...data.user, cookie }
}

async function signupChallenger(username) {
  const player = await signup(username)
  const replay = await insertRoundReplay({
    userId: player.id,
    username: player.username,
    modeId: "normal",
    seed: 1,
    loadoutSnapshot: { arenaWidth: 640, arenaHeight: 400 },
  })
  return { ...player, replayId: replay.id }
}

function sendChallenge(player, opponentUsername) {
  return post("challenges", { opponentUsername, replayId: player.replayId }, player.cookie)
}

test("the fourth open duel against the same opponent returns 409", async () => {
  const sender = await signupChallenger("PairSender")
  const opponent = await signup("PairOpponent")

  const first = await sendChallenge(sender, opponent.username)
  assert.equal(first.status, 200, JSON.stringify(first.data))
  const accepted = await post(`challenges/${first.data.challenge.id}/respond`, { action: "accept" }, opponent.cookie)
  assert.equal(accepted.status, 200, JSON.stringify(accepted.data))
  for (let i = 0; i < 2; i += 1) {
    const result = await sendChallenge(sender, opponent.username)
    assert.equal(result.status, 200, JSON.stringify(result.data))
  }

  const blocked = await sendChallenge(sender, opponent.username)
  assert.equal(blocked.status, 409)
  assert.deepEqual(blocked.data, { error: "You already have open duels with this player. Wait for them to finish." })
})

test("a sender's 21st open duel against distinct opponents returns 409", async () => {
  const sender = await signupChallenger("TotalSender")
  // Seed earlier invitations so the request rate limit does not mask the cap.
  await pool.query(
    `INSERT INTO users (username, password_hash)
     SELECT 'TotalOpponent' || n, 'unused' FROM generate_series(1, 21) n`
  )
  await pool.query(
    `INSERT INTO challenges (challenger_user_id, challenger_username, opponent_user_id, opponent_username, replay_id, mode_id)
     SELECT ?, ?, id, username, ?, 'normal'
     FROM users
     WHERE username IN (SELECT 'TotalOpponent' || n FROM generate_series(1, 19) n)`,
    [sender.id, sender.username, sender.replayId]
  )

  const allowed = await sendChallenge(sender, "TotalOpponent20")
  assert.equal(allowed.status, 200, JSON.stringify(allowed.data))
  const blocked = await sendChallenge(sender, "TotalOpponent21")
  assert.equal(blocked.status, 409)
  assert.deepEqual(blocked.data, { error: "You already have too many open duels. Wait for them to finish." })
})

test("a recipient can reach 50 pending invitations and then rejects the next one", async () => {
  const opponent = await signup("InboxOpponent")
  const sender = await signupChallenger("InboxSender")
  const nextSender = await signupChallenger("NextInboxSender")
  await pool.query(
    `WITH senders AS (
       INSERT INTO users (username, password_hash)
       SELECT 'InboxFixtureSender' || n, 'unused' FROM generate_series(1, 49) n
       RETURNING id, username
     ), replays AS (
       INSERT INTO round_replays (user_id, username, mode_id, seed, events_json)
       SELECT id, username, 'normal', 1, '[]' FROM senders
       RETURNING id, user_id, username, mode_id
     )
     INSERT INTO challenges (challenger_user_id, challenger_username, opponent_user_id, opponent_username, replay_id, mode_id)
     SELECT user_id, username, ?, ?, id, mode_id FROM replays`,
    [opponent.id, opponent.username]
  )

  const allowed = await sendChallenge(sender, opponent.username)
  assert.equal(allowed.status, 200, JSON.stringify(allowed.data))
  const blocked = await sendChallenge(nextSender, opponent.username)
  assert.equal(blocked.status, 409)
  assert.deepEqual(blocked.data, { error: "This player has too many open duels right now. Try again later." })
})
