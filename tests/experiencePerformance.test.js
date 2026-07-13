import test from "node:test"
import assert from "node:assert/strict"
import { existsSync } from "node:fs"

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

test("heavy cosmetic sources use deployable modern assets", () => {
  const imageSources = SHOP_CATEGORIES.flatMap((category) => category.items)
    .map((item) => item.imageSrc)
    .filter(Boolean)
  const optimizedSources = ["/cd.avif", "/earth.avif", "/eye.avif", "/melon.avif", "/moon.avif", "/wheel.avif"]

  optimizedSources.forEach((source) => {
    assert.ok(imageSources.includes(source), `${source} should be referenced by the catalog`)
    assert.ok(existsSync(new URL(`../public${source}`, import.meta.url)), `${source} should exist`)
  })
})
