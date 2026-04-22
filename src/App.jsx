import { lazy, useCallback, useEffect, useRef } from "react"
import { Navigate, Route, Routes } from "react-router-dom"
import { MotionConfig } from "motion/react"
import toast from "react-hot-toast"

import { isValidModeId } from "./app/appAccountStateHelpers.js"
import { useAchievementSync } from "./app/useAchievementSync.js"
import { useAppDerivedState } from "./app/useAppDerivedState.js"
import { useAppPlayerState } from "./app/useAppPlayerState.js"
import { useAuthSession } from "./app/useAuthSession.js"
import { usePlayerProgressionUpdates } from "./app/usePlayerProgressionUpdates.js"
import { useShopActions } from "./app/useShopActions.js"
import { updatePlayerProgress } from "./services/clickAwayHttpApiClient.js"
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
const ArmoryPage = lazy(() => import("./pages/ArmoryPage.jsx"))
const ProfilePage = lazy(() => import("./pages/ProfilePage.jsx"))
const ShopPage = lazy(() => import("./pages/ShopPage.jsx"))

const PROGRESS_SYNC_TOAST_ID = "progress-sync"

const PROGRESS_ERROR_TOAST_STYLE = {
  background: "rgba(11, 18, 36, 0.97)",
  color: "#ddeeff",
  border: "1px solid rgba(255, 106, 117, 0.4)",
  borderRadius: "12px",
  fontSize: "13px",
  fontFamily: "inherit",
  fontWeight: 600,
  padding: "10px 14px",
  boxShadow: "0 12px 28px rgba(4, 8, 20, 0.52)",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  maxWidth: "min(380px, 92vw)",
}

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
  const persistProgressRef = useRef(null)

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
      buildWalkthrough,
    }
  }, [
    activeLoadoutId,
    buildWalkthrough,
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

    if (nextProgress.buildWalkthrough === undefined) {
      progressPayload.buildWalkthrough = buildWalkthrough
    }

    progressSnapshotRef.current = progressPayload

    persistQueueRef.current = persistQueueRef.current
      .catch(() => null)
      .then(async () => {
        const response = await updatePlayerProgress(authToken, progressPayload)
        if (activeAuthTokenRef.current !== authToken) {
          return null
        }
        toast.dismiss(PROGRESS_SYNC_TOAST_ID)
        applyProgress(response.progress)
        return response.progress
      })
      .catch((error) => {
        console.error("Unable to sync player progress:", error)
        toast.custom(
          (t) => (
            <div style={PROGRESS_ERROR_TOAST_STYLE}>
              <span style={{ flex: "1 1 auto", lineHeight: 1.35 }}>
                Couldn&apos;t save progress. Check your connection.
              </span>
              <button
                type="button"
                className="primaryButton primaryButton-sm"
                onClick={() => {
                  toast.dismiss(t.id)
                  void persistProgressRef.current?.({})
                }}
              >
                Retry
              </button>
            </div>
          ),
          { id: PROGRESS_SYNC_TOAST_ID, duration: Infinity },
        )
        return null
      })

    return persistQueueRef.current
  }, [applyProgress, authToken, buildWalkthrough])

  useEffect(() => {
    persistProgressRef.current = persistProgress
  }, [persistProgress])

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

  const handleBuildWalkthroughChange = useCallback((nextBuildWalkthrough = {}) => {
    const normalizedBuildWalkthrough = normalizeBuildWalkthrough(nextBuildWalkthrough)

    setBuildWalkthrough(normalizedBuildWalkthrough)
    syncProgressSnapshot({
      buildWalkthrough: normalizedBuildWalkthrough,
    })
    void persistProgress({
      buildWalkthrough: normalizedBuildWalkthrough,
    })
  }, [
    persistProgress,
    setBuildWalkthrough,
    syncProgressSnapshot,
  ])

  useAchievementSync({
    unlockedAchievementIds,
    setUnlockedAchievementIds,
    unlockedAchievementIdsFromStats,
    persistProgress,
  })

  const { handleRoundComplete } = usePlayerProgressionUpdates({
    authToken,
    applyProgress,
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
                buildWalkthrough={buildWalkthrough}
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
