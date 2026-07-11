import test from "node:test"
import assert from "node:assert/strict"

import { buildDrillMode, isValidDrillId } from "../src/constants/drillConfig.js"
import { getWarmupSuggestion } from "../src/utils/trainingRecommendations.js"

test("buildDrillMode applies drill overrides on top of practice", () => {
  const drillMode = buildDrillMode("accuracy_shooter")

  assert.equal(drillMode.id, "easy")
  assert.equal(drillMode.drillId, "accuracy_shooter")
  assert.equal(drillMode.isTimedRound, true)
  assert.equal(drillMode.initialButtonSize, 88)
})

test("isValidDrillId rejects unknown drills", () => {
  assert.equal(isValidDrillId("accuracy_shooter"), true)
  assert.equal(isValidDrillId("unknown_drill"), false)
})

test("getWarmupSuggestion appears for ranked players with low accuracy", () => {
  const suggestion = getWarmupSuggestion({
    totalRounds: 20,
    totalHits: 40,
    totalMisses: 30,
    bestStreak: 12,
    reactionRounds: 10,
    totalReactionMs: 3000,
  }, "hard")

  assert.equal(suggestion?.id, "accuracy_shooter")
})
