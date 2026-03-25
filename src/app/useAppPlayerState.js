import { useCallback, useState } from "react"

import { DEFAULT_EQUIPPED_IDS, STORAGE_KEYS } from "../constants/appStorage.js"
import { DEFAULT_DIFFICULTY_ID as DEFAULT_MODE_ID } from "../constants/difficultyConfig.js"
import { useLocalStorageState } from "../hooks/useLocalStorageState.js"
import { readStringFromStorage } from "../utils/localStorage.js"
import { INITIAL_RANK_MMR } from "../utils/rankUtils.js"

const DEFAULT_PLAYER_NAME = "Player"
const DEFAULT_PROGRESS = {
  coins: 0,
  levelXp: 0,
  rankMmr: INITIAL_RANK_MMR,
  ownedItemIds: [],
  equippedButtonSkinId: DEFAULT_EQUIPPED_IDS.buttonSkin,
  equippedArenaThemeId: DEFAULT_EQUIPPED_IDS.arenaTheme,
  equippedProfileImageId: DEFAULT_EQUIPPED_IDS.profileImage,
  roundHistory: [],
  unlockedAchievementIds: [],
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
  return {
    coins: Math.max(0, Number(progress.coins) || 0),
    levelXp: Math.max(0, Number(progress.levelXp) || 0),
    rankMmr: Math.max(0, Number(progress.rankMmr) || 0),
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
    roundHistory: Array.isArray(progress.roundHistory) ? progress.roundHistory : [],
    unlockedAchievementIds: normalizeStringList(progress.unlockedAchievementIds),
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

  const applyProgress = useCallback((progress = {}) => {
    const normalizedProgress = normalizeProgress(progress)

    setCoins(normalizedProgress.coins)
    setLevelXp(normalizedProgress.levelXp)
    setRankMmr(normalizedProgress.rankMmr)
    setOwnedItemIds(normalizedProgress.ownedItemIds)
    setEquippedButtonSkinId(normalizedProgress.equippedButtonSkinId)
    setEquippedArenaThemeId(normalizedProgress.equippedArenaThemeId)
    setEquippedProfileImageId(normalizedProgress.equippedProfileImageId)
    setRoundHistory(normalizedProgress.roundHistory)
    setUnlockedAchievementIds(normalizedProgress.unlockedAchievementIds)

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
    applyProgress,
    applyPlayerState,
    applyAuthenticatedSession,
    resetPlayerState,
  }
}
