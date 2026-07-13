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

  test("hotbar gallery, test range, compare bench, and unlock wall", async ({ page }) => {
    await prepareDeterministicPage(page)
    await gotoRoute(page, { path: "/armory", heading: "Armory" })

    await page.getByRole("button", { name: /Hotbar/i }).click()
    await expect(page.getByRole("group", { name: "Power tools" })).toBeVisible()
    await expect(page).toHaveScreenshot("desktop-1440-armory-gallery.png")

    await page.getByRole("button", { name: /Test Range/i }).click()
    await page.getByRole("button", { name: "Run the Range" }).click()
    await expect(page.getByRole("group", { name: "Test range" })).toBeVisible()
    await expect(page).toHaveScreenshot("desktop-1440-armory-range.png")
    await page.getByRole("button", { name: /Exit/i }).click()

    await page.getByRole("button", { name: "Compare with active" }).first().click()
    await expect(page.getByRole("dialog", { name: "Compare bench" })).toBeVisible()
    await expect(page).toHaveScreenshot("desktop-1440-armory-compare.png")
    await page.getByRole("dialog", { name: "Compare bench" }).getByRole("button", { name: "Close" }).click()

    await page.getByRole("button", { name: "Unlock Wall" }).click()
    await expect(page.getByRole("dialog", { name: "Unlock wall" })).toBeVisible()
    await expect(page).toHaveScreenshot("desktop-1440-armory-unlock-wall.png")
  })
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
