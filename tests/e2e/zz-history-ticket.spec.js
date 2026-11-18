import { expect, test } from "@playwright/test"
import { prepareDeterministicPage, gotoRoute } from "./fixtures.js"

const out = "C:/Users/quinl/AppData/Local/Temp/claude/8f5fc2fbe33c61b7/52a8d379-0918-4105-90fd-d3f7d1db2f63/scratchpad/artpass/history-int"
for (const [name, width, height] of [["desktop", 1440, 900], ["phone", 390, 844], ["narrow", 320, 844]]) {
  test(`history ticket ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await prepareDeterministicPage(page)
    await gotoRoute(page, { path: "/history", heading: "Match history" })
    const ticket = page.locator(".historyRoundCard").first()
    await expect(ticket).toBeVisible()
    await ticket.scrollIntoViewIfNeeded()
    await page.waitForTimeout(2000)
    const phase = process.env.ART_PHASE || "after"
    // Let every finite entrance animation finish, or the desktop shot can catch a blank backdrop.
    await page.evaluate(() => Promise.all(document.getAnimations()
      .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
      .map((animation) => animation.finished.catch(() => null))))
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${out}/${phase}-${name}-page.png` })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}
