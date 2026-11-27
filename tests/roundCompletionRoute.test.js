import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import vm from "node:vm"
import { performance } from "node:perf_hooks"
import { getLevelProgress } from "../src/utils/progressionUtils.js"
import { applyRankedMatchResult, RANK_SYSTEM_VERSION } from "../src/utils/rankUtils.js"

const source = readFileSync("server/index.js", "utf8")
const route = source.slice(source.indexOf('app.post("/api/round/complete"'), source.indexOf('app.put("/api/progress"'))
const database = readFileSync("server/playerMysqlDatabase.js", "utf8")
const save = database.slice(database.indexOf("export async function completeUserRound("), database.indexOf("// Saves only the preferences"))
  .replace("export ", "")

async function run({ token = true, duplicate = false, invalid = false, failure = null, ranked = false, savedTimestamp = {}, clientReaction = {} } = {}) {
  const trace = [], writes = [], headers = {}
  let handler, saveInputs, savedHistoryEntry, simulatedLevel, seasonInputs, stats = 0
  const locked = { coins: 990, xp: 990, mmr: 400, rankSystemVersion: RANK_SYSTEM_VERSION,
    placementMatchesPlayed: 10, demotionProtectionRounds: 0 }
  const connection = {
    beginTransaction: async () => trace.push("begin"),
    execute: async (sql, params) => {
      if (sql.includes("consumed_round_tokens")) { trace.push("claim"); return [{ affectedRows: duplicate ? 0 : 1 }] }
      writes.push({ sql, params }); return [{ affectedRows: 1 }]
    },
    query: async () => [[]],
    commit: async () => trace.push("commit"), rollback: async () => trace.push("rollback"), release: () => trace.push("release"),
  }
  const ctx = {
    performance, console: { error: () => {} },
    app: { post: (_path, _auth, _limiter, fn) => { handler = fn } }, requireAuth: null, roundRateLimiter: null,
    JWT_SECRET: "test", ROUND_SUBMIT_CLOCK_SLACK_MS: 0, MAX_COINS: 1000, MAX_XP: 1000, MAX_MMR: 1000,
    MAX_STORED_REACTION_MS: 2_147_483_647,
    findUserById: async () => { trace.push("identity"); return { id: 7, username: "private-user" } },
    getDifficultyById: id => ({ id, allowsRankProgression: ranked }),
    verifyRoundToken: () => ({ valid: true, seed: 42, roundId: "private-token", issuedAtMs: 0, challengeId: 11 }),
    findRoundCompletionContext: async () => { trace.push("context"); return { levelXp: 250, rankMmr: 0,
      rankedState: { rankSystemVersion: RANK_SYSTEM_VERSION, placementMatchesPlayed: 0 }, hasRankedHistory: true } },
    getLevelProgress, applyRankedMatchResult, RANK_SYSTEM_VERSION,
    getTokenlessGeometrySeed: () => 42,
    simulateRound: (_events, _mode, options) => { trace.push("simulate"); simulatedLevel = options.playerLevel;
      return { valid: !invalid, reason: "invalid events", hits: 1, misses: 0, score: 5, bestStreak: 1,
        bullseyes: 0, goldHits: 0, loadoutSnapshot: null, avgReactionMs: 230, bestReactionMs: 230 } },
    calculateRoundRewards: () => ({ earnedCoins: 20, earnedXp: 20, progressionMode: ranked ? "ranked" : "non_ranked",
      baseRankDelta: 10, placementMatchScore: 20, allowsRankProgression: ranked }),
    pool: { getConnection: async () => connection },
    getUserStateRow: async (_connection, _id, options) => { assert.equal(options.forUpdate, true); trace.push("lock"); return locked },
    RoundAlreadySubmittedError: class extends Error {},
    hasXpRoundToday: async () => true,
    getTodaysDailyGoalRounds: async () => ({ dayKey: null, rounds: [] }),
    sumDailyGoalRewards: () => ({ coins: 0, xp: 0 }),
    backfillLifetimeStatsFromHistory: async () => trace.push("backfill"),
    insertRoundHistoryEntry: async (_connection, _id, entry) => {
      trace.push("history")
      savedHistoryEntry = { ...entry, ...savedTimestamp }
      return savedHistoryEntry
    },
    getLifetimeStatsRow: async () => ({}), mapLifetimeStatsRow: () => ({}),
    applyRoundToLifetimeStats: () => ({}), persistLifetimeStats: async () => { stats++ },
    buildAchievementStatsFromLifetime: () => ({}), evaluateAchievements: () => [], getUnlockedAchievementIds: () => [], addUnlockedAchievements: async () => {},
    insertRoundReplay: async () => { trace.push("replay"); if (failure === "replay") throw Error("failure"); return { id: 8 } },
    completeChallenge: async () => { trace.push("duel"); return { ok: true, challenge: { id: 11 } } },
    applyUserSeasonProgress: async (_id, inputs) => { seasonInputs = inputs; trace.push("season"); if (failure === "season") throw Error("failure"); return {} },
    findUserProgressByUserId: async () => { trace.push("progress"); if (failure === "progress") throw Error("failure"); return { final: true } },
    handleRouteError: (_error, response) => response.status(409).json({ error: "save failed" }),
  }
  vm.runInNewContext(save, ctx)
  const realSave = ctx.completeUserRound
  ctx.completeUserRound = async inputs => { saveInputs = inputs; return realSave(inputs) }
  vm.runInNewContext(route, ctx)
  const response = { statusCode: 200, status(code) { this.statusCode = code; return this },
    setHeader: (name, value) => { headers[name] = value }, json(body) { this.body = body; return this } }
  await handler({ auth: { userId: 7 }, body: { modeId: ranked ? "hard" : "normal", events: [{ t: 0 }], roundToken: token ? "private-token" : null, ...clientReaction } }, response)
  assert.match(headers["Server-Timing"], /^context;dur=\d+\.\d{2}, simulate;dur=\d+\.\d{2}, save;dur=\d+\.\d{2}, followups;dur=\d+\.\d{2}, progress;dur=\d+\.\d{2}, total;dur=\d+\.\d{2}$/)
  return { trace, writes, response, saveInputs, savedHistoryEntry, simulatedLevel, seasonInputs, stats }
}

test("season attribution prefers the committed DB timestamp across a rollover", async () => {
  const playedAtIso = "2026-12-01T00:00:00.000Z"
  const h = await run({ savedTimestamp: { playedAtIso, playedAt: "2026-11-30T23:59:59.999Z" } })
  assert.equal(h.response.statusCode, 200)
  assert.notEqual(h.saveInputs.historyEntry.playedAtIso, playedAtIso)
  assert.equal(h.seasonInputs.playedAt, playedAtIso)
})

test("season attribution retains legacy and request timestamp fallbacks", async () => {
  const playedAt = "2026-11-30T23:59:59.999Z"
  const legacy = await run({ savedTimestamp: { playedAtIso: null, playedAt } })
  assert.equal(legacy.seasonInputs.playedAt, playedAt)
  const fallback = await run({ savedTimestamp: { playedAtIso: null } })
  assert.equal(fallback.seasonInputs.playedAt, fallback.saveInputs.historyEntry.playedAtIso)
})

test("context drives simulation; locked wallet and rank override stale context; final progress follows all writes", async () => {
  const h = await run({ ranked: true })
  assert.equal(h.simulatedLevel, getLevelProgress(250).level)
  assert.deepEqual(h.trace, ["identity", "context", "simulate", "begin", "lock", "claim", "backfill", "history", "commit", "release", "replay", "duel", "season", "progress"])
  assert.deepEqual([...h.writes[0].params], [1000, 1000, 7])
  assert.equal(h.writes[1].params[0], 410)
  assert.equal(h.response.body.rankDelta, 10)
  assert.equal(h.stats, 1)
  assert.equal(h.response.body.progress.final, true)
})

test("invalid simulation never begins a save or claims a token", async () => {
  const h = await run({ invalid: true })
  assert.deepEqual(h.trace, ["identity", "context", "simulate"])
  assert.equal(h.response.statusCode, 400)
  assert.equal(h.writes.length, 0)
})

test("round completion saves the simulation's reaction times and ignores client values", async () => {
  const h = await run({ clientReaction: { avgReactionMs: 1, bestReactionMs: 0 } })
  assert.equal(h.response.statusCode, 200)
  assert.equal(h.savedHistoryEntry.avgReactionMs, 230)
  assert.equal(h.savedHistoryEntry.bestReactionMs, 230)
  const verifiedWrite = h.writes.find(({ sql }) => sql.includes("verified_best_reaction_ms"))
  assert.deepEqual([...verifiedWrite.params], [230, 7])
})

test("duplicate token rolls back before paying or writing history", async () => {
  const h = await run({ duplicate: true })
  assert.deepEqual(h.trace.slice(3), ["begin", "lock", "claim", "rollback", "release"])
  assert.equal(h.writes.length, 0)
  assert.equal(h.stats, 0)
  assert.equal(h.response.statusCode, 409)
})

test("tokenless round pays nothing, counts no stats, and leaves rank alone", async () => {
  const h = await run({ token: false })
  assert.equal(h.trace.includes("claim"), false)
  assert.equal(h.saveInputs.countsTowardStats, false)
  assert.equal(h.stats, 0)
  assert.equal(h.writes.length, 1)
  assert.deepEqual([...h.writes[0].params], [990, 990, 7])
  assert.equal(h.response.body.earnedXp, 0)
  assert.equal(h.response.body.earnedCoins, 0)
})

for (const failure of ["replay", "season", "progress"]) test(`committed save succeeds despite ${failure} failure`, async () => {
  const h = await run({ failure })
  assert.equal(h.response.statusCode, 200)
  assert.ok(h.trace.indexOf("commit") < h.trace.indexOf("replay"))
  assert.ok(h.trace.indexOf("season") < h.trace.indexOf("progress"))
  assert.equal(h.response.body.earnedXp, 20)
  assert.equal(h.response.body.progress === null, failure === "progress")
  assert.equal(Boolean(h.response.body.followUpError), failure !== "progress")
})
