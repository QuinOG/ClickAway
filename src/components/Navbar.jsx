import { NavLink, useNavigate } from "react-router-dom"

export default function Navbar({ isAuthed }) {
  const navigate = useNavigate()

  function handleLogout() {
    // Frontend-only logout behavior until auth/session integration is wired up.
    navigate("/login")
  }

  return (
    <header className="topbar">
      <div className="topbarInner">
        <div className="brand">ClickAway</div>

        <nav className="navLinks">
          {/* Keep nav options auth-aware so route access and UX stay consistent. */}
          {isAuthed ? (
            <>
              <NavLink to="/game" className={({ isActive }) => `navItem ${isActive ? "active" : ""}`}>Game</NavLink>
              <NavLink to="/history" className={({ isActive }) => `navItem ${isActive ? "active" : ""}`}>History</NavLink>
              <NavLink to="/leaderboard" className={({ isActive }) => `navItem ${isActive ? "active" : ""}`}>Leaderboard</NavLink>
              <NavLink to="/help" className={({ isActive }) => `navItem ${isActive ? "active" : ""}`}>Help</NavLink>
              <button className="navButton" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={({ isActive }) => `navItem ${isActive ? "active" : ""}`}>Login</NavLink>
              <NavLink to="/signup" className="navItem">Sign Up</NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
