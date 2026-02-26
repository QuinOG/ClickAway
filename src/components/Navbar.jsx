import { NavLink } from "react-router-dom"

const AUTHED_NAV_LINKS = [
  { to: "/game", label: "Game" },
  { to: "/history", label: "History" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/shop", label: "Shop" },
  { to: "/help", label: "Help" },
]

const GUEST_NAV_LINKS = [
  { to: "/login", label: "Login" },
  { to: "/signup", label: "Sign Up" },
]

function renderNavLink({ to, label }) {
  return (
    <NavLink key={to} to={to} className={({ isActive }) => `navItem ${isActive ? "active" : ""}`}>
      {label}
    </NavLink>
  )
}

function NavigationLinks({ links, className }) {
  return <div className={className}>{links.map(renderNavLink)}</div>
}

function CoinVault({ coins }) {
  const formattedCoins = Number.isFinite(coins) ? coins.toLocaleString() : "0"

  return (
    <div className="coinPill" aria-label={`Coin vault ${formattedCoins}`}>
      <span className="coinPillLabel">¢ Coin Vault:</span>
      <span className="coinPillValue">{formattedCoins}</span>
    </div>
  )
}

export default function Navbar({ isAuthed, onLogout, coins = 0 }) {
  function handleLogout() {
    // App-level state owns auth; this callback keeps navbar behavior in sync with route guards.
    onLogout?.()
  }

  return (
    <header className="topbar">
      <div className="topbarInner">
        <div className="brandCluster">
          {/* Replace the image path below when your final logo asset is ready. */}
          <div className="brandLogoPlaceholder" aria-label="Logo placeholder">
            <img className="brandLogoImage" src="/pointerimage.png" alt="ClickAway logo" />
          </div>
          <div className="brandText">
            <div className="brand">ClickAway</div>
            <div className="brandTag">Reflex Arena</div>
          </div>
        </div>

        <nav className="navRail" aria-label="Primary navigation">
          {/* Keep nav options auth-aware so route access and UX stay consistent. */}
          {isAuthed ? (
            <>
              <NavigationLinks links={AUTHED_NAV_LINKS} className="navMain" />

              <div className="navMeta">
                <CoinVault coins={coins} />
                <button className="navButton" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </>
          ) : (
            <NavigationLinks links={GUEST_NAV_LINKS} className="navMain navMainGuest" />
          )}
        </nav>
      </div>
    </header>
  )
}
