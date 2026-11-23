/**
 * Returns true if a shop item is already owned.
 * @param {Object} item
 * @param {string[]} ownedItemIds
 * @returns {boolean}
 */
export function isShopItemOwned(item, ownedItemIds) {
  if (!item?.id) return false
  return Boolean(item.builtIn || (Array.isArray(ownedItemIds) && ownedItemIds.includes(item.id)))
}

/**
 * Returns true if an item can be purchased.
 * @param {Object} item
 * @param {number} coins
 * @param {string[]} ownedItemIds
 * @returns {boolean}
 */
export function canPurchaseShopItem(item, coins, ownedItemIds) {
  if (!item?.id || !Number.isFinite(item.cost)) return false
  if (item.builtIn) return false
  if (Array.isArray(ownedItemIds) && ownedItemIds.includes(item.id)) return false
  return Number.isFinite(coins) && coins >= item.cost
}

/**
 * Builds common shop item status flags for UI rendering.
 * @param {Object} options
 * @param {Object} options.item
 * @param {number} options.coins
 * @param {string[]} options.ownedItemIds
 * @param {string} options.equippedButtonSkinId
 * @param {string} options.equippedArenaThemeId
 * @param {string} options.equippedProfileImageId
 * @returns {{isOwned: boolean, canAfford: boolean, isAffordable: boolean, isEquipped: boolean, state: string}}
 */
export function getShopItemStatus({
  item,
  coins,
  ownedItemIds,
  equippedButtonSkinId,
  equippedArenaThemeId,
  equippedProfileImageId,
}) {
  if (!item) {
    return { isOwned: false, canAfford: false, isAffordable: false, isEquipped: false, state: "locked" }
  }
  const isOwned = isShopItemOwned(item, ownedItemIds)
  const canAfford = Number.isFinite(coins) && Number.isFinite(item.cost) && coins >= item.cost
  const isEquipped =
    (item.type === "button_skin" && item.id === equippedButtonSkinId) ||
    (item.type === "arena_theme" && item.id === equippedArenaThemeId) ||
    (item.type === "profile_image" && item.id === equippedProfileImageId)
  const isAffordable = !isOwned && canAfford
  const state = isEquipped
    ? "equipped"
    : isOwned
      ? "owned"
      : isAffordable
        ? "affordable"
        : "locked"

  return { isOwned, canAfford, isAffordable, isEquipped, state }
}

/**
 * Returns the cheapest item a round's coins just brought within reach: one the
 * player couldn't afford before the round and can now. Ties keep catalog order.
 * @param {Object[]} items Catalog items, in catalog order.
 * @param {Object} options
 * @param {number|null} options.coinsBefore Balance when the round started.
 * @param {number|null} options.coinsAfter Balance once the round's coins land.
 * @param {string[]} [options.ownedItemIds]
 * @returns {Object|null}
 */
export function getNewlyAffordableShopItem(items, { coinsBefore, coinsAfter, ownedItemIds = [] } = {}) {
  // Number(null) is 0, which would read an unknown balance as "had no coins".
  if (coinsBefore == null || coinsAfter == null) return null
  const before = Number(coinsBefore)
  const after = Number(coinsAfter)
  if (!Number.isFinite(before) || !Number.isFinite(after) || after <= before) return null
  if (!Array.isArray(items)) return null
  const ownedIds = Array.isArray(ownedItemIds) ? ownedItemIds : []

  let cheapest = null
  for (const item of items) {
    if (!item?.id || typeof item.cost !== "number" || item.cost <= 0) continue
    if (item.builtIn || ownedIds.includes(item.id)) continue
    if (item.cost <= before || item.cost > after) continue
    // Strictly cheaper only, so the first of equal prices (catalog order) wins.
    if (!cheapest || item.cost < cheapest.cost) cheapest = item
  }
  return cheapest
}
