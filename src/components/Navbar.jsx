import { NavLink } from "react-router-dom"

export default function Navbar({ isAuthed, onLogout, coins = 0 }) {
  const formattedCoins = Number.isFinite(coins) ? coins.toLocaleString() : "0"

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
              <div className="navMain">
                <NavLink to="/game" className={({ isActive }) => `navItem ${isActive ? "active" : ""}`}>Game</NavLink>
                <NavLink to="/history" className={({ isActive }) => `navItem ${isActive ? "active" : ""}`}>History</NavLink>
                <NavLink to="/leaderboard" className={({ isActive }) => `navItem ${isActive ? "active" : ""}`}>Leaderboard</NavLink>
                <NavLink to="/shop" className={({ isActive }) => `navItem ${isActive ? "active" : ""}`}>Shop</NavLink>
                <NavLink to="/help" className={({ isActive }) => `navItem ${isActive ? "active" : ""}`}>Help</NavLink>
              </div>

              <div className="navMeta">
                <div className="coinPill" aria-label={`Coin vault ${formattedCoins}`}>
                  <span className="coinPillLabel">Coin Vault:</span>
                  <span className="coinPillValue">{formattedCoins}</span>
                </div>
                <button className="navButton" onClick={handleLogout}>Logout</button>
              </div>
            </>
          ) : (
            <div className="navMain navMainGuest">
              <NavLink to="/login" className={({ isActive }) => `navItem ${isActive ? "active" : ""}`}>Login</NavLink>
              <NavLink to="/signup" className={({ isActive }) => `navItem ${isActive ? "active" : ""}`}>Sign Up</NavLink>
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}
