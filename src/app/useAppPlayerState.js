import { useCallback, useEffect, useState } from "react"

import {
  ACTIVE_LOADOUT_ID_DEFAULT,
  DEFAULT_SAVED_LOADOUTS,
  normalizeLoadoutState,
} from "../constants/buildcraft.js"
import {
  BUILD_WALKTHROUGH_STATUS,
  normalizeBuildWalkthrough,
} from "../constants/buildWalkthrough.js"
import { normalizeSeenUnlockPartIds } from "../utils/unlockWallUtils.js"
import { normalizeDailyGoals } from "../utils/dailyGoals.js"
import { DEFAULT_EQUIPPED_IDS } from "../constants/clientStorageKeysAndEquippedDefaults.js"
import { DEFAULT_DIFFICULTY_ID as DEFAULT_MODE_ID, getDifficultyById } from "../constants/gameModesConfig.js"
import { getLevelProgress } from "../utils/progressionUtils.js"
import {
  DEFAULT_LIFETIME_STATS,
  normalizeLifetimeStats,
  normalizeLoadoutStatsEntry,
} from "../utils/lifetimeStatsUtils.js"
import { normalizeHistoryEntry } from "../utils/historyUtils.js"
import {
  buildDefaultRankedState,
  INITIAL_RANK_MMR,
  migrateLegacyRankData,
} from "../utils/rankUtils.js"

const DEFAULT_PLAYER_NAME = "Player"
const DEFAULT_PROGRESS = {
  coins: 0,
  levelXp: 0,
  rankMmr: INITIAL_RANK_MMR,
  rankedState: buildDefaultRankedState(),
  ownedItemIds: [],
  equippedButtonSkinId: DEFAULT_EQUIPPED_IDS.buttonSkin,
  equippedArenaThemeId: DEFAULT_EQUIPPED_IDS.arenaTheme,
  equippedProfileImageId: DEFAULT_EQUIPPED_IDS.profileImage,
  roundHistory: [],
  lifetimeStats: normalizeLifetimeStats(DEFAULT_LIFETIME_STATS),
  loadoutStats: [],
  totalRoundCount: 0,
  unlockedAchievementIds: [],
  savedLoadouts: DEFAULT_SAVED_LOADOUTS,
  activeLoadoutId: ACTIVE_LOADOUT_ID_DEFAULT,
  buildWalkthrough: normalizeBuildWalkthrough(
    {},
    BUILD_WALKTHROUGH_STATUS.DISMISSED
  ),
  seenUnlockPartIds: [],
}

function normalizeStringList(values = []) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .filter((value) => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean)
    )
  )
}

function normalizeProgress(progress = {}) {
  const safeProgress = progress && typeof progress === "object" ? progress : {}
  const levelXp = Math.max(0, Number(safeProgress.levelXp) || 0)
  const level = getLevelProgress(levelXp).level
  const normalizedRoundHistory = (Array.isArray(safeProgress.roundHistory) ? safeProgress.roundHistory : [])
    .map(normalizeHistoryEntry)
  const migratedRankData = migrateLegacyRankData({
    rankMmr: safeProgress.rankMmr,
    rankedState: safeProgress.rankedState,
    roundHistory: normalizedRoundHistory,
  })
  const normalizedLoadouts = normalizeLoadoutState(
    level,
    safeProgress.savedLoadouts,
    safeProgress.activeLoadoutId
  )
  const normalizedLifetimeStats = normalizeLifetimeStats(
    safeProgress.lifetimeStats ?? DEFAULT_LIFETIME_STATS
  )
  const normalizedLoadoutStats = (Array.isArray(safeProgress.loadoutStats) ? safeProgress.loadoutStats : [])
    .map(normalizeLoadoutStatsEntry)
    .filter(Boolean)

  return {
    // Server-reported; null when unknown (older responses), and the lobby then
    // falls back to the loaded rounds.
    dailyBonusAvailable: typeof safeProgress.dailyBonusAvailable === "boolean" ? safeProgress.dailyBonusAvailable : null,
    // Server-reported; null from older servers, and the lobby then shows no goals.
    dailyGoals: normalizeDailyGoals(safeProgress.dailyGoals),
    coins: Math.max(0, Number(safeProgress.coins) || 0),
    levelXp,
    rankMmr: migratedRankData.rankMmr,
    rankedState: migratedRankData.rankedState,
    ownedItemIds: normalizeStringList(safeProgress.ownedItemIds),
    equippedButtonSkinId: String(
      safeProgress.equippedButtonSkinId || DEFAULT_EQUIPPED_IDS.buttonSkin
    ),
    equippedArenaThemeId: String(
      safeProgress.equippedArenaThemeId || DEFAULT_EQUIPPED_IDS.arenaTheme
    ),
    equippedProfileImageId: String(
      safeProgress.equippedProfileImageId || DEFAULT_EQUIPPED_IDS.profileImage
    ),
    roundHistory: normalizedRoundHistory,
    lifetimeStats: normalizedLifetimeStats,
    loadoutStats: normalizedLoadoutStats,
    totalRoundCount: Math.max(0, Number(safeProgress.totalRoundCount) || normalizedRoundHistory.length),
    unlockedAchievementIds: normalizeStringList(safeProgress.unlockedAchievementIds),
    savedLoadouts: normalizedLoadouts.savedLoadouts,
    activeLoadoutId: normalizedLoadouts.activeLoadoutId,
    buildWalkthrough: normalizeBuildWalkthrough(
      safeProgress.buildWalkthrough,
      BUILD_WALKTHROUGH_STATUS.DISMISSED
    ),
    seenUnlockPartIds: normalizeSeenUnlockPartIds(safeProgress.seenUnlockPartIds),
  }
}

function normalizePlayerState(playerState = {}) {
  const safePlayerState = playerState && typeof playerState === "object" ? playerState : {}
  return {
    coins: Math.max(0, Number(safePlayerState.coins) || 0),
    ownedItemIds: normalizeStringList(safePlayerState.ownedItemIds),
    equippedButtonSkinId: String(
      safePlayerState.equippedButtonSkinId || DEFAULT_EQUIPPED_IDS.buttonSkin
    ),
    equippedArenaThemeId: String(
      safePlayerState.equippedArenaThemeId || DEFAULT_EQUIPPED_IDS.arenaTheme
    ),
    equippedProfileImageId: String(
      safePlayerState.equippedProfileImageId || DEFAULT_EQUIPPED_IDS.profileImage
    ),
  }
}

const SELECTED_MODE_STORAGE_KEY = "clickaway.selected-mode"

function readStoredModeId() {
  try {
    const storedModeId = localStorage.getItem(SELECTED_MODE_STORAGE_KEY)
    return getDifficultyById(storedModeId)?.id === storedModeId ? storedModeId : DEFAULT_MODE_ID
  } catch {
    return DEFAULT_MODE_ID
  }
}

export function useAppPlayerState() {
  const [isAuthed, setIsAuthed] = useState(false)
  const [playerUserId, setPlayerUserId] = useState("")
  const [playerUsername, setPlayerUsername] = useState(DEFAULT_PLAYER_NAME)
  const [coins, setCoins] = useState(DEFAULT_PROGRESS.coins)
  const [levelXp, setLevelXp] = useState(DEFAULT_PROGRESS.levelXp)
  const [rankMmr, setRankMmr] = useState(DEFAULT_PROGRESS.rankMmr)
  const [rankedState, setRankedState] = useState(DEFAULT_PROGRESS.rankedState)
  const [ownedItemIds, setOwnedItemIds] = useState(DEFAULT_PROGRESS.ownedItemIds)
  const [equippedButtonSkinId, setEquippedButtonSkinId] = useState(
    DEFAULT_PROGRESS.equippedButtonSkinId
  )
  const [equippedArenaThemeId, setEquippedArenaThemeId] = useState(
    DEFAULT_PROGRESS.equippedArenaThemeId
  )
  const [equippedProfileImageId, setEquippedProfileImageId] = useState(
    DEFAULT_PROGRESS.equippedProfileImageId
  )
  // The chosen mode is a per-device preference; the server has nowhere to keep it.
  const [selectedModeId, setSelectedModeId] = useState(readStoredModeId)
  useEffect(() => {
    try {
      localStorage.setItem(SELECTED_MODE_STORAGE_KEY, selectedModeId)
    } catch {
      // Storage unavailable; the choice lasts for this session only.
    }
  }, [selectedModeId])
  const [roundHistory, setRoundHistory] = useState(DEFAULT_PROGRESS.roundHistory)
  const [lifetimeStats, setLifetimeStats] = useState(DEFAULT_PROGRESS.lifetimeStats)
  const [loadoutStats, setLoadoutStats] = useState(DEFAULT_PROGRESS.loadoutStats)
  const [totalRoundCount, setTotalRoundCount] = useState(DEFAULT_PROGRESS.totalRoundCount)
  const [unlockedAchievementIds, setUnlockedAchievementIds] = useState(
    DEFAULT_PROGRESS.unlockedAchievementIds
  )
  const [savedLoadouts, setSavedLoadouts] = useState(DEFAULT_PROGRESS.savedLoadouts)
  const [activeLoadoutId, setActiveLoadoutId] = useState(DEFAULT_PROGRESS.activeLoadoutId)
  const [buildWalkthrough, setBuildWalkthrough] = useState(DEFAULT_PROGRESS.buildWalkthrough)
  const [seenUnlockPartIds, setSeenUnlockPartIds] = useState(DEFAULT_PROGRESS.seenUnlockPartIds)
  const [dailyBonusAvailable, setDailyBonusAvailable] = useState(null)
  const [dailyGoals, setDailyGoals] = useState(null)

  const applyProgress = useCallback((progress = {}) => {
    const normalizedProgress = normalizeProgress(progress)

    setCoins(normalizedProgress.coins)
    setLevelXp(normalizedProgress.levelXp)
    setRankMmr(normalizedProgress.rankMmr)
    setRankedState(normalizedProgress.rankedState)
    setOwnedItemIds(normalizedProgress.ownedItemIds)
    setEquippedButtonSkinId(normalizedProgress.equippedButtonSkinId)
    setEquippedArenaThemeId(normalizedProgress.equippedArenaThemeId)
    setEquippedProfileImageId(normalizedProgress.equippedProfileImageId)
    setRoundHistory(normalizedProgress.roundHistory)
    setLifetimeStats(normalizedProgress.lifetimeStats)
    setLoadoutStats(normalizedProgress.loadoutStats)
    setTotalRoundCount(normalizedProgress.totalRoundCount)
    setUnlockedAchievementIds(normalizedProgress.unlockedAchievementIds)
    setSavedLoadouts(normalizedProgress.savedLoadouts)
    setActiveLoadoutId(normalizedProgress.activeLoadoutId)
    setBuildWalkthrough(normalizedProgress.buildWalkthrough)
    setSeenUnlockPartIds(normalizedProgress.seenUnlockPartIds)
    setDailyBonusAvailable(normalizedProgress.dailyBonusAvailable)
    setDailyGoals(normalizedProgress.dailyGoals)

    return normalizedProgress
  }, [])

  const applyPlayerState = useCallback((response = {}) => {
    const safeResponse = response && typeof response === "object" ? response : {}
    const normalizedPlayerState = normalizePlayerState(safeResponse.state ?? safeResponse)

    if (safeResponse?.user?.id !== undefined && safeResponse?.user?.id !== null) {
      setPlayerUserId(String(safeResponse.user.id))
    }

    if (safeResponse?.user?.username) {
      setPlayerUsername(String(safeResponse.user.username))
    }

    setCoins(normalizedPlayerState.coins)
    setOwnedItemIds(normalizedPlayerState.ownedItemIds)
    setEquippedButtonSkinId(normalizedPlayerState.equippedButtonSkinId)
    setEquippedArenaThemeId(normalizedPlayerState.equippedArenaThemeId)
    setEquippedProfileImageId(normalizedPlayerState.equippedProfileImageId)

    return normalizedPlayerState
  }, [])

  const applyAuthenticatedSession = useCallback((response = {}) => {
    const safeResponse = response && typeof response === "object" ? response : {}
    if (safeResponse?.user?.id !== undefined && safeResponse?.user?.id !== null) {
      setPlayerUserId(String(safeResponse.user.id))
    }

    if (safeResponse?.user?.username) {
      setPlayerUsername(String(safeResponse.user.username))
    }

    return applyProgress(safeResponse.progress)
  }, [applyProgress])

  const resetPlayerState = useCallback(() => {
    setPlayerUserId("")
    setPlayerUsername(DEFAULT_PLAYER_NAME)
    applyProgress(DEFAULT_PROGRESS)
    // The selected mode is a device preference, so it survives logout.
  }, [applyProgress])

  return {
    isAuthed,
    setIsAuthed,
    playerUserId,
    setPlayerUserId,
    playerUsername,
    setPlayerUsername,
    coins,
    setCoins,
    levelXp,
    setLevelXp,
    rankMmr,
    setRankMmr,
    rankedState,
    setRankedState,
    ownedItemIds,
    setOwnedItemIds,
    equippedButtonSkinId,
    setEquippedButtonSkinId,
    equippedArenaThemeId,
    setEquippedArenaThemeId,
    equippedProfileImageId,
    setEquippedProfileImageId,
    selectedModeId,
    setSelectedModeId,
    roundHistory,
    setRoundHistory,
    dailyBonusAvailable,
    dailyGoals,
    lifetimeStats,
    setLifetimeStats,
    loadoutStats,
    setLoadoutStats,
    totalRoundCount,
    setTotalRoundCount,
    unlockedAchievementIds,
    setUnlockedAchievementIds,
    savedLoadouts,
    setSavedLoadouts,
    activeLoadoutId,
    setActiveLoadoutId,
    buildWalkthrough,
    setBuildWalkthrough,
    seenUnlockPartIds,
    setSeenUnlockPartIds,
    applyProgress,
    applyPlayerState,
    applyAuthenticatedSession,
    resetPlayerState,
  }
}
