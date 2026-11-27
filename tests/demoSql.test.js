import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync, existsSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawnSync } from "node:child_process"
import vm from "node:vm"
import bcrypt from "bcryptjs"
import { buildDemoPlan, DEMO_PLAYER_USERNAMES } from "../server/scripts/demoPlayerData.js"
import { computeDemoPlayer, generateDemoSql, generateCleanupSql, sqlString } from "../server/scripts/demoSql.js"
import { parseArgs } from "../server/scripts/seedDemoPlayers.mjs"
import { calculateRoundRewards } from "../server/roundRewards.js"
import * as rank from "../src/utils/rankUtils.js"
import * as lifetime from "../src/utils/lifetimeStatsUtils.js"
import * as achievements from "../src/game/achievements/evaluateAchievements.js"
import * as dailyGoals from "../src/utils/dailyGoals.js"
import * as shop from "../server/serverShopCatalogIdMappings.js"
import { getLevelProgress } from "../src/utils/progressionUtils.js"
import { getSeasonRewardTier } from "../src/utils/seasonUtils.js"

const roundsSource = readFileSync("server/db/rounds.js", "utf8")
const sharedSource = readFileSync("server/db/shared.js", "utf8")
const seasonsSource = readFileSync("server/db/seasons.js", "utf8")
const schemaSource = readFileSync("server/db/schema.js", "utf8")
const progressSource = readFileSync("server/db/progress.js", "utf8")
const section = (start, end, text = roundsSource) => (
  end === undefined ? text.slice(text.indexOf(start)) : text.slice(text.indexOf(start), text.indexOf(end))
).replaceAll("export ", "")
const plan = buildDemoPlan({ count: 3, days: 5, now: new Date("2026-11-15T12:00:00Z"), duelsTo: "admin" })
const plain = value => JSON.parse(JSON.stringify(value))

// Execute the real transaction bodies and persistence/normalization functions.
// Only the connection and read helpers are scripted; no DB module is imported.
async function runLivePlayer(player, index) {
  const state = { coins: 0, xp: 0, mmr: 0, rankSystemVersion: 0, placementMatchesPlayed: 0, demotionProtectionRounds: 0 }
  let stats = { ...lifetime.DEFAULT_LIFETIME_STATS }, currentRound
  const rounds = [], unlocked = new Set(), owned = [], seasons = new Map(), persisted = {}
  const connection = {
    beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release() {},
    query: async (sql, params = []) => {
      if (sql.includes("INSERT INTO user_lifetime_stats")) return [[]]
      if (sql.includes("AS round_time")) return [[{ round_time: currentRound.playedAtIso }]]
      if (sql.includes("AS day_key")) return [[{ day_key: currentRound.playedAtIso.slice(0, 10) }]]
      if (sql.includes("FROM round_history")) {
        const today = rounds.filter(r => r.playedAtIso.slice(0, 10) === currentRound.playedAtIso.slice(0, 10) && r.xpEarned > 0)
        return [sql.includes("best_streak AS bestStreak") ? today : today.slice(0, 1)]
      }
      if (sql.includes("FROM achievements_catalog")) return [params[0].map(id => ({ id }))]
      if (sql.includes("INSERT INTO user_achievement_progress")) { for (let i = 1; i < params.length; i += 3) unlocked.add(params[i]); return [[]] }
      if (sql.includes("FROM user_achievement_progress")) return [[...unlocked].map(achievementId => ({ achievementId }))]
      if (sql.includes("FROM seasons")) return [[{ id: currentRound.playedAtIso < "2026-11-13T00:00:00Z" ? 1 : 2 }]]
      if (sql.includes("FROM user_season_stats")) return [[seasons.get(params[1])]]
      if (sql.includes("FROM user_collection")) return [owned.filter(i => i.item_type === params[1] && i.item_id === params[2])]
      if (sql.includes("FROM users")) return [[{ id: 7, ...state }]]
      if (sql.includes("UPDATE users")) { const col = sql.match(/SET (\w+)/)[1]; state[col] = params[0]; return [{ affectedRows: 1 }] }
      throw Error(`Unexpected query: ${sql}`)
    },
    execute: async (sql, params) => {
      if (sql.includes("UPDATE users SET coins = coins -")) state.coins -= params[0]
      else if (sql.includes("UPDATE users SET coins")) [state.coins, state.xp] = params
      else if (sql.includes("UPDATE users")) [state.mmr, state.rankSystemVersion, state.placementMatchesPlayed, state.demotionProtectionRounds] = params
      else if (sql.includes("INSERT INTO round_history")) persisted.history = Array.from(params)
      else if (sql.includes("UPDATE user_lifetime_stats")) persisted.lifetime = Array.from(params)
      else if (sql.includes("INSERT INTO user_lifetime_stats")) { /* ensure row */ }
      else if (sql.includes("INSERT INTO user_collection")) owned.push({ item_type: params[1], item_id: params[2] })
      else if (sql.includes("INSERT INTO user_season_stats")) {
        const old = seasons.get(params[1]) ?? { rankedRounds: 0, peakMmr: 0, rewardTier: 0 }
        seasons.set(params[1], { rankedRounds: old.rankedRounds + 1, peakMmr: Math.max(old.peakMmr, params[2]), rewardTier: Math.max(old.rewardTier, params[3]) })
      } else throw Error(`Unexpected execute: ${sql}`)
      return [{ affectedRows: 1, insertId: rounds.length + 1 }]
    },
  }
  const ctx = { ...rank, ...lifetime, ...achievements, ...dailyGoals, ...shop, getLevelProgress, getSeasonRewardTier,
    pool: { getConnection: async () => connection },
    DEFAULT_PROGRESS: { selectedModeId: "normal" }, DEFAULT_PROGRESSION_MODE: "non_ranked",
    getUserStateRow: async () => state, backfillLifetimeStatsFromHistory: async () => {},
    getLifetimeStatsRow: async () => stats, mapLifetimeStatsRow: s => s,
    normalizeLoadoutSnapshot: () => null, buildHistoryEntry: entry => entry,
    buildValuesClause: rows => ({ clause: rows.map(r => `(${r.map(() => "?").join(",")})`).join(","), params: rows.flat() }),
    withCurrentSeason: work => work(connection, { id: 2, startsAt: "2026-11-13T00:00:00Z" }),
    toNonNegativeNumber: v => Math.max(0, Number(v) || 0),
    findUserById: async () => ({ id: 7, username: player.username }), findUserProgressByUserId: async () => ({}),
  }
  vm.createContext(ctx)
  vm.runInContext(section("function toNullableNonNegativeNumber", "function normalizeStringList", sharedSource), ctx)
  vm.runInContext(section("function normalizeRoundHistoryEntry", "function buildHistoryEntry", sharedSource), ctx)
  vm.runInContext(section("const TODAY_UTC_WINDOW", "async function getRoundHistoryCount", progressSource), ctx)
  vm.runInContext(section("async function ensureLifetimeStatsRow", "async function getLoadoutStatsRows", progressSource), ctx)
  vm.runInContext(section("async function insertRoundHistoryEntry", "async function persistLoadoutStats"), ctx)
  vm.runInContext(section("async function addUnlockedAchievements", "export async function findRoundHistoryPage"), ctx)
  vm.runInContext(section("export async function completeUserRound"), ctx)
  vm.runInContext(section("async function readUserSeasonStats", "\nexport {", seasonsSource), ctx)
  const shopSource = readFileSync("server/playerStateStore.js", "utf8")
  vm.runInContext(shopSource.slice(shopSource.indexOf("export class PlayerStateError")).replaceAll("export ", ""), ctx)
  for (const round of player.rounds) {
    currentRound = round
    const rewards = calculateRoundRewards(round)
    const historyEntry = { ...round, ...rewards, coinsEarned: rewards.earnedCoins, xpEarned: rewards.earnedXp, loadoutSnapshot: null }
    const originalPersist = ctx.persistLifetimeStats
    ctx.persistLifetimeStats = async (c, id, next) => { stats = next; await originalPersist(c, id, next) }
    const result = await ctx.completeUserRound({ userId: 7, ...rewards, rankInputs: { ...rewards, hasRankedHistory: stats.rankedRounds > 0 }, fallbackRankState: { currentMmr: state.mmr, currentRankedState: rank.buildDefaultRankedState() }, historyEntry })
    ctx.persistLifetimeStats = originalPersist
    rounds.push({ ...historyEntry, xpEarned: persisted.history[10], coinsEarned: persisted.history[9], rankDelta: persisted.history[11], rankResultKind: persisted.history[12] })
    if (rewards.progressionMode === "ranked") await ctx.applyUserSeasonProgress(7, { rankMmr: result.rankOutcome.nextMmr, isRankedRound: true, isPlaced: !result.rankOutcome.nextRankProgress.isPlacement, playedAt: round.playedAtIso })
  }
  const store = ctx.createPlayerStateStore()
  for (const id of [["skin_neon", "profile_racoon"], ["theme_sunset", "profile_heart"], ["skin_moon", "profile_ghost"]][index]) {
    if (state.coins < shop.getMappedShopItemById(id).cost) continue
    await store.purchaseItem({ user: { id: 7 }, itemId: id })
    await store.equipItem({ user: { id: 7 }, itemId: id })
  }
  return { state, stats, rounds, unlocked: [...unlocked], seasons, persisted, owned }
}

test("derived SQL state matches real round, season, persistence and shop transactions", async () => {
  const sql = await generateDemoSql(plan)
  for (const [index, player] of plan.players.entries()) {
    const live = await runLivePlayer(player, index), computed = computeDemoPlayer(player, index)
    assert.equal(computed.coins, live.state.coins)
    assert.equal(computed.xp, live.state.xp)
    assert.equal(computed.mmr, live.state.mmr)
    assert.deepEqual(plain(computed.lifetimeStats), plain(live.stats))
    assert.deepEqual(computed.achievements, live.unlocked)
    assert.equal(computed.rankedState.placementMatchesPlayed, live.state.placementMatchesPlayed)
    assert.equal(computed.rankedState.demotionProtectionRounds, live.state.demotionProtectionRounds)
    assert.equal(computed.rankedState.rankSystemVersion, live.state.rankSystemVersion)
    assert.equal(getLevelProgress(computed.xp).level, getLevelProgress(live.state.xp).level)
    assert.deepEqual(computed.loadoutStats, {}) // demo history has no loadout
    for (const [i, { entry }] of computed.rounds.entries()) {
      for (const key of ["coinsEarned", "xpEarned", "rankDelta", "rankResultKind"]) assert.equal(entry[key], live.rounds[i][key])
    }
    const seasonTotals = new Map()
    for (const { entry, season } of computed.rounds) if (season) {
      const id = entry.playedAtIso < "2026-11-13T00:00:00Z" ? 1 : 2
      const old = seasonTotals.get(id) ?? { rankedRounds: 0, peakMmr: 0, rewardTier: 0 }
      seasonTotals.set(id, { rankedRounds: old.rankedRounds + 1, peakMmr: Math.max(old.peakMmr, season.peak), rewardTier: Math.max(old.rewardTier, season.tier) })
    }
    assert.deepEqual(plain([...seasonTotals]), plain([...live.seasons]))
    const block = sql.slice(sql.indexOf(`IF NOT EXISTS (SELECT 1 FROM users WHERE username = '${player.username}')`))
    assert.ok(block.includes(`'not_started', ${live.state.coins}, ${live.state.xp}, ${live.state.mmr},`))
    assert.ok(block.includes(`${live.state.mmr}, ${live.state.rankSystemVersion}, ${live.state.placementMatchesPlayed}, ${live.state.demotionProtectionRounds},`))
    assert.ok(block.includes(live.persisted.lifetime.slice(0, -2).map(v => v ?? "NULL").join(", ") + ", '{}'::jsonb"))
    for (const id of live.unlocked) assert.ok(block.includes(`FROM achievements_catalog WHERE id = '${id}'`))
    for (const item of computed.purchases) assert.equal(live.state[item.currentUserColumn], item.dbItemId)
  }
  assert.match(sql, /WITH r AS \(INSERT INTO round_history/)
  assert.match(sql, /INSERT INTO challenges/)
  assert.match(sql, /CROSS JOIN o/)
  assert.match(sql, /'completed'/)
  assert.match(sql, /'pending'/)
})

test("escaping, bcrypt, missing-opponent and rerun guards", async () => {
  const small = { players: [{ ...plan.players[0], username: "O'Brien $demo$ \\ test", rounds: plan.players[0].rounds.slice(0, 2) }], duels: [] }
  const sql = await generateDemoSql(small, { password: "TestPassword123!" })
  assert.match(sql, /O''Brien \$demo\$/)
  assert.match(sql, /DO \$demo_\$/)
  assert.match(sql, /IF NOT EXISTS \(SELECT 1 FROM users WHERE username/)
  const hash = sql.match(/\$2[aby]\$12\$[^']+/)[0]
  assert.ok(await bcrypt.compare("TestPassword123!", hash))
  assert.equal(sqlString("a'b"), "'a''b'")
  const duels = await generateDemoSql({ players: [], duels: plan.duels })
  assert.match(duels, /EXISTS \(SELECT 1 FROM users WHERE username = 'admin'\)/)
  assert.match(duels, /= ANY\(created\)/)
})

test("cleanup is exactly the fixed allowlist with role protection", () => {
  const sql = generateCleanupSql()
  assert.deepEqual([...sql.matchAll(/'([^']+)'/g)].map(m => m[1]), [...DEMO_PLAYER_USERNAMES, "player"])
  assert.equal((sql.match(/DELETE FROM/g) ?? []).length, 1)
  assert.match(sql, /BEGIN;[\s\S]*COMMIT;/)
})

// Lex SQL enough to verify literal boundaries and balanced parentheses without
// invoking Postgres. Also validate every generated INSERT column against schema.
export function checkSql(sql) {
  let depth = 0, quote = false
  for (let i = 0; i < sql.length; i++) {
    if (sql[i] === "'") {
      if (quote && sql[i + 1] === "'") { i++; continue }
      quote = !quote
    } else if (!quote) {
      if (sql[i] === "(") depth++
      if (sql[i] === ")") depth--
      assert.ok(depth >= 0)
    }
  }
  assert.equal(quote, false)
  assert.equal(depth, 0)
  for (const match of sql.matchAll(/INSERT INTO (\w+) \(([^)]+)\)/g)) {
    const ddl = schemaSource.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${match[1]} \\(([\\s\\S]*?)\\n\\s*\\)`))?.[1] ?? ""
    const added = [...schemaSource.matchAll(new RegExp(`addColumnIfMissing\\("${match[1]}", "([^"]+)"`, "g"))].map(m => m[1])
    for (const col of match[2].split(",").map(c => c.trim())) assert.ok(new RegExp(`\\b${col}\\s+(?:bigint|int|varchar|timestamptz|jsonb|boolean)\\b`).test(ddl) || added.includes(col), `${match[1]}.${col}`)
  }
}

test("all generated INSERT columns match initializeSchema, statements balance, FKs cascade", async () => {
  checkSql(await generateDemoSql(plan))
  if (existsSync("docs/demo-data/demo-players.sql")) checkSql(readFileSync("docs/demo-data/demo-players.sql", "utf8"))
  for (const table of ["round_history", "round_replays", "challenges", "user_collection", "user_lifetime_stats", "user_season_stats", "user_achievement_progress"]) {
    const start = schemaSource.indexOf(`CREATE TABLE IF NOT EXISTS ${table} (`)
    assert.match(schemaSource.slice(start, schemaSource.indexOf("`)", start)), /REFERENCES users \(id\) ON DELETE CASCADE/)
  }
})

test("CLI SQL paths never load database configuration", () => {
  assert.equal(parseArgs(["--sql", "out.sql", "--duels-to", "admin"]).sql, "out.sql")
  assert.throws(() => parseArgs(["--sql"]), /Missing value/)
  assert.throws(() => parseArgs(["--sql", "a", "--sql", "b"]), /Duplicate/)
  const directory = mkdtempSync(join(tmpdir(), "demo-sql-"))
  try {
    for (const args of [["--count", "1", "--days", "1"], ["--remove"]]) {
      const path = join(directory, "out.sql")
      const result = spawnSync(process.execPath, ["server/scripts/seedDemoPlayers.mjs", "--sql", path, ...args], { encoding: "utf8", env: { ...process.env, DATABASE_URL: "invalid", DEMO_PASSWORD: "" } })
      assert.equal(result.status, 0, result.stderr)
      assert.match(readFileSync(path, "utf8"), /COMMIT;/)
    }
  } finally { rmSync(directory, { recursive: true, force: true }) }
})
