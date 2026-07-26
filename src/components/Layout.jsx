import { Suspense, lazy, useEffect, useRef, useState } from "react"
import { Toaster } from "react-hot-toast"
import { useLocation, useOutlet } from "react-router-dom"
import { AnimatePresence, motion } from "motion/react"

import { AUTHENTICATED_ROUTES, getRouteMetadata, shouldCollapseShell } from "../app/routeMetadata.js"
import { scheduleIdleRoutePrefetch } from "../app/routeModules.js"
import { useFeedbackPreferences } from "../app/useFeedbackPreferences.js"
import { FEEDBACK_EVENTS } from "../constants/feedbackEvents.js"
import { useBodyClass } from "../hooks/useBodyClass.js"
import { cancelCelebrationEffects } from "../services/celebrationEffects.js"
import Navbar from "./Navbar.jsx"
import {
  RouteFallback as BrandedRouteFallback,
  RouteSceneBackdrop,
} from "./RouteScene.jsx"

const MotionDiv = motion.div
const FeedbackSettingsSheet = lazy(() => import("./FeedbackSettingsSheet.jsx"))
const GAME_ROUTE_BODY_CLASS = "gameRouteActive"
const ARMORY_ROUTE_BODY_CLASS = "armoryRouteActive"
const PAGE_EASE = [0.22, 1, 0.36, 1]
const PAGE_ROUTE_MOTION = Object.freeze({
  variants: Object.freeze({
    initial: Object.freeze({ opacity: 0, y: 18 }),
    animate: Object.freeze({ opacity: 1, y: 0 }),
    exit: Object.freeze({ opacity: 0, y: -10, scale: 0.993 }),
  }),
  transition: Object.freeze({ duration: 0.2, ease: PAGE_EASE }),
})
const GAME_ROUTE_MOTION = Object.freeze({
  variants: Object.freeze({
    initial: Object.freeze({ opacity: 0, y: 4 }),
    animate: Object.freeze({ opacity: 1, y: 0 }),
    exit: Object.freeze({ opacity: 0 }),
  }),
  transition: Object.freeze({ duration: 0.13, ease: PAGE_EASE }),
})

function RouteFallback({ route }) {
  if (route) return <BrandedRouteFallback route={route} />

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
  showArmoryUnlockBadge = false,
  isIdentityLoading = false,
  isOffline = false,
  onOpenSettings,
}) {
  const location = useLocation()
  const outlet = useOutlet()
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
  const routeMotion = isGameRoute ? GAME_ROUTE_MOTION : PAGE_ROUTE_MOTION
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
    document.title = currentRoute
      ? `${currentRoute.label} | ClickAway`
      : "ClickAway | Precision Arena"
  }, [currentRoute])

  useEffect(() => {
    stopFeedback()
    cancelCelebrationEffects()
    emitFeedback(FEEDBACK_EVENTS.NAVIGATE, {
      eventId: `route-${pathname}`,
      scope: "navigation",
    })
  }, [emitFeedback, pathname, stopFeedback])

  useEffect(() => {
    if (!isAuthed) return undefined
    return scheduleIdleRoutePrefetch(
      AUTHENTICATED_ROUTES
        .filter((route) => route.path !== pathname)
        .map((route) => route.path)
    )
  }, [isAuthed, pathname])

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
    <div
      className={shellClassName}
      data-round-phase={isGameRoute ? gamePhase : undefined}
      data-scene={currentRoute?.scene?.tone ?? currentRoute?.id ?? "utility"}
    >
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
        showArmoryUnlockBadge={showArmoryUnlockBadge}
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
        <RouteSceneBackdrop route={currentRoute} isLiveRound={isLiveRound} />
        <Suspense
          fallback={(
            <div className="routeOutlet">
              <RouteFallback route={currentRoute} />
            </div>
          )}
        >
          <AnimatePresence mode="wait" initial={false}>
            <MotionDiv
              key={pathname}
              className="routeOutlet"
              data-transition-tone={currentRoute?.transitionTone ?? "utility"}
              variants={routeMotion.variants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={routeMotion.transition}
            >
              {outlet}
            </MotionDiv>
          </AnimatePresence>
        </Suspense>
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
