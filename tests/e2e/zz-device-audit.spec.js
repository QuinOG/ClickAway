// Device audit: every page and key screen across phones, tablets and laptops, measured
// for sideways overflow, clipped text, overlapping text and small touch targets.
// Run against your own dev server (another worktree's server may be on 4173):
//   AUDIT_BASE_URL=http://127.0.0.1:4174 AUDIT_DIR=<dir> npx playwright test tests/e2e/zz-device-audit.spec.js --workers=2
// AUDIT_DEVICES and AUDIT_SCREENS (comma lists) run a smaller batch; a full run of all
// devices and screens takes over two hours.
// Writes <dir>/audit.json and one screenshot per device and screen.
import fs from "node:fs"
import { audit } from "./device-audit.js"
import { test } from "@playwright/test"
import { AUTHENTICATED_ROUTES, gotoRoute, installApiMocks } from "./fixtures.js"

test.describe.configure({ mode: "parallel" })

const DIR = process.env.AUDIT_DIR || "test-results/device-audit"
const BASE = process.env.AUDIT_BASE_URL || "http://127.0.0.1:4173"
const DEVICES = [
  ["phone-tiny", 320, 640, true], ["phone-small", 360, 740, true], ["phone", 390, 844, true], ["phone-large", 430, 932, true],
  ["phone-landscape", 844, 390, true], ["tablet", 768, 1024, true], ["tablet-air", 820, 1180, true],
  ["tablet-landscape", 1024, 768, true], ["laptop-small", 1280, 800, false], ["laptop", 1366, 768, false],
  ["desktop", 1440, 900, false],
]
const ONLY = process.env.AUDIT_DEVICES ? process.env.AUDIT_DEVICES.split(",") : null
const ONLY_SCREENS = process.env.AUDIT_SCREENS ? process.env.AUDIT_SCREENS.split(",") : null
const PREFS = { masterVolume: 0.7, sfxVolume: 0.75, muted: true, reduceMotion: true, screenShake: false, flashes: false, haptics: false, feedbackIntensity: "standard" }
const NEW_PLAYER = { coins: 0, levelXp: 0, rankMmr: 0, roundHistory: [], totalRoundCount: 0, loadoutStats: [], lifetimeStats: {}, unlockedAchievementIds: [], buildWalkthrough: { status: "not_started" }, seenUnlockPartIds: [], rankedState: { rankSystemVersion: 4, placementMatchesPlayed: 0, placementScoreTotal: 0, demotionProtectionRounds: 0, consecutiveRankedWins: 0 } }

// Screens: authenticated routes plus states reached by an action.
const SCREENS = [
  ...AUTHENTICATED_ROUTES.map((route) => ({ id: route.id, route })),
  { id: "login", anon: true, path: "/login" },
  { id: "signup", anon: true, path: "/signup" },
  { id: "first-round-lobby", route: { path: "/game", heading: "Your first round" }, progress: NEW_PLAYER },
  { id: "live-round", route: AUTHENTICATED_ROUTES[0], action: "round" },
  { id: "results", route: AUTHENTICATED_ROUTES[0], action: "results" },
  { id: "settings", route: AUTHENTICATED_ROUTES[0], action: "settings" },
  { id: "armory-compare", route: AUTHENTICATED_ROUTES[1], click: "Compare Modes" },
  { id: "armory-spec", route: AUTHENTICATED_ROUTES[1], click: "Spec Sheet" },
  { id: "armory-unlocks", route: AUTHENTICATED_ROUTES[1], click: "Unlock Wall" },
]


for (const [device, width, height, touch] of DEVICES) {
  if (ONLY && !ONLY.includes(device)) continue
  test(`device audit ${device}`, async ({ browser }) => {
    test.setTimeout(1_500_000)
    fs.mkdirSync(DIR, { recursive: true })
    const results = {}
    for (const screen of SCREENS) {
      if (ONLY_SCREENS && !ONLY_SCREENS.includes(screen.id)) continue
      const context = await browser.newContext({ viewport: { width, height }, baseURL: BASE, reducedMotion: "reduce", hasTouch: touch, isMobile: touch && width < 900, colorScheme: "dark" })
      const page = await context.newPage()
      try {
        await page.clock.install({ time: new Date("2026-07-12T16:00:00.000Z") })
        if (!screen.anon) await installApiMocks(page, screen.progress ? { progressOverrides: screen.progress } : {})
        else await installApiMocks(page, { authenticated: false })
        await page.addInitScript((prefs) => localStorage.setItem("clickaway.feedback-preferences.v1", JSON.stringify(prefs)), PREFS)
        if (screen.anon) { await page.goto(screen.path); await page.waitForTimeout(1500) } else await gotoRoute(page, screen.route)
        await page.waitForTimeout(600)
        if (screen.click) { await page.getByRole("button", { name: screen.click, exact: true }).first().click({ timeout: 8000 }); await page.waitForTimeout(900) }
        if (screen.action === "settings") {
          // Desktop has a gear button; phones and tablets open it from the More menu.
          const gear = page.getByRole("button", { name: "Open feedback settings" })
          if (await gear.isVisible()) await gear.click({ timeout: 5000 })
          else {
            await page.getByRole("button", { name: /^More/ }).first().click({ timeout: 5000 })
            await page.waitForTimeout(400)
            await page.getByRole("button", { name: "Settings, Support" }).click({ timeout: 5000 })
          }
          await page.waitForTimeout(800)
        }
        if (screen.action === "round" || screen.action === "results") {
          await page.locator(".arenaLobbyStart").click()
          await page.clock.runFor(3900); await page.waitForTimeout(600)
          for (let i = 0; i < 8; i += 1) await page.locator(".arena .bigCircleButton").first().click({ force: true, timeout: 1000 }).catch(() => {})
          if (screen.action === "results") { await page.keyboard.press("g"); await page.clock.runFor(2600); await page.waitForTimeout(800) }
        }
        // Show the whole page at once so nothing is judged by where the scroll happens to be.
        const fullHeight = await page.evaluate(() => {
          const scrollers = [...document.querySelectorAll(".mainContent, .gameOverCard, .gameOverlay")]
          return Math.max(document.documentElement.scrollHeight, ...scrollers.map((el) => el.scrollHeight + el.getBoundingClientRect().top))
        })
        if (fullHeight > height) { await page.setViewportSize({ width, height: Math.min(Math.ceil(fullHeight) + 40, 6000) }); await page.waitForTimeout(500) }
        const report = await page.evaluate(audit, { touch })
        results[screen.id] = report
        await page.screenshot({ path: `${DIR}/${device}-${screen.id}.png`, fullPage: true })
      } catch (error) {
        results[screen.id] = { error: String(error.message).split("\n")[0] }
      }
      await context.close().catch(() => {})
      // Saved after every screen so a slow device keeps what it finished.
      fs.writeFileSync(`${DIR}/audit-${device}.json`, JSON.stringify({ device, width, height, results }, null, 2))
    }
    fs.writeFileSync(`${DIR}/audit-${device}.json`, JSON.stringify({ device, width, height, results }, null, 2))
  })
}
