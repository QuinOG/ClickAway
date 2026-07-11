import { lazy, useCallback } from "react"
import { Navigate, Route, Routes } from "react-router-dom"
import { MotionConfig } from "motion/react"

import { isValidModeId } from "./app/appAccountStateHelpers.js"
import { useAchievementSync } from "./app/useAchievementSync.js"
import { useAppDerivedState } from "./app/useAppDerivedState.js"
import { useAppPlayerState } from "./app/useAppPlayerState.js"
import { useAuthSession } from "./app/useAuthSession.js"
import { usePlayerProgressionUpdates } from "./app/usePlayerProgressionUpdates.js"
import { useProgressSync } from "./app/useProgressSync.js"
import { useShopActions } from "./app/useShopActions.js"
import { DIFFICULTIES as MODES } from "./constants/gameModesConfig.js"
import { normalizeBuildWalkthrough } from "./constants/buildWalkthrough.js"

import Layout from "./components/Layout.jsx"
import ProtectedRoute from "./components/routing/ProtectedRoute.jsx"

import LoginPage from "./pages/LoginPage.jsx"
import SignupPage from "./pages/SignupPage.jsx"

const GamePage = lazy(() => import("./pages/GamePage.jsx"))
const HelpPage = lazy(() => import("./pages/HelpPage.jsx"))
const HistoryPage = lazy(() => import("./pages/HistoryPage.jsx"))
const LeaderboardPage = lazy(() => import("./pages/LeaderboardPage.jsx"))
const ChallengesPage = lazy(() => import("./pages/ChallengesPage.jsx"))
const ArmoryPage = lazy(() => import("./pages/ArmoryPage.jsx"))
const ProfilePage = lazy(() => import("./pages/ProfilePage.jsx"))
const ShopPage = lazy(() => import("./pages/ShopPage.jsx"))

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
    playerUserId,
    playerUsername,

    // progression
    coins,
    levelXp,
    rankMmr,
    rankedState,

    // inventory + cosmetics
    ownedItemIds,
    equippedButtonSkinId,
    equippedArenaThemeId,
    equippedProfileImageId,

    // game/session state
    selectedModeId,
    setSelectedModeId,
    roundHistory,
    lifetimeStats,
    loadoutStats,
    totalRoundCount,

    // achievements
    unlockedAchievementIds,
    setUnlockedAchievementIds,
    savedLoadouts,
    setSavedLoadouts,
    activeLoadoutId,
    setActiveLoadoutId,
    buildWalkthrough,
    setBuildWalkthrough,
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
    lifetimeStats,
    coins,
    unlockedAchievementIds,
    savedLoadouts,
    activeLoadoutId,
  })

  const { authReady, handleLogin, handleSignup, handleLogout } = useAuthSession({
    setIsAuthed,
    applyAuthenticatedSession,
    resetPlayerState,
  })

  const { persistIntent, waitForPendingProgress } = useProgressSync({
    isAuthed,
    applyProgress,
  })

  const handleLoadoutStateChange = useCallback((nextState = {}) => {
    const nextSavedLoadouts = Array.isArray(nextState.savedLoadouts)
      ? nextState.savedLoadouts
      : savedLoadouts
    const nextActiveLoadoutId = nextState.activeLoadoutId || activeLoadoutId

    setSavedLoadouts(nextSavedLoadouts)
    setActiveLoadoutId(nextActiveLoadoutId)
    void persistIntent({
      savedLoadouts: nextSavedLoadouts,
      activeLoadoutId: nextActiveLoadoutId,
    })
  }, [
    activeLoadoutId,
    persistIntent,
    savedLoadouts,
    setActiveLoadoutId,
    setSavedLoadouts,
  ])

  const handleBuildWalkthroughChange = useCallback((nextBuildWalkthrough = {}) => {
    const normalizedBuildWalkthrough = normalizeBuildWalkthrough(nextBuildWalkthrough)

    setBuildWalkthrough(normalizedBuildWalkthrough)
    void persistIntent({
      buildWalkthrough: normalizedBuildWalkthrough,
    })
  }, [
    persistIntent,
    setBuildWalkthrough,
  ])

  useAchievementSync({
    unlockedAchievementIds,
    setUnlockedAchievementIds,
    unlockedAchievementIdsFromStats,
  })

  const { handleRoundComplete } = usePlayerProgressionUpdates({
    isAuthed,
    applyProgress,
  })

  const { handlePurchase, handleEquip } = useShopActions({
    isAuthed,
    coins,
    ownedItemIds,
    applyProgress,
    waitForPendingProgress,
  })

  const handleModeChange = useCallback((nextModeId) => {
    if (!isValidModeId(nextModeId)) return
    setSelectedModeId(nextModeId)
    void persistIntent({ selectedModeId: nextModeId })
  }, [persistIntent, setSelectedModeId])

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
                lifetimeStats={lifetimeStats}
                savedLoadouts={savedLoadouts}
                activeLoadoutId={activeLoadoutId}
                activeLoadout={activeLoadout}
                onLoadoutStateChange={handleLoadoutStateChange}
                buildWalkthrough={buildWalkthrough}
                onBuildWalkthroughChange={handleBuildWalkthroughChange}
                buttonSkinClass={equippedButtonSkin?.effectClass}
                buttonSkinImageSrc={equippedButtonSkin?.imageSrc}
                buttonSkinImageScale={
                  equippedButtonSkin?.gameImageScale ??
                  equippedButtonSkin?.imageScale
                }
                arenaThemeClass={equippedArenaTheme?.effectClass}
                achievementStats={achievementStats}
                unlockedAchievementIds={unlockedAchievementIds}
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
                buildWalkthrough={buildWalkthrough}
                onBuildWalkthroughChange={handleBuildWalkthroughChange}
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
              <HistoryPage
                roundHistory={roundHistory}
                totalRoundCount={totalRoundCount}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/leaderboard"
          element={
            <ProtectedRoute isAuthed={isAuthed}>
              <LeaderboardPage
                isAuthed={isAuthed}
                currentUserId={playerUserId}
                currentUsername={playerUsername}
                currentRankProgress={rankProgress}
                roundHistory={roundHistory}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/challenges"
          element={
            <ProtectedRoute isAuthed={isAuthed}>
              <ChallengesPage currentUserId={playerUserId} />
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
                lifetimeStats={lifetimeStats}
                loadoutStats={loadoutStats}
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
