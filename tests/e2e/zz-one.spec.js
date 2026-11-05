// Single-scene before/after capture for one-change-per-round UI polish.
// Run: SCENE=armory|live|rankup|results|miss|mods|range|lobby|countdown|ready|spec|compare|wall|final|rangelive SHOT=<file.png> npx playwright test tests/e2e/zz-one.spec.js --workers=1
import { test } from "@playwright/test"
import { AUTHENTICATED_ROUTES, gotoRoute, installApiMocks } from "./fixtures.js"

const SCENE = process.env.SCENE || "armory"
const SHOT = process.env.SHOT || `../ui-shots/tmp/${SCENE}.png`
const PREFS = { masterVolume: 0.7, sfxVolume: 0.75, muted: true, reduceMotion: false, screenShake: false, flashes: true, haptics: false, feedbackIntensity: "standard" }
const route = (id) => AUTHENTICATED_ROUTES.find((r) => r.id === id)

async function newPage(browser, progressOverrides = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark", baseURL: "http://127.0.0.1:4173" })
  const page = await context.newPage()
  await page.clock.install({ time: new Date("2026-07-12T16:00:00.000Z") })
  await installApiMocks(page, { progressOverrides })
  await page.addInitScript((prefs) => localStorage.setItem("clickaway.feedback-preferences.v1", JSON.stringify(prefs)), PREFS)
  return page
}

async function hitTargets(page, count, delay = 120) {
  for (let i = 0; i < count; i += 1) {
    const target = page.locator(".arena .bigCircleButton").first()
    if (await target.count()) await target.click({ force: true, timeout: 1000 }).catch(() => {})
    await page.waitForTimeout(delay)
  }
}

test(`one-scene capture: ${SCENE}`, async ({ browser }) => {
  test.setTimeout(180_000)
  if (SCENE === "armory") {
    const page = await newPage(browser)
    await gotoRoute(page, route("armory"))
    await page.waitForTimeout(1200)
    await page.screenshot({ path: SHOT })
  } else if (SCENE === "live") {
    const page = await newPage(browser)
    await gotoRoute(page, route("play"))
    await page.waitForTimeout(900)
    await page.getByRole("button", { name: /Start Casual/i }).click()
    await page.waitForTimeout(3800)
    await hitTargets(page, 17, 110)
    await page.screenshot({ path: SHOT })
  } else if (SCENE === "rankup") {
    const page = await newPage(browser, { rankMmr: 799 })
    await gotoRoute(page, route("play"))
    await page.waitForTimeout(800)
    await page.getByRole("button", { name: "Select Ranked" }).click()
    await page.getByRole("button", { name: /Start Ranked/i }).click()
    await page.waitForTimeout(3800)
    await hitTargets(page, 30, 90)
    await page.waitForTimeout(15_000)
    await page.getByRole("button", { name: /Reveal Rank/i }).click({ timeout: 4000 })
    await page.waitForTimeout(2500)
    await page.screenshot({ path: SHOT })
  } else if (SCENE === "results" || SCENE === "miss") {
    const page = await newPage(browser)
    await gotoRoute(page, route("play"))
    await page.waitForTimeout(900)
    await page.getByRole("button", { name: /Start Casual/i }).click()
    await page.waitForTimeout(3800)
    await hitTargets(page, SCENE === "miss" ? 8 : 17, 110)
    if (SCENE === "miss") {
      await page.mouse.click(300, 650)
      await page.waitForTimeout(90)
    } else {
      await page.keyboard.press("g")
      await page.waitForTimeout(2600)
    }
    await page.screenshot({ path: SHOT })
  } else if (SCENE === "preview") {
    const page = await newPage(browser)
    await gotoRoute(page, route("armory"))
    await page.waitForTimeout(1000)
    await page.locator(".armoryMachineHousing", { hasText: "Streak Lens" }).first().click({ timeout: 5000 })
    await page.waitForTimeout(400)
    await page.locator(".armoryPartCard", { hasText: "Stabilizer" }).first().hover()
    await page.waitForTimeout(700)
    await page.screenshot({ path: SHOT })
  } else if (SCENE === "mods" || SCENE === "range") {
    const page = await newPage(browser)
    await gotoRoute(page, route("armory"))
    await page.waitForTimeout(1000)
    if (SCENE === "mods") {
      await page.locator(".armoryMachineHousing", { hasText: "Streak Lens" }).first().click({ timeout: 5000 })
      await page.waitForTimeout(400)
    } else {
      await page.locator(".armoryRailStepButton", { hasText: "Test Run" }).click()
      await page.waitForTimeout(500)
      await page.getByRole("button", { name: "Start test run" }).click()
      await page.waitForTimeout(3500)
      await hitTargets(page, 5)
      await page.waitForTimeout(9000)
      await page.getByRole("button", { name: "Run it again" }).click({ timeout: 3000 })
      await page.waitForTimeout(3500)
      await hitTargets(page, 9)
      await page.waitForTimeout(9000)
    }
    await page.screenshot({ path: SHOT })
  } else if (SCENE === "ready") {
    const page = await newPage(browser)
    await gotoRoute(page, route("play"))
    await page.waitForTimeout(900)
    await page.getByRole("button", { name: /Start Casual/i }).click()
    await page.waitForTimeout(3800)
    await hitTargets(page, 6, 110)
    await page.waitForTimeout(500)
    await page.screenshot({ path: SHOT })
  } else if (SCENE === "spec" || SCENE === "compare" || SCENE === "wall" || SCENE === "powers" || SCENE === "testrun") {
    const page = await newPage(browser)
    await gotoRoute(page, route("armory"))
    await page.waitForTimeout(1000)
    if (SCENE === "spec") await page.getByRole("button", { name: "Spec Sheet" }).click()
    if (SCENE === "compare") await page.getByRole("button", { name: "Compare Modes" }).click()
    if (SCENE === "wall") await page.getByRole("button", { name: "Unlock Wall" }).click()
    if (SCENE === "powers") await page.locator(".armoryRailStepButton", { hasText: "Powerups" }).click()
    if (SCENE === "testrun") await page.locator(".armoryRailStepButton", { hasText: "Test Run" }).click()
    await page.waitForTimeout(700)
    await page.screenshot({ path: SHOT })
  } else if (SCENE === "final") {
    const page = await newPage(browser)
    await gotoRoute(page, route("play"))
    await page.waitForTimeout(800)
    await page.getByRole("button", { name: "Select Ranked" }).click()
    await page.getByRole("button", { name: /Start Ranked/i }).click()
    await page.waitForTimeout(3800)
    await hitTargets(page, 6, 110)
    await page.waitForTimeout(10_600)
    await page.screenshot({ path: SHOT })
    if (process.env.MEASURE) for (const s of [".arena", ".arenaFinalCount", ".hudTimerAnchor", ".arena.isFinalDanger"]) console.log(s, JSON.stringify(await page.locator(s).first().boundingBox().catch(() => null)))
  } else if (SCENE === "rangelive") {
    const page = await newPage(browser)
    await gotoRoute(page, route("armory"))
    await page.waitForTimeout(1000)
    await page.locator(".armoryRailStepButton", { hasText: "Test Run" }).click()
    await page.waitForTimeout(500)
    await page.getByRole("button", { name: "Start test run" }).click()
    await page.waitForTimeout(3500)
    await hitTargets(page, 6)
    await page.screenshot({ path: SHOT })
  } else if (SCENE === "countdown") {
    const page = await newPage(browser)
    await gotoRoute(page, route("play"))
    await page.waitForTimeout(900)
    await page.getByRole("button", { name: /Start Casual/i }).click()
    await page.waitForTimeout(1400)
    await page.screenshot({ path: SHOT })
    if (process.env.MEASURE) for (const s of [".entranceReticle", ".roundCountdownInstruction", ".roundCountdownPips", ".arena"]) console.log(s, JSON.stringify(await page.locator(s).first().boundingBox().catch(() => null)))
  } else if (SCENE === "lobby") {
    const page = await newPage(browser)
    await gotoRoute(page, route("play"))
    await page.waitForTimeout(1200)
    await page.screenshot({ path: SHOT })
  }
})
