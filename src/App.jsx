import { Routes, Route, Navigate } from "react-router-dom"
import Layout from "./components/Layout.jsx"

import LoginPage from "./pages/LoginPage.jsx"
import GamePage from "./pages/GamePage.jsx"
import HelpPage from "./pages/HelpPage.jsx"
import HistoryPage from "./pages/HistoryPage.jsx"
import LeaderboardPage from "./pages/LeaderboardPage.jsx"

export default function App() {
  // Frontend placeholder until backend auth is integrated.
  // Keep this as the single source of truth for route-guard behavior in the UI.
  const isAuthed = true

  return (
    <Routes>
      {/* Shared app shell; child pages render inside <Outlet />. */}
      <Route element={<Layout isAuthed={isAuthed} />}>
        {/* Default entry path routes users based on auth state. */}
        <Route path="/" element={<Navigate to={isAuthed ? "/game" : "/login"} replace />} />
        <Route path="/login" element={<LoginPage />} />

        <Route path="/help" element={<HelpPage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
      </Route>

      {/* Catch-all keeps unknown paths inside the app flow. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
