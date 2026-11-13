import test from "node:test"
import assert from "node:assert/strict"
import { buildRoundRules, DEFAULT_SAVED_LOADOUTS } from "../src/constants/buildcraft.js"
import { DIFFICULTIES } from "../src/constants/gameModesConfig.js"
import { getProfileStats } from "../src/features/armory/armorySpecRatings.js"

test("spec shrink factor preserves the build rule's tuning precision", () => {
  const loadout = { ...DEFAULT_SAVED_LOADOUTS[0], moduleIds: {
    ...DEFAULT_SAVED_LOADOUTS[0].moduleIds, tempoCoreId: "tempo_bastion",
  } }
  const rules = buildRoundRules(DIFFICULTIES[2], loadout)
  assert.notEqual(rules.shrinkFactor, Number(rules.shrinkFactor.toFixed(2)))
  const shrink = getProfileStats(rules).find((stat) => stat.key === "shrink")
  assert.equal(Number(shrink.value.slice(1)), Number(rules.shrinkFactor.toFixed(3)))
})
