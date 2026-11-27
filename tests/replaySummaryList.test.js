import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import vm from "node:vm"

const source = readFileSync("server/playerMysqlDatabase.js", "utf8")
const plain = (value) => JSON.parse(JSON.stringify(value))

function loadReplayQueries(rowsByQuery) {
  const calls = []
  const mappersCode = source.slice(
    source.indexOf("function mapReplayRow("),
    source.indexOf("function mapChallengeRow(")
  )
  const queriesCode = source.slice(
    source.indexOf("export async function findReplayById("),
    source.indexOf("export async function findUserByUsernameForChallenge(")
  ).replaceAll("export ", "")

  const ctx = {
    toNonNegativeNumber: (value, fallback = 0) => {
      const numeric = Number(value)
      return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback
    },
    pool: {
      query: async (sql, params) => {
        calls.push({ sql, params: [...params] })
        return [rowsByQuery(sql, params)]
      },
    },
  }

  vm.runInNewContext(`${mappersCode}\n${queriesCode}`, ctx)
  return { ctx, calls }
}

test("findUserReplays selects summary columns only and omits events, seed, and loadoutSnapshot", async () => {
  const { ctx, calls } = loadReplayQueries(() => [
    {
      id: "42",
      userId: "7",
      username: "Vector",
      modeId: "normal",
      seed: 12345,
      eventsJson: JSON.stringify([{ type: "hit", t: 100 }]),
      loadoutSnapshotJson: JSON.stringify({ arenaWidth: 600, arenaHeight: 400 }),
      score: "920",
      hits: "18",
      misses: "2",
      bestStreak: "9",
      visibility: "public",
      playedAt: "2026-11-20T12:00:00.000Z",
    },
    { id: null },
  ])

  const replays = await ctx.findUserReplays(7, { limit: 15 })

  assert.equal(calls.length, 1)
  const [{ sql, params }] = calls
  assert.deepEqual(params, [7, 15])

  const selectClause = sql.slice(0, sql.indexOf("FROM round_replays"))
  assert.doesNotMatch(selectClause, /events_json/i)
  assert.doesNotMatch(selectClause, /loadout_snapshot_json/i)
  assert.doesNotMatch(selectClause, /\bseed\b/i)
  assert.match(sql, /loadout_snapshot_json->>'arenaWidth' IS NOT NULL/)
  assert.match(sql, /loadout_snapshot_json->>'arenaHeight' IS NOT NULL/)

  assert.equal(replays.length, 1)
  const [summary] = replays
  assert.deepEqual(Object.keys(summary).sort(), [
    "bestStreak",
    "hits",
    "id",
    "misses",
    "modeId",
    "playedAt",
    "score",
    "userId",
    "username",
    "visibility",
  ])
  assert.equal("events" in summary, false)
  assert.equal("seed" in summary, false)
  assert.equal("loadoutSnapshot" in summary, false)
  assert.deepEqual(plain(summary), {
    id: 42,
    userId: 7,
    username: "Vector",
    modeId: "normal",
    score: 920,
    hits: 18,
    misses: 2,
    bestStreak: 9,
    visibility: "public",
    playedAt: "2026-11-20T12:00:00.000Z",
  })
})

test("findReplayById still returns full replay including events, seed, and loadoutSnapshot", async () => {
  const { ctx } = loadReplayQueries(() => [
    {
      id: "42",
      userId: "7",
      username: "Vector",
      modeId: "normal",
      seed: 12345,
      eventsJson: JSON.stringify([{ type: "hit", t: 100 }]),
      loadoutSnapshotJson: JSON.stringify({ arenaWidth: 600, arenaHeight: 400 }),
      score: "920",
      hits: "18",
      misses: "2",
      bestStreak: "9",
      visibility: "public",
      playedAt: "2026-11-20T12:00:00.000Z",
    },
  ])

  const replay = await ctx.findReplayById(42)
  assert.equal(replay.seed, 12345)
  assert.deepEqual(plain(replay.events), [{ type: "hit", t: 100 }])
  assert.deepEqual(plain(replay.loadoutSnapshot), { arenaWidth: 600, arenaHeight: 400 })
})
