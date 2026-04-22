import { useCallback, useState } from "react"

import {
  ACTIVE_LOADOUT_ID_DEFAULT,
  DEFAULT_SAVED_LOADOUTS,
  normalizeLoadoutState,
} from "../constants/buildcraft.js"
import {
  BUILD_WALKTHROUGH_STATUS,
  normalizeBuildWalkthrough,
} from "../constants/buildWalkthrough.js"
import { DEFAULT_EQUIPPED_IDS, STORAGE_KEYS } from "../constants/clientStorageKeysAndEquippedDefaults.js"
import { DEFAULT_DIFFICULTY_ID as DEFAULT_MODE_ID } from "../constants/gameModesConfig.js"
import { useLocalStorageState } from "../hooks/useLocalStorageState.js"
import { getLevelProgress } from "../utils/progressionUtils.js"
import { normalizeHistoryEntry } from "../utils/historyUtils.js"
import { readStringFromStorage } from "../utils/browserLocalStorageRead.js"
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
  unlockedAchievementIds: [],
  savedLoadouts: DEFAULT_SAVED_LOADOUTS,
  activeLoadoutId: ACTIVE_LOADOUT_ID_DEFAULT,
  buildWalkthrough: normalizeBuildWalkthrough(
    {},
    BUILD_WALKTHROUGH_STATUS.DISMISSED
  ),
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
  const levelXp = Math.max(0, Number(progress.levelXp) || 0)
  const level = getLevelProgress(levelXp).level
  const normalizedRoundHistory = (Array.isArray(progress.roundHistory) ? progress.roundHistory : [])
    .map(normalizeHistoryEntry)
  const migratedRankData = migrateLegacyRankData({
    rankMmr: progress.rankMmr,
    rankedState: progress.rankedState,
    roundHistory: normalizedRoundHistory,
  })
  const normalizedLoadouts = normalizeLoadoutState(
    level,
    progress.savedLoadouts,
    progress.activeLoadoutId
  )

  return {
    coins: Math.max(0, Number(progress.coins) || 0),
    levelXp,
    rankMmr: migratedRankData.rankMmr,
    rankedState: migratedRankData.rankedState,
    ownedItemIds: normalizeStringList(progress.ownedItemIds),
    equippedButtonSkinId: String(
      progress.equippedButtonSkinId || DEFAULT_EQUIPPED_IDS.buttonSkin
    ),
    equippedArenaThemeId: String(
      progress.equippedArenaThemeId || DEFAULT_EQUIPPED_IDS.arenaTheme
    ),
    equippedProfileImageId: String(
      progress.equippedProfileImageId || DEFAULT_EQUIPPED_IDS.profileImage
    ),
    roundHistory: normalizedRoundHistory,
    unlockedAchievementIds: normalizeStringList(progress.unlockedAchievementIds),
    savedLoadouts: normalizedLoadouts.savedLoadouts,
    activeLoadoutId: normalizedLoadouts.activeLoadoutId,
    buildWalkthrough: normalizeBuildWalkthrough(
      progress.buildWalkthrough,
      BUILD_WALKTHROUGH_STATUS.DISMISSED
    ),
  }
}

function normalizePlayerState(playerState = {}) {
  return {
    coins: Math.max(0, Number(playerState.coins) || 0),
    ownedItemIds: normalizeStringList(playerState.ownedItemIds),
    equippedButtonSkinId: String(
      playerState.equippedButtonSkinId || DEFAULT_EQUIPPED_IDS.buttonSkin
    ),
    equippedArenaThemeId: String(
      playerState.equippedArenaThemeId || DEFAULT_EQUIPPED_IDS.arenaTheme
    ),
    equippedProfileImageId: String(
      playerState.equippedProfileImageId || DEFAULT_EQUIPPED_IDS.profileImage
    ),
  }
}

export function useAppPlayerState() {
  const [isAuthed, setIsAuthed] = useState(false)
  const [authToken, setAuthToken] = useLocalStorageState({
    key: STORAGE_KEYS.authToken,
    readValue: () => readStringFromStorage(STORAGE_KEYS.authToken, ""),
  })
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
  const [selectedModeId, setSelectedModeId] = useState(DEFAULT_MODE_ID)
  const [roundHistory, setRoundHistory] = useState(DEFAULT_PROGRESS.roundHistory)
  const [unlockedAchievementIds, setUnlockedAchievementIds] = useState(
    DEFAULT_PROGRESS.unlockedAchievementIds
  )
  const [savedLoadouts, setSavedLoadouts] = useState(DEFAULT_PROGRESS.savedLoadouts)
  const [activeLoadoutId, setActiveLoadoutId] = useState(DEFAULT_PROGRESS.activeLoadoutId)
  const [buildWalkthrough, setBuildWalkthrough] = useState(DEFAULT_PROGRESS.buildWalkthrough)

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
    setUnlockedAchievementIds(normalizedProgress.unlockedAchievementIds)
    setSavedLoadouts(normalizedProgress.savedLoadouts)
    setActiveLoadoutId(normalizedProgress.activeLoadoutId)
    setBuildWalkthrough(normalizedProgress.buildWalkthrough)

    return normalizedProgress
  }, [])

  const applyPlayerState = useCallback((response = {}) => {
    const normalizedPlayerState = normalizePlayerState(response.state ?? response)

    if (response?.user?.id !== undefined && response?.user?.id !== null) {
      setPlayerUserId(String(response.user.id))
    }

    if (response?.user?.username) {
      setPlayerUsername(String(response.user.username))
    }

    setCoins(normalizedPlayerState.coins)
    setOwnedItemIds(normalizedPlayerState.ownedItemIds)
    setEquippedButtonSkinId(normalizedPlayerState.equippedButtonSkinId)
    setEquippedArenaThemeId(normalizedPlayerState.equippedArenaThemeId)
    setEquippedProfileImageId(normalizedPlayerState.equippedProfileImageId)

    return normalizedPlayerState
  }, [])

  const applyAuthenticatedSession = useCallback((response = {}) => {
    if (response?.user?.id !== undefined && response?.user?.id !== null) {
      setPlayerUserId(String(response.user.id))
    }

    if (response?.user?.username) {
      setPlayerUsername(String(response.user.username))
    }

    return applyProgress(response.progress)
  }, [applyProgress])

  const resetPlayerState = useCallback(() => {
    setPlayerUserId("")
    setPlayerUsername(DEFAULT_PLAYER_NAME)
    applyProgress(DEFAULT_PROGRESS)
    setSelectedModeId(DEFAULT_MODE_ID)
  }, [applyProgress])

  return {
    isAuthed,
    setIsAuthed,
    authToken,
    setAuthToken,
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
    unlockedAchievementIds,
    setUnlockedAchievementIds,
    savedLoadouts,
    setSavedLoadouts,
    activeLoadoutId,
    setActiveLoadoutId,
    buildWalkthrough,
    setBuildWalkthrough,
    applyProgress,
    applyPlayerState,
    applyAuthenticatedSession,
    resetPlayerState,
  }
}
