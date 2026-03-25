import { useCallback } from "react"

import { equipShopItem, purchaseShopItem } from "../services/api.js"
import { canPurchaseShopItem, isShopItemOwned } from "../utils/shopUtils.js"

function buildPurchaseError(item, coins, ownedItemIds) {
  if (!item?.id) return "Unknown item."
  if (item.builtIn) return "Built-in items cannot be purchased."
  if (ownedItemIds.includes(item.id)) return "Item is already owned."
  if (coins < item.cost) return "Not enough coins."
  return "Could not unlock that item."
}

function buildEquipError(item, ownedItemIds) {
  if (!item?.id || !item.type) return "Unknown item."
  if (item.builtIn) return ""
  if (!ownedItemIds.includes(item.id)) {
    return "Item must be owned before it can be equipped."
  }
  return "Could not equip that item."
}

export function useShopActions({
  authToken,
  coins,
  ownedItemIds,
  applyPlayerState,
}) {
  const handlePurchase = useCallback(async (item) => {
    const canPurchase = canPurchaseShopItem(item, coins, ownedItemIds)
    if (!canPurchase) {
      return {
        ok: false,
        error: buildPurchaseError(item, coins, ownedItemIds),
      }
    }

    if (!authToken) {
      return {
        ok: false,
        error: "You must be logged in to unlock items.",
      }
    }

    try {
      const playerState = await purchaseShopItem(authToken, item.id)
      applyPlayerState(playerState)
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: error.message || "Could not unlock that item.",
      }
    }
  }, [applyPlayerState, authToken, coins, ownedItemIds])

  const handleEquip = useCallback(async (item) => {
    if (!item?.id || !item.type) {
      return {
        ok: false,
        error: "Unknown item.",
      }
    }

    const isOwned = isShopItemOwned(item, ownedItemIds)
    if (!isOwned) {
      return {
        ok: false,
        error: buildEquipError(item, ownedItemIds),
      }
    }

    if (!authToken) {
      return {
        ok: false,
        error: "You must be logged in to equip items.",
      }
    }

    try {
      const playerState = await equipShopItem(authToken, item.id)
      applyPlayerState(playerState)
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: error.message || "Could not equip that item.",
      }
    }
  }, [applyPlayerState, authToken, ownedItemIds])

  return {
    handlePurchase,
    handleEquip,
  }
}
