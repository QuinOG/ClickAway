import assert from "node:assert/strict"
import { test } from "node:test"
import { buildAchievementStats, evaluateAchievements } from "../src/game/achievements/evaluateAchievements.js"

test("history-based achievements exclude explicitly marked placement rounds", () => {
  const roundHistory = Array.from({ length: 3 }, () => ({
    progressionMode: "ranked", rankDelta: 50, rankedWin: false,
  }))
  const stats = buildAchievementStats({ roundHistory })
  assert.equal(stats.maxConsecutiveRankedWins, 0)
  assert.equal(evaluateAchievements(stats).find((item) => item.id === "skill-consec-wins-3").isUnlocked, false)
})

test("history-based achievements retain legacy wins and reset on explicit non-wins", () => {
  const stats = buildAchievementStats({ roundHistory: [
    { progressionMode: "ranked", rankDelta: 8 },
    { progressionMode: "ranked", rankDelta: 50, rankedWin: false },
    { progressionMode: "ranked", rankDelta: 8, rankedWin: true },
    { progressionMode: "ranked", rankDelta: 8 },
  ] })
  assert.equal(stats.maxConsecutiveRankedWins, 2)
})

test("missing history coin data is unavailable rather than zero progress", () => {
  const stats = buildAchievementStats({ roundHistory: [{ hits: 10 }] })
  const achievement = evaluateAchievements(stats).find((item) => item.metricKey === "totalCoinsEarned")
  assert.equal(stats.totalCoinsEarned, null)
  assert.equal(achievement.isProgressAvailable, false)
  assert.equal(achievement.progressText, "Progress unavailable")
})

test("unknown metrics remain unavailable while an explicit zero is available", () => {
  for (const totalRounds of [null, undefined, ""]) {
    const achievement = evaluateAchievements({ totalRounds }).find((item) => item.id === "easy-rounds-1")
    assert.equal(achievement.isProgressAvailable, false)
  }
  const achievement = evaluateAchievements({ totalRounds: 0 }).find((item) => item.id === "easy-rounds-1")
  assert.equal(achievement.isProgressAvailable, true)
  assert.equal(achievement.percent, 0)
})

test("a persisted unlock stays unlocked when its metric is unavailable", () => {
  const achievement = evaluateAchievements({}, { persistedUnlockedIds: ["easy-rounds-1"] })
    .find((item) => item.id === "easy-rounds-1")
  assert.equal(achievement.isUnlocked, true)
  assert.equal(achievement.percentText, "Unlocked")
})
