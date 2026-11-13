import { useCallback } from "react"

import { equipShopItem, purchaseShopItem } from "../services/clickAwayHttpApiClient.js"
import { canPurchaseShopItem, isShopItemOwned } from "../utils/shopUtils.js"
import { applyProgressResponse, beginProgressRequest, isCurrentSession } from "./progressResponseGuard.js"

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
  isAuthed,
  coins,
  ownedItemIds,
  applyProgress,
  waitForPendingProgress,
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
      // The ticket is taken before waiting, so a purchase or equip started by one
      // account is never sent after another account has logged in.
      const ticket = beginProgressRequest()
      await waitForPendingProgress?.()
      if (!isCurrentSession(ticket)) {
        return { ok: false, error: "You switched accounts, so that wasn't sent." }
      }
      const session = await purchaseShopItem(item.id)
      const outcome = await applyProgressResponse(ticket, session.progress, applyProgress)
      if (outcome === "refresh-failed") {
        return { ok: false, error: "Item unlocked, but the Shop couldn't refresh. Reload to see it." }
      }
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
      // The ticket is taken before waiting, so a purchase or equip started by one
      // account is never sent after another account has logged in.
      const ticket = beginProgressRequest()
      await waitForPendingProgress?.()
      if (!isCurrentSession(ticket)) {
        return { ok: false, error: "You switched accounts, so that wasn't sent." }
      }
      const session = await equipShopItem(item.id)
      const outcome = await applyProgressResponse(ticket, session.progress, applyProgress)
      if (outcome === "refresh-failed") {
        return { ok: false, error: "Item equipped, but the Shop couldn't refresh. Reload to see it." }
      }
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
    ownedItemIds,
    waitForPendingProgress,
  ])

  return {
    handlePurchase,
    handleEquip,
  }
}
