import test from "node:test"
import assert from "node:assert/strict"

import {
  buildRoundRules,
  normalizeLoadoutState,
} from "../src/constants/buildcraft.js"
import { getDifficultyById } from "../src/constants/difficultyConfig.js"

test("normalizeLoadoutState falls back from locked or duplicate powerups", () => {
  const normalized = normalizeLoadoutState(1, [
    {
      id: "loadout_1",
      name: "Gremlin",
      moduleIds: {
        tempoCoreId: "tempo_overdrive",
        streakLensId: "streak_momentum",
        powerRigId: "power_surge",
      },
      powerupIds: ["combo_surge", "combo_surge", "guard_charge"],
    },
  ], "loadout_1")

  assert.equal(normalized.activeLoadoutId, "loadout_1")
  assert.deepEqual(normalized.savedLoadouts[0].powerupIds, [
    "time_boost",
    "size_boost",
    "freeze_movement",
  ])
})

test("buildRoundRules applies module tradeoffs and clamps", () => {
  const roundRules = buildRoundRules(getDifficultyById("hard"), {
    id: "loadout_3",
    name: "Pressure",
    moduleIds: {
      tempoCoreId: "tempo_overdrive",
      streakLensId: "streak_momentum",
      powerRigId: "power_surge",
    },
    powerupIds: ["time_boost", "size_boost", "freeze_movement"],
  })

  assert.equal(roundRules.initialButtonSize, 88)
  assert.equal(roundRules.minButtonSize, 8)
  assert.equal(roundRules.comboStep, 4)
  assert.equal(roundRules.missPenalty, 4)
  assert.equal(roundRules.equippedPowerups[0].awardEvery, 4)
})
