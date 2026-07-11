import test from "node:test"
import assert from "node:assert/strict"

import { pickProgressIntent } from "../src/app/progressIntent.js"

test("pickProgressIntent keeps only server-owned intent fields", () => {
  const intent = pickProgressIntent({
    savedLoadouts: [{ id: "loadout_1" }],
    activeLoadoutId: "loadout_1",
    buildWalkthrough: { status: "completed" },
    selectedModeId: "normal",
    coins: 999,
    rankMmr: 2500,
    unlockedAchievementIds: ["career-rounds-250"],
  })

  assert.deepEqual(intent, {
    savedLoadouts: [{ id: "loadout_1" }],
    activeLoadoutId: "loadout_1",
    buildWalkthrough: { status: "completed" },
    selectedModeId: "normal",
  })
  assert.equal(intent.coins, undefined)
  assert.equal(intent.rankMmr, undefined)
})
