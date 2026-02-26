import { SHOP_CATEGORIES } from "../constants/shopCatalog.js"
import ShopItemCard from "../features/shop/components/ShopItemCard.jsx"

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
        <p className="muted">
          Spend coins earned from successful clicks. Add new items by updating the shared
          shop catalog config.
        </p>

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
                  ownedItemIds={ownedItems}
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
