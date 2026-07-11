import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  applyRoundToLifetimeStats,
  applyRoundToLoadoutStats,
  buildAchievementStatsFromLifetime,
  buildLifetimeStatsFromRounds,
  normalizeLifetimeStats,
} from "../src/utils/lifetimeStatsUtils.js"

describe("lifetimeStatsUtils", () => {
  it("increments durable counters for a ranked round", () => {
    const nextStats = applyRoundToLifetimeStats({}, {
      hits: 18,
      misses: 2,
      score: 420,
      bestStreak: 9,
      coinsEarned: 35,
      avgReactionMs: 210,
      bestReactionMs: 180,
      progressionMode: "ranked",
      rankDelta: 12,
      loadoutSnapshot: {
        loadoutId: "loadout_1",
        loadoutName: "Tempo Build",
      },
    })

    assert.equal(nextStats.totalRounds, 1)
    assert.equal(nextStats.rankedRounds, 1)
    assert.equal(nextStats.bestSingleScore, 420)
    assert.equal(nextStats.totalCoinsEarned, 35)
    assert.equal(nextStats.bestSingleRoundAccuracy, 90)
    assert.equal(nextStats.currentConsecutiveRankedWins, 1)
    assert.equal(nextStats.maxConsecutiveRankedWins, 1)
    assert.equal(nextStats.reactionRounds, 1)
    assert.equal(nextStats.bestReactionMs, 180)
  })

  it("resets ranked win streaks after a non-positive ranked result", () => {
    const seededStats = normalizeLifetimeStats({
      currentConsecutiveRankedWins: 3,
      maxConsecutiveRankedWins: 3,
    })

    const nextStats = applyRoundToLifetimeStats(seededStats, {
      hits: 10,
      misses: 5,
      score: 200,
      bestStreak: 4,
      coinsEarned: 10,
      progressionMode: "ranked",
      rankDelta: 0,
    })

    assert.equal(nextStats.currentConsecutiveRankedWins, 0)
    assert.equal(nextStats.maxConsecutiveRankedWins, 3)
  })

  it("tracks per-build personal bests and ranked wins", () => {
    const nextStats = applyRoundToLoadoutStats({}, {
      hits: 12,
      misses: 1,
      score: 310,
      bestStreak: 7,
      progressionMode: "ranked",
      rankDelta: 8,
      loadoutSnapshot: {
        loadoutId: "loadout_2",
        loadoutName: "Streak Lens",
      },
    })

    assert.equal(nextStats.loadoutId, "loadout_2")
    assert.equal(nextStats.totalRounds, 1)
    assert.equal(nextStats.rankedRounds, 1)
    assert.equal(nextStats.rankedWins, 1)
    assert.equal(nextStats.bestScore, 310)
    assert.equal(nextStats.bestRankedStreak, 7)
  })

  it("rebuilds lifetime stats from chronological rounds", () => {
    const lifetimeStats = buildLifetimeStatsFromRounds([
      {
        playedAtIso: "2026-07-01T12:00:00.000Z",
        hits: 8,
        misses: 2,
        score: 180,
        bestStreak: 5,
        coinsEarned: 12,
        progressionMode: "non_ranked",
      },
      {
        playedAtIso: "2026-07-02T12:00:00.000Z",
        hits: 15,
        misses: 0,
        score: 360,
        bestStreak: 10,
        coinsEarned: 24,
        avgReactionMs: 190,
        bestReactionMs: 160,
        progressionMode: "ranked",
        rankDelta: 10,
      },
    ])

    assert.equal(lifetimeStats.totalRounds, 2)
    assert.equal(lifetimeStats.rankedRounds, 1)
    assert.equal(lifetimeStats.cleanRounds, 1)
    assert.equal(lifetimeStats.totalCoinsEarned, 36)
    assert.equal(lifetimeStats.bestSingleScore, 360)
    assert.equal(lifetimeStats.bestReactionMs, 160)
  })

  it("feeds achievement metrics from lifetime counters", () => {
    const achievementStats = buildAchievementStatsFromLifetime({
      lifetimeStats: {
        totalRounds: 250,
        rankedRounds: 80,
        bestStreak: 18,
        totalCoinsEarned: 4200,
        cleanRounds: 6,
        bestSingleRoundAccuracy: 96,
        bestRankedStreak: 14,
        bestSingleScore: 880,
        maxConsecutiveRankedWins: 5,
      },
      levelProgress: { level: 22 },
      coins: 900,
    })

    assert.equal(achievementStats.totalRounds, 250)
    assert.equal(achievementStats.rankedRounds, 80)
    assert.equal(achievementStats.totalCoinsEarned, 4200)
    assert.equal(achievementStats.level, 22)
    assert.equal(achievementStats.currentCoins, 900)
  })
})
