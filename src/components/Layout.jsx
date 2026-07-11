import { Suspense, lazy, useEffect, useRef, useState } from "react"
import { Toaster } from "react-hot-toast"
import { Outlet, useLocation } from "react-router-dom"
import { AnimatePresence, motion } from "motion/react"

import { getRouteMetadata, shouldCollapseShell } from "../app/routeMetadata.js"
import { useFeedbackPreferences } from "../app/useFeedbackPreferences.js"
import { FEEDBACK_EVENTS } from "../constants/feedbackEvents.js"
import { useBodyClass } from "../hooks/useBodyClass.js"
import { cancelCelebrationEffects } from "../services/celebrationEffects.js"
import Navbar from "./Navbar.jsx"

const MotionDiv = motion.div
const FeedbackSettingsSheet = lazy(() => import("./FeedbackSettingsSheet.jsx"))
const GAME_ROUTE_BODY_CLASS = "gameRouteActive"
const ARMORY_ROUTE_BODY_CLASS = "armoryRouteActive"
const PAGE_EASE = [0.22, 1, 0.36, 1]

function RouteFallback() {
  return (
    <div className="routeFallback" aria-busy="true" aria-live="polite">
      <span className="routeFallbackText">Loading…</span>
    </div>
  )
}

const TOAST_STYLE = {
  background: "rgba(11, 18, 36, 0.97)",
  color: "#ddeeff",
  border: "1px solid rgba(74, 168, 255, 0.28)",
  borderRadius: "12px",
  fontSize: "13px",
  fontFamily: "inherit",
  fontWeight: 600,
  padding: "10px 14px",
  boxShadow: "0 12px 28px rgba(4, 8, 20, 0.52)",
}

export default function Layout({
  isAuthed,
  gamePhase = "ready",
  playerName = "Player",
  playerUsername,
  profileImageSrc = "",
  profileImageClassName = "",
  equippedProfileImage = null,
  coins,
  level,
  accuracyPercent,
  rankProgress,
  rankLabel,
  rankMmr,
  pendingDuelCount = 0,
  isIdentityLoading = false,
  isOffline = false,
  onOpenSettings,
}) {
  const location = useLocation()
  const { pathname } = location
  const { emitFeedback, stopFeedback } = useFeedbackPreferences()
  const settingsTriggerRef = useRef(null)
  const [settingsOrigin, setSettingsOrigin] = useState(null)
  const currentRoute = getRouteMetadata(pathname)
  const isGameRoute = currentRoute?.id === "play"
  const isArmoryRoute = currentRoute?.id === "armory"
  const isLiveRound = shouldCollapseShell(pathname, gamePhase)
  const isSettingsOpen = !isLiveRound
    && settingsOrigin?.location === location
    && settingsOrigin?.gamePhase === gamePhase
  const resolvedPlayerName = playerUsername || playerName || "Player"
  const resolvedProfileImage = equippedProfileImage ?? {
    imageSrc: profileImageSrc,
    effectClass: profileImageClassName,
  }
  const shellClassName = [
    "appShell",
    isLiveRound ? "isLiveRound" : "",
    isAuthed ? "isAuthenticated" : "isGuest",
  ].filter(Boolean).join(" ")
  const mainClassName = [
    "mainContent",
    isGameRoute ? "gameMain" : "",
    isArmoryRoute ? "armoryMain" : "",
    isAuthed && !isLiveRound ? "hasMobileDock" : "",
  ].filter(Boolean).join(" ")

  useBodyClass(GAME_ROUTE_BODY_CLASS, isGameRoute)
  useBodyClass(ARMORY_ROUTE_BODY_CLASS, isArmoryRoute)

  useEffect(() => {
    stopFeedback()
    cancelCelebrationEffects()
    emitFeedback(FEEDBACK_EVENTS.NAVIGATE, {
      eventId: `route-${location.key}`,
      scope: "navigation",
    })
  }, [emitFeedback, location.key, stopFeedback])

  useEffect(() => {
    const animationFrameId = window.requestAnimationFrame(() => {
      setSettingsOrigin(null)
    })
    return () => window.cancelAnimationFrame(animationFrameId)
  }, [isLiveRound, location.key])

  function handleOpenSettings(source) {
    settingsTriggerRef.current = source?.currentTarget || source || document.activeElement
    setSettingsOrigin({ location, gamePhase })
    onOpenSettings?.()
  }

  return (
    <div className={shellClassName} data-round-phase={isGameRoute ? gamePhase : undefined}>
      <Navbar
        isArmoryRoute={isArmoryRoute}
        isAuthed={isAuthed}
        isCollapsed={isLiveRound}
        playerUsername={resolvedPlayerName}
        equippedProfileImage={resolvedProfileImage}
        coins={coins}
        level={level}
        accuracyPercent={accuracyPercent}
        rankProgress={rankProgress}
        rankLabel={rankLabel}
        rankMmr={rankMmr}
        pendingDuelCount={pendingDuelCount}
        isIdentityLoading={isIdentityLoading}
        isOffline={isOffline}
        onOpenSettings={handleOpenSettings}
      />

      {isSettingsOpen ? (
        <Suspense fallback={null}>
          <FeedbackSettingsSheet
            open
            onOpenChange={(nextOpen) => setSettingsOrigin(
              nextOpen ? { location, gamePhase } : null
            )}
            triggerRef={settingsTriggerRef}
          />
        </Suspense>
      ) : null}

      <div className="routeAnnouncement" aria-live="polite" aria-atomic="true">
        {currentRoute ? `${currentRoute.label} page` : "Page changed"}
      </div>

      <main className={mainClassName}>
        <AnimatePresence mode="wait" initial={false}>
          <MotionDiv
            key={pathname}
            className="routeOutlet"
            data-transition-tone={currentRoute?.transitionTone ?? "utility"}
            initial={isGameRoute ? { opacity: 0, y: 4 } : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={isGameRoute ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.993 }}
            transition={{
              duration: isGameRoute ? 0.13 : 0.2,
              ease: PAGE_EASE,
            }}
          >
            <Suspense fallback={<RouteFallback />}>
              <Outlet />
            </Suspense>
          </MotionDiv>
        </AnimatePresence>
      </main>

      <Toaster
        position="bottom-right"
        gutter={8}
        containerStyle={{ bottom: "var(--toast-bottom-offset, 16px)" }}
        toastOptions={{
          duration: 2800,
          style: TOAST_STYLE,
          success: {
            iconTheme: { primary: "#53d7b3", secondary: "#081a14" },
          },
          error: {
            iconTheme: { primary: "#ff6a75", secondary: "#1a0808" },
          },
        }}
      />
    </div>
  )
}
