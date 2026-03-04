import { useMemo } from "react"
import { Navigate, Route, Routes } from "react-router-dom"

import Layout from "./components/Layout.jsx"
import ProtectedRoute from "./components/routing/ProtectedRoute.jsx"
import { DEFAULT_EQUIPPED_IDS, STORAGE_KEYS } from "./constants/appStorage.js"
import {
  DEFAULT_DIFFICULTY_ID,
  DIFFICULTIES_BY_ID,
} from "./constants/difficultyConfig.js"
import { SHOP_ITEMS_BY_ID } from "./constants/shopCatalog.js"
import { useLocalStorageState } from "./hooks/useLocalStorageState.js"
import GamePage from "./pages/GamePage.jsx"
import HelpPage from "./pages/HelpPage.jsx"
import HistoryPage from "./pages/HistoryPage.jsx"
import LeaderboardPage from "./pages/LeaderboardPage.jsx"
import LoginPage from "./pages/LoginPage.jsx"
import ShopPage from "./pages/ShopPage.jsx"
import SignupPage from "./pages/SignupPage.jsx"
import { readArrayFromStorage, readBooleanFromStorage, readNumberFromStorage, readStringFromStorage } from "./utils/localStorage.js"
import { appendHistoryEntry, createHistoryEntry } from "./utils/historyUtils.js"
import { calculateRoundXp, getLevelProgress } from "./utils/progressionUtils.js"
import { calculateRoundRankDelta, getRankProgress, INITIAL_RANK_MMR } from "./utils/rankUtils.js"
import { calculateRoundCoins } from "./utils/roundRewards.js"
import { canPurchaseShopItem, isShopItemOwned } from "./utils/shopUtils.js"

function readSelectedDifficultyId() {
  const storedDifficultyId = readStringFromStorage(
    STORAGE_KEYS.selectedDifficulty,
    DEFAULT_DIFFICULTY_ID
  )

  return DIFFICULTIES_BY_ID[storedDifficultyId]
    ? storedDifficultyId
    : DEFAULT_DIFFICULTY_ID
}

function isValidDifficultyId(difficultyId) {
  return Boolean(DIFFICULTIES_BY_ID[difficultyId])
}

function getEquippedShopItem(itemId, fallbackItemId) {
  return SHOP_ITEMS_BY_ID[itemId] ?? SHOP_ITEMS_BY_ID[fallbackItemId]
}

export default function App() {
  const [isAuthed, setIsAuthed] = useLocalStorageState({
    key: STORAGE_KEYS.auth,
    readValue: () => readBooleanFromStorage(STORAGE_KEYS.auth),
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

  const [selectedDifficultyId, setSelectedDifficultyId] = useLocalStorageState({
    key: STORAGE_KEYS.selectedDifficulty,
    readValue: readSelectedDifficultyId,
  })

  const [roundHistory, setRoundHistory] = useLocalStorageState({
    key: STORAGE_KEYS.roundHistory,
    readValue: () => readArrayFromStorage(STORAGE_KEYS.roundHistory),
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

  const levelProgress = useMemo(() => getLevelProgress(levelXp), [levelXp])
  const rankProgress = useMemo(() => getRankProgress(rankMmr), [rankMmr])

  function handleLogin() {
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
    difficultyId = "",
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
      difficultyId,
      progressionMode,
      allowsRankProgression,
    })

    const historyEntry = createHistoryEntry({
      score,
      hits,
      misses,
      bestStreak,
      coinsEarned: earnedCoins,
      difficultyId,
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

  function handleDifficultyChange(nextDifficultyId) {
    if (!isValidDifficultyId(nextDifficultyId)) return
    setSelectedDifficultyId(nextDifficultyId)
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

    return false
  }

  return (
    <Routes>
      <Route element={<Layout isAuthed={isAuthed} onLogout={handleLogout} coins={coins} />}>
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
              <SignupPage onSignup={handleLogin} />
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
                selectedDifficultyId={selectedDifficultyId}
                onDifficultyChange={handleDifficultyChange}
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
              />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
