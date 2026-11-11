import {
  CaretRight,
  ClockCounterClockwise,
  Coins,
  Crosshair,
  DotsThree,
  GameController,
  GearSix,
  Question,
  ShoppingBag,
  Sword,
  Trophy,
  UserCircle,
} from "@phosphor-icons/react"
import { useEffect, useId, useRef, useState } from "react"
import { Link, NavLink, useLocation } from "react-router-dom"

import {
  APP_ROUTE,
  GUEST_ROUTES,
  MOBILE_DOCK_ROUTES,
  MOBILE_MORE_ROUTES,
  ROUTE_GROUP,
  getMobileNavigationState,
  getRoutesForGroup,
} from "../app/routeMetadata.js"
import { prefetchRouteModule } from "../app/routeModules.js"
import { useActionFeedback } from "../hooks/useActionFeedback.js"
import { getProfileAvatarStyle } from "../utils/profileAvatarStyling.js"
import PlayerPortrait from "./art/PlayerPortrait.jsx"
import PlayerHoverCard from "./PlayerHoverCard.jsx"
import { MobileSheet } from "./ui/index.js"
import { InterpolatedNumber } from "./ui/status/InterpolatedNumber.jsx"
import { CoinIcon, GemIcon, GearIcon, RouteEmblem } from "./art/GameIcons.jsx"

const ICON_BY_KEY = {
  play: GameController,
  armory: Crosshair,
  shop: ShoppingBag,
  profile: UserCircle,
  ladder: Trophy,
  duels: Sword,
  history: ClockCounterClockwise,
  help: Question,
}

const ALL_SHELL_ROUTES = [
  ...getRoutesForGroup(ROUTE_GROUP.PRIMARY),
  ...getRoutesForGroup(ROUTE_GROUP.COLLECTION),
  ...getRoutesForGroup(ROUTE_GROUP.COMPETITION),
  ...getRoutesForGroup(ROUTE_GROUP.SUPPORT),
]
const PRIMARY_TILE_IDS = ["play", "armory", "shop", "ladder", "duels"]
const UTILITY_IDS = ["profile", "history", "help"]
const PRIMARY_TILE_ROUTES = PRIMARY_TILE_IDS.map((id) => ALL_SHELL_ROUTES.find((route) => route.id === id)).filter(Boolean)
const UTILITY_ROUTES = UTILITY_IDS.map((id) => ALL_SHELL_ROUTES.find((route) => route.id === id)).filter(Boolean)

function RouteIcon({ route, size = 17, active = false, illustrated = false }) {
  if (illustrated && route?.icon) return <RouteEmblem routeKey={route.icon} size={size} />
  const Icon = ICON_BY_KEY[route?.icon] ?? DotsThree
  return <Icon size={size} weight={active ? "fill" : "bold"} aria-hidden="true" />
}

function PendingBadge({ count = 0 }) {
  const normalizedCount = Math.max(0, Number(count) || 0)
  if (normalizedCount === 0) return null

  return (
    <span className="navPendingBadge" aria-label={`${normalizedCount} pending duels`}>
      {normalizedCount > 9 ? "9+" : normalizedCount}
    </span>
  )
}

function ShellNavLink({ route, className = "navItem", pendingDuelCount = 0, showArmoryUnlockBadge = false, onNavigate, illustrated = false, iconSize = 17, iconOnly = false }) {
  const { signalAction } = useActionFeedback()

  return (
    <NavLink
      to={route.path}
      end
      className={({ isActive }) => `${className} ${isActive ? "active" : ""}`.trim()}
      onClick={(event) => {
        signalAction(event.currentTarget, { silent: true })
        onNavigate?.(event)
      }}
      onPointerEnter={() => prefetchRouteModule(route.path)}
      onFocus={() => prefetchRouteModule(route.path)}
      aria-label={iconOnly ? route.label : undefined}
      title={iconOnly ? route.label : undefined}
    >
      {({ isActive }) => (
        <>
          <span className="navItemIcon"><RouteIcon route={route} active={isActive} illustrated={illustrated} size={iconSize} /></span>
          <span className={iconOnly ? "navItemLabel uiVisuallyHidden" : "navItemLabel"}>{route.label}</span>
          {route.id === "duels" ? <PendingBadge count={pendingDuelCount} /> : null}
          {route.id === "armory" && showArmoryUnlockBadge ? <b className="navNewBadge">New</b> : null}
        </>
      )}
    </NavLink>
  )
}

function NavGroup({ label, routes, pendingDuelCount, showArmoryUnlockBadge }) {
  return (
    <div className="navGroup">
      <span className="navGroupLabel">{label}</span>
      <div className="navGroupLinks">
        {routes.map((route) => (
          <ShellNavLink
            key={route.id}
            route={route}
            pendingDuelCount={pendingDuelCount}
            showArmoryUnlockBadge={showArmoryUnlockBadge}
          />
        ))}
      </div>
    </div>
  )
}

function CompactAvatar({ username, profileImage }) {
  const hasImage = Boolean(profileImage?.imageSrc)
  const className = [
    "shellAvatar",
    profileImage?.effectClass,
    hasImage ? "hasImage" : "",
  ].filter(Boolean).join(" ")

  return (
    <span
      className={className}
      style={hasImage ? undefined : getProfileAvatarStyle(username)}
      aria-hidden="true"
    >
      {hasImage ? (
        <img className="shellAvatarImage" src={profileImage.imageSrc} alt="" width="512" height="512" decoding="async" />
      ) : (
        <PlayerPortrait name={username} size={36} />
      )}
    </span>
  )
}

export default function Navbar({
  isArmoryRoute = false,
  isAuthed,
  isCollapsed = false,
  playerUsername = "Player",
  equippedProfileImage = null,
  coins = 0,
  level = 1,
  accuracyPercent = 0,
  rankProgress = null,
  rankLabel = "Unranked",
  rankMmr = 0,
  pendingDuelCount = 0,
  showArmoryUnlockBadge = false,
  isIdentityLoading = false,
  isOffline = false,
  onOpenSettings,
}) {
  const { pathname } = useLocation()
  const identityPopoverId = `shell-player-${useId().replaceAll(":", "")}`
  const identityWrapRef = useRef(null)
  const identityTriggerRef = useRef(null)
  const suppressIdentityFocusOpenRef = useRef(false)
  const moreTriggerRef = useRef(null)
  const [identityOpenPath, setIdentityOpenPath] = useState(null)
  const [moreOpenPath, setMoreOpenPath] = useState(null)
  const isIdentityOpen = !isCollapsed && identityOpenPath === pathname
  const isMoreOpen = !isCollapsed && moreOpenPath === pathname
  const mobileNavigation = getMobileNavigationState(pathname)
  const resolvedRankLabel = rankProgress?.tierLabel || rankLabel || "Unranked"
  const displayCoins = Number.isFinite(coins) ? Math.max(0, coins).toLocaleString() : "0"
  const displayLevel = Number.isFinite(level) ? Math.max(1, level).toLocaleString() : "1"

  useEffect(() => {
    if (!isIdentityOpen) return undefined

    function handlePointerDown(event) {
      if (!identityWrapRef.current?.contains(event.target)) {
        setIdentityOpenPath(null)
      }
    }

    function handleKeyDown(event) {
      if (event.key !== "Escape") return
      event.preventDefault()
      setIdentityOpenPath(null)
      suppressIdentityFocusOpenRef.current = true
      identityTriggerRef.current?.focus()
      window.requestAnimationFrame(() => {
        suppressIdentityFocusOpenRef.current = false
      })
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isIdentityOpen])

  function openIdentity() {
    if (suppressIdentityFocusOpenRef.current) return
    setIdentityOpenPath(pathname)
  }

  function closeIdentity() {
    setIdentityOpenPath(null)
  }

  function closeMore() {
    setMoreOpenPath(null)
  }

  function openSettings() {
    setMoreOpenPath(null)
    onOpenSettings?.(moreTriggerRef.current)
  }

  function handleMoreNavigation() {
    setMoreOpenPath(null)
  }

  return (
    <>
      <header
        className={`topbar ${isArmoryRoute ? "topbarArmory" : ""} ${isCollapsed ? "isCollapsed" : ""}`.trim()}
        aria-hidden={isCollapsed || undefined}
        inert={isCollapsed || undefined}
      >
        <div className="topbarInner">
          <Link
            className="brandCluster"
            to={isAuthed ? APP_ROUTE.PLAY : APP_ROUTE.LOGIN}
            onPointerEnter={() => isAuthed && prefetchRouteModule(APP_ROUTE.PLAY)}
            onFocus={() => isAuthed && prefetchRouteModule(APP_ROUTE.PLAY)}
            aria-label={isAuthed ? "ClickAway — go to Play" : "ClickAway — go to log in"}
          >
            <span className="brandLogo" aria-hidden="true">
              <img className="brandLogoImage" src="/brand/clickaway-mark.svg" alt="" width="128" height="128" decoding="async" />
            </span>
            <span className="brandText">
              <span className="brand">ClickAway</span>
              <span className="brandTag">Precision Arena</span>
            </span>
          </Link>

          {isAuthed ? (
            <nav className="desktopNav gameHudNav" aria-label="Primary navigation">
              <div className="hudMenuTiles">
                {PRIMARY_TILE_ROUTES.map((route) => (
                  <ShellNavLink
                    key={route.id}
                    route={route}
                    className={`navItem hudMenuTile hudMenuTile-${route.id}`}
                    illustrated
                    iconSize={30}
                    pendingDuelCount={pendingDuelCount}
                    showArmoryUnlockBadge={showArmoryUnlockBadge}
                  />
                ))}
              </div>
              <div className="navUtility hudUtility">
                {UTILITY_ROUTES.map((route) => (
                  <ShellNavLink
                    key={route.id}
                    route={route}
                    className="navItem hudUtilityButton hudMedallion"
                    illustrated
                    iconSize={22}
                  />
                ))}
                <button
                  type="button"
                  className="navItem navSettingsButton hudUtilityButton hudMedallion"
                  onClick={onOpenSettings}
                  disabled={!onOpenSettings}
                  aria-label="Open feedback settings"
                  title="Settings"
                >
                  <span className="navItemIcon"><GearIcon size={22} /></span>
                  <span className="navItemLabel" aria-hidden="true">Settings</span>
                </button>
              </div>
            </nav>
          ) : (
            <nav className="guestNav" aria-label="Account navigation">
              {GUEST_ROUTES.map((route) => (
                <NavLink
                  key={route.id}
                  to={route.path}
                  end
                  className={({ isActive }) => `guestNavLink ${isActive ? "active" : ""}`.trim()}
                >
                  {route.label}
                </NavLink>
              ))}
            </nav>
          )}

          {isAuthed ? (
            <div
              className="shellIdentityWrap"
              ref={identityWrapRef}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) closeIdentity()
              }}
            >
              <button
                ref={identityTriggerRef}
                type="button"
                className="shellIdentityButton"
                aria-haspopup="dialog"
                aria-expanded={isIdentityOpen}
                aria-controls={identityPopoverId}
                onFocus={openIdentity}
                onClick={openIdentity}
              >
                <CompactAvatar username={playerUsername} profileImage={equippedProfileImage} />
                <span className="shellIdentityText">
                  <span className="shellIdentityName">
                    {isIdentityLoading ? "Loading player…" : playerUsername}
                  </span>
                  <span className="shellIdentityRank">
                    {isOffline ? "Offline" : resolvedRankLabel}
                  </span>
                </span>
                <span className="shellIdentityProgress" aria-label={`${displayCoins} coins, level ${displayLevel}`}>
                  <span className="hudResource hudResourceCoins"><CoinIcon size={20} /><InterpolatedNumber value={coins} /></span>
                  <span className="hudResource hudResourceLevel"><GemIcon size={20} />Lv {displayLevel}</span>
                </span>
              </button>

              {isIdentityOpen ? (
                <PlayerHoverCard
                  id={identityPopoverId}
                  className="shellIdentityPopover"
                  role="dialog"
                  username={playerUsername}
                  profileImage={equippedProfileImage}
                  profileHref={APP_ROUTE.PROFILE}
                  onNavigate={closeIdentity}
                  rankProgress={rankProgress}
                  rankLabel={rankLabel}
                  rankMmr={rankMmr}
                  coins={coins}
                  level={level}
                  accuracyPercent={accuracyPercent}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      {isAuthed ? (
        <nav
          className={`mobileDock ${isCollapsed ? "isCollapsed" : ""}`.trim()}
          aria-label="Mobile navigation"
          aria-hidden={isCollapsed || undefined}
          inert={isCollapsed || undefined}
        >
          <div className="mobileDockInner">
            {MOBILE_DOCK_ROUTES.map((route) => (
              <ShellNavLink key={route.id} route={route} className="mobileDockItem" />
            ))}
            <button
              ref={moreTriggerRef}
              type="button"
              className={`mobileDockItem mobileMoreTrigger ${mobileNavigation.isMoreActive ? "active" : ""}`.trim()}
              aria-haspopup="dialog"
              aria-expanded={isMoreOpen}
              aria-current={mobileNavigation.isMoreActive ? "page" : undefined}
              onClick={() => {
                setMoreOpenPath(pathname)
              }}
            >
              <span className="navItemIcon">
                {mobileNavigation.activeMoreRoute ? (
                  <RouteIcon route={mobileNavigation.activeMoreRoute} active />
                ) : (
                  <DotsThree size={19} weight="bold" aria-hidden="true" />
                )}
              </span>
              <span className="navItemLabel">{mobileNavigation.moreLabel}</span>
              <PendingBadge count={pendingDuelCount} />
            </button>
          </div>
        </nav>
      ) : null}

      <MobileSheet
        open={isMoreOpen}
        onOpenChange={(nextOpen) => (nextOpen ? setMoreOpenPath(pathname) : closeMore())}
        triggerRef={moreTriggerRef}
        title="More destinations"
        description="Collection, competition, support, and arena settings."
        className="mobileMoreBackdrop"
        surfaceClassName="mobileMoreSheet"
      >
        <div className="mobileMoreGroups">
              {[ROUTE_GROUP.COLLECTION, ROUTE_GROUP.COMPETITION, ROUTE_GROUP.SUPPORT].map((group) => {
                const routes = MOBILE_MORE_ROUTES.filter((route) => route.group === group)
                if (!routes.length) return null
                const label = group === ROUTE_GROUP.COLLECTION
                  ? "Collection"
                  : group === ROUTE_GROUP.COMPETITION
                    ? "Competition"
                    : "Support"

                return (
                  <div className="mobileMoreGroup" key={group}>
                    <h3 className="mobileMoreGroupLabel">{label}</h3>
                    <div className="mobileMoreLinks">
                      {routes.map((route) => (
                        <ShellNavLink
                          key={route.id}
                          route={route}
                          className="mobileMoreLink"
                          pendingDuelCount={pendingDuelCount}
                          showArmoryUnlockBadge={showArmoryUnlockBadge}
                          onNavigate={handleMoreNavigation}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}

              <button
                type="button"
                className="mobileMoreLink mobileMoreSettings"
                onClick={openSettings}
                disabled={!onOpenSettings}
              >
                <span className="navItemIcon"><GearSix size={18} weight="bold" aria-hidden="true" /></span>
                <span className="navItemLabel">Settings</span>
                <CaretRight size={16} weight="bold" aria-hidden="true" />
              </button>
        </div>
      </MobileSheet>
    </>
  )
}
