import { DIFFICULTIES_BY_ID as MODES_BY_ID } from "../constants/difficultyConfig.js"
import { SHOP_ITEMS_BY_ID } from "../constants/shopCatalog.js"

export function isValidModeId(modeId) {
  return Boolean(MODES_BY_ID[modeId])
}

export function normalizeUsername(username = "") {
  return String(username).trim()
}

export function getEquippedShopItem(itemId, fallbackItemId) {
  return SHOP_ITEMS_BY_ID[itemId] ?? SHOP_ITEMS_BY_ID[fallbackItemId]
}

export function mergeUnlockedAchievementIds(currentIds, nextUnlockedIds) {
  const currentList = Array.isArray(currentIds)
    ? currentIds.filter((id) => typeof id === "string")
    : []
  const nextList = Array.isArray(nextUnlockedIds)
    ? nextUnlockedIds.filter((id) => typeof id === "string")
    : []
  const mergedSet = new Set(currentList)
  let hasChanges = currentList.length !== (Array.isArray(currentIds) ? currentIds.length : 0)

  nextList.forEach((id) => {
    if (!mergedSet.has(id)) {
      mergedSet.add(id)
      hasChanges = true
    }
  })

  if (!hasChanges) return currentIds
  return Array.from(mergedSet)
}
