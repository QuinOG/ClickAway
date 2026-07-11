export const ROUTE_GROUP = Object.freeze({
  PRIMARY: "primary",
  COLLECTION: "collection",
  COMPETITION: "competition",
  SUPPORT: "support",
  AUTH: "auth",
})

export const MOBILE_PLACEMENT = Object.freeze({
  DOCK: "dock",
  MORE: "more",
  NONE: "none",
})

export const APP_ROUTE = Object.freeze({
  ROOT: "/",
  PLAY: "/game",
  ARMORY: "/armory",
  SHOP: "/shop",
  PROFILE: "/profile",
  LADDER: "/leaderboard",
  DUELS: "/challenges",
  HISTORY: "/history",
  HELP: "/help",
  LOGIN: "/login",
  SIGNUP: "/signup",
})

export const APP_ROUTE_METADATA = Object.freeze([
  Object.freeze({
    id: "play",
    path: APP_ROUTE.PLAY,
    label: "Play",
    group: ROUTE_GROUP.PRIMARY,
    icon: "play",
    requiresAuth: true,
    mobilePlacement: MOBILE_PLACEMENT.DOCK,
    mobileOrder: 1,
    transitionTone: "arena",
  }),
  Object.freeze({
    id: "armory",
    path: APP_ROUTE.ARMORY,
    label: "Armory",
    group: ROUTE_GROUP.COLLECTION,
    icon: "armory",
    requiresAuth: true,
    mobilePlacement: MOBILE_PLACEMENT.DOCK,
    mobileOrder: 2,
    transitionTone: "utility",
  }),
  Object.freeze({
    id: "shop",
    path: APP_ROUTE.SHOP,
    label: "Shop",
    group: ROUTE_GROUP.COLLECTION,
    icon: "shop",
    requiresAuth: true,
    mobilePlacement: MOBILE_PLACEMENT.MORE,
    transitionTone: "utility",
  }),
  Object.freeze({
    id: "profile",
    path: APP_ROUTE.PROFILE,
    label: "Profile",
    group: ROUTE_GROUP.COLLECTION,
    icon: "profile",
    requiresAuth: true,
    mobilePlacement: MOBILE_PLACEMENT.DOCK,
    mobileOrder: 4,
    transitionTone: "utility",
  }),
  Object.freeze({
    id: "ladder",
    path: APP_ROUTE.LADDER,
    label: "Ladder",
    group: ROUTE_GROUP.COMPETITION,
    icon: "ladder",
    requiresAuth: true,
    mobilePlacement: MOBILE_PLACEMENT.DOCK,
    mobileOrder: 3,
    transitionTone: "utility",
  }),
  Object.freeze({
    id: "duels",
    path: APP_ROUTE.DUELS,
    label: "Duels",
    group: ROUTE_GROUP.COMPETITION,
    icon: "duels",
    requiresAuth: true,
    mobilePlacement: MOBILE_PLACEMENT.MORE,
    transitionTone: "utility",
  }),
  Object.freeze({
    id: "history",
    path: APP_ROUTE.HISTORY,
    label: "History",
    group: ROUTE_GROUP.COMPETITION,
    icon: "history",
    requiresAuth: true,
    mobilePlacement: MOBILE_PLACEMENT.MORE,
    transitionTone: "utility",
  }),
  Object.freeze({
    id: "help",
    path: APP_ROUTE.HELP,
    label: "Help",
    group: ROUTE_GROUP.SUPPORT,
    icon: "help",
    requiresAuth: true,
    mobilePlacement: MOBILE_PLACEMENT.MORE,
    transitionTone: "utility",
  }),
  Object.freeze({
    id: "login",
    path: APP_ROUTE.LOGIN,
    label: "Log in",
    group: ROUTE_GROUP.AUTH,
    icon: "login",
    requiresAuth: false,
    mobilePlacement: MOBILE_PLACEMENT.NONE,
    transitionTone: "utility",
  }),
  Object.freeze({
    id: "signup",
    path: APP_ROUTE.SIGNUP,
    label: "Sign up",
    group: ROUTE_GROUP.AUTH,
    icon: "signup",
    requiresAuth: false,
    mobilePlacement: MOBILE_PLACEMENT.NONE,
    transitionTone: "utility",
  }),
])

export const AUTHENTICATED_ROUTES = Object.freeze(
  APP_ROUTE_METADATA.filter((route) => route.requiresAuth)
)

export const GUEST_ROUTES = Object.freeze(
  APP_ROUTE_METADATA.filter((route) => route.group === ROUTE_GROUP.AUTH)
)

export const MOBILE_DOCK_ROUTES = Object.freeze(
  AUTHENTICATED_ROUTES
    .filter((route) => route.mobilePlacement === MOBILE_PLACEMENT.DOCK)
    .sort((leftRoute, rightRoute) => leftRoute.mobileOrder - rightRoute.mobileOrder)
)

export const MOBILE_MORE_ROUTES = Object.freeze(
  AUTHENTICATED_ROUTES.filter((route) => route.mobilePlacement === MOBILE_PLACEMENT.MORE)
)

export function normalizeAppPathname(pathname = APP_ROUTE.ROOT) {
  const rawPathname = String(pathname || APP_ROUTE.ROOT)
    .split(/[?#]/, 1)[0]
    .trim()
  const withLeadingSlash = rawPathname.startsWith("/") ? rawPathname : `/${rawPathname}`

  if (withLeadingSlash === APP_ROUTE.ROOT) return APP_ROUTE.ROOT
  return withLeadingSlash.replace(/\/+$/, "") || APP_ROUTE.ROOT
}

export function getRouteMetadata(pathname) {
  const normalizedPathname = normalizeAppPathname(pathname)
  return APP_ROUTE_METADATA.find((route) => route.path === normalizedPathname) ?? null
}

export function getRoutesForGroup(group) {
  return AUTHENTICATED_ROUTES.filter((route) => route.group === group)
}

export function getMobileNavigationState(pathname) {
  const activeRoute = getRouteMetadata(pathname)
  const activeMoreRoute = activeRoute?.mobilePlacement === MOBILE_PLACEMENT.MORE
    ? activeRoute
    : null

  return {
    activeRoute,
    activeMoreRoute,
    isMoreActive: Boolean(activeMoreRoute),
    moreLabel: activeMoreRoute?.label ?? "More",
  }
}

export function shouldCollapseShell(pathname, gamePhase) {
  const route = getRouteMetadata(pathname)
  if (route?.id !== "play") return false
  return gamePhase === "countdown" || gamePhase === "playing"
}
