import test from "node:test"
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { buildDemoPlan, DEMO_ARENA, DEMO_PLAYER_USERNAMES, generateDemoPlayer, removeDemoPlayers, summarizeDemoPlan } from "../server/scripts/demoPlayerData.js"
import { main, parseArgs, writeDemoPlan } from "../server/scripts/seedDemoPlayers.mjs"
import { applyRankedMatchResult } from "../src/utils/rankUtils.js"
import { simulateRound } from "../server/roundRewards.js"
import { replayRoundEvents, MIN_CLICK_INTERVAL_MS } from "../src/game/engine/roundEngine.js"
import { getDifficultyById } from "../src/constants/gameModesConfig.js"
import { validateUsername } from "../server/validation.js"

const now = new Date("2026-11-15T12:00:00Z")

test("demo generation is deterministic per username and independent of player count", () => {
  const first = generateDemoPlayer("PixelRook", { now })
  assert.deepEqual(first, generateDemoPlayer("PixelRook", { now }))
  assert.deepEqual(first, buildDemoPlan({ count: 2, now }).players[0])
  assert.notDeepEqual(first.skill, generateDemoPlayer("NeonBadger", { now }).skill)
})

test("all demo rounds replay with identical scores, geometry, timing and summaries", () => {
  const plan = buildDemoPlan({ count: 30, now })
  let placed = 0, casualOnly = 0, bullseyes = 0
  for (const player of plan.players) {
    assert.equal(validateUsername(player.username), "")
    assert.ok(player.rounds.length >= 8 && player.rounds.length <= 90)
    if (!player.rank.startsWith("Placement") && player.rank !== "Unranked") placed++
    if (player.rounds.every((round) => round.modeId === "normal")) casualOnly++
    let previousTime = 0
    for (const round of player.rounds) {
      const playedAt = new Date(round.playedAtIso).getTime()
      assert.ok(playedAt >= now.getTime() - 21 * 86400000 && playedAt <= now.getTime())
      assert.ok(playedAt >= previousTime)
      previousTime = playedAt
      const verified = simulateRound(round.events, round.modeId, { roundSeed: round.seed, ...DEMO_ARENA })
      const engine = replayRoundEvents(getDifficultyById(round.modeId), round.events, { seed: round.seed, ...DEMO_ARENA })
      assert.equal(verified.valid, true, verified.reason)
      assert.equal(engine.valid, true, engine.reason)
      for (const key of ["score", "hits", "misses", "bestStreak", "bullseyes"]) {
        assert.equal(round[key], verified[key])
        assert.equal(round[key], engine[key])
      }
      bullseyes += verified.bullseyes
      round.events.forEach((event, i) => {
        assert.ok(event.t < getDifficultyById(round.modeId).durationSeconds * 1000)
        if (i) assert.ok(event.t - round.events[i - 1].t >= MIN_CLICK_INTERVAL_MS)
      })
    }
  }
  assert.ok(placed > 10)
  assert.ok(casualOnly > 0)
  assert.ok(bullseyes > 0)
})

test("pending and completed duel replays validate with their saved seed and arena", () => {
  const { duels } = buildDemoPlan({ now, duelsTo: "Owner" })
  assert.equal(duels.filter((duel) => !duel.completed).length, 3)
  assert.equal(duels.filter((duel) => duel.completed).length, 2)
  for (const duel of duels) {
    for (const round of [duel.round, duel.opponentRound].filter(Boolean)) {
      const verified = simulateRound(round.events, round.modeId, { roundSeed: round.seed, ...round.loadoutSnapshot })
      assert.equal(verified.valid, true, verified.reason)
      assert.equal(verified.score, round.score)
    }
    if (duel.completed) assert.equal(duel.round.seed, duel.opponentRound.seed)
  }
})

test("dry-run returns table and totals without importing a database", async () => {
  const tables = [], logs = []
  await main(["--dry-run", "--count", "2", "--duels-to", "Owner"], { table: (rows) => tables.push(rows), log: (line) => logs.push(line) })
  assert.equal(tables[0].length, 2)
  assert.deepEqual(Object.keys(tables[0][0]), ["player", "rounds", "ranked", "rank", "mmr", "duels"])
  assert.match(logs[0], /DRY RUN: 2 players, \d+ rounds, 3 duels \(2 pending\)/)
  assert.equal(summarizeDemoPlan(buildDemoPlan({ count: 1, now })).length, 1)
  // A malformed URL would throw on import of pgPool; dry-run must never load it.
  const result = spawnSync(process.execPath, ["server/scripts/seedDemoPlayers.mjs", "--dry-run", "--count", "1"], {
    encoding: "utf8", env: { ...process.env, SUPABASE_DB_URL: "invalid-do-not-connect" },
  })
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /DRY RUN: 1 players/)
})

test("removal targets only the immutable fixed list and refuses outsiders before any deletion", async () => {
  const calls = []
  const remove = async (username) => { calls.push(username); return 1 }
  assert.equal(await removeDemoPlayers(remove), 30)
  assert.deepEqual(calls, DEMO_PLAYER_USERNAMES)
  calls.length = 0
  await assert.rejects(removeDemoPlayers(remove, [DEMO_PLAYER_USERNAMES[0], "Owner"]), /non-demo/)
  assert.deepEqual(calls, [])
  assert.ok(Object.isFrozen(DEMO_PLAYER_USERNAMES))
})

test("removal dry-run never calls a database and ignores no seed options", async () => {
  const tables = [], logs = []
  await main(["--remove", "--dry-run"], { table: (rows) => tables.push(rows), log: (line) => logs.push(line) })
  assert.deepEqual(tables[0].map((row) => row.player), DEMO_PLAYER_USERNAMES)
  assert.match(logs[0], /database not loaded/)
  for (const args of [["--remove", "--count", "1"], ["--count", "31"], ["--days", "0"], ["--days", "2.5"], ["--duels-to"], ["--unknown"]]) {
    assert.throws(() => parseArgs(args))
  }
})

test("writer uses signup hashing, real round inputs, history backdating and season placement results", async () => {
  const player = generateDemoPlayer("PixelRook", { now })
  player.rounds = player.rounds.filter((round) => round.modeId === "hard").slice(0, 6)
  const user = { id: 7, username: player.username, role: "player" }
  let progress = { rankMmr: 0, rankedState: undefined, lifetimeStats: { rankedRounds: 0 }, coins: 0 }
  const sql = [], seasons = [], replays = []
  let saved = 0
  const db = {
    default: { execute: async (...args) => { sql.push(args) } },
    findUserByUsername: async () => null,
    createUser: async (input) => {
      assert.equal(input.role, "player")
      assert.match(input.passwordHash, /^\$2[aby]\$12\$/)
      return user
    },
    createDefaultUserProgress: async () => progress,
    findUserProgressByUserId: async () => progress,
    completeUserRound: async (input) => {
      assert.equal(input.userId, user.id)
      assert.equal(input.roundTokenId, null)
      assert.equal(input.countsTowardStats, true)
      assert.ok(input.earnedCoins > 0 && input.earnedXp > 0)
      assert.equal(input.rankInputs.hasRankedHistory, saved > 0)
      const rankOutcome = applyRankedMatchResult({ ...input.rankInputs, ...input.fallbackRankState })
      progress = { ...progress, rankMmr: rankOutcome.nextMmr, rankedState: rankOutcome.nextRankedState,
        lifetimeStats: { rankedRounds: ++saved } }
      return { historyEntry: { id: saved }, rankOutcome }
    },
    insertRoundReplay: async (input) => { replays.push(input); return { id: replays.length } },
    applyUserSeasonProgress: async (...args) => { seasons.push(args) },
  }
  const result = await writeDemoPlan({ players: [player], duels: [] }, db, {})
  assert.deepEqual(result, { created: 1, skipped: 0, rounds: 6, duels: 0 })
  assert.equal(sql.length, 6)
  assert.deepEqual(sql[0], ["UPDATE round_history SET played_at = ? WHERE id = ? AND user_id = ?", [new Date(player.rounds[0].playedAtIso), 1, 7]])
  assert.equal(replays[0].roundHistoryId, 1)
  assert.equal(seasons[0][1].isPlaced, false)
  assert.equal(seasons[4][1].isPlaced, true)
})

test("reruns leave existing demo users and their duels untouched", async () => {
  const plan = buildDemoPlan({ count: 4, now, duelsTo: "Owner" })
  const db = { findUserByUsername: async (username) => ({ id: 1, username }) }
  assert.deepEqual(await writeDemoPlan(plan, db, {}), { created: 0, skipped: 4, rounds: 0, duels: 0 })
})
