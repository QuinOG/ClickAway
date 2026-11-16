import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import vm from "node:vm"
import { RECENT_HISTORY_LIMIT } from "../src/utils/lifetimeStatsUtils.js"
import { RANK_SYSTEM_VERSION } from "../src/utils/rankUtils.js"
import { getLevelProgress } from "../src/utils/progressionUtils.js"
import { isRankedModeEntry } from "../src/utils/gameModeLabelsAndRankedFilters.js"

const source = readFileSync("server/playerMysqlDatabase.js", "utf8")
const imports = {}
for (const match of source.matchAll(/from "((?:\.\.\/src\/|\.\/serverShop)[^"]+)"/g)) {
  Object.assign(imports, await import(new URL(`../server/${match[1]}`, import.meta.url)))
}
const code = source.slice(source.indexOf("const DEFAULT_PROGRESS ="))
  .replaceAll("export default pool", "").replaceAll("export ", "")
const plain = value => JSON.parse(JSON.stringify(value))

function harness({ user = {}, rankedRounds = 0, history = [], cold = false } = {}) {
  const row = { id: 7, xp: 250, mmr: 330, rankSystemVersion: RANK_SYSTEM_VERSION,
    placementMatchesPlayed: 4, demotionProtectionRounds: 2, ...user }
  const recent = [...history].sort((a, b) => b.playedAt.localeCompare(a.playedAt) || b.id - a.id).slice(0, RECENT_HISTORY_LIMIT)
  const statements = []
  let connections = 0
  const execute = async (sql) => { statements.push(sql); return [{ affectedRows: 1 }] }
  const query = async (sql, params) => {
    statements.push(sql)
    if (sql.includes("LEFT JOIN LATERAL")) {
      assert.deepEqual([...params], [RECENT_HISTORY_LIMIT, 7])
      assert.match(sql, /WHERE user_id = u.id\s+ORDER BY played_at DESC, id DESC\s+LIMIT \?/)
      assert.match(sql, /ls.user_id AS lifetimeUserId/)
      assert.doesNotMatch(sql, /\b(?:INSERT|UPDATE|DELETE|BEGIN|COMMIT|EXISTS)\b/)
      return [[{ ...row, lifetimeUserId: cold ? null : 7, rankedRounds,
        roundHistory: recent.map(h => ({ modeId: h.modeId, progressionMode: h.progressionMode })) }]]
    }
    if (sql.includes("FROM users")) return [[row]]
    if (sql.includes("COUNT(*)")) return [[{ total: history.length, totalRounds: history.length }]]
    if (sql.includes("FROM user_lifetime_stats")) return [cold ? [] : [{ totalRounds: 0, rankedRounds }]]
    if (sql.includes("AS day_key")) return [[{ day_key: "2026-11-15" }]]
    if (sql.includes("FROM round_history") && sql.includes("LIMIT ?")) return [recent]
    if (sql.includes("ORDER BY played_at ASC, id ASC")) return [history]
    return [[]]
  }
  const ctx = { ...imports, pool: { query, getConnection: async () => {
    connections++
    return { query, execute, beginTransaction: async () => {}, commit: async () => {},
      rollback: async () => {}, release: () => {} }
  } } }
  vm.runInNewContext(code, ctx)
  return { ctx, statements, connections: () => connections }
}

const entry = (id, modeId = "normal", progressionMode = "non_ranked") => ({
  id, modeId, progressionMode, playedAt: "2026-11-15T12:00:00Z",
})
const cases = [
  ...[0, 99, 100, 249, 250, "250", -1, "invalid"].map(xp => ({ name: `XP ${xp}`, user: { xp } })),
  { name: "zero lifetime is authoritative", rankedRounds: 0 },
  { name: "lifetime alone", rankedRounds: "2" },
  { name: "hard mode overrides non_ranked", history: [entry(1, "hard")] },
  { name: "ranked progression overrides normal mode", history: [entry(1, "normal", "ranked")] },
  { name: "legacy empty history fields", history: [entry(1, null, null)] },
  { name: "ranked outside recent limit", history: [entry(0, "hard"), ...Array.from({ length: 50 }, (_, i) => entry(i + 1))] },
  { name: "ranked at recent boundary", history: [entry(1, "hard"), ...Array.from({ length: 49 }, (_, i) => entry(i + 2))] },
  ...[0, RANK_SYSTEM_VERSION - 1, RANK_SYSTEM_VERSION, RANK_SYSTEM_VERSION + 1].map(rankSystemVersion => ({ name: `rank version ${rankSystemVersion}`, user: { rankSystemVersion } })),
]
for (const fixture of cases) test(`narrow context matches real full progress: ${fixture.name}`, async () => {
  const h = harness(fixture)
  const context = await h.ctx.findRoundCompletionContext(7)
  assert.equal(h.statements.length, 1)
  assert.equal(h.connections(), 0)
  const full = await h.ctx.findUserProgressByUserId(7)
  assert.deepEqual(plain(context), plain({ levelXp: full.levelXp, rankMmr: full.rankMmr,
    rankedState: full.rankedState, hasRankedHistory: full.lifetimeStats.rankedRounds > 0 || full.roundHistory.some(isRankedModeEntry) }))
  assert.equal(getLevelProgress(context.levelXp).level, getLevelProgress(full.levelXp).level)
  if (fixture.name === "ranked outside recent limit") assert.equal(context.hasRankedHistory, false)
  if (fixture.name === "ranked at recent boundary") assert.equal(context.hasRankedHistory, true)
})

test("missing lifetime delegates once to the real full snapshot", async () => {
  const fixture = { cold: true, history: [entry(1, "hard")], user: { rankSystemVersion: 0 } }
  const h = harness(fixture)
  const context = await h.ctx.findRoundCompletionContext(7)
  const full = await harness(fixture).ctx.findUserProgressByUserId(7)
  assert.deepEqual(plain(context), plain({ levelXp: full.levelXp, rankMmr: full.rankMmr,
    rankedState: full.rankedState, hasRankedHistory: full.lifetimeStats.rankedRounds > 0 || full.roundHistory.some(isRankedModeEntry) }))
  assert.equal(context.hasRankedHistory, true)
  assert.equal(h.connections(), 1)
  assert.equal(h.statements.filter(sql => sql.includes("LEFT JOIN LATERAL")).length, 1)
  assert.equal(h.statements.filter(sql => sql.includes("UPDATE user_lifetime_stats")).length, 1)
  assert.equal(h.statements.filter(sql => sql.includes("ORDER BY played_at ASC, id ASC")).length, 1)
})

test("context query failures propagate without a fallback read", async () => {
  const h = harness()
  const error = Error("query failed")
  h.ctx.pool.query = async () => { throw error }
  await assert.rejects(h.ctx.findRoundCompletionContext(7), e => e === error)
  assert.equal(h.connections(), 0)
})

test("cold snapshot errors propagate, and a missing user never falls back", async () => {
  const h = harness({ cold: true })
  const error = Error("snapshot failed")
  let calls = 0
  h.ctx.findUserProgressByUserId = async () => { calls++; throw error }
  await assert.rejects(h.ctx.findRoundCompletionContext(7), e => e === error)
  assert.equal(calls, 1)
  h.ctx.pool.query = async () => [[]]
  await assert.rejects(h.ctx.findRoundCompletionContext(7), /no longer exists/)
  assert.equal(calls, 1)
})
