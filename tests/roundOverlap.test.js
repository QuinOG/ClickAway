import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import vm from "node:vm"

// Runs the real completeUserRound against a scripted connection: a player's timed
// rounds can't overlap, so tokens started side by side can't multiply rewards.
const source = readFileSync("server/playerMysqlDatabase.js", "utf8")
const code = source.slice(
  source.indexOf("const ROUND_OVERLAP_SLACK_MS"),
  source.indexOf("// Saves only the preferences the client actually sent")
).replaceAll("export ", "")

function harness(lastRoundEndsAt) {
  const state = { lastRoundEndsAt, committed: 0, rolledBack: 0 }
  const connection = {
    beginTransaction: async () => {},
    commit: async () => { state.committed += 1 },
    rollback: async () => { state.rolledBack += 1 },
    release: () => {},
    execute: async (sql, params) => {
      if (sql.includes("last_round_ends_at")) {
        const next = params[0]
        if (!state.lastRoundEndsAt || next > state.lastRoundEndsAt) state.lastRoundEndsAt = next
      }
      return [{ affectedRows: 1 }]
    },
    query: async (sql) => (sql.includes("AS round_time") ? [[{ round_time: null }]] : [[]]),
  }
  const ctx = {
    pool: { getConnection: async () => connection },
    getUserStateRow: async () => ({ coins: 0, xp: 0, rankSystemVersion: 4, lastRoundEndsAt: state.lastRoundEndsAt }),
    RANK_SYSTEM_VERSION: 4,
    applyRankedMatchResult: () => ({ nextMmr: 0, appliedRankDelta: 0, nextRankedState: {}, previousRankProgress: {} }),
    backfillLifetimeStatsFromHistory: async () => {},
    insertRoundHistoryEntry: async (_c, _u, entry) => entry,
    hasXpRoundToday: async () => true,
    getTodaysDailyGoalRounds: async () => ({ dayKey: "", rounds: [] }),
    getNewlyCompletedDailyGoals: () => [],
    sumDailyGoalRewards: () => ({ coins: 0, xp: 0 }),
  }
  vm.runInNewContext(code, ctx)
  return { ctx, state }
}

const round = (startsAtMs, tokenId) => ({
  userId: 7, earnedCoins: 10, earnedXp: 0, roundTokenId: tokenId, countsTowardStats: false,
  roundWindow: { startsAtMs, endsAtMs: startsAtMs + 15_000 },
  historyEntry: { score: 1, progressionMode: "non_ranked" },
})

test("two tokens started together pay for one round, a later round still counts", async () => {
  const { ctx, state } = harness(null)
  const t0 = Date.parse("2026-11-27T12:00:00Z")
  await ctx.completeUserRound(round(t0, "a"))
  await assert.rejects(ctx.completeUserRound(round(t0, "b")), /overlapped another round/)
  await ctx.completeUserRound(round(t0 + 18_000, "c"))
  assert.equal(state.committed, 2)
  assert.equal(state.rolledBack, 1)
  assert.equal(state.lastRoundEndsAt.getTime(), t0 + 33_000)
})
