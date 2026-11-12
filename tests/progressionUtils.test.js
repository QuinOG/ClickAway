import test from "node:test"
import assert from "node:assert/strict"

import {
  calculateRoundXp,
  getLevelProgress,
  getRequiredXpForLevel,
} from "../src/utils/progressionUtils.js"

// Intended rules: level 1 requires 100 XP and each later level requires 50 more
// (100, 150, 200, ...). Round XP is 5 per hit, 3 per best-streak point,
// floor(score * 0.2), plus 25 XP at >= 90% accuracy or 10 XP at >= 75%.
// All inputs are clamped to non-negative finite numbers.
test("getRequiredXpForLevel applies the 100 XP base and 50 XP per-level step", () => {
  assert.equal(getRequiredXpForLevel(1), 100)
  assert.equal(getRequiredXpForLevel(2), 150)
  assert.equal(getRequiredXpForLevel(3), 200)
  assert.equal(getRequiredXpForLevel(10), 550)
})

test("getRequiredXpForLevel clamps invalid and fractional levels to level 1 or below", () => {
  assert.equal(getRequiredXpForLevel(0), 100)
  assert.equal(getRequiredXpForLevel(-4), 100)
  assert.equal(getRequiredXpForLevel(Number.NaN), 100)
  assert.equal(getRequiredXpForLevel(Number.POSITIVE_INFINITY), 100)
  assert.equal(getRequiredXpForLevel(2.9), 150)
})

test("calculateRoundXp combines hits, best streak, score, and accuracy bonuses", () => {
  assert.equal(calculateRoundXp({ hits: 10, misses: 0 }), 75)
  assert.equal(calculateRoundXp({ hits: 9, misses: 1 }), 70)
  assert.equal(calculateRoundXp({ hits: 3, misses: 1 }), 25)
  assert.equal(calculateRoundXp({ hits: 4, misses: 1 }), 30)
  assert.equal(calculateRoundXp({ hits: 2, misses: 1 }), 10)
  assert.equal(calculateRoundXp({ hits: 0, misses: 0, bestStreak: 4, score: 17 }), 15)
})

test("calculateRoundXp awards no accuracy bonus below 75% and ignores invalid values", () => {
  assert.equal(calculateRoundXp({ hits: 0, misses: 4 }), 0)
  assert.equal(calculateRoundXp({ hits: -5, misses: -1, bestStreak: -2, score: -100 }), 0)
  assert.equal(
    calculateRoundXp({
      hits: Number.NaN,
      misses: Number.POSITIVE_INFINITY,
      bestStreak: "unknown",
      score: Number.NEGATIVE_INFINITY,
    }),
    0
  )
})

test("getLevelProgress reports level boundaries from cumulative requirements", () => {
  assert.deepEqual(getLevelProgress(0), {
    totalXp: 0,
    level: 1,
    xpIntoLevel: 0,
    xpToNextLevel: 100,
    xpForNextLevel: 100,
    progressPercent: 0,
  })

  assert.deepEqual(getLevelProgress(99), {
    totalXp: 99,
    level: 1,
    xpIntoLevel: 99,
    xpToNextLevel: 1,
    xpForNextLevel: 100,
    progressPercent: 99,
  })

  assert.deepEqual(getLevelProgress(100), {
    totalXp: 100,
    level: 2,
    xpIntoLevel: 0,
    xpToNextLevel: 150,
    xpForNextLevel: 150,
    progressPercent: 0,
  })

  assert.deepEqual(getLevelProgress(249), {
    totalXp: 249,
    level: 2,
    xpIntoLevel: 149,
    xpToNextLevel: 1,
    xpForNextLevel: 150,
    progressPercent: 99,
  })

  assert.deepEqual(getLevelProgress(250), {
    totalXp: 250,
    level: 3,
    xpIntoLevel: 0,
    xpToNextLevel: 200,
    xpForNextLevel: 200,
    progressPercent: 0,
  })

  assert.deepEqual(getLevelProgress(600), {
    totalXp: 600,
    level: 4,
    xpIntoLevel: 150,
    xpToNextLevel: 100,
    xpForNextLevel: 250,
    progressPercent: 60,
  })
})

test("getLevelProgress clamps invalid totals and floors fractional XP", () => {
  assert.deepEqual(getLevelProgress(Number.NaN), {
    totalXp: 0,
    level: 1,
    xpIntoLevel: 0,
    xpToNextLevel: 100,
    xpForNextLevel: 100,
    progressPercent: 0,
  })

  assert.deepEqual(getLevelProgress(Number.POSITIVE_INFINITY), {
    totalXp: 0,
    level: 1,
    xpIntoLevel: 0,
    xpToNextLevel: 100,
    xpForNextLevel: 100,
    progressPercent: 0,
  })

  assert.equal(getLevelProgress(-50).totalXp, 0)
  assert.equal(getLevelProgress(-50).level, 1)

  const fractional = getLevelProgress(149.9)
  assert.equal(fractional.totalXp, 149)
  assert.equal(fractional.level, 2)
  assert.equal(fractional.xpIntoLevel, 49)
})
