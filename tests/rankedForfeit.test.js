import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import vm from "node:vm"

import { calculateRoundRewards } from "../server/roundRewards.js"
import {
  applyRankedMatchResult,
  migrateLegacyRankData,
  PLACEMENT_MATCH_COUNT,
  RANK_SYSTEM_VERSION,
} from "../src/utils/rankUtils.js"

const database = readFileSync("server/db/rounds.js", "utf8")
const settlement = database.slice(
  database.indexOf("async function settlePendingRankedRounds("),
  database.indexOf("export async function recordPendingRankedRound")
)
const hourMs = 60 * 60 * 1000

async function settle({ pending = [], olderThanMs, mmr = 400, placements = PLACEMENT_MATCH_COUNT } = {}) {
  const userId = 7
  const trace = []
  const history = []
  const consumed = []
  const remaining = new Map(pending.map(({ roundId, ageMs }) => [roundId, ageMs]))
  let savedRank = null
  const connection = {
    async query(sql, params) {
      assert.deepEqual(Array.from(params), [userId, olderThanMs ?? 0, olderThanMs ?? 0])
      assert.match(sql, /FROM pending_ranked_rounds/)
      assert.match(sql, /issued_at <= now\(\) - \?::double precision \* interval '1 millisecond'/)
      trace.push("pending")
      return [pending.filter(({ ageMs }) => ageMs >= (olderThanMs ?? 0))]
    },
    async execute(sql, params) {
      if (sql.includes("UPDATE users")) {
        assert.equal(params[4], userId)
        savedRank = Array.from(params.slice(0, 4))
      } else {
        assert.equal(params[1], userId)
        if (sql.includes("INSERT INTO consumed_round_tokens")) consumed.push(params[0])
        else if (sql.includes("DELETE FROM pending_ranked_rounds")) remaining.delete(params[0])
        else assert.fail(`Unexpected statement: ${sql}`)
      }
    },
  }
  const context = {
    applyRankedMatchResult,
    calculateRoundRewards,
    migrateLegacyRankData,
    async getUserStateRow(executor, id, { forUpdate }) {
      assert.equal(executor, connection)
      assert.equal(id, userId)
      assert.equal(forUpdate, true)
      trace.push("lock")
      return {
        mmr,
        rankSystemVersion: RANK_SYSTEM_VERSION,
        placementMatchesPlayed: placements,
        demotionProtectionRounds: 0,
      }
    },
    async insertRoundHistoryEntry(executor, id, entry) {
      assert.equal(executor, connection)
      assert.equal(id, userId)
      history.push({ ...entry })
    },
  }
  vm.runInNewContext(settlement, context)
  await context.settlePendingRankedRounds(connection, userId, { olderThanMs })
  assert.deepEqual(trace, ["lock", "pending"])
  return { history, consumed, remaining: [...remaining.keys()], savedRank }
}

test("settlement applies the zero-round rating loss and records one forfeit", async () => {
  const result = await settle({ pending: [{ roundId: "abandoned", modeId: "hard", ageMs: 500 }] })
  const zeroRewards = calculateRoundRewards({ modeId: "hard", score: 0, hits: 0, misses: 0, bestStreak: 0 })
  const { appliedRankDelta, nextMmr } = applyRankedMatchResult({
    ...zeroRewards,
    currentMmr: 400,
    currentRankedState: { rankSystemVersion: RANK_SYSTEM_VERSION, placementMatchesPlayed: PLACEMENT_MATCH_COUNT },
    hasRankedHistory: true,
  })
  assert.ok(appliedRankDelta < 0)
  assert.deepEqual(result.history, [{
    modeId: "hard", progressionMode: "ranked", score: 0, coinsEarned: 0, xpEarned: 0,
    rankDelta: appliedRankDelta, rankResultKind: "rr", outcome: "forfeit",
  }])
  assert.deepEqual(result.savedRank, [nextMmr, RANK_SYSTEM_VERSION, PLACEMENT_MATCH_COUNT, 0])
  assert.deepEqual(result.consumed, ["abandoned"])
  assert.deepEqual(result.remaining, [])
})

test("no pending rounds means no writes", async () => {
  assert.deepEqual(await settle(), { history: [], consumed: [], remaining: [], savedRank: null })
})

test("settlement skips rounds younger than the cutoff", async () => {
  const result = await settle({
    pending: [
      { roundId: "expired", modeId: "hard", ageMs: hourMs + 1 },
      { roundId: "fresh", modeId: "hard", ageMs: hourMs - 1 },
    ],
    olderThanMs: hourMs,
  })
  assert.equal(result.history.length, 1)
  assert.deepEqual(result.consumed, ["expired"])
  assert.deepEqual(result.remaining, ["fresh"])
})

test("a placement forfeit advances placement with the same points as a zero-score round", async () => {
  const result = await settle({ mmr: 0, placements: 0, pending: [{ roundId: "placement", modeId: "hard", ageMs: 500 }] })
  assert.equal(result.history[0].rankResultKind, "placement")
  assert.equal(result.history[0].rankDelta, 2)
  assert.deepEqual(result.savedRank, [2, RANK_SYSTEM_VERSION, 1, 0])
})
