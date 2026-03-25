import { useMemo } from "react"

import { DEFAULT_EQUIPPED_IDS } from "../constants/appStorage.js"
import {
  buildAchievementStats,
  evaluateAchievements,
  getUnlockedAchievementIds,
} from "../game/achievements/evaluateAchievements.js"
import { buildPlayerLeaderboardStats } from "../utils/historyUtils.js"
import { isRankedModeEntry } from "../utils/modeUtils.js"
import { getLevelProgress } from "../utils/progressionUtils.js"
import { getRankProgressWithPlacement } from "../utils/rankUtils.js"
import { getEquippedShopItem } from "./appStateHelpers.js"

export function useAppDerivedState({
  equippedButtonSkinId,
  equippedArenaThemeId,
  equippedProfileImageId,
  levelXp,
  rankMmr,
  roundHistory,
  coins,
  unlockedAchievementIds,
}) {
  const equippedButtonSkin = useMemo(
    () =>
      getEquippedShopItem(equippedButtonSkinId, DEFAULT_EQUIPPED_IDS.buttonSkin),
    [equippedButtonSkinId]
  )
  const equippedArenaTheme = useMemo(
    () =>
      getEquippedShopItem(equippedArenaThemeId, DEFAULT_EQUIPPED_IDS.arenaTheme),
    [equippedArenaThemeId]
  )
  const equippedProfileImage = useMemo(
    () =>
      getEquippedShopItem(
        equippedProfileImageId,
        DEFAULT_EQUIPPED_IDS.profileImage
      ),
    [equippedProfileImageId]
  )
  const levelProgress = useMemo(() => getLevelProgress(levelXp), [levelXp])
  const hasRankedHistory = useMemo(
    () => roundHistory.some((entry) => isRankedModeEntry(entry)),
    [roundHistory]
  )
  const rankProgress = useMemo(
    () => getRankProgressWithPlacement(rankMmr, hasRankedHistory),
    [hasRankedHistory, rankMmr]
  )
  const playerLeaderboardStats = useMemo(
    () => buildPlayerLeaderboardStats(roundHistory),
    [roundHistory]
  )
  const achievementStats = useMemo(
    () => buildAchievementStats({
      levelProgress,
      roundHistory,
      coins,
    }),
    [coins, levelProgress, roundHistory]
  )
  const unlockedAchievementIdsFromStats = useMemo(() => {
    const evaluatedAchievements = evaluateAchievements(achievementStats, {
      persistedUnlockedIds: unlockedAchievementIds,
    })

    return getUnlockedAchievementIds(evaluatedAchievements)
  }, [achievementStats, unlockedAchievementIds])

  return {
    equippedButtonSkin,
    equippedArenaTheme,
    equippedProfileImage,
    levelProgress,
    rankProgress,
    playerLeaderboardStats,
    achievementStats,
    unlockedAchievementIdsFromStats,
  }
}
