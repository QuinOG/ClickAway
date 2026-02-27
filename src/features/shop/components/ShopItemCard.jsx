import { getShopItemStatus } from "../../../utils/shopUtils.js"

function getActionState({ isOwned, isEquipped, canAfford }) {
  const label = isOwned ? (isEquipped ? "Equipped" : "Equip") : "Buy"
  const isDisabled = isOwned ? isEquipped : !canAfford

  return { label, isDisabled }
}

function getPreviewStyle(item) {
  if (!item.imageSrc) return undefined

  return {
    backgroundImage: `url(${item.imageSrc})`,
    backgroundSize: `${item.shopImageScale ?? item.imageScale ?? 100}%`,
  }
}

export default function ShopItemCard({
  item,
  coins,
  ownedItemIds,
  onPurchase,
  onEquip,
  equippedButtonSkinId,
  equippedArenaThemeId,
}) {
  const { isOwned, canAfford, isEquipped } = getShopItemStatus({
    item,
    coins,
    ownedItemIds,
    equippedButtonSkinId,
    equippedArenaThemeId,
  })

  const { label: actionLabel, isDisabled: isActionDisabled } = getActionState({
    isOwned,
    isEquipped,
    canAfford,
  })

  function handleAction() {
    if (isOwned) {
      onEquip?.(item)
      return
    }

    onPurchase?.(item)
  }

  const hasImage = Boolean(item.imageSrc)
  const previewClassName = `shopPreview ${hasImage ? "" : item.effectClass} ${hasImage ? "hasImage" : ""}`

  return (
    <article className="shopItemCard">
      <div className="shopItemTop">
        <div
          className={previewClassName}
          style={getPreviewStyle(item)}
          aria-hidden="true"
        />

        <div className="shopItemInfo">
          <h3>{item.name}</h3>
          <p>{item.description}</p>
        </div>
      </div>

      <div className="shopItemFooter">
        <span className="shopCost">{item.cost === 0 ? "Free" : `${item.cost} coins`}</span>
        <button className="primaryButton" onClick={handleAction} disabled={isActionDisabled}>
          {actionLabel}
        </button>
      </div>
    </article>
  )
}
