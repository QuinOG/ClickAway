import assert from "node:assert/strict"
import test from "node:test"

import {
  DAILY_GOAL_REWARDS,
  buildDailyGoalProgress,
  getDailyGoals,
  getNewlyCompletedDailyGoals,
  getNextUtcResetMs,
  getUtcDayKey,
  measureDailyGoal,
  normalizeDailyGoalRewards,
  normalizeDailyGoals,
  sumDailyGoalRewards,
} from "../src/utils/dailyGoals.js"

function dayKeys(count, start = Date.UTC(2026, 10, 15)) {
  return Array.from({ length: count }, (_, index) => getUtcDayKey(new Date(start + index * 86400000)))
}

test("each day has the same three goals for everyone, one per slot", () => {
  assert.deepEqual(getDailyGoals("2026-11-15"), getDailyGoals("2026-11-15"))
  for (const day of dayKeys(60)) {
    const goals = getDailyGoals(day)
    assert.equal(goals.length, 3)
    assert.equal(new Set(goals.map((goal) => goal.id)).size, 3)
    assert.deepEqual(goals.map((goal) => goal.reward), DAILY_GOAL_REWARDS)
  }
})

test("over a season every goal in every slot comes up, and days vary", () => {
  const seen = [new Set(), new Set(), new Set()]
  const sets = new Set()
  for (const day of dayKeys(90)) {
    const goals = getDailyGoals(day)
    goals.forEach((goal, slot) => seen[slot].add(goal.id))
    sets.add(goals.map((goal) => goal.id).join("|"))
  }
  assert.deepEqual(seen.map((ids) => ids.size), [2, 3, 3])
  assert.ok(sets.size >= 10)
})

test("goals measure only the rounds they describe", () => {
  const rounds = [
    { modeId: "normal", hits: 30, misses: 2, bestStreak: 18 },
    { modeId: "hard", hits: 14, misses: 1, bestStreak: 9 },
    { modeId: "hard", hits: 20, misses: 1, bestStreak: 21 },
  ]
  assert.equal(measureDailyGoal({ kind: "rounds" }, rounds), 3)
  assert.equal(measureDailyGoal({ kind: "rounds", modeId: "hard" }, rounds), 2)
  assert.equal(measureDailyGoal({ kind: "hits" }, rounds), 64)
  assert.equal(measureDailyGoal({ kind: "streak" }, rounds), 21)
  // 30/32 = 93.75% qualifies; 14 hits is under the 15-hit minimum; 20/21 qualifies.
  assert.equal(measureDailyGoal({ kind: "accurateRound", minHits: 15, minAccuracy: 90 }, rounds), 2)
  assert.equal(measureDailyGoal({ kind: "hits" }, [{ hits: "12" }, { hits: null }, { hits: -4 }]), 12)
})

test("a goal completes once: on the round that crosses it, never again", () => {
  const day = "2026-11-15"
  const [showUp] = getDailyGoals(day)
  const round = { modeId: "normal", hits: 1, misses: 9, bestStreak: 1 }
  const before = Array.from({ length: showUp.target - 1 }, () => round)
  assert.ok(getNewlyCompletedDailyGoals(day, before, round).some((goal) => goal.id === showUp.id))
  assert.equal(getNewlyCompletedDailyGoals(day, [...before, round], round).some((goal) => goal.id === showUp.id), false)
  assert.deepEqual(getNewlyCompletedDailyGoals(day, before, null), [])
})

test("progress is capped at the target and sums the rewards of finished goals", () => {
  const day = "2026-11-15"
  const many = Array.from({ length: 10 }, () => ({ modeId: "hard", hits: 40, misses: 0, bestStreak: 40 }))
  const progress = buildDailyGoalProgress(day, many)
  assert.ok(progress.every((goal) => goal.isComplete && goal.progress === goal.target))
  assert.deepEqual(sumDailyGoalRewards(progress), { coins: 150, xp: 300 })
  assert.ok(buildDailyGoalProgress(day, []).every((goal) => goal.progress === 0 && !goal.isComplete))
})

test("the reset is the next UTC midnight", () => {
  assert.equal(new Date(getNextUtcResetMs(Date.UTC(2026, 10, 15, 23, 59, 59))).toISOString(), "2026-11-16T00:00:00.000Z")
  assert.equal(new Date(getNextUtcResetMs(Date.UTC(2026, 10, 16, 0, 0, 0))).toISOString(), "2026-11-17T00:00:00.000Z")
})

test("client normalizers accept server payloads and reject junk", () => {
  assert.equal(normalizeDailyGoals(null), null)
  assert.equal(normalizeDailyGoals({ goals: [] }), null)
  const normalized = normalizeDailyGoals({
    day: "2026-11-15",
    resetsAt: "2026-11-16T00:00:00.000Z",
    goals: [{ id: "rounds-3", label: "Play 3 rounds", target: 3, progress: 7, reward: { coins: 40, xp: 80 } }, { id: 4 }],
  })
  assert.equal(normalized.goals.length, 1)
  assert.equal(normalized.goals[0].progress, 3)
  assert.equal(normalized.goals[0].isComplete, true)
  assert.equal(normalized.resetsAt, "2026-11-16T00:00:00.000Z")

  assert.equal(normalizeDailyGoalRewards(undefined), null)
  assert.equal(normalizeDailyGoalRewards({ goals: [] }), null)
  assert.deepEqual(
    normalizeDailyGoalRewards({ goals: [{ id: "streak-20", label: "Hit a 20 streak", reward: { coins: 60, xp: 120 } }] }),
    { goals: [{ id: "streak-20", label: "Hit a 20 streak", reward: { coins: 60, xp: 120 } }], coins: 60, xp: 120 }
  )
})
