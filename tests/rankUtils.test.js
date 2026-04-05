import test from "node:test"
import assert from "node:assert/strict"

import {
  applyRankedMatchResult,
  buildDefaultRankedState,
  calculatePlacementMatchScore,
  getRankProgressWithPlacement,
  migrateLegacyRankData,
  PLACEMENT_MATCH_COUNT,
  RANK_SYSTEM_VERSION,
} from "../src/utils/rankUtils.js"

test("rank progress stays unranked before any placement match starts", () => {
  const progress = getRankProgressWithPlacement({
    mmr: 0,
    hasRankedHistory: false,
    rankedState: buildDefaultRankedState(),
  })

  assert.equal(progress.isUnranked, true)
  assert.equal(progress.tierLabel, "Unranked")
})

test("placement match score is derived from match stats instead of a seeded rating", () => {
  const placementScore = calculatePlacementMatchScore({
    score: 75,
    hits: 20,
    misses: 2,
    bestStreak: 12,
    modeId: "hard",
    progressionMode: "ranked",
    allowsRankProgression: true,
  })

  assert.equal(placementScore, 13)
})

test("first placement match advances tracker using placement score only", () => {
  const result = applyRankedMatchResult({
    currentMmr: 0,
    currentRankedState: buildDefaultRankedState(),
    hasRankedHistory: false,
    baseRankDelta: 20,
    placementMatchScore: 13,
    allowsRankProgression: true,
  })

  assert.equal(result.nextRankedState.placementMatchesPlayed, 1)
  assert.equal(result.nextRankProgress.isPlacement, true)
  assert.equal(result.nextRankProgress.tierLabel, "Placement 1/5")
  assert.equal(result.appliedRankDelta, 13)
  assert.equal(result.placementMatchScore, 13)
  assert.equal(result.nextMmr, 13)
})

test("final placement reveal is capped at gold iii", () => {
  const result = applyRankedMatchResult({
    currentMmr: 80,
    currentRankedState: {
      ...buildDefaultRankedState(),
      placementMatchesPlayed: PLACEMENT_MATCH_COUNT - 1,
    },
    hasRankedHistory: true,
    baseRankDelta: 35,
    placementMatchScore: 20,
    allowsRankProgression: true,
  })

  assert.equal(result.nextRankedState.placementMatchesPlayed, PLACEMENT_MATCH_COUNT)
  assert.equal(result.nextRankProgress.isPlacement, false)
  assert.equal(result.nextRankProgress.majorTierId, "gold")
  assert.equal(result.nextRankProgress.divisionLabel, "III")
  assert.equal(result.nextMmr, 850)
})

test("legacy ranked players are reset into the new placement algorithm", () => {
  const migrated = migrateLegacyRankData({
    rankMmr: 1600,
    rankedState: {},
    roundHistory: [{ progressionMode: "ranked" }],
  })

  assert.equal(migrated.rankedState.rankSystemVersion, RANK_SYSTEM_VERSION)
  assert.equal(migrated.rankedState.placementMatchesPlayed, 0)
  assert.equal(migrated.rankMmr, 0)
})

test("promotion grants demotion protection for the next two matches", () => {
  const result = applyRankedMatchResult({
    currentMmr: 295,
    currentRankedState: {
      ...buildDefaultRankedState(),
      placementMatchesPlayed: PLACEMENT_MATCH_COUNT,
    },
    hasRankedHistory: true,
    baseRankDelta: 10,
    allowsRankProgression: true,
  })

  assert.equal(result.wasPromotion, true)
  assert.equal(result.nextRankProgress.tierLabel, "Silver I")
  assert.equal(result.nextRankedState.demotionProtectionRounds, 2)
})

test("demotion protection clamps rating to the current division floor", () => {
  const result = applyRankedMatchResult({
    currentMmr: 400,
    currentRankedState: {
      ...buildDefaultRankedState(),
      placementMatchesPlayed: PLACEMENT_MATCH_COUNT,
      demotionProtectionRounds: 2,
    },
    hasRankedHistory: true,
    baseRankDelta: -25,
    allowsRankProgression: true,
  })

  assert.equal(result.nextMmr, 400)
  assert.equal(result.nextRankProgress.tierLabel, "Silver II")
  assert.equal(result.nextRankedState.demotionProtectionRounds, 1)
})
