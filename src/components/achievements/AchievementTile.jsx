import ProgressBar from "./ProgressBar.jsx"

function AchievementIcon({ iconKey = "default" }) {
  if (iconKey === "master") {
    return (
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
        <path d="M4.5 18.2h15l-1.3-9-4.2 3-2-5.6-2 5.6-4.2-3z" />
        <path d="M4.2 20h15.6" />
      </svg>
    )
  }

  if (iconKey === "level") {
    return (
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
        <path d="M12 2.8 14.9 8l5.7.8-4.1 4.1 1 5.8L12 16l-5.5 2.7 1-5.8-4.1-4.1L9.1 8z" />
      </svg>
    )
  }

  if (iconKey === "rounds") {
    return (
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
        <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
        <path d="m10 9 5 3-5 3z" />
      </svg>
    )
  }

  if (iconKey === "ranked") {
    return (
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
        <path d="M7 4h10v3.2c0 2.7-2.2 4.8-5 4.8s-5-2.1-5-4.8z" />
        <path d="M9.4 12.5h5.2v2.5a2.6 2.6 0 0 1-2.6 2.6 2.6 2.6 0 0 1-2.6-2.6z" />
        <path d="M6.2 5.2H4.4a1.9 1.9 0 0 0 0 3.8h1.8M17.8 5.2h1.8a1.9 1.9 0 1 1 0 3.8h-1.8" />
        <path d="M8.5 19.8h7" />
      </svg>
    )
  }

  if (iconKey === "score") {
    return (
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="4.4" />
        <circle cx="12" cy="12" r="1.4" />
      </svg>
    )
  }

  if (iconKey === "streak") {
    return (
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
        <path d="M14 2.5 6.8 12h5l-1.8 9.5L17.2 12h-5.1z" />
      </svg>
    )
  }

  if (iconKey === "accuracy") {
    return (
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
        <circle cx="12" cy="12" r="7.8" />
        <circle cx="12" cy="12" r="3.8" />
        <path d="M12 2.5v3.2M12 18.3v3.2M2.5 12h3.2M18.3 12h3.2" />
      </svg>
    )
  }

  if (iconKey === "clean") {
    return (
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
        <path d="M12 2.8 18.2 5v5.7c0 4.1-2.4 7.2-6.2 9.6-3.8-2.4-6.2-5.5-6.2-9.6V5z" />
        <path d="m8.3 12.2 2.2 2.2 5.1-5.1" />
      </svg>
    )
  }

  if (iconKey === "economy") {
    return (
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
        <ellipse cx="12" cy="7" rx="6.5" ry="2.8" />
        <path d="M5.5 7v5.5c0 1.5 2.9 2.8 6.5 2.8s6.5-1.3 6.5-2.8V7" />
        <path d="M5.5 12.5V18c0 1.5 2.9 2.8 6.5 2.8s6.5-1.3 6.5-2.8v-5.5" />
      </svg>
    )
  }

  if (iconKey === "hits") {
    return (
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
        <path d="M12 3.5v3.2M12 17.3v3.2M3.5 12h3.2M17.3 12h3.2" />
        <circle cx="12" cy="12" r="6.8" />
        <circle cx="12" cy="12" r="2.4" />
      </svg>
    )
  }

  if (iconKey === "powerups") {
    return (
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
        <path d="M12 3.8 9 9l-5.6.8 4 3.9-1 5.5 5-2.7 5 2.7-1-5.5 4-3.9L15 9z" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
      <path d="M12 3.6 14.3 8l4.9.7-3.5 3.4.8 4.9L12 14.8 7.5 17l.8-4.9L4.8 8.7 9.7 8z" />
    </svg>
  )
}

export default function AchievementTile({ achievement, variant = "default" }) {
  const isFeaturedVariant = variant === "featured"
  const isFeaturedBannerVariant = variant === "featuredBanner"

  if (!achievement) {
    return (
      <div
        className={`achievementTilePlaceholder ${isFeaturedVariant ? "isFeatured" : ""} ${isFeaturedBannerVariant ? "isFeaturedBanner" : ""}`}
        aria-hidden="true"
      />
    )
  }

  const {
    title,
    description,
    iconKey,
    percent,
    isUnlocked,
    isProgressAvailable,
    progressText,
    percentText,
  } = achievement
  const isCategoryMaster =
    achievement?.isCategoryMaster === true || achievement?.type === "categoryMaster"
  const isMasterOfMasters = achievement?.type === "masterOfMasters"
  const cardClassName = `achievementTile ${isUnlocked ? "isUnlocked" : "isLocked"} ${isCategoryMaster ? "isCategoryMaster" : ""} ${isMasterOfMasters ? "isMasterOfMasters" : ""} ${isFeaturedVariant ? "isFeatured" : ""} ${isFeaturedBannerVariant ? "isFeaturedBanner" : ""}`
  const stateClassName = `achievementState ${isUnlocked ? "isUnlocked" : "isLocked"} ${isCategoryMaster ? "isCategoryMaster" : ""} ${isMasterOfMasters ? "isMasterOfMasters" : ""}`
  const iconWrapClassName = `achievementIconWrap ${isCategoryMaster ? "isCategoryMaster" : ""} ${isMasterOfMasters ? "isMasterOfMasters" : ""}`

  if (isFeaturedBannerVariant) {
    return (
      <article
        className={cardClassName}
        aria-label={`${title}. ${description}. ${percentText}.`}
      >
        <div className="achievementFeaturedBannerContent">
          <header className="achievementTileHeader">
            <div className="achievementTileHeaderMain">
              <span className={iconWrapClassName}>
                <AchievementIcon iconKey={iconKey} />
              </span>
              <h3 className="achievementTitle">{title}</h3>
            </div>
          </header>

          <p className="achievementDescription">{description}</p>

          <div className="achievementStatusRow">
            <span className={stateClassName}>
              {isUnlocked ? "Unlocked" : "Locked"}
            </span>
          </div>
        </div>

        <ProgressBar
          percent={percent}
          isUnlocked={isUnlocked}
          isUnavailable={!isProgressAvailable}
          progressText={progressText}
          percentText={percentText}
        />
      </article>
    )
  }

  return (
    <article
      className={cardClassName}
      aria-label={`${title}. ${description}. ${percentText}.`}
    >
      <header className="achievementTileHeader">
        <div className="achievementTileHeaderMain">
          <span className={iconWrapClassName}>
            <AchievementIcon iconKey={iconKey} />
          </span>
          <h3 className="achievementTitle">{title}</h3>
        </div>
      </header>

      <p className="achievementDescription">{description}</p>

      <div className="achievementStatusRow">
        <span className={stateClassName}>
          {isUnlocked ? "Unlocked" : "Locked"}
        </span>
      </div>

      <ProgressBar
        percent={percent}
        isUnlocked={isUnlocked}
        isUnavailable={!isProgressAvailable}
        progressText={progressText}
        percentText={percentText}
      />
    </article>
  )
}
