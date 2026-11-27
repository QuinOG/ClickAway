import assert from "node:assert/strict"
import { once } from "node:events"
import test, { after, before } from "node:test"

import { startTestDatabase } from "./testDatabase.js"

let database
let pool
let server

before(async () => {
  database = await startTestDatabase()
  process.env.JWT_SECRET = "integration-test-secret"
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

function request(path, method, body, cookie) {
  const headers = new Headers({ "Content-Type": "application/json" })
  if (cookie) headers.set("Cookie", cookie)
  return fetch(`http://127.0.0.1:${server.address().port}/api/${path}`, {
    method,
    headers,
    body: JSON.stringify(body),
  })
}

async function signup(username) {
  const response = await request("auth/signup", "POST", { username, password: "integration-password" })
  assert.equal(response.status, 201, await response.text())
  const cookie = response.headers.get("Set-Cookie")?.split(";")[0]
  assert.ok(cookie)
  return cookie
}

test("progress rejects the 61st write for one player while allowing another player on the same IP", async () => {
  const cookie = await signup("RateLimitedPlayer")
  const otherCookie = await signup("OtherWriter")

  for (let i = 1; i <= 60; i += 1) {
    const response = await request("progress", "PUT", {}, cookie)
    assert.equal(response.status, 200, `write ${i}: ${await response.text()}`)
  }

  const limited = await request("progress", "PUT", {}, cookie)
  assert.equal(limited.status, 429)
  assert.deepEqual(await limited.json(), { error: "Too many updates. Please slow down." })

  const allowed = await request("progress", "PUT", {}, otherCookie)
  assert.equal(allowed.status, 200, await allowed.text())
})
