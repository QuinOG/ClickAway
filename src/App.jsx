import { Routes, Route, Navigate } from "react-router-dom"
import Layout from "./components/Layout.jsx"

import LoginPage from "./pages/LoginPage.jsx"
import GamePage from "./pages/GamePage.jsx"
import HelpPage from "./pages/HelpPage.jsx"
import HistoryPage from "./pages/HistoryPage.jsx"
import LeaderboardPage from "./pages/LeaderboardPage.jsx"

export default function App() {
  // For now, fake auth. Later you’ll replace with JWT logic.
  const isAuthed = true

  return (
    <Routes>
      <Route element={<Layout isAuthed={isAuthed} />}>
        <Route path="/" element={<Navigate to={isAuthed ? "/game" : "/login"} replace />} />
        <Route path="/login" element={<LoginPage />} />

        <Route path="/help" element={<HelpPage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}