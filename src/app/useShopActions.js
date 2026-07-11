import { useCallback } from "react"

import { equipShopItem, purchaseShopItem } from "../services/clickAwayHttpApiClient.js"
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

function hasFullProgressPayload(response) {
  const progress = response?.progress
  return Boolean(
    progress &&
    typeof progress === "object" &&
    Array.isArray(progress.ownedItemIds) &&
    progress.equippedButtonSkinId &&
    progress.equippedArenaThemeId &&
    progress.equippedProfileImageId
  )
}

function buildEquipProgressPatch(item, equippedIds) {
  if (item.type === "button_skin") {
    return { equippedButtonSkinId: item.id }
  }

  if (item.type === "arena_theme") {
    return { equippedArenaThemeId: item.id }
  }

  if (item.type === "profile_image") {
    return { equippedProfileImageId: item.id }
  }

  return equippedIds
}

export function useShopActions({
  isAuthed,
  coins,
  ownedItemIds,
  equippedButtonSkinId,
  equippedArenaThemeId,
  equippedProfileImageId,
  applyProgress,
  waitForPendingProgress,
  syncProgressSnapshot,
}) {
  const handlePurchase = useCallback(async (item) => {
    const canPurchase = canPurchaseShopItem(item, coins, ownedItemIds)
    if (!canPurchase) {
      return {
        ok: false,
        error: buildPurchaseError(item, coins, ownedItemIds),
      }
    }

    if (!isAuthed) {
      return {
        ok: false,
        error: "You must be logged in to unlock items.",
      }
    }

    try {
      await waitForPendingProgress?.()
      const session = await purchaseShopItem(item.id)
      const nextProgress = applyProgress({
        ...syncProgressSnapshot?.(),
        ...(hasFullProgressPayload(session)
          ? {
              coins: session.progress.coins,
              ownedItemIds: session.progress.ownedItemIds,
            }
          : {
              coins: Math.max(0, coins - (Number(item.cost) || 0)),
              ownedItemIds: Array.from(new Set([...ownedItemIds, item.id])),
            }),
      })
      syncProgressSnapshot?.(nextProgress)
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: error.message || "Could not unlock that item.",
      }
    }
  }, [
    applyProgress,
    isAuthed,
    coins,
    ownedItemIds,
    syncProgressSnapshot,
    waitForPendingProgress,
  ])

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

    if (!isAuthed) {
      return {
        ok: false,
        error: "You must be logged in to equip items.",
      }
    }

    try {
      await waitForPendingProgress?.()
      const session = await equipShopItem(item.id)
      const nextProgress = applyProgress({
        ...syncProgressSnapshot?.(),
        ...(hasFullProgressPayload(session)
          ? {
              coins: session.progress.coins,
              ownedItemIds: session.progress.ownedItemIds,
              equippedButtonSkinId: session.progress.equippedButtonSkinId,
              equippedArenaThemeId: session.progress.equippedArenaThemeId,
              equippedProfileImageId: session.progress.equippedProfileImageId,
            }
          : buildEquipProgressPatch(item, {
              equippedButtonSkinId,
              equippedArenaThemeId,
              equippedProfileImageId,
            })),
      })
      syncProgressSnapshot?.(nextProgress)
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: error.message || "Could not equip that item.",
      }
    }
  }, [
    applyProgress,
    isAuthed,
    equippedArenaThemeId,
    equippedButtonSkinId,
    equippedProfileImageId,
    ownedItemIds,
    syncProgressSnapshot,
    waitForPendingProgress,
  ])

  return {
    handlePurchase,
    handleEquip,
  }
}
