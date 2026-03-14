import { DEFAULT_EQUIPPED_IDS, STORAGE_KEYS } from "../constants/appStorage.js"
import { useLocalStorageState } from "../hooks/useLocalStorageState.js"
import { readArrayFromStorage, readBooleanFromStorage, readNumberFromStorage, readStringFromStorage } from "../utils/localStorage.js"
import { INITIAL_RANK_MMR } from "../utils/rankUtils.js"
import { readSelectedModeId } from "./appStateHelpers.js"

export function useAppPlayerState() {
  const [isAuthed, setIsAuthed] = useLocalStorageState({
    key: STORAGE_KEYS.auth,
    readValue: () => readBooleanFromStorage(STORAGE_KEYS.auth),
  })
  const [authToken, setAuthToken] = useLocalStorageState({
    key: STORAGE_KEYS.authToken,
    readValue: () => readStringFromStorage(STORAGE_KEYS.authToken, ""),
  })
  const [playerUsername, setPlayerUsername] = useLocalStorageState({
    key: STORAGE_KEYS.playerUsername,
    readValue: () => readStringFromStorage(STORAGE_KEYS.playerUsername, "Player"),
  })
  const [coins, setCoins] = useLocalStorageState({
    key: STORAGE_KEYS.coins,
    readValue: () => readNumberFromStorage(STORAGE_KEYS.coins),
  })
  const [levelXp, setLevelXp] = useLocalStorageState({
    key: STORAGE_KEYS.levelXp,
    readValue: () => readNumberFromStorage(STORAGE_KEYS.levelXp),
  })
  const [rankMmr, setRankMmr] = useLocalStorageState({
    key: STORAGE_KEYS.rankMmr,
    readValue: () => readNumberFromStorage(STORAGE_KEYS.rankMmr, INITIAL_RANK_MMR),
  })
  const [ownedItemIds, setOwnedItemIds] = useLocalStorageState({
    key: STORAGE_KEYS.ownedItems,
    readValue: () => readArrayFromStorage(STORAGE_KEYS.ownedItems),
    serialize: JSON.stringify,
  })
  const [equippedButtonSkinId, setEquippedButtonSkinId] = useLocalStorageState({
    key: STORAGE_KEYS.equippedButtonSkin,
    readValue: () =>
      readStringFromStorage(
        STORAGE_KEYS.equippedButtonSkin,
        DEFAULT_EQUIPPED_IDS.buttonSkin
      ),
  })
  const [equippedArenaThemeId, setEquippedArenaThemeId] = useLocalStorageState({
    key: STORAGE_KEYS.equippedArenaTheme,
    readValue: () =>
      readStringFromStorage(
        STORAGE_KEYS.equippedArenaTheme,
        DEFAULT_EQUIPPED_IDS.arenaTheme
      ),
  })
  const [equippedProfileImageId, setEquippedProfileImageId] = useLocalStorageState({
    key: STORAGE_KEYS.equippedProfileImage,
    readValue: () =>
      readStringFromStorage(
        STORAGE_KEYS.equippedProfileImage,
        DEFAULT_EQUIPPED_IDS.profileImage
      ),
  })
  const [selectedModeId, setSelectedModeId] = useLocalStorageState({
    key: STORAGE_KEYS.selectedDifficulty,
    readValue: readSelectedModeId,
  })
  const [roundHistory, setRoundHistory] = useLocalStorageState({
    key: STORAGE_KEYS.roundHistory,
    readValue: () => readArrayFromStorage(STORAGE_KEYS.roundHistory),
    serialize: JSON.stringify,
  })
  const [unlockedAchievementIds, setUnlockedAchievementIds] = useLocalStorageState({
    key: STORAGE_KEYS.achievementsUnlocked,
    readValue: () => readArrayFromStorage(STORAGE_KEYS.achievementsUnlocked),
    serialize: JSON.stringify,
  })

  return {
    isAuthed,
    setIsAuthed,
    authToken,
    setAuthToken,
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
  }
}
