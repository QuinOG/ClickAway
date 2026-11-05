import { useEffect, useRef, useState } from "react"

import {
  CoinIcon,
  CrestIcon,
  CrownIcon,
  FlameIcon,
  GemIcon,
  LockIcon,
  ShieldIcon,
  TargetIcon,
  TrophyIcon,
} from "../art/GameIcons.jsx"
import ProgressBar from "./ProgressBar.jsx"

const MEDAL_TIERS = ["bronze", "silver", "gold", "platinum", "diamond"]

const CATEGORY_EMBLEMS = {
  rounds: TargetIcon,
  level: GemIcon,
  ranked: TrophyIcon,
  economy: CoinIcon,
  streak: FlameIcon,
  skill: ShieldIcon,
  master: CrownIcon,
}

/*
 * Achievements read as medals: the category's illustrated emblem on a disc
 * whose metal steps up a tier with each milestone in the category. A ring
 * around the medal fills with progress, so unlocked, in-progress and
 * untouched achievements are told apart at a glance.
 */
function AchievementMedal({ iconKey, tier, percent = 0, isUnlocked }) {
  const Emblem = CATEGORY_EMBLEMS[iconKey] ?? CrestIcon
  const progress = isUnlocked ? 100 : Math.max(0, Math.min(100, Number(percent) || 0))
  const progressState = isUnlocked ? "isUnlocked" : progress > 0 ? "isProgressing" : "isUntouched"

  return (
    <span
      className={`achievementMedal tier-${tier} ${progressState}`}
      style={{ "--medal-progress": `${progress}%` }}
      aria-hidden="true"
    >
      <span className="achievementMedalDisc">
        <Emblem size={30} />
      </span>
      {isUnlocked ? null : (
        <span className="achievementMedalLock">
          <LockIcon size={14} />
        </span>
      )}
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
                <AchievementMedal iconKey={iconKey} tier={medalTier} percent={percent} isUnlocked={isUnlocked} />
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
            <AchievementMedal iconKey={iconKey} tier={medalTier} percent={percent} isUnlocked={isUnlocked} />
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
