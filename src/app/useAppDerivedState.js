import { useMemo } from "react"

import { normalizeLoadoutState } from "../constants/buildcraft.js"
import { DEFAULT_EQUIPPED_IDS } from "../constants/clientStorageKeysAndEquippedDefaults.js"
import {
  buildAchievementStats,
  evaluateAchievements,
  getUnlockedAchievementIds,
} from "../game/achievements/evaluateAchievements.js"
import { buildPlayerLeaderboardStats } from "../utils/historyUtils.js"
import { isRankedModeEntry } from "../utils/gameModeLabelsAndRankedFilters.js"
import { getLevelProgress } from "../utils/progressionUtils.js"
import { getRankProgressWithPlacement } from "../utils/rankUtils.js"
import { getEquippedShopItem } from "./appAccountStateHelpers.js"

export function useAppDerivedState({
  equippedButtonSkinId,
  equippedArenaThemeId,
  equippedProfileImageId,
  levelXp,
  rankMmr,
  rankedState,
  roundHistory,
  coins,
  unlockedAchievementIds,
  savedLoadouts,
  activeLoadoutId,
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
  const loadoutState = useMemo(
    () => normalizeLoadoutState(levelProgress.level, savedLoadouts, activeLoadoutId),
    [activeLoadoutId, levelProgress.level, savedLoadouts]
  )
  const hasRankedHistory = useMemo(
    () => roundHistory.some((entry) => isRankedModeEntry(entry)),
    [roundHistory]
  )
  const rankProgress = useMemo(
    () => getRankProgressWithPlacement({
      mmr: rankMmr,
      hasRankedHistory,
      rankedState,
    }),
    [hasRankedHistory, rankMmr, rankedState]
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
    savedLoadouts: loadoutState.savedLoadouts,
    activeLoadoutId: loadoutState.activeLoadoutId,
    activeLoadout: loadoutState.activeLoadout,
    hasRankedHistory,
    rankProgress,
    playerLeaderboardStats,
    achievementStats,
    unlockedAchievementIdsFromStats,
  }
}
