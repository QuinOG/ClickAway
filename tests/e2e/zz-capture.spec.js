// Focused capture for the council: full gameplay loop + every Armory surface.
// Run: SHOT_DIR=<dir> npx playwright test tests/e2e/zz-capture.spec.js --workers=1
import { test } from "@playwright/test"
import { AUTHENTICATED_ROUTES, gotoRoute, installApiMocks } from "./fixtures.js"

const OUT = process.env.SHOT_DIR || "../ui-shots/tmp"
const PREFS = { masterVolume: 0.7, sfxVolume: 0.75, muted: true, reduceMotion: false, screenShake: false, flashes: true, haptics: false, feedbackIntensity: "standard" }
const route = (id) => AUTHENTICATED_ROUTES.find((r) => r.id === id)
let n = 0

async function newPage(browser, progressOverrides = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark", baseURL: "http://127.0.0.1:4173" })
  const page = await context.newPage()
  await page.clock.install({ time: new Date("2026-07-12T16:00:00.000Z") })
  await installApiMocks(page, { progressOverrides })
  await page.addInitScript((prefs) => localStorage.setItem("clickaway.feedback-preferences.v1", JSON.stringify(prefs)), PREFS)
  return page
}

async function shot(page, name, opts = {}) {
  n += 1
  await page.screenshot({ path: `${OUT}/${String(n).padStart(2, "0")}-${name}.png`, ...opts }).catch(() => {})
}

async function step(label, fn) {
  try { await fn() } catch (error) { console.log(`SKIPPED ${label}: ${error.message.split("\n")[0]}`) }
}

async function closeDialogs(page) {
  await page.keyboard.press("Escape")
  await page.waitForTimeout(200)
  const close = page.getByRole("dialog").getByRole("button", { name: /^(Close|Done|Back)/i }).first()
  if (await close.count()) await close.click({ timeout: 1500 }).catch(() => {})
  await page.waitForTimeout(200)
}

async function hitTargets(page, count, delay = 120) {
  for (let i = 0; i < count; i += 1) {
    const target = page.locator(".arena .bigCircleButton").first()
    if (await target.count()) await target.click({ force: true, timeout: 1000 }).catch(() => {})
    await page.waitForTimeout(delay)
  }
}

test("council capture: gameplay loop + armory", async ({ browser }) => {
  test.setTimeout(480_000)

  // ---- Gameplay loop (casual) ----
  const play = await newPage(browser)
  await gotoRoute(play, route("play"))
  await play.waitForTimeout(900)
  await step("lobby practice", async () => {
    await play.getByRole("button", { name: "Select Practice" }).click()
    await play.waitForTimeout(400)
    await play.locator(".practiceDrawerTrigger").click()
    await play.waitForTimeout(500)
    await shot(play, "loop-lobby-practice-drills")
    await play.locator(".practiceDrawerTrigger").click({ timeout: 3000 })
    await play.getByRole("button", { name: "Select Casual" }).click({ timeout: 3000 })
  })
  await play.getByRole("button", { name: /Start Casual/i }).click()
  await play.waitForTimeout(1100)
  await play.waitForTimeout(2700)
  await hitTargets(play, 3)
  await step("miss", async () => {
    await play.mouse.click(300, 650)
    await play.waitForTimeout(90)
    await shot(play, "loop-live-miss-feedback")
  })
  await hitTargets(play, 14, 110)
  await shot(play, "loop-live-high-streak")
  await play.keyboard.press("g")
  await play.waitForTimeout(2600)
  await shot(play, "loop-results-summary")
  await play.context().close()

  // ---- Ranked round that promotes (seeded at 99/100 RR) ----
  await step("rank up", async () => {
    const ranked = await newPage(browser, { rankMmr: 799 })
    await gotoRoute(ranked, route("play"))
    await ranked.waitForTimeout(800)
    await ranked.getByRole("button", { name: "Select Ranked" }).click()
    await ranked.getByRole("button", { name: /Start Ranked/i }).click()
    await ranked.waitForTimeout(3800)
    await hitTargets(ranked, 30, 90)
    await ranked.waitForTimeout(15_000)
    await ranked.getByRole("button", { name: /Reveal Rank/i }).click({ timeout: 4000 })
    await ranked.waitForTimeout(2500)
    await shot(ranked, "loop-rank-up")
    await ranked.context().close()
  })

  // ---- Armory ----
  const armory = await newPage(browser)
  await gotoRoute(armory, route("armory"))
  await armory.waitForTimeout(1000)
  await shot(armory, "armory-main-fullpage", { fullPage: true })
  for (const slot of ["Streak Lens"]) {
    await step(`slot ${slot}`, async () => {
      await armory.locator(".armoryMachineHousing", { hasText: slot }).first().click({ timeout: 5000 })
      await armory.waitForTimeout(400)
      await shot(armory, `armory-mods-${slot.toLowerCase().replace(" ", "-")}`)
    })
  }
  await step("test run", async () => {
    await armory.locator(".armoryRailStepButton", { hasText: "Test Run" }).click()
    await armory.waitForTimeout(500)
    await armory.getByRole("button", { name: "Start test run" }).click()
    await armory.waitForTimeout(3500)
    await hitTargets(armory, 5)
    await armory.waitForTimeout(9000)
    await armory.getByRole("button", { name: "Run it again" }).click({ timeout: 3000 })
    await armory.waitForTimeout(3500)
    await hitTargets(armory, 9)
    await armory.waitForTimeout(9000)
    await shot(armory, "armory-test-run-results")
    await armory.getByRole("dialog", { name: "Range results" }).getByRole("button").last().click({ timeout: 1500 }).catch(() => {})
  })
  await step("spec sheet", async () => {
    await armory.getByRole("button", { name: "Spec Sheet" }).click()
    await armory.waitForTimeout(500)
    await shot(armory, "armory-spec-sheet")
    await closeDialogs(armory)
  })
  await step("compare bench", async () => {
    await armory.getByRole("button", { name: "Compare with active" }).first().click()
    await armory.waitForTimeout(500)
    await shot(armory, "armory-compare-bench")
    await closeDialogs(armory)
  })
  await step("unlock wall", async () => {
    await armory.getByRole("button", { name: "Unlock Wall" }).first().click({ timeout: 5000 })
    await armory.waitForTimeout(500)
    await shot(armory, "armory-unlock-wall")
    await closeDialogs(armory)
  })
  await armory.context().close()
})
