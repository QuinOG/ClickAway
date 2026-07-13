import { PASSIVE_LOADOUT_MODULES, LOADOUT_POWERUPS } from "../constants/buildcraft.js"

// The full catalog of draftable parts (Phase 11's unlock wall), each tagged
// with its kind so the wall and the ceremony can route installs correctly.
function getAllUnlockableParts() {
  return [
    ...PASSIVE_LOADOUT_MODULES.map((module) => ({ ...module, kind: "module" })),
    ...LOADOUT_POWERUPS.map((powerup) => ({ ...powerup, kind: "power" })),
  ]
}

export const UNLOCK_WALL_PARTS = getAllUnlockableParts()

const UNLOCK_WALL_PART_IDS = new Set(UNLOCK_WALL_PARTS.map((part) => part.id))

export function getUnlockWallPartById(partId) {
  return UNLOCK_WALL_PARTS.find((part) => part.id === partId) ?? null
}

// Only ids that name a real module or power survive — a stale id from a
// removed part (or a forged one) is silently dropped rather than crashing
// the ceremony queue.
export function normalizeSeenUnlockPartIds(values = []) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .filter((value) => typeof value === "string" && UNLOCK_WALL_PART_IDS.has(value))
    )
  )
}

// Parts unlocked by the player's current level that the ceremony has not yet
// shown, oldest unlock first so the queue plays back in the order the player
// actually earned them.
export function getUnseenUnlockedParts(playerLevel = 1, seenUnlockPartIds = []) {
  const seenSet = new Set(seenUnlockPartIds)

  return UNLOCK_WALL_PARTS
    .filter((part) => part.unlockLevel <= playerLevel && !seenSet.has(part.id))
    .sort((a, b) => a.unlockLevel - b.unlockLevel)
}

export function hasUnseenUnlockedParts(playerLevel = 1, seenUnlockPartIds = []) {
  return getUnseenUnlockedParts(playerLevel, seenUnlockPartIds).length > 0
}
