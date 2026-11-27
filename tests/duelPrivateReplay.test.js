import { parsePositiveIntId } from "../server/positiveIntId.js"
import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import vm from "node:vm"
import { isRaceableReplay } from "../server/roundRewards.js"

const source = readFileSync("server/app.js", "utf8")
const code = source.slice(source.indexOf('app.get("/api/replays/:replayId"'), source.indexOf('app.post("/api/challenges/:challengeId/respond"'))

function harness(visibility, loadoutSnapshot = { arenaWidth: 600, arenaHeight: 400 }) {
  const routes = new Map()
  let writes = 0
  const ctx = { parsePositiveIntId,
    app: { get: (path, auth, handler) => routes.set(path, handler), post: (path, auth, limiter, handler) => routes.set(path, handler) },
    requireAuth: {}, challengeCreateLimiter: {}, findUserById: async id => ({ id, username: "Player" }),
    findUserByUsernameForChallenge: async () => ({ id: 2, username: "Rival" }),
    findReplayById: async () => ({ id: 7, userId: 1, modeId: "normal", visibility, loadoutSnapshot }),
    isRaceableReplay,
    createChallenge: async () => { writes += 1; return { id: 9 } },
    handleRouteError: error => { throw error },
  }
  vm.runInNewContext(code, ctx)
  const response = { statusCode: 200, status(code) { this.statusCode = code; return this }, json(body) { this.body = body } }
  return { routes, response, writes: () => writes }
}

test("private ghosts cannot create invitations their opponent cannot play", async () => {
  const h = harness("private")
  await h.routes.get("/api/replays/:replayId")({ auth: { userId: 2 }, params: { replayId: "7" } }, h.response)
  assert.equal(h.response.statusCode, 403)
  h.response.statusCode = 200
  await h.routes.get("/api/challenges")({ auth: { userId: 1 }, body: { opponentUsername: "Rival", replayId: 7 } }, h.response)
  assert.equal(h.response.statusCode, 400)
  assert.match(h.response.body.error, /private/i)
  assert.equal(h.writes(), 0)
})

test("public ghosts can still be challenged", async () => {
  const h = harness("public")
  await h.routes.get("/api/challenges")({ auth: { userId: 1 }, body: { opponentUsername: "Rival", replayId: 7 } }, h.response)
  assert.equal(h.response.statusCode, 200)
  assert.equal(h.response.body.challenge.id, 9)
  assert.equal(h.writes(), 1)
})

test("ghosts saved before Bullseye and Gold can't be raced or used for a new duel", async () => {
  const h = harness("public", { equippedPowerups: [] })
  await h.routes.get("/api/replays/:replayId")({ auth: { userId: 2 }, params: { replayId: "7" } }, h.response)
  assert.equal(h.response.statusCode, 410)
  h.response.statusCode = 200
  await h.routes.get("/api/challenges")({ auth: { userId: 1 }, body: { opponentUsername: "Rival", replayId: 7 } }, h.response)
  assert.equal(h.response.statusCode, 400)
  assert.match(h.response.body.error, /before Bullseye and Gold/)
  assert.equal(h.writes(), 0)
})
