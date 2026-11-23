import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import vm from "node:vm"
import { performance } from "node:perf_hooks"
import { parsePositiveIntId } from "../server/positiveIntId.js"
import { simulateRound } from "../server/roundRewards.js"
import { buildDrillMode, isValidDrillId, TRAINING_DRILLS } from "../src/constants/drillConfig.js"
import { getDifficultyById } from "../src/constants/gameModesConfig.js"
import { buildRoundRules, normalizeLoadoutSnapshotForLevel } from "../src/constants/buildcraft.js"
import { createGeometrySimulation } from "../src/game/engine/roundGeometry.js"
import { createSeededRng } from "../src/game/engine/seededRng.js"
import { replayRoundEvents } from "../src/game/engine/roundEngine.js"

test("positive IDs accept only canonical safe integers", () => {
  for (const value of [1, 42, Number.MAX_SAFE_INTEGER, "1", "42", String(Number.MAX_SAFE_INTEGER)]) assert.equal(parsePositiveIntId(value), Number(value))
  for (const value of [undefined, null, "", 0, -1, 1.5, NaN, Infinity, "NaN", "no", "1.5", "01", " 1", "1 ", "+1", "1e2", "0x10", true, [], {}, Number.MAX_SAFE_INTEGER + 1, "9007199254740992"]) assert.equal(parsePositiveIntId(value), null)
})

test("loadout snapshots retain known IDs and clamp arbitrary and oversized IDs", () => {
  for (const loadoutId of ["unknown", "x".repeat(100), "toString"]) assert.equal(normalizeLoadoutSnapshotForLevel(1, { loadoutId }).loadoutId, "loadout_1")
  assert.equal(normalizeLoadoutSnapshotForLevel(1, { loadoutId: "loadout_3" }).loadoutId, "loadout_3")
  assert.equal(normalizeLoadoutSnapshotForLevel(1, { id: "x".repeat(100), loadoutId: "loadout_3" }).loadoutId, "loadout_1")
})

for (const drill of TRAINING_DRILLS) test(`${drill.id} replays client geometry and enforces its timer`, () => {
  for (const snapshot of [null, {}]) {
    const rules = snapshot ? buildRoundRules(buildDrillMode(drill.id), normalizeLoadoutSnapshotForLevel(1, snapshot)) : buildDrillMode(drill.id)
    const options = { seed: 4321, arenaWidth: 600, arenaHeight: 400 }
    const geometry = createGeometrySimulation({ roundRules: rules, ...options, rng: createSeededRng(options.seed) })
    const events = []
    for (let i = 0; i < 12; i++) {
      const { position, buttonSize } = geometry.getState()
      events.push({ type: "hit", t: i * 200, x: position.x + buttonSize / 2, y: position.y + buttonSize / 2 })
      geometry.applyHit(i * 200)
    }
    const result = simulateRound(events, "easy", { drillId: drill.id, loadoutSnapshot: snapshot, roundSeed: options.seed, ...options })
    assert.equal(result.valid, true)
    assert.equal(result.bullseyes, 12)
    assert.equal(result.score, replayRoundEvents(rules, events, options).score)
    assert.equal(result.roundEndMs, drill.modeOverrides.durationSeconds * 1000)
    const late = simulateRound([{ type: "miss", t: result.roundEndMs + 1001 }], "easy", { drillId: drill.id })
    assert.equal(late.valid, false)
    assert.match(late.reason, /timer/)
  }
})

test("simulation rejects unknown drills and drills outside easy mode", () => {
  for (const drillId of ["unknown", "toString", "__proto__"]) assert.deepEqual(simulateRound([], "easy", { drillId }), { valid: false, reason: "Invalid drillId." })
  assert.equal(simulateRound([], "normal", { drillId: TRAINING_DRILLS[0].id }).valid, false)
})

const source = readFileSync("server/index.js", "utf8")
function route(method, path, extra = {}) {
  const start = source.indexOf(`app.${method}("${path}"`)
  const end = source.indexOf('\napp.', start + 1)
  let handler
  const ctx = { performance, parsePositiveIntId, isValidDrillId, getDifficultyById, requireAuth: null, roundRateLimiter: null,
    app: { [method]: (...args) => { handler = args.at(-1) } }, findUserById: async () => ({ id: 1 }), createRoundSeed: () => 42,
    handleRouteError: error => { throw error }, ...extra }
  vm.runInNewContext(source.slice(start, end), ctx)
  return handler
}
function response() { return { statusCode: 200, status(code) { this.statusCode = code; return this }, setHeader() {}, json(body) { this.body = body; return this } } }

test("all replay and challenge routes reject malformed IDs before database operations", async () => {
  const routes = [["get", "/api/replays/:replayId", "replayId", true], ["post", "/api/challenges", "replayId", false], ["post", "/api/challenges/:challengeId/respond", "challengeId", true], ["post", "/api/round/start", "challengeId", false]]
  for (const [method, path, key, param] of routes) for (const value of ["abc", "1.5", "-1", "0", "Infinity", "9007199254740992"]) {
    const res = response()
    await route(method, path)({ auth: { userId: 1 }, params: param ? { [key]: value } : {}, body: { modeId: "easy", opponentUsername: "Rival", action: "accept", ...(!param ? { [key]: value } : {}) } }, res)
    assert.equal(res.statusCode, 400, `${path}: ${value}`)
    assert.match(res.body.error, new RegExp(key))
  }
})

test("completion rejects invalid drills before simulation", async () => {
  for (const [modeId, drillId] of [["easy", "unknown"], ["easy", "toString"], ["normal", TRAINING_DRILLS[0].id]]) {
    const res = response()
    await route("post", "/api/round/complete")({ auth: { userId: 1 }, body: { modeId, drillId, events: [] } }, res)
    assert.equal(res.statusCode, 400)
    assert.match(res.body.error, /drillId/)
  }
})

