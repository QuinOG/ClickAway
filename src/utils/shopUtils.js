/**
 * Returns true if a shop item is already owned.
 * @param {Object} item
 * @param {string[]} ownedItemIds
 * @returns {boolean}
 */
export function isShopItemOwned(item, ownedItemIds) {
  if (!item?.id) return false
  return Boolean(item.builtIn || ownedItemIds.includes(item.id))
}

/**
 * Returns true if an item can be purchased.
 * @param {Object} item
 * @param {number} coins
 * @param {string[]} ownedItemIds
 * @returns {boolean}
 */
export function canPurchaseShopItem(item, coins, ownedItemIds) {
  if (!item?.id || typeof item.cost !== "number") return false
  if (item.builtIn) return false
  if (ownedItemIds.includes(item.id)) return false
  return coins >= item.cost
}

/**
 * Builds common shop item status flags for UI rendering.
 * @param {Object} options
 * @param {Object} options.item
 * @param {number} options.coins
 * @param {string[]} options.ownedItemIds
 * @param {string} options.equippedButtonSkinId
 * @param {string} options.equippedArenaThemeId
 * @returns {{isOwned: boolean, canAfford: boolean, isEquipped: boolean}}
 */
export function getShopItemStatus({
  item,
  coins,
  ownedItemIds,
  equippedButtonSkinId,
  equippedArenaThemeId,
}) {
  const isOwned = isShopItemOwned(item, ownedItemIds)
  const canAfford = coins >= item.cost
  const isEquipped =
    (item.type === "button_skin" && item.id === equippedButtonSkinId) ||
    (item.type === "arena_theme" && item.id === equippedArenaThemeId)

  return { isOwned, canAfford, isEquipped }
}
