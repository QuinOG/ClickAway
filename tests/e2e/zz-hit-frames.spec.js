// Hit animation frames for the council: one hit captured at 1/10 playback with page timers frozen.
// OUT_PREFIX=<dir>/f npx playwright test tests/e2e/zz-hit-frames.spec.js, then frame_sheet.py <dir> <out.png>
import { test } from "@playwright/test"
import { AUTHENTICATED_ROUTES, gotoRoute, installApiMocks } from "./fixtures.js"
test("hit frames", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark", baseURL: process.env.SHOT_BASE_URL || "http://127.0.0.1:4173" })
  const page = await context.newPage()
  await page.clock.install({ time: new Date("2026-07-12T16:00:00.000Z") })
  await installApiMocks(page, {})
  await page.addInitScript(() => localStorage.setItem("clickaway.feedback-preferences.v1", JSON.stringify({ masterVolume: 0.7, sfxVolume: 0.75, muted: true, reduceMotion: false, screenShake: false, flashes: true, haptics: false, feedbackIntensity: "standard" })))
  await gotoRoute(page, AUTHENTICATED_ROUTES[0]); await page.waitForTimeout(900)
  await page.getByRole("button", { name: "Select Casual" }).click(); await page.getByRole("button", { name: /Start Casual/i }).click(); await page.waitForTimeout(3900)
  for (let i = 0; i < 6; i++) { await page.locator(".arena .bigCircleButton").first().click({ force: true, timeout: 1000 }).catch(() => {}); await page.waitForTimeout(700) }
  const box = await page.locator(".arena .bigCircleButton").first().boundingBox()
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2
  const clip = { x: Math.max(0, cx - 160), y: Math.max(0, cy - 140), width: 320, height: 240 }
  // Slow CSS animations 10x and freeze page timers so the hit isn't removed mid-sequence.
  const cdp = await context.newCDPSession(page)
  await cdp.send("Animation.enable"); await cdp.send("Animation.setPlaybackRate", { playbackRate: 0.1 })
  await page.clock.pauseAt(new Date(Date.now() + 50))
  await page.mouse.click(cx, cy)
  const t0 = Date.now()
  for (let f = 0; f < 22; f++) {
    const animMs = Math.round((Date.now() - t0) / 10)
    await page.screenshot({ path: `${process.env.OUT_PREFIX}-${String(f).padStart(2, "0")}-${String(animMs).padStart(3, "0")}ms.png`, clip })
  }
})
