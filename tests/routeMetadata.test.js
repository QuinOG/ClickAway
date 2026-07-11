import test from "node:test"
import assert from "node:assert/strict"

import {
  APP_ROUTE_METADATA,
  AUTHENTICATED_ROUTES,
  MOBILE_DOCK_ROUTES,
  MOBILE_MORE_ROUTES,
  ROUTE_GROUP,
  getMobileNavigationState,
  getRouteMetadata,
  getRoutesForGroup,
  normalizeAppPathname,
  shouldCollapseShell,
} from "../src/app/routeMetadata.js"

test("route metadata uses unique ids and paths", () => {
  assert.equal(new Set(APP_ROUTE_METADATA.map((route) => route.id)).size, APP_ROUTE_METADATA.length)
  assert.equal(new Set(APP_ROUTE_METADATA.map((route) => route.path)).size, APP_ROUTE_METADATA.length)
})

test("route metadata freezes the canonical shell terminology and groups", () => {
  assert.equal(getRouteMetadata("/game")?.label, "Play")
  assert.equal(getRouteMetadata("/leaderboard")?.label, "Ladder")
  assert.equal(getRouteMetadata("/challenges")?.label, "Duels")
  assert.deepEqual(
    getRoutesForGroup(ROUTE_GROUP.COLLECTION).map((route) => route.id),
    ["armory", "shop", "profile"]
  )
  assert.deepEqual(
    getRoutesForGroup(ROUTE_GROUP.COMPETITION).map((route) => route.id),
    ["ladder", "duels", "history"]
  )
})

test("path matching is exact while tolerating query, hash, and trailing slash", () => {
  assert.equal(normalizeAppPathname("game/?challengeId=2#round"), "/game")
  assert.equal(getRouteMetadata("/game?challengeId=2")?.id, "play")
  assert.equal(getRouteMetadata("/game/")?.id, "play")
  assert.equal(getRouteMetadata("/game-night"), null)
})

test("mobile navigation exposes four fixed destinations and every other protected route in More", () => {
  assert.deepEqual(
    MOBILE_DOCK_ROUTES.map((route) => route.id),
    ["play", "armory", "ladder", "profile"]
  )
  assert.deepEqual(
    MOBILE_MORE_ROUTES.map((route) => route.id),
    ["shop", "duels", "history", "help"]
  )

  const reachableIds = new Set([
    ...MOBILE_DOCK_ROUTES.map((route) => route.id),
    ...MOBILE_MORE_ROUTES.map((route) => route.id),
  ])
  assert.deepEqual(reachableIds, new Set(AUTHENTICATED_ROUTES.map((route) => route.id)))
})

test("More visibly represents a currently active secondary destination", () => {
  assert.deepEqual(getMobileNavigationState("/history"), {
    activeRoute: getRouteMetadata("/history"),
    activeMoreRoute: getRouteMetadata("/history"),
    isMoreActive: true,
    moreLabel: "History",
  })
  assert.equal(getMobileNavigationState("/game").isMoreActive, false)
  assert.equal(getMobileNavigationState("/game").moreLabel, "More")
})

test("shell collapse is limited to countdown and playing on the Play route", () => {
  assert.equal(shouldCollapseShell("/game", "ready"), false)
  assert.equal(shouldCollapseShell("/game", "countdown"), true)
  assert.equal(shouldCollapseShell("/game", "playing"), true)
  assert.equal(shouldCollapseShell("/game", "game_over"), false)
  assert.equal(shouldCollapseShell("/armory", "playing"), false)
})
