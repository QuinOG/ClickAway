import { APP_ROUTE, normalizeAppPathname } from "./routeMetadata.js"

const ROUTE_MODULE_LOADERS = Object.freeze({
  [APP_ROUTE.PLAY]: () => import("../pages/GamePage.jsx"),
  [APP_ROUTE.HELP]: () => import("../pages/HelpPage.jsx"),
  [APP_ROUTE.HISTORY]: () => import("../pages/HistoryPage.jsx"),
  [APP_ROUTE.LADDER]: () => import("../pages/LeaderboardPage.jsx"),
  [APP_ROUTE.DUELS]: () => import("../pages/ChallengesPage.jsx"),
  [APP_ROUTE.ARMORY]: () => import("../pages/ArmoryPage.jsx"),
  [APP_ROUTE.PROFILE]: () => import("../pages/ProfilePage.jsx"),
  [APP_ROUTE.SHOP]: () => import("../pages/ShopPage.jsx"),
})

const modulePromises = new Map()

export function loadRouteModule(pathname) {
  const routePath = normalizeAppPathname(pathname)
  const loader = ROUTE_MODULE_LOADERS[routePath]
  if (!loader) return Promise.reject(new Error(`No lazy route module for ${routePath}`))

  if (!modulePromises.has(routePath)) {
    const promise = loader().catch((error) => {
      modulePromises.delete(routePath)
      throw error
    })
    modulePromises.set(routePath, promise)
  }

  return modulePromises.get(routePath)
}

export function canPrefetchRoutes(connection = globalThis.navigator?.connection) {
  if (!connection) return true
  return !connection.saveData && !/^(slow-)?2g$/i.test(connection.effectiveType ?? "")
}

export function prefetchRouteModule(pathname, options = {}) {
  const connection = Object.hasOwn(options, "connection")
    ? options.connection
    : globalThis.navigator?.connection
  if (!canPrefetchRoutes(connection)) return Promise.resolve(null)
  const routePath = normalizeAppPathname(pathname)
  if (!ROUTE_MODULE_LOADERS[routePath]) return Promise.resolve(null)
  return loadRouteModule(routePath).catch(() => null)
}

export function scheduleIdleRoutePrefetch(pathnames = [], {
  delay = 900,
  windowObject = globalThis.window,
  connection = globalThis.navigator?.connection,
} = {}) {
  if (!windowObject || !canPrefetchRoutes(connection)) return () => {}

  let cancelled = false
  const uniquePaths = [...new Set(pathnames.map(normalizeAppPathname))]
  const run = () => {
    if (cancelled) return
    uniquePaths.reduce(
      (pending, pathname) => pending.then(() => (
        cancelled ? null : prefetchRouteModule(pathname, { connection })
      )),
      Promise.resolve()
    )
  }

  let handle
  let cancel
  if (typeof windowObject.requestIdleCallback === "function") {
    handle = windowObject.requestIdleCallback(run, { timeout: delay + 1200 })
    cancel = () => windowObject.cancelIdleCallback?.(handle)
  } else {
    handle = windowObject.setTimeout(run, delay)
    cancel = () => windowObject.clearTimeout(handle)
  }

  return () => {
    cancelled = true
    cancel?.()
  }
}

export function resetRouteModuleCacheForTests() {
  modulePromises.clear()
}
