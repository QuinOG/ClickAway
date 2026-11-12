import test from "node:test"
import assert from "node:assert/strict"

import {
  buildRoundRules,
  normalizeLoadoutState,
} from "../src/constants/buildcraft.js"
import { getDifficultyById } from "../src/constants/gameModesConfig.js"

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

test("normalizeLoadoutState falls back from unknown loadout ids and locked or unknown modules", () => {
  const normalized = normalizeLoadoutState(1, [
    {
      id: "loadout_99",
      name: "  forged   loadout  ",
      moduleIds: {
        tempoCoreId: "tempo_bastion",
        streakLensId: "streak_balanced",
        powerRigId: "not_a_real_module",
      },
      powerupIds: ["magnet_center", "time_boost"],
    },
  ], "loadout_99")

  assert.equal(normalized.activeLoadoutId, "loadout_1")
  assert.deepEqual(
    normalized.savedLoadouts.map((loadout) => loadout.id),
    ["loadout_1", "loadout_2", "loadout_3"]
  )
  assert.deepEqual(normalized.savedLoadouts[0].moduleIds, {
    tempoCoreId: "tempo_balanced",
    streakLensId: "streak_balanced",
    powerRigId: "power_balanced",
  })
  assert.deepEqual(
    normalized.savedLoadouts[0].powerupIds,
    ["time_boost", "size_boost", "freeze_movement"]
  )
})

test("normalizeLoadoutState keeps catalog ids only when the player level unlocks them", () => {
  const normalized = normalizeLoadoutState(5, [
    {
      id: "loadout_1",
      name: "Unlocked",
      moduleIds: {
        tempoCoreId: "tempo_bastion",
        streakLensId: "streak_rapidfire",
        powerRigId: "power_surge",
      },
      powerupIds: ["magnet_center", "combo_surge"],
    },
  ], "loadout_1")

  assert.deepEqual(normalized.savedLoadouts[0].moduleIds, {
    tempoCoreId: "tempo_bastion",
    streakLensId: "streak_balanced",
    powerRigId: "power_surge",
  })
  assert.deepEqual(
    normalized.savedLoadouts[0].powerupIds,
    ["magnet_center", "time_boost", "size_boost"]
  )
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
