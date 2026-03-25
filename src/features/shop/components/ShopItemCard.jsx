import { getShopItemStatus } from "../../../utils/shopUtils.js"

function getActionState({ isOwned, isEquipped, canAfford }) {
  const label = isOwned
    ? isEquipped
      ? "Equipped"
      : "Equip"
    : canAfford
      ? "Unlock"
      : "Need Coins"
  const isDisabled = isOwned ? isEquipped : !canAfford

  return { label, isDisabled }
}

function getVisualState({ isOwned, isEquipped, canAfford }) {
  if (isEquipped) return "equipped"
  if (isOwned) return "owned"
  if (!canAfford) return "locked"
  return "available"
}

function formatCoins(value) {
  return Number.isFinite(value) ? value.toLocaleString() : "0"
}

function getActionLabel({ item, isOwned, canAfford, coins, defaultLabel }) {
  if (isOwned || canAfford) return defaultLabel

  const missingCoins = Math.max(0, item.cost - coins)
  return `Need ${formatCoins(missingCoins)} more`
}

function getStateLabel({ isOwned, isEquipped, canAfford }) {
  if (isEquipped) return "Active"
  if (isOwned) return "Owned"
  if (!canAfford) return "Locked"
  return "Ready"
}

function getPriceLabel({ item }) {
  if (item.builtIn || item.cost === 0) return "Core"
  return `${formatCoins(item.cost)}C`
}

function getTypeClass(type) {
  return String(type ?? "cosmetic").replace(/_/g, "-")
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
  equippedProfileImageId,
}) {
  const { isOwned, canAfford, isEquipped } = getShopItemStatus({
    item,
    coins,
    ownedItemIds,
    equippedButtonSkinId,
    equippedArenaThemeId,
    equippedProfileImageId,
  })

  const { label: actionLabel, isDisabled: isActionDisabled } = getActionState({
    isOwned,
    isEquipped,
    canAfford,
  })
  const visualState = getVisualState({ isOwned, isEquipped, canAfford })

  function handleAction() {
    if (isOwned) {
      onEquip?.(item)
      return
    }

    onPurchase?.(item)
  }

  const hasImage = Boolean(item.imageSrc)
  const itemTypeClass = getTypeClass(item.type)
  const previewClassName = `shopPreview is-${itemTypeClass} ${
    hasImage ? "hasImage" : item.effectClass
  }`
  const previewFrameClassName = `shopItemPreviewFrame is-${itemTypeClass}`
  const cardClassName = `shopItemCard shopItemCard-${visualState}`
  const actionButtonClassName = `primaryButton shopActionButton ${
    isOwned ? "isEquip" : canAfford ? "isBuy" : "isLocked"
  }`
  const actionLabelDisplay = getActionLabel({
    item,
    isOwned,
    canAfford,
    coins,
    defaultLabel: actionLabel,
  })
  const stateLabel = getStateLabel({ isOwned, isEquipped, canAfford })
  const priceLabel = getPriceLabel({ item })

  return (
    <article className={cardClassName}>
      <div className="shopItemHeader">
        <span className={`shopItemStateTag is-${visualState}`}>{stateLabel}</span>
        {isEquipped ? null : (
          <span className={`shopItemPriceTag ${item.cost === 0 ? "isCore" : ""}`}>
            {priceLabel}
          </span>
        )}
      </div>

      <div className="shopItemShowcase">
        <div className={previewFrameClassName}>
          <span className="shopItemPreviewGlow" aria-hidden="true" />
          {item.type === "button_skin" ? (
            <div
              className={`shopPreviewButtonStage ${hasImage ? "hasImage" : item.effectClass}`}
              style={getPreviewStyle(item)}
              aria-hidden="true"
            />
          ) : (
            <div
              className={previewClassName}
              style={getPreviewStyle(item)}
              aria-hidden="true"
            />
          )}
        </div>
      </div>

      <div className="shopItemInfo">
        <h3>{item.name}</h3>
        <p>{item.description}</p>
      </div>

      <div className="shopItemFooter">
        {isEquipped ? null : (
          <button
            type="button"
            className={actionButtonClassName}
            onClick={handleAction}
            disabled={isActionDisabled}
          >
            {actionLabelDisplay}
          </button>
        )}
      </div>
    </article>
  )
}
