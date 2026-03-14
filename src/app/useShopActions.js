import { useCallback } from "react"

import { canPurchaseShopItem, isShopItemOwned } from "../utils/shopUtils.js"

export function useShopActions({
  coins,
  ownedItemIds,
  setCoins,
  setOwnedItemIds,
  setEquippedButtonSkinId,
  setEquippedArenaThemeId,
  setEquippedProfileImageId,
}) {
  const handlePurchase = useCallback((item) => {
    const canPurchase = canPurchaseShopItem(item, coins, ownedItemIds)
    if (!canPurchase) return false

    setCoins((currentCoins) => currentCoins - item.cost)
    setOwnedItemIds((currentItemIds) => [...currentItemIds, item.id])
    return true
  }, [coins, ownedItemIds, setCoins, setOwnedItemIds])

  const handleEquip = useCallback((item) => {
    if (!item?.id || !item.type) return false

    const isOwned = isShopItemOwned(item, ownedItemIds)
    if (!isOwned) return false

    if (item.type === "button_skin") {
      setEquippedButtonSkinId(item.id)
      return true
    }

    if (item.type === "arena_theme") {
      setEquippedArenaThemeId(item.id)
      return true
    }

    if (item.type === "profile_image") {
      setEquippedProfileImageId(item.id)
      return true
    }

    return false
  }, [
    ownedItemIds,
    setEquippedArenaThemeId,
    setEquippedButtonSkinId,
    setEquippedProfileImageId,
  ])

  return {
    handlePurchase,
    handleEquip,
  }
}
