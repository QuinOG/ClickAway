import { getProfileAvatarStyle, getProfileInitials } from "../../../utils/profileAvatarStyling.js"

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

function LoadoutStage({ playerName, buttonSkin, arenaTheme, profileImage }) {
  const hasButtonImage = Boolean(buttonSkin?.imageSrc)
  const hasProfileImage = Boolean(profileImage?.imageSrc)

  return (
    <div
      className={`shopCommandLoadoutStage ${arenaTheme?.effectClass ?? "theme-default"}`}
      aria-label={`Equipped preview with ${buttonSkin?.name ?? "button skin"} and ${arenaTheme?.name ?? "arena theme"}`}
    >
      <span className="shopCommandLoadoutPedestal" aria-hidden="true" />

      <div className="shopCommandLoadoutAvatarFrame">
        <span
          className={`shopCommandLoadoutAvatar ${hasProfileImage ? "hasImage" : ""}`}
          style={hasProfileImage ? undefined : getProfileAvatarStyle(playerName)}
          aria-hidden="true"
        >
          {hasProfileImage ? (
            <img className="shopCommandLoadoutAvatarImage" src={profileImage.imageSrc} alt="" />
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
}) {
  const remainingCount = Math.max(0, totalItems - totalOwnedCount)

  return (
    <section className="shopArmoryHeader" aria-label="Shop overview">
      <header className="shopArmoryTop">
        <div>
          <h1 className="cardTitle shopScreenTitle">Cosmetic Armory</h1>
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
                  {formatCoins(coins)}
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

              <div className="shopCommandProgressBar" aria-hidden="true">
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
              <div className="shopScreenSignal" aria-label="Inventory updates live">
                <span className="shopScreenSignalDot" aria-hidden="true" />
                Live Inventory
              </div>
            </div>

            <LoadoutStage
              playerName={playerName}
              buttonSkin={buttonSkin}
              arenaTheme={arenaTheme}
              profileImage={profileImage}
            />

            <div className="shopCommandLoadoutMeta" aria-label="Equipped item summary">
              <span><strong>Button</strong><span>{buttonSkin?.name ?? "Default"}</span></span>
              <span><strong>Arena</strong><span>{arenaTheme?.name ?? "Default"}</span></span>
              <span><strong>Profile</strong><span>{profileImage?.name ?? "Default"}</span></span>
            </div>
          </section>
        </div>
      </section>
    </section>
  )
}
