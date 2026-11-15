import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import vm from "node:vm"

// Runs the real completeUserRound against a scripted connection to check the
// first-round-of-the-day XP bonus.
const source = readFileSync("server/playerMysqlDatabase.js", "utf8")
const code = source.slice(
  source.indexOf("export async function completeUserRound("),
  source.indexOf("// Saves only the preferences the client actually sent")
).replace("export async function", "async function")
const helper = source.slice(
  source.indexOf("async function hasXpRoundToday("),
  source.indexOf("async function getRoundHistoryCount(")
)

function harness({ playedEarlierToday }) {
  const writes = { xp: null, historyEntry: null, bonusQueries: 0 }
  const connection = {
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
    execute: async (sql, params) => {
      if (sql.includes("consumed_round_tokens")) return [{ affectedRows: 1 }]
      if (sql.includes("UPDATE users SET coins")) { writes.xp = params[1]; return [{ affectedRows: 1 }] }
      return [{ affectedRows: 1 }]
    },
    query: async (sql) => {
      if (sql.includes("FROM round_history") && sql.includes("xp_earned > 0")) {
        writes.bonusQueries += 1
        assert.match(sql, /date_trunc\('day', now\(\) AT TIME ZONE 'UTC'\)/)
        return [playedEarlierToday ? [{ 1: 1 }] : []]
      }
      return [[]]
    },
  }
  const ctx = {
    pool: { getConnection: async () => connection },
    getUserStateRow: async () => ({ coins: 0, xp: 100, rankSystemVersion: 4 }),
    RANK_SYSTEM_VERSION: 4,
    applyRankedMatchResult: () => ({ nextMmr: 0, appliedRankDelta: 0, nextRankedState: {}, previousRankProgress: {} }),
    backfillLifetimeStatsFromHistory: async () => {},
    insertRoundHistoryEntry: async (_connection, _userId, entry) => { writes.historyEntry = entry; return entry },
    RoundAlreadySubmittedError: class extends Error {},
  }
  vm.runInNewContext(helper + code, ctx)
  return { ctx, writes }
}

const round = (overrides = {}) => ({
  userId: 7,
  earnedCoins: 16,
  earnedXp: 160,
  roundTokenId: "token-1",
  countsTowardStats: false,
  historyEntry: { score: 37, xpEarned: 160, progressionMode: "non_ranked" },
  ...overrides,
})

test("the first XP-earning round of the day earns its XP twice", async () => {
  const { ctx, writes } = harness({ playedEarlierToday: false })
  const result = await ctx.completeUserRound(round())
  assert.equal(result.dailyBonusXp, 160)
  assert.equal(writes.xp, 100 + 320)
  assert.equal(writes.historyEntry.xpEarned, 320)
})

test("later rounds the same day earn normal XP", async () => {
  const { ctx, writes } = harness({ playedEarlierToday: true })
  const result = await ctx.completeUserRound(round())
  assert.equal(result.dailyBonusXp, 0)
  assert.equal(writes.xp, 100 + 160)
  assert.equal(writes.historyEntry.xpEarned, 160)
})

test("rounds that earn no XP (Practice, unverified) don't check or use up the bonus", async () => {
  const { ctx, writes } = harness({ playedEarlierToday: false })
  const result = await ctx.completeUserRound(round({ earnedXp: 0, roundTokenId: null, historyEntry: { xpEarned: 0 } }))
  assert.equal(result.dailyBonusXp, 0)
  assert.equal(writes.bonusQueries, 0)
  assert.equal(writes.xp, 100)
})
