import { expect, test } from "@playwright/test"
import { AUTHENTICATED_ROUTES, gotoRoute, prepareDeterministicPage } from "./fixtures.js"

test("main routes replace content immediately with motion enabled", async ({ page }) => {
  test.setTimeout(120_000)
  await prepareDeterministicPage(page)
  await page.emulateMedia({ reducedMotion: "no-preference" })
  await page.addInitScript(() => {
    const key = "clickaway.feedback-preferences.v1"
    const prefs = JSON.parse(localStorage.getItem(key))
    localStorage.setItem(key, JSON.stringify({ ...prefs, reduceMotion: false }))
  })
  await gotoRoute(page, AUTHENTICATED_ROUTES[0])
  for (const route of [...AUTHENTICATED_ROUTES.slice(1), AUTHENTICATED_ROUTES[0]]) {
    const link = page.locator(`a[href="${route.path}"]:visible`).first()
    await link.focus()
    await link.press("Enter")
    await expect(page.getByRole("heading", { name: route.heading, exact: true }).first()).toBeVisible()
    await expect(page.locator(".routeOutlet")).toHaveCount(1)
    await expect(page.locator(".routeOutlet")).toHaveCSS("opacity", "1")
    const state = await page.evaluate(() => ({
      focusConnected: document.activeElement?.isConnected,
      scrollY: window.scrollY,
      outletScroll: document.querySelector(".routeOutlet")?.scrollTop,
    }))
    expect(state.focusConnected).toBe(true)
    expect(state.scrollY).toBe(0)
    expect(state.outletScroll).toBe(0)
  }
})
