import { useEffect, useId, useRef, useState } from "react"

import { LockIcon } from "../art/GameIcons.jsx"
import ProgressBar from "./ProgressBar.jsx"

const MEDAL_TIERS = ["bronze", "silver", "gold", "platinum", "diamond"]

const OBJECTS = {
  cup: "M18 14H46V24C46 36 39 42 32 43C25 42 18 36 18 24Z M18 19H10C10 30 14 34 22 34 M46 19H54C54 30 50 34 42 34 M32 43V51 M23 52H41V58H23Z",
  star: "M32 6L38 20L53 21L42 31L46 46L32 38L18 46L22 31L11 21L26 20Z M32 42V52 M22 52H42V58H22Z",
  clock: "M27 5H37V10H27Z M32 11A21 21 0 1 1 31.9 11Z M32 18V31L41 36 M20 54H44V59H20Z",
  plaque: "M13 10H51V48H13Z M32 16A13 13 0 1 1 31.9 16Z M32 20V42 M21 31H43 M20 51H44V58H20Z",
  flame: "M32 5C36 17 47 19 46 30C45 38 40 42 32 43C23 42 18 37 18 29C18 22 23 16 27 13C26 22 30 24 32 25C35 20 35 13 32 5Z M27 43H37L35 53H29Z M23 53H41V59H23Z",
  crown: "M9 16L20 25L25 10L32 20L39 10L44 25L55 16L50 45H14Z M14 45H50V51H14Z M20 52H44V59H20Z",
  coins: "M12 39C12 34 52 34 52 39V49C52 55 12 55 12 49Z M12 39C12 45 52 45 52 39 M17 26C17 21 47 21 47 26V36C47 41 17 41 17 36Z M17 26C17 31 47 31 47 26 M22 13C22 9 42 9 42 13V23C42 27 22 27 22 23Z M22 13C22 17 42 17 42 13",
  shield: "M32 6L51 14V29C51 41 43 47 32 52C21 47 13 41 13 29V14Z M32 14V43 M20 26H44 M21 53H43V59H21Z",
}
const CATEGORY_OBJECTS = { rounds: "cup", level: "star", ranked: "cup", economy: "coins", streak: "flame", skill: "shield", master: "crown" }
const MILESTONE_OBJECTS = { "easy-rounds-1": "cup", "easy-rounds-10": "star", "hard-rounds-50": "clock", "career-rounds-100": "plaque", "career-rounds-250": "flame" }

function AchievementMedal({ iconKey, achievementId, tier, percent = 0, isUnlocked }) {
  const clipId = useId()
  const object = MILESTONE_OBJECTS[achievementId] ?? CATEGORY_OBJECTS[iconKey] ?? "shield"
  const progress = isUnlocked ? 100 : Math.max(0, Math.min(100, Number(percent) || 0))
  const progressState = isUnlocked ? "isUnlocked" : progress > 0 ? "isProgressing" : "isUntouched"
  return (
    <span className={`achievementMedal tier-${tier} ${progressState}`} style={{ "--medal-progress": `${progress}%` }} aria-hidden="true">
      <span className="achievementMedalDisc">
        <svg className="achievementObject" viewBox="0 0 64 64" aria-hidden="true">
          <defs><clipPath id={clipId}><path d={OBJECTS[object]} /></clipPath></defs>
          <path d={OBJECTS[object]} fill="var(--medal-hi)" stroke="#040912" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          <path d="M55 9C53 34 43 48 15 51L15 64H64V9Z" fill="var(--medal-lo)" opacity=".65" clipPath={`url(#${clipId})`} />
          <path d="M22 18 L27 15" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" opacity=".8" clipPath={`url(#${clipId})`} />
        </svg>
      </span>
      {isUnlocked ? null : <span className="achievementMedalLock"><LockIcon size={14} /></span>}
    </span>
  )
}

function getMedalTier({ tierIndex, tierCount, isCategoryMaster, isMasterOfMasters }) {
  if (isMasterOfMasters || isCategoryMaster) return "master"
  if (!Number.isFinite(tierIndex) || !Number.isFinite(tierCount) || tierCount <= 0) return "bronze"
  return MEDAL_TIERS[Math.min(MEDAL_TIERS.length - 1, Math.floor((tierIndex * MEDAL_TIERS.length) / tierCount))]
}

export default function AchievementTile({ achievement, variant = "default", tierIndex, tierCount }) {
  const isFeaturedVariant = variant === "featured"
  const isFeaturedBannerVariant = variant === "featuredBanner"
  const achievementId = achievement?.id ?? ""
  const isUnlocked = achievement?.isUnlocked === true
  const previousAchievementIdRef = useRef(achievementId)
  const previousUnlockedRef = useRef(isUnlocked)
  const [isUnlocking, setIsUnlocking] = useState(false)

  const isCategoryMaster =
    achievement?.isCategoryMaster === true || achievement?.type === "categoryMaster"
  const isMasterOfMasters = achievement?.type === "masterOfMasters"
  const cardClassName = `achievementTile ${isUnlocked ? "isUnlocked" : "isLocked"} ${isUnlocking ? "isUnlocking" : ""} ${isCategoryMaster ? "isCategoryMaster" : ""} ${isMasterOfMasters ? "isMasterOfMasters" : ""} ${isFeaturedVariant ? "isFeatured" : ""} ${isFeaturedBannerVariant ? "isFeaturedBanner" : ""}`
  const stateClassName = `achievementState ${isUnlocked ? "isUnlocked" : "isLocked"} ${isCategoryMaster ? "isCategoryMaster" : ""} ${isMasterOfMasters ? "isMasterOfMasters" : ""}`
  const iconWrapClassName = `achievementIconWrap ${isCategoryMaster ? "isCategoryMaster" : ""} ${isMasterOfMasters ? "isMasterOfMasters" : ""}`

  useEffect(() => {
    const wasSameAchievement = previousAchievementIdRef.current === achievementId
    const didJustUnlock = wasSameAchievement && !previousUnlockedRef.current && isUnlocked

    previousAchievementIdRef.current = achievementId
    previousUnlockedRef.current = isUnlocked

    if (!didJustUnlock) {
      return undefined
    }

    let timeoutId = 0
    const animationFrameId = window.requestAnimationFrame(() => {
      setIsUnlocking(true)

      timeoutId = window.setTimeout(() => {
        setIsUnlocking(false)
      }, 420)
    })

    return () => {
      window.cancelAnimationFrame(animationFrameId)
      window.clearTimeout(timeoutId)
    }
  }, [achievementId, isUnlocked])

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
    isProgressAvailable,
    progressText,
    percentText,
  } = achievement
  const medalTier = getMedalTier({ tierIndex, tierCount, isCategoryMaster, isMasterOfMasters })

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
                <AchievementMedal achievementId={achievementId} iconKey={iconKey} tier={medalTier} percent={percent} isUnlocked={isUnlocked} />
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
            <AchievementMedal achievementId={achievementId} iconKey={iconKey} tier={medalTier} percent={percent} isUnlocked={isUnlocked} />
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
