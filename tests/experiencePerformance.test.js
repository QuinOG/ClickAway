import test from "node:test"
import assert from "node:assert/strict"
import { existsSync, statSync } from "node:fs"

import { canPrefetchRoutes, scheduleIdleRoutePrefetch } from "../src/app/routeModules.js"
import { SHOP_CATEGORIES } from "../src/constants/shopCatalog.js"

test("route prefetch respects constrained and data-saving connections", () => {
  assert.equal(canPrefetchRoutes({ saveData: true, effectiveType: "4g" }), false)
  assert.equal(canPrefetchRoutes({ saveData: false, effectiveType: "slow-2g" }), false)
  assert.equal(canPrefetchRoutes({ saveData: false, effectiveType: "2g" }), false)
  assert.equal(canPrefetchRoutes({ saveData: false, effectiveType: "3g" }), true)
})

test("idle route scheduling is cancellable", () => {
  let scheduledCallback = null
  let cancelledHandle = null
  const fakeWindow = {
    requestIdleCallback(callback) {
      scheduledCallback = callback
      return 42
    },
    cancelIdleCallback(handle) {
      cancelledHandle = handle
    },
  }

  const cancel = scheduleIdleRoutePrefetch([], { windowObject: fakeWindow })
  assert.equal(typeof scheduledCallback, "function")
  cancel()
  assert.equal(cancelledHandle, 42)
})

test("cosmetic art is one lightweight illustrated SVG set", () => {
  const imageSources = SHOP_CATEGORIES.flatMap((category) => category.items)
    .map((item) => item.imageSrc)
    .filter(Boolean)

  assert.ok(imageSources.length >= 20, "catalog should reference the illustrated set")
  imageSources.forEach((source) => {
    assert.match(source, /^\/skins\/[a-z]+\.svg$/, `${source} should come from the illustrated /skins set`)
    const file = new URL(`../public${source}`, import.meta.url)
    assert.ok(existsSync(file), `${source} should exist`)
    assert.ok(statSync(file).size < 8192, `${source} should stay under 8KB`)
  })
})
