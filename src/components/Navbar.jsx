import {
  Crosshair,
  ClockCounterClockwise,
  GameController,
  Question,
  ShoppingBag,
  Swords,
  Trophy,
  UserCircle,
} from "@phosphor-icons/react"
import { NavLink } from "react-router-dom"
import PlayerHoverCard from "./PlayerHoverCard.jsx"

const AUTHED_NAV_LINKS = [
  { to: "/game", label: "Game", Icon: GameController },
  { to: "/armory", label: "Armory", Icon: Crosshair },
  { to: "/history", label: "History", Icon: ClockCounterClockwise },
  { to: "/leaderboard", label: "Ladder", Icon: Trophy },
  { to: "/challenges", label: "Duels", Icon: Swords },
  { to: "/shop", label: "Shop", Icon: ShoppingBag },
  { to: "/help", label: "Help", Icon: Question },
]

const GUEST_NAV_LINKS = [
  { to: "/login", label: "Login" },
  { to: "/signup", label: "Sign Up" },
]

function renderNavLink({ to, label, Icon }) {
  return (
    <NavLink key={to} to={to} className={({ isActive }) => `navItem ${isActive ? "active" : ""}`}>
      {({ isActive }) => (
        <>
          {Icon && <Icon size={14} weight={isActive ? "fill" : "bold"} aria-hidden="true" className="navItemIcon" />}
          <span className="navItemLabel">{label}</span>
        </>
      )}
    </NavLink>
  )
}

function NavigationLinks({ links, className }) {
  return <div className={className}>{links.map(renderNavLink)}</div>
}

export default function Navbar({
  isArmoryRoute = false,
  isAuthed,
  coins = 0,
  level = 1,
  accuracyPercent = 0,
  rankProgress = null,
  rankLabel = "Unranked",
  rankMmr = 0,
}) {
  return (
    <header className={`topbar ${isArmoryRoute ? "topbarArmory" : ""}`.trim()}>
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
                <div className="profileHoverWrap">
                  <NavLink to="/profile" className={({ isActive }) => `navButton profileNavButton ${isActive ? "active" : ""}`}>
                    {({ isActive }) => (
                      <>
                        <UserCircle size={14} weight={isActive ? "fill" : "bold"} aria-hidden="true" className="navItemIcon" />
                        <span className="navItemLabel">Profile</span>
                      </>
                    )}
                  </NavLink>
                  <PlayerHoverCard
                    rankProgress={rankProgress}
                    rankLabel={rankLabel}
                    rankMmr={rankMmr}
                    coins={coins}
                    level={level}
                    accuracyPercent={accuracyPercent}
                  />
                </div>
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
