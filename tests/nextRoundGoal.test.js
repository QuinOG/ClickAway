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
