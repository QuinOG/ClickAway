import { Check, Coins, Eye, LockKey, Package } from "@phosphor-icons/react"

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

function formatCoins(value) {
  return Number.isFinite(value) ? value.toLocaleString() : "0"
}

function getActionLabel({ item, isOwned, canAfford, coins, defaultLabel }) {
  if (isOwned || canAfford) return defaultLabel

  const missingCoins = Math.max(0, item.cost - coins)
  return `Need ${formatCoins(missingCoins)} more`
}

function getStateLabel({ isOwned, isEquipped, canAfford }) {
  if (isEquipped) return "Equipped"
  if (isOwned) return "Owned"
  if (!canAfford) return "Locked"
  return "Affordable"
}

function StateIcon({ state }) {
  if (state === "equipped") return <Check weight="bold" aria-hidden="true" />
  if (state === "owned") return <Package weight="fill" aria-hidden="true" />
  if (state === "affordable") return <Coins weight="fill" aria-hidden="true" />
  return <LockKey weight="fill" aria-hidden="true" />
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
  isSelected = false,
  isSubmitting = false,
  onSelect,
  onPurchase,
  onEquip,
  equippedButtonSkinId,
  equippedArenaThemeId,
  equippedProfileImageId,
  actionSourceAware = false,
}) {
  const { isOwned, canAfford, isEquipped, state: visualState } = getShopItemStatus({
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
  function handleAction(event) {
    if (isSubmitting) return
    const source = event.currentTarget
    if (actionSourceAware) onSelect?.(item, source)
    else onSelect?.(item)
    if (isOwned) {
      if (actionSourceAware) onEquip?.(item, source)
      else onEquip?.(item)
    } else if (actionSourceAware) onPurchase?.(item, source)
    else onPurchase?.(item)
  }

  const hasImage = Boolean(item.imageSrc)
  const itemTypeClass = getTypeClass(item.type)
  const previewClassName = `shopPreview is-${itemTypeClass} ${
    hasImage ? "hasImage" : item.effectClass
  }`
  const previewFrameClassName = `shopItemPreviewFrame is-${itemTypeClass}`
  const cardClassName = `shopItemCard shopItemCard-${visualState}${isSelected ? " shopItemCard-selected" : ""}`
  const actionButtonClassName = `primaryButton shopActionButton ${
    isEquipped ? "isEquipped" : isOwned ? "isEquip" : canAfford ? "isBuy" : "isLocked"
  }`
  const isActionBusy = isSubmitting && !isEquipped
  const actionLabelDisplay = getActionLabel({
    item,
    isOwned,
    canAfford,
    coins,
    defaultLabel: isActionBusy
      ? (isOwned ? "Equipping..." : "Unlocking...")
      : actionLabel,
  })
  const stateLabel = getStateLabel({ isOwned, isEquipped, canAfford })
  const priceLabel = getPriceLabel({ item })

  return (
    <article
      className={cardClassName}
      data-shop-state={visualState}
      data-selected={isSelected ? "true" : "false"}
      data-shop-item-id={item.id}
    >
      <div className="shopItemHeader">
        <span className={`shopItemStateTag is-${visualState}`}>
          <StateIcon state={visualState} />
          {stateLabel}
        </span>
        {isEquipped ? null : (
          <span className={`shopItemPriceTag ${item.cost === 0 ? "isCore" : ""}`}>
            {priceLabel}
          </span>
        )}
      </div>

      <div className="shopItemShowcase">
        <button
          type="button"
          className="shopItemPreviewSelect"
          aria-label={`Preview ${item.name}`}
          aria-pressed={isSelected}
          onClick={(event) => actionSourceAware
            ? onSelect?.(item, event.currentTarget)
            : onSelect?.(item)}
        >
          <div className={previewFrameClassName}>
            <span className="shopItemSelectionCue" aria-hidden="true">
              <Eye weight="bold" />
            </span>
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
        </button>
      </div>

      <div className="shopItemInfo">
        <h3>{item.name}</h3>
        <p>{item.description}</p>
      </div>

      <div className="shopItemFooter">
        <button
          type="button"
          className={actionButtonClassName}
          onClick={handleAction}
          disabled={isActionDisabled || isSubmitting}
        >
          {actionLabelDisplay}
        </button>
      </div>
    </article>
  )
}
