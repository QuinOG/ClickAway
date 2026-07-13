import { Check, Coins, Eye, LockKey, Package } from "@phosphor-icons/react"

import { getProfileAvatarStyle, getProfileInitials } from "../../../utils/profileAvatarStyling.js"
import { InterpolatedNumber } from "../../../components/ui/status/InterpolatedNumber.jsx"

function formatCoins(value) {
  return Number.isFinite(value) ? value.toLocaleString() : "0"
}

function getButtonPreviewStyle(item, useGameScale = false) {
  if (!item?.imageSrc) return undefined

  return {
    backgroundImage: `url(${item.imageSrc})`,
    backgroundSize: `${useGameScale
      ? item.gameImageScale ?? item.shopImageScale ?? 100
      : item.shopImageScale ?? item.gameImageScale ?? 100}%`,
  }
}

function LoadoutStage({ playerName, buttonSkin, arenaTheme, profileImage, isPreviewing }) {
  const hasButtonImage = Boolean(buttonSkin?.imageSrc)
  const hasProfileImage = Boolean(profileImage?.imageSrc)

  return (
    <div
      className={`shopCommandLoadoutStage ${arenaTheme?.effectClass ?? "theme-default"}${isPreviewing ? " isPreviewing" : ""}`}
      role="img"
      aria-label={`${isPreviewing ? "Selected" : "Equipped"} preview with ${buttonSkin?.name ?? "button skin"} and ${arenaTheme?.name ?? "arena theme"}`}
    >
      <span className="shopCommandLoadoutPedestal" aria-hidden="true" />

      <div className="shopCommandLoadoutAvatarFrame">
        <span
          className={`shopCommandLoadoutAvatar ${hasProfileImage ? "hasImage" : ""}`}
          style={hasProfileImage ? undefined : getProfileAvatarStyle(playerName)}
          aria-hidden="true"
        >
          {hasProfileImage ? (
            <img className="shopCommandLoadoutAvatarImage" src={profileImage.imageSrc} alt="" width="512" height="512" decoding="async" />
          ) : (
            getProfileInitials(playerName)
          )}
        </span>
      </div>

      <span
        className={`shopCommandLoadoutButton ${hasButtonImage ? "hasImage" : buttonSkin?.effectClass ?? ""}`}
        style={getButtonPreviewStyle(buttonSkin, true)}
        aria-hidden="true"
      />
    </div>
  )
}

function StateIcon({ state }) {
  if (state === "equipped") return <Check weight="bold" aria-hidden="true" />
  if (state === "owned") return <Package weight="fill" aria-hidden="true" />
  if (state === "affordable") return <Coins weight="fill" aria-hidden="true" />
  return <LockKey weight="fill" aria-hidden="true" />
}

function getItemTypeLabel(itemType) {
  if (itemType === "arena_theme") return "Arena"
  if (itemType === "profile_image") return "Profile"
  return "Button"
}

export default function ShopHeroHeader({
  playerName = "Player",
  coins = 0,
  totalOwnedCount = 0,
  totalItems = 0,
  collectionPercent = 0,
  buttonSkin = null,
  arenaTheme = null,
  profileImage = null,
  balancePulseKey = 0,
  selectedItem = null,
  selectedItemStatus = {},
  isSubmitting = false,
  onPurchase,
  onEquip,
  onShowEquipped,
  actionFeedback = null,
  actionSourceAware = false,
}) {
  const remainingCount = Math.max(0, totalItems - totalOwnedCount)
  const previewButtonSkin = selectedItem?.type === "button_skin" ? selectedItem : buttonSkin
  const previewArenaTheme = selectedItem?.type === "arena_theme" ? selectedItem : arenaTheme
  const previewProfileImage = selectedItem?.type === "profile_image" ? selectedItem : profileImage
  const selectedState = selectedItemStatus.state ?? "equipped"
  const isPreviewing = Boolean(selectedItem && !selectedItemStatus.isEquipped)
  const missingCoins = Math.max(0, (selectedItem?.cost ?? 0) - coins)
  const selectedTypeLabel = getItemTypeLabel(selectedItem?.type)

  function handleSelectedAction(event) {
    if (!selectedItem || isSubmitting) return
    if (selectedItemStatus.isOwned) {
      if (actionSourceAware) onEquip?.(selectedItem, event.currentTarget)
      else onEquip?.(selectedItem)
    } else if (selectedItemStatus.canAfford) {
      if (actionSourceAware) onPurchase?.(selectedItem, event.currentTarget)
      else onPurchase?.(selectedItem)
    }
  }

  const selectedActionLabel = isSubmitting
    ? selectedItemStatus.isOwned ? "Equipping..." : "Unlocking..."
    : selectedItemStatus.isEquipped
      ? "Currently equipped"
      : selectedItemStatus.isOwned
        ? `Equip ${selectedTypeLabel}`
        : selectedItemStatus.canAfford
          ? `Unlock for ${formatCoins(selectedItem?.cost)} coins`
          : `Need ${formatCoins(missingCoins)} more coins`
  const isSelectedActionDisabled = Boolean(
    isSubmitting
    || selectedItemStatus.isEquipped
    || !selectedItemStatus.isOwned && !selectedItemStatus.canAfford
  )

  return (
    <section className="shopArmoryHeader" aria-label="Shop overview">
      <header className="shopArmoryTop">
        <div>
          <h1 className="cardTitle shopScreenTitle">Cosmetic shop</h1>
        </div>
      </header>

      <section className="shopCommandSurface" aria-label="Armory command bar">
        <div className="shopCommandGrid">
          <div className="shopCommandColumn shopCommandColumn-economy">
            <section className="shopCommandSection shopCommandSection-balance">
              <span className="shopCommandLabel">Available Coins</span>
              <strong className="shopCommandValue shopCommandValue-balance">
                <span
                  key={balancePulseKey}
                  className={`shopCommandValueMain${balancePulseKey > 0 ? " shopCommandValueMain--pulseOnce" : ""}`}
                >
                  <InterpolatedNumber value={coins} />
                </span>
              </strong>
            </section>

            <section className="shopCommandSection shopCommandSection-progress">
              <div className="shopCommandProgressHeader">
                <span className="shopCommandLabel">Collection</span>
                <strong className="shopCommandProgressValue">
                  {totalOwnedCount}/{totalItems}
                </strong>
              </div>

              <div
                className="shopCommandProgressBar"
                role="progressbar"
                aria-label="Collection progress"
                aria-valuemin="0"
                aria-valuemax={totalItems}
                aria-valuenow={totalOwnedCount}
              >
                <span
                  className="shopCommandProgressFill"
                  style={{ width: `${collectionPercent}%` }}
                />
              </div>

              <div className="shopCommandProgressMeta">
                <span>{collectionPercent}% owned</span>
                <span>{remainingCount === 0 ? "Complete" : `${remainingCount} remaining`}</span>
              </div>
            </section>
          </div>

          <section className="shopCommandSection shopCommandSection-loadout">
            <div className="shopCommandLoadoutHeader">
              <div className="shopCommandPreviewIdentity">
                <span className="shopCommandPreviewEyebrow">
                  <Eye weight="bold" aria-hidden="true" />
                  {isPreviewing ? "Previewing" : "Live loadout"}
                </span>
                <strong className="shopCommandPreviewTitle">
                  {selectedItem?.name ?? "Equipped cosmetics"}
                </strong>
              </div>
              <span className={`shopCommandPreviewState is-${selectedState}`}>
                <StateIcon state={selectedState} />
                {selectedState}
              </span>
            </div>

            <LoadoutStage
              playerName={playerName}
              buttonSkin={previewButtonSkin}
              arenaTheme={previewArenaTheme}
              profileImage={previewProfileImage}
              isPreviewing={isPreviewing}
            />

            <div className="shopCommandLoadoutMeta" aria-label="Preview item summary">
              <span className={selectedItem?.type === "button_skin" ? "isPreviewSlot" : ""}><strong>Button</strong><span>{previewButtonSkin?.name ?? "Default"}</span></span>
              <span className={selectedItem?.type === "arena_theme" ? "isPreviewSlot" : ""}><strong>Arena</strong><span>{previewArenaTheme?.name ?? "Default"}</span></span>
              <span className={selectedItem?.type === "profile_image" ? "isPreviewSlot" : ""}><strong>Profile</strong><span>{previewProfileImage?.name ?? "Default"}</span></span>
            </div>

            <div className="shopCommandPreviewAction">
              <div className="shopCommandPreviewCopy">
                <strong>{selectedItem?.name ?? "Current loadout"}</strong>
                <span>{selectedItem?.description ?? "Your equipped cosmetic set."}</span>
              </div>
              <div className="shopCommandPreviewButtons">
                {isPreviewing ? (
                  <button
                    type="button"
                    className="secondaryButton shopPreviewResetButton"
                    onClick={onShowEquipped}
                  >
                    Show equipped
                  </button>
                ) : null}
                <button
                  type="button"
                  className={`primaryButton shopPreviewActionButton is-${selectedState}`}
                  onClick={handleSelectedAction}
                  disabled={isSelectedActionDisabled}
                >
                  <StateIcon state={selectedState} />
                  {selectedActionLabel}
                </button>
              </div>
            </div>
            {actionFeedback ? (
              <p
                className={`shopInlineSignal is-${actionFeedback.kind}`}
                role={actionFeedback.kind === "error" ? "alert" : "status"}
              >
                <span aria-hidden="true">{actionFeedback.kind === "error" ? "!" : actionFeedback.kind === "pending" ? "â€¦" : "âœ“"}</span>
                {actionFeedback.message}
              </p>
            ) : null}
          </section>
        </div>
      </section>
    </section>
  )
}
