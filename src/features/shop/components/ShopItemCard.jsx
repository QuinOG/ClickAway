import { Check, Coins, Eye, LockKey, Package } from "@phosphor-icons/react"

import ArenaWorldArt from "../../../components/art/ArenaWorldArt.jsx"
import PlayerPortrait from "../../../components/art/PlayerPortrait.jsx"
import { getShopItemStatus } from "../../../utils/shopUtils.js"

// Pedestals communicate rarity consistently across the button catalog.
const RARITY_CRADLES = {
  core: "dish",
  common: "dish",
  rare: "ring",
  epic: "claw",
  legendary: "cushion",
}

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

/* Rarity follows price so the catalog reads as a progression. */
function getRarity(item) {
  if (item.builtIn || !item.cost) return { id: "core", label: "Core" }
  if (item.cost <= 300) return { id: "common", label: "Common" }
  if (item.cost <= 800) return { id: "rare", label: "Rare" }
  if (item.cost <= 1200) return { id: "epic", label: "Epic" }
  return { id: "legendary", label: "Legendary" }
}

function getTypeClass(type) {
  return String(type ?? "cosmetic").replace(/_/g, "-")
}

function ArenaThemeScene({ effectClass }) {
  return (
    <div className={`shopArenaScene ${effectClass}`} aria-hidden="true">
      <ArenaWorldArt className="shopArenaWorld" />
      <span className="shopArenaSceneFloor" />
      <span className="shopArenaSceneCorner isTL" />
      <span className="shopArenaSceneCorner isTR" />
      <span className="shopArenaSceneCorner isBL" />
      <span className="shopArenaSceneCorner isBR" />
      <span className="shopArenaSceneTarget" />
    </div>
  )
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
  // Another item's purchase/equip is in flight; actions wait for it.
  isShopBusy = false,
  onSelect,
  onPurchase,
  onEquip,
  equippedButtonSkinId,
  equippedArenaThemeId,
  equippedProfileImageId,
  playerName = "Player",
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
    if (isSubmitting || isShopBusy) return
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
  const rarity = getRarity(item)
  const cradle = RARITY_CRADLES[rarity.id]
  const cardClassName = `shopItemCard shopItemCard-${visualState} rarity-${rarity.id}${isSelected ? " shopItemCard-selected" : ""}`
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

  return (
    <article
      className={cardClassName}
      data-shop-state={visualState}
      data-selected={isSelected ? "true" : "false"}
      data-shop-item-id={item.id}
      data-rarity={rarity.id}
    >
      {!isEquipped && <span className={`shopPriceTag is-${visualState}`} aria-hidden="true">
        {isEquipped ? "Equipped" : isOwned ? "Owned" : (
          <><Coins weight="fill" />{formatCoins(item.cost)}</>
        )}
      </span>}
      <div className="shopItemHeader">
        {!isEquipped && <span className={`shopItemStateTag is-${visualState}`}>
          <StateIcon state={visualState} />
          {visualState === "locked" ? (
            <>
              <span className="uiVisuallyHidden">{stateLabel}: </span>
              {formatCoins(item.cost)} coins
            </>
          ) : stateLabel}
        </span>}
        <span className="shopItemRarity">{rarity.label}</span>
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
              <img className={`shopItemCradle is-${cradle}`} src={`/art/shop/cradle-${cradle}.png`} alt="" aria-hidden="true" width="320" height="160" decoding="async" />
            ) : null}
            {item.type === "button_skin" ? (
              <div
                className={`shopPreviewButtonStage ${hasImage ? "hasImage" : item.effectClass}`}
                style={getPreviewStyle(item)}
                aria-hidden="true"
              />
            ) : item.type === "arena_theme" ? (
              <ArenaThemeScene effectClass={item.effectClass} />
            ) : item.type === "profile_image" && !hasImage ? (
              <span className="shopPreviewPortrait" aria-hidden="true">
                <PlayerPortrait name={playerName} size={104} />
              </span>
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
          disabled={isActionDisabled || isSubmitting || isShopBusy}
        >
          {actionLabelDisplay}
          {!isOwned && canAfford && !isActionBusy ? (
            <span className="shopActionPrice">
              <Coins weight="fill" aria-hidden="true" />
              {formatCoins(item.cost)}
            </span>
          ) : null}
        </button>
      </div>
    </article>
  )
}
