// Before/after captures for feature RSI trials (clickaway-feature-rsi skill).
// Run: ROUTE=history OUT=docs/feature-improvement/shots/002/before npx playwright test tests/e2e/zz-feature-shot.spec.js --workers=1
// FILL=<field label>::<text> types into one field first.
// LINK=<link name> follows one link first (e.g. into another page).
// Writes <OUT>-desktop.png (1440 wide) and <OUT>-mobile.png (390 wide). The app scrolls
// .mainContent rather than the document, so the viewport is grown to the content height
// to get the whole page in one shot.
import { test } from "@playwright/test"
import { AUTHENTICATED_ROUTES, gotoRoute, installApiMocks } from "./fixtures.js"

const ROUTE = process.env.ROUTE || "history"
const OUT = process.env.OUT || `test-results/feature-shot/${ROUTE}`
// NEW_PLAYER=1 captures a brand-new account (no rounds, level 1, onboarding not started).
const NEW_PLAYER_PROGRESS = {
  coins: 0, levelXp: 0, rankMmr: 0, roundHistory: [], totalRoundCount: 0, loadoutStats: [],
  rankedState: { rankSystemVersion: 4, placementMatchesPlayed: 0, placementScoreTotal: 0, demotionProtectionRounds: 0, consecutiveRankedWins: 0 },
  lifetimeStats: {}, unlockedAchievementIds: [], buildWalkthrough: { status: "not_started" }, seenUnlockPartIds: [],
}
const PREFS = { masterVolume: 0.7, sfxVolume: 0.75, muted: true, reduceMotion: true, screenShake: false, flashes: false, haptics: false, feedbackIntensity: "standard" }

// EXTRA=<label>:<width>x<height> adds one more size, e.g. EXTRA=laptop:1024x700.
const SIZES = [["desktop", 1440, 900], ["mobile", 390, 844]]
if (process.env.EXTRA) {
  const [extraLabel, size] = process.env.EXTRA.split(":")
  const [extraWidth, extraHeight] = size.split("x").map(Number)
  SIZES.push([extraLabel, extraWidth, extraHeight])
}

for (const [label, width, height] of SIZES) {
  test(`feature shot: ${ROUTE} ${label}`, async ({ browser }) => {
    test.skip(!process.env.OUT, "capture tool; set OUT to run")
    const context = await browser.newContext({ viewport: { width, height }, colorScheme: "dark", baseURL: process.env.SHOT_BASE_URL || "http://127.0.0.1:4173", reducedMotion: "reduce" })
    const page = await context.newPage()
    await page.clock.install({ time: new Date("2026-07-12T16:00:00.000Z") })
    // BEST=<score> sets the personal best (for Results comparisons).
    const progressOverrides = process.env.NEW_PLAYER ? { ...NEW_PLAYER_PROGRESS } : {}
    if (process.env.BEST) progressOverrides.lifetimeStats = { ...(progressOverrides.lifetimeStats ?? {}), bestSingleScore: Number(process.env.BEST) }
    await installApiMocks(page, { progressOverrides })
    await page.addInitScript((prefs) => localStorage.setItem("clickaway.feedback-preferences.v1", JSON.stringify(prefs)), PREFS)
    const route = AUTHENTICATED_ROUTES.find((entry) => entry.id === ROUTE)
    // HEADING=<text> when the page heading differs for this state (e.g. a new player).
    await gotoRoute(page, process.env.HEADING ? { ...route, heading: process.env.HEADING } : route)
    await page.waitForTimeout(800)
    if (process.env.CLICK) await page.getByRole("button", { name: process.env.CLICK, exact: true }).first().click()
    if (process.env.FILL) {
      const [label, text] = process.env.FILL.split("::")
      await page.getByLabel(label, { exact: true }).fill(text)
      await page.waitForTimeout(800)
    }
    if (process.env.LINK) {
      await page.getByRole("link", { name: process.env.LINK, exact: true }).first().click()
      await page.waitForLoadState("networkidle")
    }
    // PLAY_ROUND=1 starts the selected mode, lands 16 hits and ends the round (dev "g"), then shoots Results.
    if (process.env.PLAY_ROUND) {
      await page.locator(".arenaLobby .primaryButton, .arenaLobby button.readyStartButton").last().click()
      await page.waitForTimeout(3900)
      for (let i = 0; i < 16; i += 1) {
        await page.locator(".arena .bigCircleButton").first().click({ force: true, timeout: 1000 }).catch(() => {})
        await page.waitForTimeout(110)
      }
      await page.keyboard.press("g")
      await page.waitForTimeout(2600)
      await page.screenshot({ path: `${OUT}-${label}.png` })
      await context.close()
      return
    }
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
