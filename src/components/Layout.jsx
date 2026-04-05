import { AnimatePresence, motion } from "motion/react"
import { Outlet, useLocation } from "react-router-dom"
import Navbar from "./Navbar.jsx"
import { useBodyClass } from "../hooks/useBodyClass.js"

const MotionDiv = motion.div

const GAME_ROUTE_PREFIX = "/game"
const GAME_ROUTE_BODY_CLASS = "gameRouteActive"

// Game route: suppress min-height so the flex item doesn't overflow. flex: 1 comes from .gameMain > * CSS rule.
const gamePageStyle = { minHeight: 0, overflow: "hidden" }

const pageVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.14, ease: [0.4, 0, 1, 1] },
  },
}

export default function Layout({
  isAuthed,
  coins,
  level,
  accuracyPercent,
  rankProgress,
  rankLabel,
  rankMmr,
}) {
  const location = useLocation()
  const isGameRoute = location.pathname.startsWith(GAME_ROUTE_PREFIX)
  useBodyClass(GAME_ROUTE_BODY_CLASS, isGameRoute)

  return (
    <div className="appShell">
      {/* Navbar visibility/links are driven by auth state from App-level routing. */}
      <Navbar
        isAuthed={isAuthed}
        coins={coins}
        level={level}
        accuracyPercent={accuracyPercent}
        rankProgress={rankProgress}
        rankLabel={rankLabel}
        rankMmr={rankMmr}
      />
      <main className={`mainContent ${isGameRoute ? "gameMain" : ""}`}>
        <AnimatePresence mode="wait" initial={false}>
          <MotionDiv
            key={location.key}
            style={isGameRoute ? gamePageStyle : undefined}
            variants={pageVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <Outlet />
          </MotionDiv>
        </AnimatePresence>
      </main>
    </div>
  )
}
