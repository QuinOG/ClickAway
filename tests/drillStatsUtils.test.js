import test from "node:test"
import assert from "node:assert/strict"

import { DRILL_IDS } from "../src/constants/drillConfig.js"
import {
  applyRoundToDrillStats,
  evaluateDrillMetric,
  formatDrillBestMetric,
  isDrillMetricBetter,
} from "../src/utils/drillStatsUtils.js"
import { getTrainingDrillById } from "../src/constants/drillConfig.js"

test("evaluateDrillMetric tracks accuracy and streak drills", () => {
  const accuracyDrill = getTrainingDrillById(DRILL_IDS.ACCURACY)
  const streakDrill = getTrainingDrillById(DRILL_IDS.STREAK)

  assert.equal(
    evaluateDrillMetric(accuracyDrill, { hits: 8, misses: 2 }),
    80
  )
  assert.equal(
    evaluateDrillMetric(streakDrill, { bestStreak: 11 }),
    11
  )
})

test("applyRoundToDrillStats keeps the best metric per drill", () => {
  const drillStats = applyRoundToDrillStats({}, DRILL_IDS.STREAK, { bestStreak: 7 })
  const improved = applyRoundToDrillStats(drillStats, DRILL_IDS.STREAK, { bestStreak: 11 })
  const worse = applyRoundToDrillStats(improved, DRILL_IDS.STREAK, { bestStreak: 8 })

  assert.equal(improved[DRILL_IDS.STREAK].bestMetric, 11)
  assert.equal(worse[DRILL_IDS.STREAK].bestMetric, 11)
  assert.equal(worse[DRILL_IDS.STREAK].rounds, 3)
})

test("reaction drill treats lower average reaction as better", () => {
  const reactionDrill = getTrainingDrillById(DRILL_IDS.REACTION)

  assert.equal(isDrillMetricBetter(reactionDrill, 320, 410), true)
  assert.equal(isDrillMetricBetter(reactionDrill, 450, 410), false)
  assert.equal(
    formatDrillBestMetric(reactionDrill, { bestMetric: 305 }),
    "305ms"
  )
})
