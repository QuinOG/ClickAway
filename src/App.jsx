import { useCallback, useEffect, useRef } from "react"
import { Navigate, Route, Routes } from "react-router-dom"
import { MotionConfig } from "motion/react"

import { isValidModeId } from "./app/appStateHelpers.js"
import { useAchievementSync } from "./app/useAchievementSync.js"
import { useAppDerivedState } from "./app/useAppDerivedState.js"
import { useAppPlayerState } from "./app/useAppPlayerState.js"
import { useAuthSession } from "./app/useAuthSession.js"
import { usePlayerProgressionUpdates } from "./app/usePlayerProgressionUpdates.js"
import { useShopActions } from "./app/useShopActions.js"
import { updatePlayerProgress } from "./services/api.js"

import Layout from "./components/Layout.jsx"
import ProtectedRoute from "./components/routing/ProtectedRoute.jsx"

import GamePage from "./pages/GamePage.jsx"
import HelpPage from "./pages/HelpPage.jsx"
import HistoryPage from "./pages/HistoryPage.jsx"
import LeaderboardPage from "./pages/LeaderboardPage.jsx"
import LoginPage from "./pages/LoginPage.jsx"
import ArmoryPage from "./pages/ArmoryPage.jsx"
import ProfilePage from "./pages/ProfilePage.jsx"
import ShopPage from "./pages/ShopPage.jsx"
import SignupPage from "./pages/SignupPage.jsx"
import { DIFFICULTIES as MODES } from "./constants/difficultyConfig.js"

function SessionLoadingScreen() {
  return (
    <div className="pageCenter">
      <section className="cardWide authCard">
        <h1 className="cardTitle authTitle">Checking session...</h1>
      </section>
    </div>
  )
}

export default function App() {
  const {
    // auth + identity
    isAuthed,
    setIsAuthed,
    authToken,
    setAuthToken,
    playerUserId,
    playerUsername,

    // progression
    coins,
    setCoins,
    levelXp,
    setLevelXp,
    rankMmr,
    setRankMmr,
    rankedState,
    setRankedState,

    // inventory + cosmetics
    ownedItemIds,
    equippedButtonSkinId,
    equippedArenaThemeId,
    equippedProfileImageId,

    // game/session state
    selectedModeId,
    setSelectedModeId,
    roundHistory,
    setRoundHistory,

    // achievements
    unlockedAchievementIds,
    setUnlockedAchievementIds,
    savedLoadouts,
    setSavedLoadouts,
    activeLoadoutId,
    setActiveLoadoutId,
    applyProgress,
    applyAuthenticatedSession,
    resetPlayerState,
  } = useAppPlayerState()

  const {
    equippedButtonSkin,
    equippedArenaTheme,
    equippedProfileImage,
    levelProgress,
    hasRankedHistory,
    rankProgress,
    playerLeaderboardStats,
    achievementStats,
    unlockedAchievementIdsFromStats,
    activeLoadout,
  } = useAppDerivedState({
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
  })

  const { authReady, handleLogin, handleSignup, handleLogout } = useAuthSession({
    authToken,
    setAuthToken,
    setIsAuthed,
    applyAuthenticatedSession,
    resetPlayerState,
  })

  const persistQueueRef = useRef(Promise.resolve(null))
  const activeAuthTokenRef = useRef(authToken)
  const progressSnapshotRef = useRef({})

  useEffect(() => {
    activeAuthTokenRef.current = authToken
    persistQueueRef.current = Promise.resolve(null)
  }, [authToken])

  useEffect(() => {
    progressSnapshotRef.current = {
      coins,
      levelXp,
      rankMmr,
      rankedState,
      ownedItemIds,
      equippedButtonSkinId,
      equippedArenaThemeId,
      equippedProfileImageId,
      roundHistory,
      unlockedAchievementIds,
      savedLoadouts,
      activeLoadoutId,
    }
  }, [
    activeLoadoutId,
    coins,
    equippedArenaThemeId,
    equippedButtonSkinId,
    equippedProfileImageId,
    levelXp,
    ownedItemIds,
    rankMmr,
    rankedState,
    roundHistory,
    savedLoadouts,
    unlockedAchievementIds,
  ])

  const persistProgress = useCallback((nextProgress = {}) => {
    if (!authToken) {
      return Promise.resolve(null)
    }

    const progressPayload = {
      ...progressSnapshotRef.current,
      ...nextProgress,
    }

    progressSnapshotRef.current = progressPayload

    persistQueueRef.current = persistQueueRef.current
      .catch(() => null)
      .then(async () => {
        const response = await updatePlayerProgress(authToken, progressPayload)
        if (activeAuthTokenRef.current !== authToken) {
          return null
        }
        applyProgress(response.progress)
        return response.progress
      })
      .catch((error) => {
        console.error("Unable to sync player progress:", error)
        return null
      })

    return persistQueueRef.current
  }, [applyProgress, authToken])

  const waitForPendingProgress = useCallback(
    () => persistQueueRef.current.catch(() => null),
    []
  )

  const syncProgressSnapshot = useCallback((nextProgress = {}) => {
    progressSnapshotRef.current = {
      ...progressSnapshotRef.current,
      ...nextProgress,
    }

    return progressSnapshotRef.current
  }, [])

  const handleLoadoutStateChange = useCallback((nextState = {}) => {
    const nextSavedLoadouts = Array.isArray(nextState.savedLoadouts)
      ? nextState.savedLoadouts
      : savedLoadouts
    const nextActiveLoadoutId = nextState.activeLoadoutId || activeLoadoutId

    setSavedLoadouts(nextSavedLoadouts)
    setActiveLoadoutId(nextActiveLoadoutId)
    syncProgressSnapshot({
      savedLoadouts: nextSavedLoadouts,
      activeLoadoutId: nextActiveLoadoutId,
    })
    void persistProgress({
      savedLoadouts: nextSavedLoadouts,
      activeLoadoutId: nextActiveLoadoutId,
    })
  }, [
    activeLoadoutId,
    persistProgress,
    savedLoadouts,
    setActiveLoadoutId,
    setSavedLoadouts,
    syncProgressSnapshot,
  ])

  useAchievementSync({
    unlockedAchievementIds,
    setUnlockedAchievementIds,
    unlockedAchievementIdsFromStats,
    persistProgress,
  })

  const { handleRoundComplete } = usePlayerProgressionUpdates({
    coins,
    levelXp,
    rankMmr,
    rankedState,
    roundHistory,
    setCoins,
    setLevelXp,
    setRankMmr,
    setRankedState,
    setRoundHistory,
    persistProgress,
  })

  const { handlePurchase, handleEquip } = useShopActions({
    authToken,
    coins,
    ownedItemIds,
    equippedButtonSkinId,
    equippedArenaThemeId,
    equippedProfileImageId,
    applyProgress,
    applyAuthenticatedSession,
    waitForPendingProgress,
    syncProgressSnapshot,
  })

  const handleModeChange = useCallback((nextModeId) => {
    if (!isValidModeId(nextModeId)) return
    setSelectedModeId(nextModeId)
  }, [setSelectedModeId])

  if (!authReady) {
    return <SessionLoadingScreen />
  }

  return (
    <MotionConfig reducedMotion="user">
    <Routes>
      <Route
        element={
          <Layout
            isAuthed={isAuthed}
            coins={coins}
            level={levelProgress.level}
            accuracyPercent={playerLeaderboardStats.accuracyPercent}
            rankProgress={rankProgress}
            rankLabel={rankProgress.tierLabel}
            rankMmr={rankProgress.mmr}
          />
        }
      >
        <Route
          path="/"
          element={<Navigate to={isAuthed ? "/game" : "/login"} replace />}
        />

        <Route
          path="/login"
          element={
            isAuthed
              ? <Navigate to="/game" replace />
              : <LoginPage onLogin={handleLogin} />
          }
        />

        <Route
          path="/signup"
          element={
            isAuthed
              ? <Navigate to="/game" replace />
              : <SignupPage onSignup={handleSignup} />
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
                playerRankMmr={rankProgress.mmr}
                playerRankLabel={rankProgress.tierLabel}
                playerRankProgress={rankProgress}
                playerRankedState={rankedState}
                playerHasRankedHistory={hasRankedHistory}
                playerBestScore={playerLeaderboardStats.bestScore}
                savedLoadouts={savedLoadouts}
                activeLoadoutId={activeLoadoutId}
                activeLoadout={activeLoadout}
                onLoadoutStateChange={handleLoadoutStateChange}
                buttonSkinClass={equippedButtonSkin?.effectClass}
                buttonSkinImageSrc={equippedButtonSkin?.imageSrc}
                buttonSkinImageScale={
                  equippedButtonSkin?.gameImageScale ??
                  equippedButtonSkin?.imageScale
                }
                arenaThemeClass={equippedArenaTheme?.effectClass}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/armory"
          element={
            <ProtectedRoute isAuthed={isAuthed}>
              <ArmoryPage
                modes={MODES}
                selectedModeId={selectedModeId}
                onModeChange={handleModeChange}
                playerLevel={levelProgress.level}
                savedLoadouts={savedLoadouts}
                activeLoadoutId={activeLoadoutId}
                onLoadoutStateChange={handleLoadoutStateChange}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/shop"
          element={
            <ProtectedRoute isAuthed={isAuthed}>
              <ShopPage
                playerName={playerUsername}
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
                authToken={authToken}
                currentUserId={playerUserId}
                currentUsername={playerUsername}
                currentRankProgress={rankProgress}
                roundHistory={roundHistory}
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
    </MotionConfig>
  )
}
