import { AnimatePresence, motion } from "motion/react"
import { Toaster } from "react-hot-toast"
import { useOutlet, useLocation } from "react-router-dom"
import { useState } from "react"
import Navbar from "./Navbar.jsx"
import { useBodyClass } from "../hooks/useBodyClass.js"

const MotionDiv = motion.div

// Freezes the outlet at mount so the exiting MotionDiv doesn't re-render
// with the new route's content while its exit animation is still playing.
function FrozenOutlet() {
  const outlet = useOutlet()
  const [frozen] = useState(outlet)
  return frozen
}
const GAME_ROUTE_PREFIX = "/game"
const GAME_ROUTE_BODY_CLASS = "gameRouteActive"
const ARMORY_ROUTE_PREFIX = "/armory"
const ARMORY_ROUTE_BODY_CLASS = "armoryRouteActive"
const PAGE_EASE = [0.4, 0, 0.2, 1]

// Game route: suppress min-height so the flex item doesn't overflow. flex: 1 comes from .gameMain > * CSS rule.
const gamePageStyle = { minHeight: 0, overflow: "hidden" }

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
  coins,
  level,
  accuracyPercent,
  rankProgress,
  rankLabel,
  rankMmr,
}) {
  const location = useLocation()
  const isGameRoute = location.pathname.startsWith(GAME_ROUTE_PREFIX)
  const isArmoryRoute = location.pathname.startsWith(ARMORY_ROUTE_PREFIX)
  useBodyClass(GAME_ROUTE_BODY_CLASS, isGameRoute)
  useBodyClass(ARMORY_ROUTE_BODY_CLASS, isArmoryRoute)

  return (
    <div className="appShell">
      {/* Navbar visibility/links are driven by auth state from App-level routing. */}
      <Navbar
        isArmoryRoute={isArmoryRoute}
        isAuthed={isAuthed}
        coins={coins}
        level={level}
        accuracyPercent={accuracyPercent}
        rankProgress={rankProgress}
        rankLabel={rankLabel}
        rankMmr={rankMmr}
      />
      <main className={`mainContent ${isGameRoute ? "gameMain" : ""} ${isArmoryRoute ? "armoryMain" : ""}`.trim()}>
        <AnimatePresence mode="wait">
          <MotionDiv
            key={location.pathname}
            style={isGameRoute ? gamePageStyle : undefined}
            initial={isGameRoute ? { opacity: 0, y: 4 } : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={isGameRoute ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.993 }}
            transition={{
              duration: isGameRoute ? 0.13 : 0.2,
              ease: PAGE_EASE,
            }}
          >
            <FrozenOutlet />
          </MotionDiv>
        </AnimatePresence>
      </main>

      <Toaster
        position="bottom-right"
        gutter={8}
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
