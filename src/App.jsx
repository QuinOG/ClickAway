import { useCallback, useEffect, useRef } from "react"
import { Navigate, Route, Routes } from "react-router-dom"

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
import ProfilePage from "./pages/ProfilePage.jsx"
import ShopPage from "./pages/ShopPage.jsx"
import SignupPage from "./pages/SignupPage.jsx"

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
    applyProgress,
    applyPlayerState,
    applyAuthenticatedSession,
    resetPlayerState,
  } = useAppPlayerState()

  const {
    equippedButtonSkin,
    equippedArenaTheme,
    equippedProfileImage,
    levelProgress,
    rankProgress,
    playerLeaderboardStats,
    achievementStats,
    unlockedAchievementIdsFromStats,
  } = useAppDerivedState({
    equippedButtonSkinId,
    equippedArenaThemeId,
    equippedProfileImageId,
    levelXp,
    rankMmr,
    roundHistory,
    coins,
    unlockedAchievementIds,
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
      ownedItemIds,
      equippedButtonSkinId,
      equippedArenaThemeId,
      equippedProfileImageId,
      roundHistory,
      unlockedAchievementIds,
    }
  }, [
    coins,
    equippedArenaThemeId,
    equippedButtonSkinId,
    equippedProfileImageId,
    levelXp,
    ownedItemIds,
    rankMmr,
    roundHistory,
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
    roundHistory,
    setCoins,
    setLevelXp,
    setRankMmr,
    setRoundHistory,
    persistProgress,
  })

  const { handlePurchase, handleEquip } = useShopActions({
    authToken,
    coins,
    ownedItemIds,
    applyPlayerState,
  })

  const handleModeChange = useCallback((nextModeId) => {
    if (!isValidModeId(nextModeId)) return
    setSelectedModeId(nextModeId)
  }, [setSelectedModeId])

  if (!authReady) {
    return <SessionLoadingScreen />
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
