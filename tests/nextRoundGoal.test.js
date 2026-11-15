import test from "node:test"
import assert from "node:assert/strict"

import { getNextRoundGoal } from "../src/utils/nextRoundGoal.js"
import { UNLOCK_WALL_PARTS } from "../src/utils/unlockWallUtils.js"

test("a near miss on the personal best comes first", () => {
  const goal = getNextRoundGoal({ score: 96, bestScore: 100, countsLevelProgress: true, level: 3, xpIntoLevel: 190, earnedXp: 100 })
  assert.deepEqual(goal, { kind: "best", text: "4 points off your best." })
  assert.equal(getNextRoundGoal({ score: 99, bestScore: 100 }).text, "1 point off your best.")
})

test("a far miss isn't a near miss", () => {
  assert.equal(getNextRoundGoal({ score: 37, bestScore: 1040 }), null)
})

test("a new best or first score has no near-miss line", () => {
  assert.equal(getNextRoundGoal({ score: 120, bestScore: 100 }), null)
  assert.equal(getNextRoundGoal({ score: 50, bestScore: 0 }), null)
})

test("a level one more similar round reaches, with its unlock", () => {
  // Level 1 needs 100 XP, level 2 needs 150. 0 + 160 XP lands at level 2 with 60;
  // another 160 would cross level 2 (needs 90 more).
  const goal = getNextRoundGoal({ score: 40, bestScore: 0, countsLevelProgress: true, level: 1, xpIntoLevel: 0, earnedXp: 160 })
  assert.equal(goal.kind, "level")
  const unlock = UNLOCK_WALL_PARTS.find((part) => part.unlockLevel === 3)
  assert.equal(goal.text, unlock
    ? `One more round like that reaches Lv 3 and unlocks ${unlock.label}.`
    : "One more round like that reaches Lv 3.")
})

test("no level line when the next level is out of reach or progress doesn't count", () => {
  assert.equal(getNextRoundGoal({ countsLevelProgress: true, level: 10, xpIntoLevel: 0, earnedXp: 40 }), null)
  assert.equal(getNextRoundGoal({ countsLevelProgress: false, level: 1, xpIntoLevel: 90, earnedXp: 160 }), null)
})

test("the once-a-day bonus isn't counted as part of the next round", () => {
  // 0 + 320 XP (160 + 160 bonus) lands at level 3 with 70; level 3 needs 200, so 130 more.
  assert.equal(getNextRoundGoal({ countsLevelProgress: true, level: 1, xpIntoLevel: 0, earnedXp: 320, nextRoundXp: 160 }).kind, "level")
  assert.equal(getNextRoundGoal({ countsLevelProgress: true, level: 1, xpIntoLevel: 0, earnedXp: 320, nextRoundXp: 100 }), null)
})

// Daily goals: built from the day's real definitions, so the tests don't depend
// on which goals a date picks.
import { getDailyGoals } from "../src/utils/dailyGoals.js"

function goalsFor(day, progressById = {}) {
  return {
    day,
    goals: getDailyGoals(day).map((goal) => {
      const progress = progressById[goal.id] ?? 0
      return { id: goal.id, label: goal.label, target: goal.target, progress, isComplete: progress >= goal.target, reward: goal.reward }
    }),
  }
}

function findDay(predicate) {
  for (let offset = 0; offset < 120; offset += 1) {
    const day = new Date(Date.UTC(2026, 10, 15 + offset)).toISOString().slice(0, 10)
    if (predicate(getDailyGoals(day))) return day
  }
  throw new Error("no matching day")
}

const plainRound = { modeId: "normal", hits: 10, misses: 6, bestStreak: 3 }
const base = { score: 40, bestScore: 0, countsLevelProgress: true, level: 20, xpIntoLevel: 0, earnedXp: 50 }

test("names a daily goal the next round would finish, with its coins", () => {
  const day = findDay(() => true)
  const [showUp] = getDailyGoals(day)
  const goal = getNextRoundGoal({ ...base, dailyGoals: goalsFor(day, { [showUp.id]: showUp.target - 1 }), round: plainRound })
  assert.equal(goal.kind, "daily")
  assert.equal(goal.text, `One more round like that finishes today's goal: ${showUp.label} (+${showUp.reward.coins} coins).`)
})

test("a streak goal is named once this round got three quarters of the way", () => {
  const day = findDay((goals) => goals[1].kind === "streak")
  const streakGoal = getDailyGoals(day)[1]
  const close = Math.ceil(streakGoal.target * 0.75)
  const goal = getNextRoundGoal({ ...base, dailyGoals: goalsFor(day), round: { ...plainRound, bestStreak: close } })
  assert.equal(goal.text, `Today's goal: ${streakGoal.label} (+${streakGoal.reward.coins} coins). Your best this round was ${close}.`)
  assert.equal(getNextRoundGoal({ ...base, dailyGoals: goalsFor(day), round: { ...plainRound, bestStreak: close - 1 } }), null)
})

test("a Ranked-only goal isn't promised after a Casual round", () => {
  const day = findDay((goals) => goals[2].modeId === "hard")
  const ranked = getDailyGoals(day)[2]
  const dailyGoals = goalsFor(day, { [ranked.id]: ranked.target - 1 })
  assert.equal(getNextRoundGoal({ ...base, dailyGoals, round: plainRound }), null)
  assert.equal(getNextRoundGoal({ ...base, dailyGoals, round: { ...plainRound, modeId: "hard" } }).kind, "daily")
})

test("a near personal best still comes first, and finished or missing goals say nothing", () => {
  const day = findDay(() => true)
  const [showUp] = getDailyGoals(day)
  const nearGoal = goalsFor(day, { [showUp.id]: showUp.target - 1 })
  assert.equal(getNextRoundGoal({ ...base, score: 96, bestScore: 100, dailyGoals: nearGoal, round: plainRound }).kind, "best")
  assert.equal(getNextRoundGoal({ ...base, dailyGoals: goalsFor(day, { [showUp.id]: showUp.target }), round: plainRound }), null)
  assert.equal(getNextRoundGoal({ ...base, dailyGoals: null, round: plainRound }), null)
  // Practice (no progression) never points at goals it can't count toward.
  assert.equal(getNextRoundGoal({ ...base, countsLevelProgress: false, dailyGoals: nearGoal, round: plainRound }), null)
})
