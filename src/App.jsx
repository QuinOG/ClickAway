import { lazy, useCallback, useEffect, useState } from "react"
import { Navigate, Route, Routes } from "react-router-dom"
import { MotionConfig } from "motion/react"

import { isValidModeId } from "./app/appAccountStateHelpers.js"
import { useFeedbackPreferences } from "./app/useFeedbackPreferences.js"
import { getMotionConfigPreference } from "./app/feedbackPreferences.js"
import { APP_ROUTE } from "./app/routeMetadata.js"
import { useAchievementSync } from "./app/useAchievementSync.js"
import { useAppDerivedState } from "./app/useAppDerivedState.js"
import { useAppPlayerState } from "./app/useAppPlayerState.js"
import { useAuthSession } from "./app/useAuthSession.js"
import { usePlayerProgressionUpdates } from "./app/usePlayerProgressionUpdates.js"
import { useProgressSync } from "./app/useProgressSync.js"
import { useShopActions } from "./app/useShopActions.js"
import { DIFFICULTIES as MODES } from "./constants/gameModesConfig.js"
import { ROUND_PHASE } from "./constants/gameConstants.js"
import { normalizeBuildWalkthrough } from "./constants/buildWalkthrough.js"
import { hasUnseenUnlockedParts, normalizeSeenUnlockPartIds } from "./utils/unlockWallUtils.js"
import { loadRouteModule } from "./app/routeModules.js"

import Layout from "./components/Layout.jsx"
import ProtectedRoute from "./components/routing/ProtectedRoute.jsx"

import LoginPage from "./pages/LoginPage.jsx"
import SignupPage from "./pages/SignupPage.jsx"

const GamePage = lazy(() => loadRouteModule(APP_ROUTE.PLAY))
const HelpPage = lazy(() => loadRouteModule(APP_ROUTE.HELP))
const HistoryPage = lazy(() => loadRouteModule(APP_ROUTE.HISTORY))
const LeaderboardPage = lazy(() => loadRouteModule(APP_ROUTE.LADDER))
const ChallengesPage = lazy(() => loadRouteModule(APP_ROUTE.DUELS))
const ArmoryPage = lazy(() => loadRouteModule(APP_ROUTE.ARMORY))
const ProfilePage = lazy(() => loadRouteModule(APP_ROUTE.PROFILE))
const ShopPage = lazy(() => loadRouteModule(APP_ROUTE.SHOP))
const UiKitPage = import.meta.env.DEV
  ? lazy(() => import("./pages/UiKitPage.jsx"))
  : null

function SessionLoadingScreen() {
  useEffect(() => {
    document.title = "Entering the arena | ClickAway"
  }, [])

  return (
    <main className="sessionArrival" aria-labelledby="session-arrival-title" aria-busy="true">
      <div className="sessionArrivalAtmosphere" aria-hidden="true">
        <span className="sessionCalibrationRing" />
        <span className="sessionCalibrationRing sessionCalibrationRingInner" />
      </div>
      <img className="sessionArrivalMark" src="/brand/clickaway-mark.svg" alt="" width="128" height="128" decoding="async" />
      <span className="sessionArrivalEyebrow">Precision Arena</span>
      <h1 id="session-arrival-title">Calibrating your session</h1>
      <p>Restoring your competitor profile and arena settings…</p>
      <span className="sessionProgress" aria-hidden="true"><span /></span>
    </main>
  )
}

export default function App() {
  const { preferences } = useFeedbackPreferences()
  const [gamePhase, setGamePhase] = useState(ROUND_PHASE.READY)
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
    seenUnlockPartIds,
    setSeenUnlockPartIds,
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
    sessionKey: isAuthed ? playerUserId : "",
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

  const handleSeenUnlockPartIdsChange = useCallback((nextSeenUnlockPartIds = []) => {
    const normalizedSeenUnlockPartIds = normalizeSeenUnlockPartIds(nextSeenUnlockPartIds)

    setSeenUnlockPartIds(normalizedSeenUnlockPartIds)
    void persistIntent({ seenUnlockPartIds: normalizedSeenUnlockPartIds })
  }, [persistIntent, setSeenUnlockPartIds])

  const handleModeChange = useCallback((nextModeId) => {
    if (!isValidModeId(nextModeId)) return
    setSelectedModeId(nextModeId)
    void persistIntent({ selectedModeId: nextModeId })
  }, [persistIntent, setSelectedModeId])

  if (!authReady) {
    return <SessionLoadingScreen />
  }

  const showArmoryUnlockBadge = hasUnseenUnlockedParts(levelProgress.level, seenUnlockPartIds)

  return (
    <MotionConfig reducedMotion={getMotionConfigPreference(preferences)}>
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
            gamePhase={gamePhase}
            playerName={playerUsername}
            profileImageSrc={equippedProfileImage?.imageSrc}
            profileImageClassName={equippedProfileImage?.effectClass}
            showArmoryUnlockBadge={showArmoryUnlockBadge}
          />
        }
      >
        <Route
          path={APP_ROUTE.ROOT}
          element={<Navigate to={isAuthed ? APP_ROUTE.PLAY : APP_ROUTE.LOGIN} replace />}
        />

        <Route
          path={APP_ROUTE.LOGIN}
          element={
            isAuthed
              ? <Navigate to={APP_ROUTE.PLAY} replace />
              : <LoginPage onLogin={handleLogin} />
          }
        />

        <Route
          path={APP_ROUTE.SIGNUP}
          element={
            isAuthed
              ? <Navigate to={APP_ROUTE.PLAY} replace />
              : <SignupPage onSignup={handleSignup} />
          }
        />

        <Route
          path={APP_ROUTE.HELP}
          element={
            <ProtectedRoute isAuthed={isAuthed}>
              <HelpPage />
            </ProtectedRoute>
          }
        />

        <Route
          path={APP_ROUTE.PLAY}
          element={
            <ProtectedRoute isAuthed={isAuthed}>
              <GamePage
                onPhaseChange={setGamePhase}
                onRoundComplete={handleRoundComplete}
                selectedModeId={selectedModeId}
                onModeChange={handleModeChange}
                playerLevel={levelProgress.level}
                playerCoins={coins}
                playerXpIntoLevel={levelProgress.xpIntoLevel}
                playerXpToNextLevel={levelProgress.xpToNextLevel}
                playerRankMmr={rankProgress.mmr}
                playerRankLabel={rankProgress.tierLabel}
                playerRankProgress={rankProgress}
                playerRankedState={rankedState}
                playerHasRankedHistory={hasRankedHistory}
                playerRecentRounds={roundHistory}
                playerBestScore={playerLeaderboardStats.bestScore}
                lifetimeStats={lifetimeStats}
                loadoutStats={loadoutStats}
                savedLoadouts={savedLoadouts}
                activeLoadoutId={activeLoadoutId}
                activeLoadout={activeLoadout}
                onLoadoutStateChange={handleLoadoutStateChange}
                buildWalkthrough={buildWalkthrough}
                onBuildWalkthroughChange={handleBuildWalkthroughChange}
                seenUnlockPartIds={seenUnlockPartIds}
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
          path={APP_ROUTE.ARMORY}
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
                seenUnlockPartIds={seenUnlockPartIds}
                onSeenUnlockPartIdsChange={handleSeenUnlockPartIdsChange}
                buttonSkinClass={equippedButtonSkin?.effectClass}
                buttonSkinImageSrc={equippedButtonSkin?.imageSrc}
                buttonSkinImageScale={
                  equippedButtonSkin?.gameImageScale ??
                  equippedButtonSkin?.imageScale
                }
                arenaThemeClass={equippedArenaTheme?.effectClass}
                loadoutStats={loadoutStats}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path={APP_ROUTE.SHOP}
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
          path={APP_ROUTE.HISTORY}
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
          path={APP_ROUTE.LADDER}
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
          path={APP_ROUTE.DUELS}
          element={
            <ProtectedRoute isAuthed={isAuthed}>
              <ChallengesPage currentUserId={playerUserId} />
            </ProtectedRoute>
          }
        />

        <Route
          path={APP_ROUTE.PROFILE}
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

        {UiKitPage ? <Route path="/__ui-kit" element={<UiKitPage />} /> : null}
      </Route>

      <Route path="*" element={<Navigate to={APP_ROUTE.ROOT} replace />} />
    </Routes>
    </MotionConfig>
  )
}
