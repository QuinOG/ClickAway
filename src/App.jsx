import { useEffect, useMemo } from "react"
import { Navigate, Route, Routes } from "react-router-dom"

import Layout from "./components/Layout.jsx"
import ProtectedRoute from "./components/routing/ProtectedRoute.jsx"
import { DEFAULT_EQUIPPED_IDS, STORAGE_KEYS } from "./constants/appStorage.js"
import {
  DEFAULT_DIFFICULTY_ID as DEFAULT_MODE_ID,
  DIFFICULTIES_BY_ID as MODES_BY_ID,
} from "./constants/difficultyConfig.js"
import { SHOP_ITEMS_BY_ID } from "./constants/shopCatalog.js"
import { useLocalStorageState } from "./hooks/useLocalStorageState.js"
import GamePage from "./pages/GamePage.jsx"
import HelpPage from "./pages/HelpPage.jsx"
import HistoryPage from "./pages/HistoryPage.jsx"
import LeaderboardPage from "./pages/LeaderboardPage.jsx"
import LoginPage from "./pages/LoginPage.jsx"
import ProfilePage from "./pages/ProfilePage.jsx"
import ShopPage from "./pages/ShopPage.jsx"
import SignupPage from "./pages/SignupPage.jsx"
import {
  buildAchievementStats,
  evaluateAchievements,
  getUnlockedAchievementIds,
} from "./game/achievements/evaluateAchievements.js"
import { readArrayFromStorage, readBooleanFromStorage, readNumberFromStorage, readStringFromStorage } from "./utils/localStorage.js"
import { appendHistoryEntry, buildPlayerLeaderboardStats, createHistoryEntry } from "./utils/historyUtils.js"
import { isRankedModeEntry } from "./utils/modeUtils.js"
import { calculateRoundXp, getLevelProgress } from "./utils/progressionUtils.js"
import {
  calculateRoundRankDelta,
  getRankProgressWithPlacement,
  INITIAL_RANK_MMR,
} from "./utils/rankUtils.js"
import { calculateRoundCoins } from "./utils/roundRewards.js"
import { canPurchaseShopItem, isShopItemOwned } from "./utils/shopUtils.js"

function readSelectedModeId() {
  const storedModeId = readStringFromStorage(
    STORAGE_KEYS.selectedDifficulty,
    DEFAULT_MODE_ID
  )

  return MODES_BY_ID[storedModeId]
    ? storedModeId
    : DEFAULT_MODE_ID
}

function isValidModeId(modeId) {
  return Boolean(MODES_BY_ID[modeId])
}

function normalizeUsername(username = "") {
  return String(username).trim()
}

function getEquippedShopItem(itemId, fallbackItemId) {
  return SHOP_ITEMS_BY_ID[itemId] ?? SHOP_ITEMS_BY_ID[fallbackItemId]
}

function mergeUnlockedAchievementIds(currentIds, nextUnlockedIds) {
  const currentList = Array.isArray(currentIds)
    ? currentIds.filter((id) => typeof id === "string")
    : []
  const nextList = Array.isArray(nextUnlockedIds)
    ? nextUnlockedIds.filter((id) => typeof id === "string")
    : []
  const mergedSet = new Set(currentList)
  let hasChanges = currentList.length !== (Array.isArray(currentIds) ? currentIds.length : 0)

  nextList.forEach((id) => {
    if (!mergedSet.has(id)) {
      mergedSet.add(id)
      hasChanges = true
    }
  })

  if (!hasChanges) return currentIds
  return Array.from(mergedSet)
}

export default function App() {
  const [isAuthed, setIsAuthed] = useLocalStorageState({
    key: STORAGE_KEYS.auth,
    readValue: () => readBooleanFromStorage(STORAGE_KEYS.auth),
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
  const evaluatedAchievements = useMemo(
    () => evaluateAchievements(achievementStats, {
      persistedUnlockedIds: unlockedAchievementIds,
    }),
    [achievementStats, unlockedAchievementIds]
  )
  const unlockedAchievementIdsFromStats = useMemo(
    () => getUnlockedAchievementIds(evaluatedAchievements),
    [evaluatedAchievements]
  )

  useEffect(() => {
    setUnlockedAchievementIds((currentIds) =>
      mergeUnlockedAchievementIds(currentIds, unlockedAchievementIdsFromStats)
    )
  }, [setUnlockedAchievementIds, unlockedAchievementIdsFromStats])

  function handleLogin(username = "") {
    const normalizedUsername = normalizeUsername(username)
    // Keep signup as the source of truth unless no username has been created yet.
    if (normalizedUsername && !normalizeUsername(playerUsername)) {
      setPlayerUsername(normalizedUsername)
    }
    setIsAuthed(true)
  }

  function handleSignup(username = "") {
    const normalizedUsername = normalizeUsername(username) || "Player"
    setPlayerUsername(normalizedUsername)
    setIsAuthed(true)
  }

  function handleLogout() {
    setIsAuthed(false)
  }

  function handleRoundComplete({
    clicksScored,
    coinMultiplier = 1,
    allowsCoinRewards = true,
    allowsLevelProgression = true,
    allowsRankProgression = false,
    progressionMode = "",
    hits = 0,
    misses = 0,
    score = 0,
    bestStreak = 0,
    modeId = "",
  }) {
    const earnedCoins = allowsCoinRewards
      ? calculateRoundCoins(clicksScored, coinMultiplier)
      : 0
    const earnedXp = allowsLevelProgression
      ? calculateRoundXp({
        hits,
        misses,
        bestStreak,
        score,
      })
      : 0
    const rankDelta = calculateRoundRankDelta({
      score,
      hits,
      misses,
      bestStreak,
      modeId,
      progressionMode,
      allowsRankProgression,
    })

    const historyEntry = createHistoryEntry({
      score,
      hits,
      misses,
      bestStreak,
      coinsEarned: earnedCoins,
      modeId,
      progressionMode,
      xpEarned: earnedXp,
      rankDelta,
    })

    if (earnedCoins > 0) {
      setCoins((currentCoins) => currentCoins + earnedCoins)
    }

    if (earnedXp > 0) {
      setLevelXp((currentXp) => currentXp + earnedXp)
    }

    if (rankDelta !== 0) {
      setRankMmr((currentMmr) => Math.max(0, currentMmr + rankDelta))
    }

    setRoundHistory((currentHistory) =>
      appendHistoryEntry(currentHistory, historyEntry)
    )
  }

  function handleModeChange(nextModeId) {
    if (!isValidModeId(nextModeId)) return
    setSelectedModeId(nextModeId)
  }

  function handlePurchase(item) {
    const canPurchase = canPurchaseShopItem(item, coins, ownedItemIds)
    if (!canPurchase) return false

    setCoins((currentCoins) => currentCoins - item.cost)
    setOwnedItemIds((currentItemIds) => [...currentItemIds, item.id])
    return true
  }

  function handleEquip(item) {
    if (!item?.id || !item.type) return false

    const isOwned = isShopItemOwned(item, ownedItemIds)
    if (!isOwned) return false

    if (item.type === "button_skin") {
      setEquippedButtonSkinId(item.id)
      return true
    }

    if (item.type === "arena_theme") {
      setEquippedArenaThemeId(item.id)
      return true
    }

    if (item.type === "profile_image") {
      setEquippedProfileImageId(item.id)
      return true
    }

    return false
  }

  return (
    <Routes>
      <Route
        element={
          <Layout
            isAuthed={isAuthed}
            coins={coins}
            level={levelProgress.level}
            accuracy={playerLeaderboardStats.accuracy}
            rankLabel={rankProgress.tierLabel}
            rankMmr={rankProgress.mmr}
          />
        }
      >
        <Route path="/" element={<Navigate to={isAuthed ? "/game" : "/login"} replace />} />
        <Route
          path="/login"
          element={
            isAuthed ? <Navigate to="/game" replace /> : <LoginPage onLogin={handleLogin} />
          }
        />
        <Route
          path="/signup"
          element={
            isAuthed ? (
              <Navigate to="/game" replace />
            ) : (
              <SignupPage onSignup={handleSignup} />
            )
          }
        />

        <Route
          path="/help"
          element={
            <ProtectedRoute isAuthed={isAuthed}>
              <HelpPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/game"
          element={
            <ProtectedRoute isAuthed={isAuthed}>
              <GamePage
                onRoundComplete={handleRoundComplete}
                selectedModeId={selectedModeId}
                onModeChange={handleModeChange}
                playerLevel={levelProgress.level}
                playerXpIntoLevel={levelProgress.xpIntoLevel}
                playerXpToNextLevel={levelProgress.xpToNextLevel}
                playerLevelProgressPercent={levelProgress.progressPercent}
                playerRankLabel={rankProgress.tierLabel}
                playerRankMmr={rankProgress.mmr}
                playerRankToNextTier={rankProgress.mmrToNextTier}
                buttonSkinClass={equippedButtonSkin?.effectClass}
                buttonSkinImageSrc={equippedButtonSkin?.imageSrc}
                buttonSkinImageScale={
                  equippedButtonSkin?.gameImageScale ?? equippedButtonSkin?.imageScale
                }
                arenaThemeClass={equippedArenaTheme?.effectClass}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/shop"
          element={
            <ProtectedRoute isAuthed={isAuthed}>
              <ShopPage
                coins={coins}
                ownedItems={ownedItemIds}
                onPurchase={handlePurchase}
                onEquip={handleEquip}
                equippedButtonSkinId={equippedButtonSkinId}
                equippedArenaThemeId={equippedArenaThemeId}
                equippedProfileImageId={equippedProfileImageId}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute isAuthed={isAuthed}>
              <HistoryPage roundHistory={roundHistory} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <ProtectedRoute isAuthed={isAuthed}>
              <LeaderboardPage
                roundHistory={roundHistory}
                playerRankLabel={rankProgress.tierLabel}
                playerRankMmr={rankProgress.mmr}
                playerCoins={coins}
                playerLevel={levelProgress.level}
                currentUsername={playerUsername}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute isAuthed={isAuthed}>
              <ProfilePage
                onLogout={handleLogout}
                playerName={playerUsername}
                coins={coins}
                levelProgress={levelProgress}
                rankProgress={rankProgress}
                roundHistory={roundHistory}
                equippedProfileImage={equippedProfileImage}
                achievementStats={achievementStats}
                persistedAchievementIds={unlockedAchievementIds}
              />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
