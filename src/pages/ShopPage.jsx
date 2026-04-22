import { useMemo, useState } from "react"
import toast from "react-hot-toast"
import { SHOP_CATEGORIES, SHOP_ITEMS_BY_ID } from "../constants/shopCatalog.js"
import { celebrateShopEquip, celebrateShopPurchase } from "../features/shop/shopPurchaseEquipCelebration.js"
import ShopCategoryTabs from "../features/shop/components/ShopCategoryTabs.jsx"
import ShopHeroHeader from "../features/shop/components/ShopHeroHeader.jsx"
import ShopItemCard from "../features/shop/components/ShopItemCard.jsx"

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
  const [activeCategoryId, setActiveCategoryId] = useState(ALL_TAB_ID)
  const [balancePulseKey, setBalancePulseKey] = useState(0)

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

  async function handlePurchase(item) {
    const purchaseResult = await onPurchase?.(item)
    if (purchaseResult?.ok) {
      celebrateShopPurchase()
      setBalancePulseKey((key) => key + 1)
      toast.success(
        (
          <div className="shopSuccessToast">
            <span className="shopSuccessToastEyebrow">New unlock</span>
            <strong className="shopSuccessToastTitle">{item.name}</strong>
            <span className="shopSuccessToastHint">Added to your collection</span>
          </div>
        ),
        { duration: 3800 },
      )
      return true
    }

    toast.error(purchaseResult?.error || `Could not unlock ${item.name}.`)
    return false
  }

  async function handleEquip(item) {
    const equipResult = await onEquip?.(item)
    if (equipResult?.ok) {
      celebrateShopEquip()
      toast.success(`Equipped — ${item.name}`, {
        duration: 2600,
      })
      return true
    }

    toast.error(equipResult?.error || `Could not equip ${item.name}.`)
    return false
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
        />

        <ShopCategoryTabs
          tabs={tabs}
          activeCategoryId={activeCategoryId}
          onChange={setActiveCategoryId}
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
                    onPurchase={handlePurchase}
                    onEquip={handleEquip}
                    equippedButtonSkinId={equippedButtonSkinId}
                    equippedArenaThemeId={equippedArenaThemeId}
                    equippedProfileImageId={equippedProfileImageId}
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
