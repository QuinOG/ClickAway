import { test, expect } from "@playwright/test"
import { prepareDeterministicPage, sessionFixture } from "./fixtures.js"

for (const [width, height] of [[1440, 900], [1280, 720], [390, 844]]) {
  for (const personalBest of [false, true]) {
    test(`round ceremony ${personalBest ? "PB" : "normal"} fits and saves at ${width}x${height}`, async ({ page }) => {
      test.setTimeout(120_000)
      await page.setViewportSize({ width, height })
      await prepareDeterministicPage(page, { progressOverrides: personalBest ? {
        lifetimeStats: { ...sessionFixture.progress.lifetimeStats, bestSingleScore: 1 },
        roundHistory: [], loadoutStats: [],
      } : {} })
      await page.clock.install()
      let release
      const saved = new Promise((resolve) => { release = resolve })
      await page.route("**/api/round/complete", async (route) => {
        await saved
        await route.fulfill({ json: { progress: null, earnedCoins: 16, earnedXp: 160, rankDelta: 24, ...(width === 1280 ? { dailyGoalRewards: { goals: [{ id: "rounds-3", label: "Play 3 rounds", reward: { coins: 40, xp: 80 } }], coins: 40, xp: 80 } } : {}) } })
      })
      await page.goto("/game")
      await page.getByRole("button", { name: /^Start / }).last().click()
      await page.clock.runFor(4000)
      for (let hit = 0; hit < 12; hit += 1) {
        await page.locator(".arena .bigCircleButton").first().click({ force: true })
        await page.clock.runFor(110)
      }
      await page.clock.fastForward(70000)
      await page.clock.resume()
      await expect(page.getByText(/Saving round/)).toBeVisible()
      await expect(page.locator(".gameOverReward.isCoins")).toContainText("pending")
      await expect(page.locator(".gameOverReward.isXp")).toContainText("pending")
      await expect(page.locator(".gameOverCard")).toHaveClass(personalBest ? /isPersonalBest/ : /resultCeremony/)
      if (!personalBest) await expect(page.locator(".gameOverCard")).not.toHaveClass(/isPersonalBest/)
      await page.evaluate(() => document.fonts.ready)
      await page.waitForTimeout(650)
      const selectors = [".gameOverScorePanel", ".gameOverRewards", ".gameOverReward.isCoins", ".gameOverReward.isXp"]
      const before = await Promise.all(selectors.map((selector) => page.locator(selector).boundingBox()))
      await page.locator(".gameOverRewards").evaluate((element) => { element.dataset.original = "yes" })
      const play = page.getByRole("button", { name: "Play Again", exact: true })
      const assertFits = async () => {
        const rect = await play.boundingBox()
        expect(rect.y).toBeGreaterThanOrEqual(0)
        expect(rect.y + rect.height).toBeLessThanOrEqual(height)
        expect(await page.locator(".gameOverCard").evaluate((el) => el.scrollTop)).toBe(0)
      }
      await assertFits()
      release()
      await expect(page.locator(".gameOverReward.isCoins")).toContainText("+16")
      await expect(page.locator(".gameOverReward.isXp")).toContainText("+160")
      await expect(page.locator(".gameOverRewards")).toHaveAttribute("data-original", "yes")
      const after = await Promise.all(selectors.map((selector) => page.locator(selector).boundingBox()))
      after.forEach((rect, index) => {
        expect(Math.abs(rect.y - before[index].y)).toBeLessThanOrEqual(2)
        expect(Math.abs(rect.x - before[index].x)).toBeLessThanOrEqual(2)
        expect(Math.abs(rect.height - before[index].height)).toBeLessThanOrEqual(2)
      })
      await assertFits()
      if (width !== 1280) await page.screenshot({ path: `docs/feature-improvement/shots/round-complete/after-a-${personalBest ? "pb" : "normal"}-${width === 390 ? "phone" : "desktop"}.png`, animations: "disabled" })
      if (width === 1440 && !personalBest) {
        await page.getByText("Round details", { exact: false }).click()
        await expect(page.locator(".resultDetails")).toHaveAttribute("open", "")
        await page.screenshot({ path: "docs/feature-improvement/shots/round-complete/after-a-details-open-desktop.png", animations: "disabled" })
      }
    })
  }
}
