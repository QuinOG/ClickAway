import { useCallback } from "react"
import { Navigate, Route, Routes } from "react-router-dom"

import { isValidModeId } from "./app/appStateHelpers.js"
import { useAchievementSync } from "./app/useAchievementSync.js"
import { useAppDerivedState } from "./app/useAppDerivedState.js"
import { useAppPlayerState } from "./app/useAppPlayerState.js"
import { useAuthSession } from "./app/useAuthSession.js"
import { usePlayerProgressionUpdates } from "./app/usePlayerProgressionUpdates.js"
import { useShopActions } from "./app/useShopActions.js"

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
    playerUsername,
    setPlayerUsername,

    // progression
    coins,
    setCoins,
    levelXp,
    setLevelXp,
    rankMmr,
    setRankMmr,

    // inventory + cosmetics
    ownedItemIds,
    setOwnedItemIds,
    equippedButtonSkinId,
    setEquippedButtonSkinId,
    equippedArenaThemeId,
    setEquippedArenaThemeId,
    equippedProfileImageId,
    setEquippedProfileImageId,

    // game/session state
    selectedModeId,
    setSelectedModeId,
    roundHistory,
    setRoundHistory,

    // achievements
    unlockedAchievementIds,
    setUnlockedAchievementIds,
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

  useAchievementSync({
    setUnlockedAchievementIds,
    unlockedAchievementIdsFromStats,
  })

  const { authReady, handleLogin, handleSignup, handleLogout } = useAuthSession({
    authToken,
    setAuthToken,
    setIsAuthed,
    setPlayerUsername,
  })

  const { handleRoundComplete } = usePlayerProgressionUpdates({
    setCoins,
    setLevelXp,
    setRankMmr,
    setRoundHistory,
  })

  const { handlePurchase, handleEquip } = useShopActions({
    coins,
    ownedItemIds,
    setCoins,
    setOwnedItemIds,
    setEquippedButtonSkinId,
    setEquippedArenaThemeId,
    setEquippedProfileImageId,
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
                playerLevelProgressPercent={levelProgress.progressPercent}
                playerRankLabel={rankProgress.tierLabel}
                playerRankMmr={rankProgress.mmr}
                playerRankToNextTier={rankProgress.mmrToNextTier}
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
