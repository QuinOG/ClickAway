import { useEffect, useState } from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import Layout from "./components/Layout.jsx"

import LoginPage from "./pages/LoginPage.jsx"
import SignupPage from "./pages/SignupPage.jsx"
import GamePage from "./pages/GamePage.jsx"
import HelpPage from "./pages/HelpPage.jsx"
import HistoryPage from "./pages/HistoryPage.jsx"
import LeaderboardPage from "./pages/LeaderboardPage.jsx"

const AUTH_STORAGE_KEY = "clickaway_is_authed"

function readInitialAuthState() {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(AUTH_STORAGE_KEY) === "true"
}

function ProtectedRoute({ isAuthed, children }) {
  return isAuthed ? children : <Navigate to="/login" replace />
}

export default function App() {
  const [isAuthed, setIsAuthed] = useState(readInitialAuthState)

  useEffect(() => {
    window.localStorage.setItem(AUTH_STORAGE_KEY, String(isAuthed))
  }, [isAuthed])

  function handleLogin() {
    setIsAuthed(true)
  }

  function handleLogout() {
    setIsAuthed(false)
  }

  return (
    <Routes>
      {/* Shared app shell; child pages render inside <Outlet />. */}
      <Route element={<Layout isAuthed={isAuthed} onLogout={handleLogout} />}>
        {/* Default entry path routes users based on auth state. */}
        <Route path="/" element={<Navigate to={isAuthed ? "/game" : "/login"} replace />} />
        <Route path="/login" element={isAuthed ? <Navigate to="/game" replace /> : <LoginPage onLogin={handleLogin} />} />
        <Route path="/signup" element={isAuthed ? <Navigate to="/game" replace /> : <SignupPage onSignup={handleLogin} />} />

        <Route path="/help" element={<ProtectedRoute isAuthed={isAuthed}><HelpPage /></ProtectedRoute>} />
        <Route path="/game" element={<ProtectedRoute isAuthed={isAuthed}><GamePage /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute isAuthed={isAuthed}><HistoryPage /></ProtectedRoute>} />
        <Route path="/leaderboard" element={<ProtectedRoute isAuthed={isAuthed}><LeaderboardPage /></ProtectedRoute>} />
      </Route>

      {/* Catch-all keeps unknown paths inside the app flow. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
