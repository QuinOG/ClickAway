import { Outlet, useLocation } from "react-router-dom"
import Navbar from "./Navbar.jsx"
import { useBodyClass } from "../hooks/useBodyClass.js"

const GAME_ROUTE_PREFIX = "/game"
const GAME_ROUTE_BODY_CLASS = "gameRouteActive"

export default function Layout({ isAuthed, onLogout, coins }) {
  const location = useLocation()
  const isGameRoute = location.pathname.startsWith(GAME_ROUTE_PREFIX)
  useBodyClass(GAME_ROUTE_BODY_CLASS, isGameRoute)

  return (
    <div className="appShell">
      {/* Navbar visibility/links are driven by auth state from App-level routing. */}
      <Navbar isAuthed={isAuthed} onLogout={onLogout} coins={coins} />
      <main className={`mainContent ${isGameRoute ? "gameMain" : ""}`}>
        {/* Route outlet for page content. */}
        <Outlet />
      </main>
    </div>
  )
}
