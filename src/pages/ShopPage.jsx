import { useMemo, useState } from "react"
import toast from "react-hot-toast"
import { useFeedbackPreferences } from "../app/useFeedbackPreferences.js"
import { SHOP_CATEGORIES, SHOP_ITEMS_BY_ID } from "../constants/shopCatalog.js"
import { celebrateShopEquip, celebrateShopPurchase } from "../features/shop/shopPurchaseEquipCelebration.js"
import ShopCategoryTabs from "../features/shop/components/ShopCategoryTabs.jsx"
import ShopHeroHeader from "../features/shop/components/ShopHeroHeader.jsx"
import ShopItemCard from "../features/shop/components/ShopItemCard.jsx"
import { getShopItemStatus } from "../utils/shopUtils.js"
import { FEEDBACK_EVENTS } from "../constants/feedbackEvents.js"
import { useActionFeedback } from "../hooks/useActionFeedback.js"

const ALL_TAB_ID = "all_items"
const SHOP_ITEMS = SHOP_CATEGORIES.flatMap((category) => category.items)

function getOwnedCount(items, ownedItemIds) {
  return items.filter((item) => item.builtIn || ownedItemIds.includes(item.id)).length
}

export default function ShopPage({
  playerName = "Player",
  coins = 0,
  ownedItems = [],
  onPurchase,
  onEquip,
  equippedButtonSkinId = "skin_button",
  equippedArenaThemeId = "theme_default",
  equippedProfileImageId = "profile_default",
}) {
  const { effectivePreferences } = useFeedbackPreferences()
  const { signalAction } = useActionFeedback()
  const [activeCategoryId, setActiveCategoryId] = useState(ALL_TAB_ID)
  const [balancePulseKey, setBalancePulseKey] = useState(0)
  const [selectedItemId, setSelectedItemId] = useState(equippedButtonSkinId)
  const [pendingItemId, setPendingItemId] = useState(null)
  const [actionFeedback, setActionFeedback] = useState(null)

  const totalItems = SHOP_ITEMS.length
  const categoryOwnedCounts = useMemo(
    () =>
      Object.fromEntries(
        SHOP_CATEGORIES.map((category) => [category.id, getOwnedCount(category.items, ownedItems)])
      ),
    [ownedItems]
  )
  const totalOwnedCount = Object.values(categoryOwnedCounts).reduce(
    (ownedCount, count) => ownedCount + count,
    0
  )
  const collectionPercent = totalItems > 0 ? Math.round((totalOwnedCount / totalItems) * 100) : 0
  const tabs = useMemo(
    () => [
      {
        id: ALL_TAB_ID,
        label: "All Items",
        itemCount: totalItems,
        ownedCount: totalOwnedCount,
      },
      ...SHOP_CATEGORIES.map((category) => ({
        id: category.id,
        label: category.title,
        itemCount: category.items.length,
        ownedCount: categoryOwnedCounts[category.id] ?? 0,
      })),
    ],
    [categoryOwnedCounts, totalItems, totalOwnedCount]
  )
  const visibleCategories = useMemo(
    () =>
      activeCategoryId === ALL_TAB_ID
        ? SHOP_CATEGORIES
        : SHOP_CATEGORIES.filter((category) => category.id === activeCategoryId),
    [activeCategoryId]
  )
  const equippedButtonSkin = SHOP_ITEMS_BY_ID[equippedButtonSkinId] ?? null
  const equippedArenaTheme = SHOP_ITEMS_BY_ID[equippedArenaThemeId] ?? null
  const equippedProfileImage = SHOP_ITEMS_BY_ID[equippedProfileImageId] ?? null
  const selectedItem = SHOP_ITEMS_BY_ID[selectedItemId] ?? equippedButtonSkin ?? SHOP_ITEMS[0]
  const selectedItemStatus = getShopItemStatus({
    item: selectedItem,
    coins,
    ownedItemIds: ownedItems,
    equippedButtonSkinId,
    equippedArenaThemeId,
    equippedProfileImageId,
  })

  function selectEquippedItemForType(itemType) {
    const equippedItemId = itemType === "arena_theme"
      ? equippedArenaThemeId
      : itemType === "profile_image"
        ? equippedProfileImageId
        : equippedButtonSkinId

    setSelectedItemId(equippedItemId)
  }

  async function handlePurchase(item, source) {
    if (pendingItemId) return false

    setSelectedItemId(item.id)
    setPendingItemId(item.id)
    setActionFeedback({ kind: "pending", message: `Unlocking ${item.name}...` })
    signalAction(source, { state: "pending", silent: true })

    try {
      const purchaseResult = await onPurchase?.(item)
      if (purchaseResult?.ok) {
        celebrateShopPurchase({ enabled: effectivePreferences.flashes })
        setBalancePulseKey((key) => key + 1)
        setActionFeedback({ kind: "success", message: `${item.name} unlocked. Preview held - equip when ready.` })
        signalAction(source, {
          eventName: FEEDBACK_EVENTS.PURCHASE,
          eventId: `purchase-${item.id}`,
        })
        return true
      }

      const message = purchaseResult?.error || `Could not unlock ${item.name}.`
      setActionFeedback({ kind: "error", message })
      signalAction(source, { state: "denied", eventName: FEEDBACK_EVENTS.ACTION_DENY })
      toast.error(message)
      return false
    } catch (error) {
      const message = error?.message || `Could not unlock ${item.name}.`
      setActionFeedback({ kind: "error", message })
      signalAction(source, { state: "denied", eventName: FEEDBACK_EVENTS.ACTION_DENY })
      toast.error(message)
      return false
    } finally {
      setPendingItemId(null)
    }
  }

  async function handleEquip(item, source) {
    if (pendingItemId) return false

    setSelectedItemId(item.id)
    setPendingItemId(item.id)
    setActionFeedback({ kind: "pending", message: `Equipping ${item.name}...` })
    signalAction(source, { state: "pending", silent: true })

    try {
      const equipResult = await onEquip?.(item)
      if (equipResult?.ok) {
        celebrateShopEquip({ enabled: effectivePreferences.flashes })
        setActionFeedback({ kind: "success", message: `${item.name} equipped. Your live loadout is updated.` })
        signalAction(source, {
          eventName: FEEDBACK_EVENTS.EQUIP,
          eventId: `equip-${item.id}`,
        })
        return true
      }

      const message = equipResult?.error || `Could not equip ${item.name}.`
      setActionFeedback({ kind: "error", message })
      signalAction(source, { state: "denied", eventName: FEEDBACK_EVENTS.ACTION_DENY })
      toast.error(message)
      return false
    } catch (error) {
      const message = error?.message || `Could not equip ${item.name}.`
      setActionFeedback({ kind: "error", message })
      signalAction(source, { state: "denied", eventName: FEEDBACK_EVENTS.ACTION_DENY })
      toast.error(message)
      return false
    } finally {
      setPendingItemId(null)
    }
  }

  return (
    <div className="pageCenter">
      <section className="card shopCard">
        <ShopHeroHeader
          playerName={playerName}
          coins={coins}
          totalOwnedCount={totalOwnedCount}
          totalItems={totalItems}
          collectionPercent={collectionPercent}
          buttonSkin={equippedButtonSkin}
          arenaTheme={equippedArenaTheme}
          profileImage={equippedProfileImage}
          balancePulseKey={balancePulseKey}
          selectedItem={selectedItem}
          selectedItemStatus={selectedItemStatus}
          isSubmitting={pendingItemId === selectedItem.id}
          onPurchase={handlePurchase}
          onEquip={handleEquip}
          onShowEquipped={() => selectEquippedItemForType(selectedItem.type)}
          actionFeedback={actionFeedback}
          actionSourceAware
        />

        <ShopCategoryTabs
          tabs={tabs}
          activeCategoryId={activeCategoryId}
          onChange={(categoryId, source) => {
            setActiveCategoryId(categoryId)
            signalAction(source, {
              eventName: FEEDBACK_EVENTS.FILTER,
              eventId: `shop-filter-${categoryId}`,
            })
          }}
        />

        <div className="shopInventoryDeck">
          {visibleCategories.map((category) => (
            <section key={category.id} className="shopSection">
              <div className="shopSectionHeader">
                <div className="shopSectionTitleRow">
                  <h2>{category.title}</h2>
                  <span className="shopSectionMeta">
                    {categoryOwnedCounts[category.id] ?? 0}/{category.items.length} owned
                  </span>
                </div>
                <p>{category.description}</p>
              </div>

              <div className="shopGrid">
                {category.items.map((item) => (
                  <ShopItemCard
                    key={item.id}
                    item={item}
                    coins={coins}
                    ownedItemIds={ownedItems}
                    isSelected={item.id === selectedItem.id}
                    isSubmitting={pendingItemId === item.id}
                    onSelect={(selectedItemValue, source) => {
                      setSelectedItemId(selectedItemValue.id)
                      setActionFeedback(null)
                      signalAction(source, {
                        eventName: FEEDBACK_EVENTS.SELECTION,
                        eventId: `shop-select-${selectedItemValue.id}`,
                      })
                    }}
                    onPurchase={handlePurchase}
                    onEquip={handleEquip}
                    equippedButtonSkinId={equippedButtonSkinId}
                    equippedArenaThemeId={equippedArenaThemeId}
                    equippedProfileImageId={equippedProfileImageId}
                    actionSourceAware
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </div>
  )
}
