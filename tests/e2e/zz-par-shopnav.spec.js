import { test, expect } from "@playwright/test"
import { prepareDeterministicPage, gotoRoute, AUTHENTICATED_ROUTES } from "./fixtures.js"

for (const [device, viewport] of [["desktop", { width: 1440, height: 900 }], ["phone", { width: 390, height: 844 }]]) {
  for (const motion of ["reduce", "no-preference"]) {
    test(`Shop navigation ${device}, motion ${motion}`, async ({ page }) => {
      test.setTimeout(240_000)
      await page.setViewportSize(viewport)
      await prepareDeterministicPage(page)
      await page.emulateMedia({ reducedMotion: motion })
      await page.addInitScript((reduceMotion) => {
        const key = "clickaway.feedback-preferences.v1"
        localStorage.setItem(key, JSON.stringify({ ...JSON.parse(localStorage.getItem(key)), reduceMotion }))
      }, motion === "reduce")
      await gotoRoute(page, { path: "/shop", heading: "Cosmetic shop" })
      const nav = page.getByRole("navigation", { name: device === "phone" ? "Mobile navigation" : "Primary navigation", exact: true })
      async function checkRoute(path) {
        const route = AUTHENTICATED_ROUTES.find((candidate) => candidate.path === path)
        await expect(page).toHaveURL(new RegExp(`${path}(?:\\?.*)?$`))
        await expect(page.getByRole("heading", { name: route.heading, exact: true }).first()).toBeVisible()
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      }
      async function clickRoute(path) {
        let link = nav.locator(`a[href="${path}"]`)
        if (await link.count() === 0) {
          // Armory canonicalizes its query on mount, which dismisses open menus.
          if (new URL(page.url()).pathname === "/armory") {
            await expect(page).toHaveURL(/\/armory\?.*step=/)
          }
          await nav.getByRole("button").click()
          link = page.locator(`.mobileMoreLink[href="${path}"]`)
        }
        await link.click()
      }
      for (const path of ["/game", "/shop", "/armory", "/shop", "/leaderboard", "/shop", "/profile", "/shop", "/challenges", "/shop", "/history", "/shop", "/help", "/shop"]) {
        await clickRoute(path)
        await checkRoute(path)
      }
      const tabs = page.getByRole("tab")
      for (let i = 1; i < await tabs.count(); i += 1) {
        await tabs.nth(i).click()
        await expect(tabs.nth(i)).toHaveAttribute("aria-selected", "true")
        await expect(page.locator(".shopSection")).toHaveCount(1)
        await checkRoute("/shop")
      }
      // Issue the next navigation as soon as the URL updates, during page exit.
      for (const path of ["/game", "/shop", "/armory", "/shop", "/game", "/shop"]) {
        await clickRoute(path)
        await expect(page).toHaveURL(new RegExp(`${path}(?:\\?.*)?$`))
      }
      await checkRoute("/shop")
      await page.goBack()
      await checkRoute("/game")
      await page.goForward()
      await checkRoute("/shop")
    })
  }
}