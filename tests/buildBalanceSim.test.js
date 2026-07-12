import test from "node:test"
import assert from "node:assert/strict"

import {
  buildRoundRules,
  MODULE_SLOTS,
  PASSIVE_LOADOUT_MODULES,
} from "../src/constants/buildcraft.js"
import { getDifficultyById } from "../src/constants/gameModesConfig.js"
import { replayRoundEvents } from "../src/game/engine/roundEngine.js"

// A tuning harness for Phase 10's content wave: every passive module gets
// swapped in alone (other two lanes left at their Balanced default) against a
// skilled-but-human Ranked sample (one miss every 12 clicks) so combo/score
// multipliers have room to matter without letting streaks grow unbounded.
// Guardrail: no single module may push expected score further above Balanced
// than the most aggressive module already shipped, so new content can't be
// strictly dominant over the original set.
const MODE = getDifficultyById("hard")
const BALANCED_MODULE_IDS = {
  tempoCoreId: "tempo_balanced",
  streakLensId: "streak_balanced",
  powerRigId: "power_balanced",
}
const SAMPLE_POWERUP_IDS = ["time_boost", "size_boost", "freeze_movement"]

function buildSampleEvents(count = 240) {
  const events = []
  let t = 0
  for (let i = 1; i <= count; i++) {
    t += 300
    events.push({ type: i % 12 === 0 ? "miss" : "hit", t })
  }
  return events
}

function expectedScore(moduleIds) {
  const roundRules = buildRoundRules(MODE, { moduleIds, powerupIds: SAMPLE_POWERUP_IDS })
  return replayRoundEvents(roundRules, buildSampleEvents()).score
}

const ORIGINAL_MODULE_IDS = new Set([
  "tempo_balanced", "tempo_anchor", "tempo_overdrive",
  "streak_balanced", "streak_momentum", "streak_stabilizer",
  "power_balanced", "power_surge", "power_reserve",
])

test("balance sim: no module is strictly dominant over the original set", () => {
  const baseline = expectedScore(BALANCED_MODULE_IDS)
  const deltasById = {}

  PASSIVE_LOADOUT_MODULES.forEach((module) => {
    const slot = MODULE_SLOTS.find((candidate) => candidate.id === module.slotId)
    const moduleIds = { ...BALANCED_MODULE_IDS, [slot.key]: module.id }
    const deltaPercent = ((expectedScore(moduleIds) - baseline) / baseline) * 100
    deltasById[module.id] = deltaPercent
  })

  const maxOriginalDelta = Math.max(
    ...PASSIVE_LOADOUT_MODULES
      .filter((module) => ORIGINAL_MODULE_IDS.has(module.id))
      .map((module) => deltasById[module.id])
  )

  // Documented guardrail ceiling from the improvement plan (Phase 10): no part
  // may raise expected Ranked score more than 20% over Balanced.
  assert.ok(maxOriginalDelta <= 20, `original set ceiling drifted to ${maxOriginalDelta}%`)

  PASSIVE_LOADOUT_MODULES
    .filter((module) => !ORIGINAL_MODULE_IDS.has(module.id))
    .forEach((module) => {
      assert.ok(
        deltasById[module.id] <= maxOriginalDelta + 0.5,
        `${module.id} (${deltasById[module.id].toFixed(1)}%) exceeds the original set's ceiling (${maxOriginalDelta.toFixed(1)}%)`
      )
      assert.ok(
        deltasById[module.id] <= 20.5,
        `${module.id} (${deltasById[module.id].toFixed(1)}%) exceeds the documented 20% guardrail`
      )
    })
})

test("balance sim: new modules stay within the mode's own clamps", () => {
  PASSIVE_LOADOUT_MODULES
    .filter((module) => !ORIGINAL_MODULE_IDS.has(module.id))
    .forEach((module) => {
      const slot = MODULE_SLOTS.find((candidate) => candidate.id === module.slotId)
      const roundRules = buildRoundRules(MODE, {
        moduleIds: { ...BALANCED_MODULE_IDS, [slot.key]: module.id },
        powerupIds: SAMPLE_POWERUP_IDS,
      })

      assert.ok(roundRules.minButtonSize >= 8)
      assert.ok(roundRules.initialButtonSize >= roundRules.minButtonSize + 4)
      assert.ok(roundRules.shrinkFactor >= 0.88 && roundRules.shrinkFactor <= 0.99)
      assert.ok(roundRules.comboStep >= 2)
      assert.ok(roundRules.missPenalty >= 0)
    })
})
