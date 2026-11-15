import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import vm from "node:vm"

import * as dailyGoals from "../src/utils/dailyGoals.js"

// Runs the real completeUserRound against a scripted connection to check the
// first-round-of-the-day XP bonus and daily goal rewards.
const source = readFileSync("server/playerMysqlDatabase.js", "utf8")
const code = source.slice(
  source.indexOf("export async function completeUserRound("),
  source.indexOf("// Saves only the preferences the client actually sent")
).replace("export async function", "async function")
const helper = source.slice(
  source.indexOf("const TODAY_UTC_WINDOW"),
  source.indexOf("async function getRoundHistoryCount(")
)

const TODAY = "2026-11-15"

function harness({ playedEarlierToday, todaysRounds = [], roundTime = null }) {
  const writes = { xp: null, coins: null, historyEntry: null, bonusQueries: 0, goalQueries: 0 }
  const connection = {
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
    execute: async (sql, params) => {
      if (sql.includes("consumed_round_tokens")) return [{ affectedRows: 1 }]
      if (sql.includes("UPDATE users SET coins")) { writes.coins = params[0]; writes.xp = params[1]; return [{ affectedRows: 1 }] }
      return [{ affectedRows: 1 }]
    },
    query: async (sql) => {
      if (sql.includes("AS day_key")) return [[{ day_key: TODAY }]]
      if (sql.includes("AS round_time")) return [[{ round_time: roundTime }]]
      if (sql.includes("FROM round_history") && sql.includes("best_streak AS bestStreak")) {
        writes.goalQueries += 1
        assert.match(sql, /xp_earned > 0/)
        // Bounded to one day, so a save just before midnight can't see the next day's rows.
        assert.match(sql, /played_at < \(\(date_trunc\('day', now\(\) AT TIME ZONE 'UTC'\) \+ interval '1 day'\)/)
        assert.match(sql, /date_trunc\('day', now\(\) AT TIME ZONE 'UTC'\)/)
        return [todaysRounds]
      }
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
    ...dailyGoals,
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

// The day's goals, so the tests don't depend on which ones the date picks.
const [showUpGoal, skillGoal, varietyGoal] = dailyGoals.getDailyGoals(TODAY)
const casualRound = (overrides = {}) => ({ modeId: "normal", hits: 20, misses: 2, bestStreak: 8, ...overrides })

test("a round that finishes a daily goal pays its coins and XP once, in the round's totals", async () => {
  const before = Array.from({ length: showUpGoal.target - 1 }, () => casualRound())
  const { ctx, writes } = harness({ playedEarlierToday: true, todaysRounds: before })
  const result = await ctx.completeUserRound(round({ historyEntry: { score: 37, xpEarned: 160, progressionMode: "non_ranked", modeId: "normal", hits: 20, misses: 2, bestStreak: 8, coinsEarned: 16 } }))
  const paid = result.dailyGoalRewards.goals.map((goal) => goal.id)
  assert.ok(paid.includes(showUpGoal.id))
  assert.equal(writes.coins, 16 + result.dailyGoalRewards.coins)
  assert.equal(writes.xp, 100 + 160 + result.dailyGoalRewards.xp)
  assert.equal(writes.historyEntry.coinsEarned, 16 + result.dailyGoalRewards.coins)
  assert.equal(writes.historyEntry.xpEarned, 160 + result.dailyGoalRewards.xp)
})

test("a goal already finished earlier today pays nothing more", async () => {
  const before = Array.from({ length: showUpGoal.target + 2 }, () => casualRound({ hits: 1, bestStreak: 1, misses: 5 }))
  const { ctx, writes } = harness({ playedEarlierToday: true, todaysRounds: before })
  const result = await ctx.completeUserRound(round({ historyEntry: { xpEarned: 160, modeId: "normal", hits: 1, misses: 5, bestStreak: 1 } }))
  assert.equal(result.dailyGoalRewards.goals.some((goal) => goal.id === showUpGoal.id), false)
  assert.equal(writes.xp, 100 + 160 + result.dailyGoalRewards.xp)
})

test("rounds that earn no XP never check or complete daily goals", async () => {
  const before = Array.from({ length: showUpGoal.target - 1 }, () => casualRound())
  const { ctx, writes } = harness({ playedEarlierToday: true, todaysRounds: before })
  const result = await ctx.completeUserRound(round({ earnedXp: 0, earnedCoins: 0, roundTokenId: null, historyEntry: { xpEarned: 0, modeId: "normal", hits: 40, misses: 0, bestStreak: 40 } }))
  // Compared as JSON: objects built inside the vm have another realm's prototypes.
  assert.equal(JSON.stringify(result.dailyGoalRewards), JSON.stringify({ goals: [], coins: 0, xp: 0 }))
  assert.equal(writes.goalQueries, 0)
  assert.equal(writes.coins, 0)
})

test("the day has one goal per slot, each with its reward", () => {
  assert.deepEqual([showUpGoal, skillGoal, varietyGoal].map((goal) => goal.reward), dailyGoals.DAILY_GOAL_REWARDS)
})

test("a round is stored at the database transaction's time, the clock its daily checks use", async () => {
  const { ctx, writes } = harness({ playedEarlierToday: true, roundTime: new Date("2026-11-16T00:00:00.250Z") })
  // The request was timestamped just before midnight; the transaction ran just after.
  await ctx.completeUserRound(round({ historyEntry: { xpEarned: 160, modeId: "normal", hits: 20, misses: 1, bestStreak: 9, playedAtIso: "2026-11-15T23:59:59.900Z" } }))
  assert.equal(writes.historyEntry.playedAtIso, "2026-11-16T00:00:00.250Z")
})
