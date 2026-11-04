import { test } from "@playwright/test"
import { AUTHENTICATED_ROUTES, gotoRoute, installApiMocks, prepareDeterministicPage } from "./fixtures.js"

async function prepareLivePage(page) {
  await page.clock.install({ time: new Date("2026-07-12T16:00:00.000Z") })
  await installApiMocks(page, {})
  await page.emulateMedia({ colorScheme: "dark" })
  await page.addInitScript(() => {
    localStorage.setItem("clickaway.feedback-preferences.v1", JSON.stringify({ masterVolume: 0.7, sfxVolume: 0.75, muted: true, reduceMotion: false, screenShake: false, flashes: true, haptics: false, feedbackIntensity: "standard" }))
  })
}

const OUT = process.env.SHOT_DIR || "../ui-shots/d4"
const MAIN = ["armory", "shop", "profile", "ladder", "history", "duels"]

test("capture", async ({ page: firstPage }) => {
  let page = firstPage
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await prepareLivePage(page)
  const play = AUTHENTICATED_ROUTES.find((r) => r.id === "play")

  // 01 lobby
  await gotoRoute(page, play)
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${OUT}/01-play-lobby.png` })

  // 02 live round
  await page.getByRole("button", { name: /Start Casual/i }).click()
  await page.waitForTimeout(3800)
  for (let i = 0; i < 9; i += 1) {
    const target = page.locator(".bigCircleButton").first()
    if (await target.count()) await target.click({ force: true }).catch(() => {})
    await page.waitForTimeout(140)
  }
  await page.waitForTimeout(250)
  await page.screenshot({ path: `${OUT}/02-play-live-round.png` })

  // 03 game over
  await page.keyboard.press("g")
  await page.waitForTimeout(2600)
  await page.screenshot({ path: `${OUT}/03-play-game-over.png` })

  const p2 = await page.context().newPage()
  await p2.setViewportSize({ width: 1440, height: 900 })
  await prepareDeterministicPage(p2)
  page = p2
  let i = 4
  for (const id of MAIN) {
    const route = AUTHENTICATED_ROUTES.find((r) => r.id === id)
    await gotoRoute(page, route)
    await page.waitForTimeout(900)
    await page.screenshot({ path: `${OUT}/${String(i++).padStart(2, "0")}-${id}.png` })
  }

  await page.setViewportSize({ width: 390, height: 844 })
  await gotoRoute(page, play)
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT}/${String(i++).padStart(2, "0")}-mobile-play.png` })
})
