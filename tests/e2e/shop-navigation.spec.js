import { expect, test } from "@playwright/test"
import { gotoRoute, prepareDeterministicPage } from "./fixtures.js"

test("rapid Shop category and route changes show the latest destination", async ({ page }) => {
  test.setTimeout(120_000)
  await prepareDeterministicPage(page)
  await page.emulateMedia({ reducedMotion: "no-preference" })
  await page.addInitScript(() => {
    const key = "clickaway.feedback-preferences.v1"
    const prefs = JSON.parse(localStorage.getItem(key))
    localStorage.setItem(key, JSON.stringify({ ...prefs, reduceMotion: false }))
  })
  await gotoRoute(page, { path: "/shop", heading: "Cosmetic shop" })
  const tabs = page.getByRole("tablist", { name: "Shop categories" }).getByRole("tab")
  for (let round = 0; round < 5; round += 1) {
    for (const index of [1, 2, 3, 0, 2]) await tabs.nth(index).dispatchEvent("click")
    await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true")
    await expect(page.locator("[data-shop-family]")).toHaveCount(1)
    await expect(page.getByRole("heading", { name: "Arena Themes", exact: true })).toBeVisible()
  }
  for (const destination of ["/shop", "/profile", "/shop", "/armory"]) {
    for (const path of ["/profile", "/shop", "/armory", destination]) {
      await page.locator(`a[href="${path}"]:visible`).first().dispatchEvent("click")
      await page.waitForTimeout(35)
    }
    await expect.poll(() => page.evaluate(() => location.pathname)).toBe(destination)
    // Heading checks also catch an outlet retained from an earlier route.
    const heading = destination === "/shop" ? "Cosmetic shop" : destination === "/armory" ? "Armory" : "Vector"
    await expect(page.getByRole("heading", { name: heading, exact: true }).first()).toBeVisible()
    await expect(page.locator(".routeOutlet")).toHaveCount(1)
    await expect(page.locator(".routeOutlet")).toHaveCSS("opacity", "1")
  }
})
