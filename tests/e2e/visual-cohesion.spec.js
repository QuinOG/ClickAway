import { expect, test } from "@playwright/test"

import {
  AUTHENTICATED_ROUTES,
  gotoRoute,
  prepareDeterministicPage,
} from "./fixtures.js"

const VIEWPORTS = [
  { id: "mobile-320", width: 320, height: 844 },
  { id: "desktop-1440", width: 1440, height: 1000 },
]

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.id} route cohesion`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    for (const route of AUTHENTICATED_ROUTES) {
      test(`${route.id} scene`, async ({ page }) => {
        await prepareDeterministicPage(page)
        await gotoRoute(page, route)
        await expect(page).toHaveScreenshot(`${viewport.id}-${route.id}.png`)
      })
    }
  })
}

test.describe("armory scene states", () => {
  test.use({ viewport: { width: 1440, height: 1000 } })

  for (const state of ["gallery", "range", "compare", "unlock-wall"]) {
    test(state, async ({ page }) => {
      await prepareDeterministicPage(page)
      await gotoRoute(page, { path: "/armory", heading: "Armory" })
      if (state === "gallery") {
        await page.getByRole("button", { name: /Powerups/i }).click()
        await expect(page.getByRole("group", { name: "Powerups", exact: true })).toBeVisible()
      } else if (state === "range") {
        await page.getByRole("button", { name: /Test Run/i }).click()
        await page.clock.install({ time: new Date("2026-07-12T16:00:00Z") })
        await page.clock.pauseAt(new Date("2026-07-12T16:00:01Z"))
        await page.getByRole("button", { name: "Start test run" }).click()
        await expect(page.getByRole("group", { name: "Test range", exact: true })).toBeVisible()
      } else if (state === "compare") {
        await page.getByRole("button", { name: "Compare with active" }).first().click()
        await expect(page.getByRole("dialog", { name: "Compare bench" })).toBeVisible()
      } else {
        await page.getByRole("button", { name: "Unlock Wall" }).click()
        await expect(page.getByRole("dialog", { name: "Unlock wall" })).toBeVisible()
      }
      await expect(page).toHaveScreenshot(`desktop-1440-armory-${state}.png`)
    })
  }

})

test.describe("guest arrival cohesion", () => {
  for (const viewport of VIEWPORTS) {
    test(`${viewport.id} login`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await prepareDeterministicPage(page, { authenticated: false })
      await page.goto("/login")
      await expect(page.getByRole("heading", { name: "Return to the arena." })).toBeVisible()
      await page.evaluate(async () => document.fonts?.ready)
      await expect(page).toHaveScreenshot(`${viewport.id}-login.png`)
    })
  }
})
