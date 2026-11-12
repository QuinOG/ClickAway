// Whole-app capture for the game-feel council. SHOT_DIR=<dir> npx playwright test tests/e2e/zz-app.spec.js --workers=1
import { test } from "@playwright/test"
import { AUTHENTICATED_ROUTES, gotoRoute, installApiMocks } from "./fixtures.js"

const OUT = process.env.SHOT_DIR || "docs/ui-polish/game-feel/tmp"
const PREFS = { masterVolume: 0.7, sfxVolume: 0.75, muted: true, reduceMotion: false, screenShake: false, flashes: true, haptics: false, feedbackIntensity: "standard" }
let n = 0

async function newPage(browser, opts = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark", baseURL: process.env.SHOT_BASE_URL || "http://127.0.0.1:4173" })
  const page = await context.newPage()
  await page.clock.install({ time: new Date("2026-07-12T16:00:00.000Z") })
  if (!opts.anon) await installApiMocks(page, { progressOverrides: opts.progress ?? {} })
  await page.addInitScript((prefs) => localStorage.setItem("clickaway.feedback-preferences.v1", JSON.stringify(prefs)), PREFS)
  return page
}
async function shot(page, name, opts = {}) {
  n += 1
  if (opts.fullPage !== false) {
    const extra = await page.evaluate(() => { const m = document.querySelector(".mainContent"); return m ? m.scrollHeight - m.clientHeight : 0 }).catch(() => 0)
    if (extra > 0) {
      await page.setViewportSize({ width: 1440, height: Math.min(900 + extra, 4600) })
      await page.waitForTimeout(500)
      await page.screenshot({ path: `${OUT}/${String(n).padStart(2, "0")}-${name}.png` }).catch(() => {})
      await page.setViewportSize({ width: 1440, height: 900 })
      return
    }
  }
  await page.screenshot({ path: `${OUT}/${String(n).padStart(2, "0")}-${name}.png`, fullPage: true, ...opts }).catch(() => {})
}
async function step(label, fn) { try { await fn() } catch (e) { console.log(`SKIPPED ${label}: ${e.message.split("\n")[0]}`) } }

test("app capture", async ({ browser }) => {
  test.setTimeout(600_000)
  await step("login", async () => {
    const p = await newPage(browser, { anon: true })
    await p.goto("/login"); await p.waitForTimeout(1200); await shot(p, "login")
    await p.context().close()
  })
  const page = await newPage(browser)
  for (const r of AUTHENTICATED_ROUTES) {
    await step(r.id, async () => { await gotoRoute(page, r); await page.waitForTimeout(900); await shot(page, r.id) })
  }
  await step("settings", async () => {
    await gotoRoute(page, AUTHENTICATED_ROUTES[0])
    await page.getByRole("button", { name: /settings/i }).first().click({ timeout: 3000 })
    await page.getByRole("dialog").waitFor({ state: "visible", timeout: 5000 })
    await page.waitForFunction(() => getComputedStyle(document.querySelector('[role="dialog"]')).opacity === "1", null, { timeout: 5000 }).catch(() => {})
    await shot(page, "settings-sheet", { fullPage: false })
    await page.keyboard.press("Escape")
  })
  await step("live", async () => {
    const page = await newPage(browser)
    await gotoRoute(page, AUTHENTICATED_ROUTES[0])
    await page.waitForTimeout(900)
    await page.getByRole("button", { name: "Select Casual" }).click()
    await page.getByRole("button", { name: /Start Casual/i }).click()
    await page.waitForTimeout(3900)
    for (let i = 0; i < 16; i++) { await page.locator(".arena .bigCircleButton").first().click({ force: true, timeout: 1000 }).catch(() => {}); await page.waitForTimeout(110) }
    await shot(page, "live-round", { fullPage: false })
    await page.keyboard.press("g"); await page.waitForTimeout(2600)
    await shot(page, "results", { fullPage: false })
    await page.context().close()
  })
  // Rank-up: start 2 RR under the next division so a ranked round promotes.
  await step("rankup", async () => {
    const page = await newPage(browser, { progress: { rankMmr: 798 } })
    await gotoRoute(page, AUTHENTICATED_ROUTES[0])
    await page.waitForTimeout(900)
    await page.getByRole("button", { name: "Select Ranked" }).click()
    await page.getByRole("button", { name: /Start Ranked/i }).click()
    await page.waitForTimeout(3900)
    for (let i = 0; i < 14; i++) { await page.locator(".arena .bigCircleButton").first().click({ force: true, timeout: 1000 }).catch(() => {}); await page.waitForTimeout(110) }
    await page.keyboard.press("g"); await page.waitForTimeout(2600)
    await page.getByRole("button", { name: /Reveal Rank/i }).click({ timeout: 4000 })
    await page.waitForTimeout(2400)
    n = 12
    await shot(page, "rankup", { fullPage: false })
    await page.context().close()
  })
  const route = (id) => AUTHENTICATED_ROUTES.find((r) => r.id === id)
  await step("identity-popover", async () => {
    await gotoRoute(page, route("play")); await page.locator(".shellIdentityButton").click({ timeout: 4000 })
    await page.locator(".shellIdentityPopover").waitFor({ timeout: 4000 }); n = 13; await shot(page, "identity-popover", { fullPage: false })
  })
  await step("ladder-hovercard", async () => {
    await gotoRoute(page, route("ladder"))
    const wrap = page.locator(".ladderPlate:not(.isCurrentUser) .leaderboardEntryHoverWrap").first()
    // the first row sits at the bottom of the viewport, so centre it or its card runs off the shot
    await wrap.evaluate((el) => el.scrollIntoView({ block: "center" })); await page.waitForTimeout(300)
    await wrap.hover({ timeout: 4000 })
    await page.waitForTimeout(500); n = 14; await shot(page, "ladder-hovercard", { fullPage: false })
  })
  for (const [number, name, trigger] of [[16, "armory-compare", "Compare with active"], [17, "armory-unlock-wall", "Unlock Wall"], [18, "armory-spec-sheet", "Spec Sheet"]]) {
    await step(name, async () => {
      await gotoRoute(page, route("armory")); await page.getByRole("button", { name: trigger }).first().click({ timeout: 5000 })
      await page.waitForTimeout(700); n = number - 1; await shot(page, name, { fullPage: false }); await page.keyboard.press("Escape")
    })
  }
  await step("signup", async () => {
    const p = await newPage(browser, { anon: true }); await p.goto("/signup"); await p.waitForTimeout(1200)
    n = 18; await shot(p, "signup"); await p.context().close()
  })
  await step("nav-more", async () => {
    await page.setViewportSize({ width: 390, height: 844 }); await gotoRoute(page, route("play"))
    await page.locator(".mobileMoreTrigger").click({ timeout: 4000 }); await page.waitForTimeout(500)
    n = 19; await shot(page, "nav-more", { fullPage: false })
  })

})
