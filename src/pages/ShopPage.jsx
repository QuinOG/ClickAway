import { SHOP_CATEGORIES } from "../config/shopCatalog.js"

function getItemStatus({ item, coins, ownedItems, equippedButtonSkinId, equippedArenaThemeId }) {
  const isOwned = item.builtIn || ownedItems.includes(item.id)
  const canAfford = coins >= item.cost
  const isEquipped =
    (item.type === "button_skin" && item.id === equippedButtonSkinId) ||
    (item.type === "arena_theme" && item.id === equippedArenaThemeId)

  return { isOwned, canAfford, isEquipped }
}

function ShopItemCard({
  item,
  coins,
  ownedItems,
  onPurchase,
  onEquip,
  equippedButtonSkinId,
  equippedArenaThemeId,
}) {
  const { isOwned, canAfford, isEquipped } = getItemStatus({
    item,
    coins,
    ownedItems,
    equippedButtonSkinId,
    equippedArenaThemeId,
  })

  const actionLabel = isOwned ? (isEquipped ? "Equipped" : "Equip") : "Buy"
  const actionDisabled = isOwned ? isEquipped : !canAfford

  function handleAction() {
    if (isOwned) {
      onEquip?.(item)
      return
    }
    onPurchase?.(item)
  }

  return (
    <article className="shopItemCard">
      <div className="shopItemTop">
        <div
          className={`shopPreview ${item.effectClass} ${item.imageSrc ? "hasImage" : ""}`}
          style={
            item.imageSrc
              ? {
                  backgroundImage: `url(${item.imageSrc})`,
                  backgroundSize: `${item.shopImageScale ?? item.imageScale ?? 100}%`,
                }
              : undefined
          }
          aria-hidden="true"
        />

        <div className="shopItemInfo">
          <h3>{item.name}</h3>
          <p>{item.description}</p>
        </div>
      </div>

      <div className="shopItemFooter">
        <span className="shopCost">{item.cost === 0 ? "Free" : `${item.cost} coins`}</span>
        <button className="primaryButton" onClick={handleAction} disabled={actionDisabled}>
          {actionLabel}
        </button>
      </div>
    </article>
  )
}

export default function ShopPage({
  coins = 0,
  ownedItems = [],
  onPurchase,
  onEquip,
  equippedButtonSkinId = "skin_default",
  equippedArenaThemeId = "theme_default",
}) {
  return (
    <div className="pageCenter">
      <section className="card shopCard">
        <h1 className="cardTitle">Shop</h1>
        <p className="muted">Spend coins earned from successful clicks. Add new items by updating the shared shop catalog config.</p>

        {SHOP_CATEGORIES.map((category) => (
          <section key={category.id} className="shopSection">
            <div className="shopSectionHeader">
              <h2>{category.title}</h2>
              <p>{category.description}</p>
            </div>

            <div className="shopGrid">
              {category.items.map((item) => (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  coins={coins}
                  ownedItems={ownedItems}
                  onPurchase={onPurchase}
                  onEquip={onEquip}
                  equippedButtonSkinId={equippedButtonSkinId}
                  equippedArenaThemeId={equippedArenaThemeId}
                />
              ))}
            </div>
          </section>
        ))}
      </section>
    </div>
  )
}
