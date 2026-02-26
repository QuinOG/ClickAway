import { useEffect } from "react"
import { Outlet, useLocation } from "react-router-dom"
import Navbar from "./Navbar.jsx"

const GAME_ROUTE_PREFIX = "/game"

export default function Layout({ isAuthed, onLogout, coins }) {
  const location = useLocation()
  const isGameRoute = location.pathname.startsWith(GAME_ROUTE_PREFIX)

  useEffect(() => {
    document.body.classList.toggle("gameRouteActive", isGameRoute)
    return () => {
      document.body.classList.remove("gameRouteActive")
    }
  }, [isGameRoute])

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
