// Close-up captures for before/after comparisons (clickaway-feature-rsi skill).
// ROUTE=<route id> W=<width> H=<height> OUT=<file.png> [SELECTOR=<css>] [FILL=<label>::<text>]
// With SELECTOR, captures just that element; otherwise captures the visible screen only.
import { test } from "@playwright/test"
import { AUTHENTICATED_ROUTES, gotoRoute, installApiMocks } from "./fixtures.js"

test("feature crop", async ({ browser }) => {
  test.skip(!process.env.OUT, "capture tool; set OUT to run")
  const width = Number(process.env.W || 390)
  const height = Number(process.env.H || 844)
  const context = await browser.newContext({ viewport: { width, height }, colorScheme: "dark", baseURL: "http://127.0.0.1:4173", reducedMotion: "reduce" })
  const page = await context.newPage()
  await page.clock.install({ time: new Date("2026-07-12T16:00:00.000Z") })
  await installApiMocks(page)
  await gotoRoute(page, AUTHENTICATED_ROUTES.find((route) => route.id === (process.env.ROUTE || "history")))
  if (process.env.FILL) {
    const [label, text] = process.env.FILL.split("::")
    await page.getByLabel(label, { exact: true }).fill(text)
  }
  await page.waitForTimeout(900)
  if (process.env.SELECTOR) {
    const target = page.locator(process.env.SELECTOR).first()
    await target.scrollIntoViewIfNeeded()
    await target.screenshot({ path: process.env.OUT })
  } else {
    await page.screenshot({ path: process.env.OUT })
  }
  await context.close()
})
