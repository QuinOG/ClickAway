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

