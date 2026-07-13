import test from "node:test"
import assert from "node:assert/strict"

import {
  getUnseenUnlockedParts,
  hasUnseenUnlockedParts,
  normalizeSeenUnlockPartIds,
} from "../src/utils/unlockWallUtils.js"
import { encodeBlueprint, importBlueprint } from "../src/utils/blueprintCodeUtils.js"

test("getUnseenUnlockedParts only returns parts unlocked by level and not yet seen", () => {
  const unseenAtLevel1 = getUnseenUnlockedParts(1, [])
  assert.ok(unseenAtLevel1.length > 0)
  assert.ok(unseenAtLevel1.every((part) => part.unlockLevel <= 1))

  const seenIds = unseenAtLevel1.map((part) => part.id)
  assert.equal(getUnseenUnlockedParts(1, seenIds).length, 0)
})

test("getUnseenUnlockedParts sorts by unlock level ascending", () => {
  const unseen = getUnseenUnlockedParts(25, [])
  for (let i = 1; i < unseen.length; i += 1) {
    assert.ok(unseen[i].unlockLevel >= unseen[i - 1].unlockLevel)
  }
})

test("hasUnseenUnlockedParts reflects whether any unlocked part is unseen", () => {
  assert.equal(hasUnseenUnlockedParts(1, []), true)
  const allIds = getUnseenUnlockedParts(30, []).map((part) => part.id)
  assert.equal(hasUnseenUnlockedParts(30, allIds), false)
})

test("normalizeSeenUnlockPartIds drops unknown ids and de-duplicates", () => {
  assert.deepEqual(
    normalizeSeenUnlockPartIds(["tempo_balanced", "tempo_balanced", "not_a_real_part", 42]),
    ["tempo_balanced"]
  )
})

test("encodeBlueprint then importBlueprint round-trips a fully unlocked build", () => {
  const loadout = {
    id: "loadout_1",
    name: "Test Build",
    moduleIds: {
      tempoCoreId: "tempo_overdrive",
      streakLensId: "streak_momentum",
      powerRigId: "power_surge",
    },
    powerupIds: ["time_boost", "size_boost", "freeze_movement"],
  }

  const code = encodeBlueprint(loadout)
  assert.ok(code.startsWith("CAB1-"))

  const result = importBlueprint(code, 30)
  assert.equal(result.ok, true)
  assert.equal(result.name, "Test Build")
  assert.deepEqual(result.moduleIds, loadout.moduleIds)
  assert.deepEqual(result.powerupIds, loadout.powerupIds)
  assert.deepEqual(result.notes, [])
})

test("importBlueprint clamps parts the importing player hasn't unlocked", () => {
  const loadout = {
    id: "loadout_1",
    name: "High Level Build",
    moduleIds: {
      tempoCoreId: "tempo_flashpoint", // unlocks at level 21
      streakLensId: "streak_balanced",
      powerRigId: "power_balanced",
    },
    powerupIds: ["time_boost", "size_boost", "freeze_movement"],
  }

  const code = encodeBlueprint(loadout)
  const result = importBlueprint(code, 1)

  assert.equal(result.ok, true)
  assert.notEqual(result.moduleIds.tempoCoreId, "tempo_flashpoint")
  assert.ok(result.notes.length > 0)
  assert.ok(result.notes[0].includes("Level 21"))
})

test("importBlueprint rejects corrupted or non-blueprint codes", () => {
  assert.equal(importBlueprint("not-a-blueprint", 30).ok, false)
  assert.equal(importBlueprint("CAB1-not-valid-base64!!!", 30).ok, false)
})
