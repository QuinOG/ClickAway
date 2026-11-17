import { test, expect } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { prepareDeterministicPage, gotoRoute } from "./fixtures.js"
const out = "C:/Users/quinl/AppData/Local/Temp/claude/8f5fc2fbe33c61b7/52a8d379-0918-4105-90fd-d3f7d1db2f63/scratchpad/par1/rankpill"
test.setTimeout(120_000)
for (const width of [390, 320, 1440]) {
  test(`topbar ${width}`, async ({ page }) => {
    await mkdir(out, { recursive: true })
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 })
    await prepareDeterministicPage(page)
    await gotoRoute(page, { path: "/shop", heading: "Cosmetic shop" })
    await page.screenshot({ path: `${out}/${process.env.COUNCIL_PHASE || "before"}-topbar-${width === 1440 ? "desktop" : width}.png`, animations: "disabled" })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (process.env.COUNCIL_PHASE === "after") {
      expect(await page.locator(".shellIdentityRank").evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
    }
  })
}
