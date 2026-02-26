import { useEffect, useMemo, useState } from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import Layout from "./components/Layout.jsx"

import LoginPage from "./pages/LoginPage.jsx"
import SignupPage from "./pages/SignupPage.jsx"
import GamePage from "./pages/GamePage.jsx"
import ShopPage from "./pages/ShopPage.jsx"
import HelpPage from "./pages/HelpPage.jsx"
import HistoryPage from "./pages/HistoryPage.jsx"
import LeaderboardPage from "./pages/LeaderboardPage.jsx"
import { SHOP_ITEMS_BY_ID } from "./config/shopCatalog.js"

const STORAGE_KEYS = {
  auth: "clickaway_is_authed",
  coins: "clickaway_coins",
  ownedItems: "clickaway_owned_items",
  equippedButtonSkin: "clickaway_equipped_button_skin",
  equippedArenaTheme: "clickaway_equipped_arena_theme",
}

const DEFAULT_IDS = {
  buttonSkin: "skin_default",
  arenaTheme: "theme_default",
}

function readBooleanStorage(key, fallback = false) {
  if (typeof window === "undefined") return fallback
  return window.localStorage.getItem(key) === "true"
}

function readNumberStorage(key, fallback = 0) {
  if (typeof window === "undefined") return fallback
  const parsed = Number(window.localStorage.getItem(key))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function readArrayStorage(key) {
  if (typeof window === "undefined") return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]")
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function readStringStorage(key, fallback) {
  if (typeof window === "undefined") return fallback
  return window.localStorage.getItem(key) || fallback
}

function ProtectedRoute({ isAuthed, children }) {
  return isAuthed ? children : <Navigate to="/login" replace />
}

export default function App() {
  const [isAuthed, setIsAuthed] = useState(() => readBooleanStorage(STORAGE_KEYS.auth))
  const [coins, setCoins] = useState(() => readNumberStorage(STORAGE_KEYS.coins))
  const [ownedItems, setOwnedItems] = useState(() => readArrayStorage(STORAGE_KEYS.ownedItems))

  const [equippedButtonSkinId, setEquippedButtonSkinId] = useState(() =>
    readStringStorage(STORAGE_KEYS.equippedButtonSkin, DEFAULT_IDS.buttonSkin)
  )
  const [equippedArenaThemeId, setEquippedArenaThemeId] = useState(() =>
    readStringStorage(STORAGE_KEYS.equippedArenaTheme, DEFAULT_IDS.arenaTheme)
  )

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.auth, String(isAuthed))
  }, [isAuthed])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.coins, String(coins))
  }, [coins])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.ownedItems, JSON.stringify(ownedItems))
  }, [ownedItems])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.equippedButtonSkin, equippedButtonSkinId)
  }, [equippedButtonSkinId])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.equippedArenaTheme, equippedArenaThemeId)
  }, [equippedArenaThemeId])

  function handleLogin() {
    setIsAuthed(true)
  }

  function handleLogout() {
    setIsAuthed(false)
  }

  function handleRoundComplete({ clicksScored }) {
    const earnedCoins = Math.max(0, clicksScored)
    if (earnedCoins > 0) {
      setCoins((current) => current + earnedCoins)
    }
  }

  function canPurchaseItem(item) {
    if (!item?.id || typeof item.cost !== "number") return false
    if (item.builtIn) return false
    if (ownedItems.includes(item.id)) return false
    return coins >= item.cost
  }

  function handlePurchase(item) {
    if (!canPurchaseItem(item)) return false

    setCoins((current) => current - item.cost)
    setOwnedItems((current) => [...current, item.id])
    return true
  }

  function handleEquip(item) {
    if (!item?.id || !item.type) return false

    const isOwned = item.builtIn || ownedItems.includes(item.id)
    if (!isOwned) return false

    if (item.type === "button_skin") {
      setEquippedButtonSkinId(item.id)
      return true
    }

    if (item.type === "arena_theme") {
      setEquippedArenaThemeId(item.id)
      return true
    }

    return false
  }

  const equippedButtonSkin = useMemo(
    () => SHOP_ITEMS_BY_ID[equippedButtonSkinId] ?? SHOP_ITEMS_BY_ID[DEFAULT_IDS.buttonSkin],
    [equippedButtonSkinId]
  )

  const equippedArenaTheme = useMemo(
    () => SHOP_ITEMS_BY_ID[equippedArenaThemeId] ?? SHOP_ITEMS_BY_ID[DEFAULT_IDS.arenaTheme],
    [equippedArenaThemeId]
  )

  return (
    <Routes>
      <Route element={<Layout isAuthed={isAuthed} onLogout={handleLogout} coins={coins} />}>
        <Route path="/" element={<Navigate to={isAuthed ? "/game" : "/login"} replace />} />
        <Route path="/login" element={isAuthed ? <Navigate to="/game" replace /> : <LoginPage onLogin={handleLogin} />} />
        <Route path="/signup" element={isAuthed ? <Navigate to="/game" replace /> : <SignupPage onSignup={handleLogin} />} />

        <Route path="/help" element={<ProtectedRoute isAuthed={isAuthed}><HelpPage /></ProtectedRoute>} />
        <Route
          path="/game"
          element={
            <ProtectedRoute isAuthed={isAuthed}>
              <GamePage
                onRoundComplete={handleRoundComplete}
                buttonSkinClass={equippedButtonSkin?.effectClass}
                buttonSkinImageSrc={equippedButtonSkin?.imageSrc}
                buttonSkinImageScale={equippedButtonSkin?.gameImageScale ?? equippedButtonSkin?.imageScale}
                arenaThemeClass={equippedArenaTheme?.effectClass}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/shop"
          element={
            <ProtectedRoute isAuthed={isAuthed}>
              <ShopPage
                coins={coins}
                ownedItems={ownedItems}
                onPurchase={handlePurchase}
                onEquip={handleEquip}
                equippedButtonSkinId={equippedButtonSkinId}
                equippedArenaThemeId={equippedArenaThemeId}
              />
            </ProtectedRoute>
          }
        />
        <Route path="/history" element={<ProtectedRoute isAuthed={isAuthed}><HistoryPage /></ProtectedRoute>} />
        <Route path="/leaderboard" element={<ProtectedRoute isAuthed={isAuthed}><LeaderboardPage /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
