import test from "node:test"
import assert from "node:assert/strict"

import { getDifficultyById } from "../src/constants/gameModesConfig.js"
import { canPurchaseShopItem } from "../src/utils/shopUtils.js"

test("F-G05 / F-G06: Casual uses 30s timer; Ranked uses 15s", () => {
  assert.equal(getDifficultyById("normal").durationSeconds, 30)
  assert.equal(getDifficultyById("normal").label, "Casual")
  assert.equal(getDifficultyById("hard").durationSeconds, 15)
  assert.equal(getDifficultyById("hard").label, "Ranked")
})

test("F-G07: Practice is untimed for round pressure (isTimedRound false)", () => {
  const practice = getDifficultyById("easy")
  assert.equal(practice.isTimedRound, false)
  assert.equal(practice.allowsCoinRewards, false)
  assert.equal(practice.allowsLevelProgression, false)
})

test("F-S02: unaffordable shop purchase is blocked by client rules", () => {
  const item = { id: "premium_theme", type: "arena_theme", cost: 5000, builtIn: false }
  assert.equal(canPurchaseShopItem(item, 10, []), false)
  assert.equal(canPurchaseShopItem(item, 5000, []), true)
})
