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
