// TEMPORARY (judge council session) — delete after.
// openApp(browser, routeId) -> page in the app as the mock player on the
// user's localhost:5173 dev server.
// routeIds: play, armory, shop, profile, ladder, duels, history, help
import { AUTHENTICATED_ROUTES, gotoRoute, installApiMocks } from "./fixtures.js"

const PREFS = { masterVolume: 0.7, sfxVolume: 0.75, muted: true, reduceMotion: false, screenShake: false, flashes: true, haptics: false, feedbackIntensity: "standard" }

export async function openApp(browser, routeId = "play", progressOverrides = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark", baseURL: "http://localhost:5173" })
  const page = await context.newPage()
  await installApiMocks(page, { progressOverrides })
  await page.addInitScript((prefs) => localStorage.setItem("clickaway.feedback-preferences.v1", JSON.stringify(prefs)), PREFS)
  await gotoRoute(page, AUTHENTICATED_ROUTES.find((route) => route.id === routeId))
  await page.waitForTimeout(800)
  return page
}

// Click the live target n times (during a round).
export async function hitTargets(page, count, delay = 120) {
  for (let i = 0; i < count; i += 1) {
    const target = page.locator(".arena .bigCircleButton").first()
    if (!(await target.count())) break
    await target.click({ force: true, timeout: 1000 }).catch(() => {})
    await page.waitForTimeout(delay)
  }
}
