import assert from "node:assert/strict"
import { test } from "node:test"

import { buildRoundRulesFromReplay, computeGhostScoreAtElapsed, normalizeReplayRecord } from "../src/utils/replayUtils.js"
import { normalizeSeasonRecord } from "../src/utils/seasonUtils.js"
import { getNextUtcResetMs, getUtcDayKey } from "../src/utils/dailyGoals.js"
import { appendHistoryEntry, buildPlayerLeaderboardStats, formatPlayedAtLabel, normalizeHistoryEntry } from "../src/utils/historyUtils.js"
import { buildLifetimeStatsFromRounds, normalizeLifetimeStats } from "../src/utils/lifetimeStatsUtils.js"

const invalidRecords = [undefined, null, "bad", 42, false, []]

test("replay helpers accept missing and malformed records", () => {
  for (const value of invalidRecords) {
    assert.deepEqual(buildRoundRulesFromReplay(value), value === undefined ? buildRoundRulesFromReplay({}) : null)
    assert.equal(computeGhostScoreAtElapsed(value), 0)
    const replay = normalizeReplayRecord(value)
    assert.deepEqual(replay.events, [])
    assert.equal(replay.loadoutSnapshot, null)
    assert.equal(replay.score, 0)
  }
})

test("replay normalization rejects malformed JSON and wrong payload shapes", () => {
  for (const value of ["{bad", "null", "42", '"text"', "{}", null, 42, {}]) {
    assert.deepEqual(normalizeReplayRecord({ eventsJson: value }).events, [])
  }
  for (const value of ["{bad", "null", "42", '"text"', "[]", null, 42, []]) {
    assert.equal(normalizeReplayRecord({ loadoutSnapshotJson: value }).loadoutSnapshot, null)
  }
  for (const value of [42, "bad", [], true]) {
    assert.equal(normalizeReplayRecord({ loadoutSnapshot: value }).loadoutSnapshot, null)
  }

  const events = [{ type: "hit", t: 100 }]
  const snapshot = { arenaWidth: 800, arenaHeight: 600 }
  assert.deepEqual(normalizeReplayRecord({ eventsJson: JSON.stringify(events) }).events, events)
  assert.deepEqual(normalizeReplayRecord({ eventsJson: events }).events, events)
  assert.deepEqual(normalizeReplayRecord({ events, eventsJson: "bad" }).events, events)
  assert.deepEqual(normalizeReplayRecord({ loadoutSnapshotJson: JSON.stringify(snapshot) }).loadoutSnapshot, snapshot)
  assert.deepEqual(normalizeReplayRecord({ loadoutSnapshotJson: snapshot }).loadoutSnapshot, snapshot)
  assert.deepEqual(normalizeReplayRecord({ loadoutSnapshot: snapshot, loadoutSnapshotJson: "bad" }).loadoutSnapshot, snapshot)
})

test("season metadata stays at zero for invalid, missing, equal, and reversed dates", () => {
  const future = "2099-01-01T00:00:00.000Z"
  for (const [startsAt, endsAt] of [
    ["bad", future], [future, "bad"], [new Date(NaN), future],
    [null, future], [future, null], [future, future],
    ["2100-01-01", future], ["bad", "bad"],
  ]) {
    const season = normalizeSeasonRecord({ id: 1, startsAt, endsAt })
    assert.equal(season.progressPercent, 0)
    assert.equal(season.daysRemaining, 0)
  }
  assert.equal(normalizeSeasonRecord(null), null)
})

test("valid season progress remains bounded before, during, and after a season", (t) => {
  const startsAt = "2026-01-01T00:00:00.000Z"
  const endsAt = "2026-01-03T00:00:00.000Z"
  const now = t.mock.method(Date, "now")
  for (const [date, progress, days] of [
    ["2025-12-31", 0, 3], ["2026-01-02", 50, 1], ["2026-01-04", 100, 0],
  ]) {
    now.mock.mockImplementation(() => Date.parse(date))
    const season = normalizeSeasonRecord({ id: 1, startsAt, endsAt })
    assert.equal(season.progressPercent, progress)
    assert.equal(season.daysRemaining, days)
  }
})

test("UTC day keys fall back to today for invalid dates", () => {
  const before = new Date().toISOString().slice(0, 10)
  for (const value of [new Date("invalid"), "bad", NaN, Infinity]) {
    const day = getUtcDayKey(value)
    assert.ok([before, new Date().toISOString().slice(0, 10)].includes(day))
  }
  assert.equal(getUtcDayKey("2026-01-02T23:59:59Z"), "2026-01-02")
  assert.equal(getUtcDayKey(new Date("2026-01-03T01:00:00+02:00")), "2026-01-02")
})

test("UTC reset times fall back to now for non-finite inputs", (t) => {
  t.mock.method(Date, "now", () => Date.parse("2026-01-02T12:00:00Z"))
  const expected = Date.parse("2026-01-03T00:00:00Z")
  for (const value of [undefined, "bad", NaN, Infinity, -Infinity]) {
    assert.equal(getNextUtcResetMs(value), expected)
  }
  assert.equal(getNextUtcResetMs(0), 86400000)
  assert.equal(getNextUtcResetMs(String(Date.now())), expected)
})

test("history date labels reject invalid dates and non-Date values", () => {
  for (const value of [...invalidRecords, {}, new Date("invalid")]) {
    assert.equal(formatPlayedAtLabel(value), "\u2014")
  }
  assert.equal(formatPlayedAtLabel(new Date()), "Just now")
})

test("history normalization and collections tolerate malformed records", () => {
  const emptyStats = { bestScore: 0, bestStreak: 0, accuracyPercent: 0 }
  const entry = { id: "valid", score: 20, bestStreak: 3, hits: 3, misses: 1 }
  for (const value of invalidRecords) {
    const normalized = normalizeHistoryEntry(value)
    assert.equal(normalized.score, 0)
    assert.ok(Number.isFinite(Date.parse(normalized.playedAtIso)))
    assert.deepEqual(appendHistoryEntry(value, entry), [entry])
    assert.deepEqual(appendHistoryEntry([entry], value), [entry])
    assert.deepEqual(buildPlayerLeaderboardStats(value), emptyStats)
  }
  assert.deepEqual(appendHistoryEntry([null, 42, entry], null), [entry])
  assert.deepEqual(buildPlayerLeaderboardStats([null, "bad", [], entry]), {
    bestScore: 20, bestStreak: 3, accuracyPercent: 75,
  })
  assert.ok(Number.isFinite(Date.parse(normalizeHistoryEntry({ playedAt: "bad" }).playedAtIso)))
})

test("lifetime normalization and round collections tolerate malformed inputs", () => {
  const empty = normalizeLifetimeStats({})
  for (const value of invalidRecords) {
    assert.deepEqual(normalizeLifetimeStats(value), empty)
    assert.deepEqual(buildLifetimeStatsFromRounds(value), empty)
  }
  assert.deepEqual(buildLifetimeStatsFromRounds([null, "bad", 42, []]), empty)
})

test("missing and invalid round timestamps sort as zero without mutating the input", () => {
  for (const timestamp of [{}, { playedAt: "bad" }, { playedAtIso: "bad" }, { playedAt: null }, { playedAt: 0 }]) {
    const rounds = [
      { modeId: "hard", rankDelta: -1, playedAt: "1990-01-01T00:00:00Z" },
      { modeId: "hard", rankDelta: 1, ...timestamp },
    ]
    const originalOrder = [...rounds]
    const stats = buildLifetimeStatsFromRounds(rounds)
    assert.equal(stats.totalRounds, 2)
    assert.equal(stats.maxConsecutiveRankedWins, 1)
    assert.equal(stats.currentConsecutiveRankedWins, 0)
    assert.deepEqual(rounds, originalOrder)
  }
})
