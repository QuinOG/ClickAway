import { test, expect } from "@playwright/test"
import { prepareDeterministicPage } from "./fixtures.js"

for (const width of [1440, 390]) {
  test(`round complete pending rewards and stable save at ${width}px`, async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width, height: width === 390 ? 2400 : 1100 })
    await prepareDeterministicPage(page)
    await page.clock.install()
    let release
    const saved = new Promise((resolve) => { release = resolve })
    await page.route("**/api/round/complete", async (route) => {
      await saved
      await route.fulfill({ json: { progress: null, earnedCoins: 16, earnedXp: 160, rankDelta: 24 } })
    })
    await page.goto("/game")
    await page.getByRole("button", { name: /^Start / }).last().click()
    await page.clock.runFor(4000)
    await page.clock.fastForward(70000)
    await page.clock.resume()
    await expect(page.getByText(/Saving round/)).toBeVisible()
    await expect(page.locator(".gameOverReward.isCoins")).toContainText("pending")
    await expect(page.locator(".gameOverReward.isXp")).toContainText("pending")
    await expect(page.locator(".gameOverXpTally")).toBeVisible()
    await page.waitForTimeout(600)
    const before = await page.locator(".gameOverActions").boundingBox()
    await page.locator(".gameOverRewards").evaluate((element) => { element.dataset.original = "yes" })
    release()
    await expect(page.locator(".gameOverReward.isCoins")).toContainText("+16")
    await expect(page.locator(".gameOverReward.isXp")).toContainText("+160")
    await expect(page.locator(".gameOverRewards")).toHaveAttribute("data-original", "yes")
    const after = await page.locator(".gameOverActions").boundingBox()
    expect(after.y).toBeCloseTo(before.y, 0)
    await page.evaluate(() => document.fonts.ready)
    await page.locator(".gameOverCard").screenshot({
      path: `docs/feature-improvement/shots/round-complete/after-card-${width === 390 ? "phone" : "desktop"}.png`,
      animations: "disabled",
    })
  })
}
