import { expect, test } from "@playwright/test"
import { prepareDeterministicPage, gotoRoute } from "./fixtures.js"

const out = "C:/Users/quinl/AppData/Local/Temp/claude/8f5fc2fbe33c61b7/52a8d379-0918-4105-90fd-d3f7d1db2f63/scratchpad/artpass/lobby-sol"
for (const [name, width, height] of [["desktop", 1440, 900], ["tablet", 768, 1024], ["phone", 390, 844], ["narrow", 320, 700]]) {
  test(`lobby mode cards ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await prepareDeterministicPage(page)
    await gotoRoute(page, { path: "/game", heading: "Enter the arena" })
    const choice = page.locator(".lobbyModeChoice").first()
    await expect(choice).toBeVisible()
    await choice.scrollIntoViewIfNeeded()
    // Let every finite entrance animation finish, or the shot can catch a blank backdrop.
    await page.evaluate(() => Promise.all(document.getAnimations()
      .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
      .map((animation) => animation.finished.catch(() => null))))
    await page.waitForTimeout(300)
    const phase = process.env.ART_PHASE || "after"
    await page.screenshot({ path: `${out}/${phase}-${name}-page.png` })
    const list = await page.locator(".lobbyModeChoice").first().locator("xpath=..").boundingBox()
    if (list) await page.screenshot({ path: `${out}/${phase}-${name}-cards.png`, clip: { x: Math.max(0, list.x - 12), y: Math.max(0, list.y - 12), width: Math.min(width - Math.max(0, list.x - 12), list.width + 24), height: list.height + 24 } })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}
