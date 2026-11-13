// Before/after captures for feature RSI trials (clickaway-feature-rsi skill).
// Run: ROUTE=history OUT=docs/feature-improvement/shots/002/before npx playwright test tests/e2e/zz-feature-shot.spec.js --workers=1
// Writes <OUT>-desktop.png (1440 wide) and <OUT>-mobile.png (390 wide). The app scrolls
// .mainContent rather than the document, so the viewport is grown to the content height
// to get the whole page in one shot.
import { test } from "@playwright/test"
import { AUTHENTICATED_ROUTES, gotoRoute, installApiMocks } from "./fixtures.js"

const ROUTE = process.env.ROUTE || "history"
const OUT = process.env.OUT || `test-results/feature-shot/${ROUTE}`
const PREFS = { masterVolume: 0.7, sfxVolume: 0.75, muted: true, reduceMotion: true, screenShake: false, flashes: false, haptics: false, feedbackIntensity: "standard" }

for (const [label, width, height] of [["desktop", 1440, 900], ["mobile", 390, 844]]) {
  test(`feature shot: ${ROUTE} ${label}`, async ({ browser }) => {
    test.skip(!process.env.OUT, "capture tool; set OUT to run")
    const context = await browser.newContext({ viewport: { width, height }, colorScheme: "dark", baseURL: "http://127.0.0.1:4173", reducedMotion: "reduce" })
    const page = await context.newPage()
    await page.clock.install({ time: new Date("2026-07-12T16:00:00.000Z") })
    await installApiMocks(page)
    await page.addInitScript((prefs) => localStorage.setItem("clickaway.feedback-preferences.v1", JSON.stringify(prefs)), PREFS)
    await gotoRoute(page, AUTHENTICATED_ROUTES.find((route) => route.id === ROUTE))
    await page.waitForTimeout(800)
    if (process.env.CLICK) await page.getByRole("button", { name: process.env.CLICK, exact: true }).first().click()
    await page.waitForTimeout(400)
    const fullHeight = await page.evaluate(() => {
      const main = document.querySelector(".mainContent")
      return Math.max(main?.scrollHeight ?? 0, document.documentElement.scrollHeight)
    })
    await page.setViewportSize({ width, height: Math.min(fullHeight + 40, 6000) })
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${OUT}-${label}.png` })
    await context.close()
  })
}
