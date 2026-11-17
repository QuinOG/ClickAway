import { test, expect } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import path from "node:path"
import { prepareDeterministicPage, gotoRoute } from "./fixtures.js"

const out = "C:/Users/quinl/AppData/Local/Temp/claude/8f5fc2fbe33c61b7/52a8d379-0918-4105-90fd-d3f7d1db2f63/scratchpad/par1/arena"
const phase = process.env.COUNCIL_PHASE || "before"
test.setTimeout(120_000)
for (const [size, viewport] of [["desktop", { width: 1440, height: 900 }], ["phone", { width: 390, height: 844 }]]) {
  test(`arena and profile cards ${size}`, async ({ page }) => {
    await mkdir(out, { recursive: true })
    await page.setViewportSize(viewport)
    await prepareDeterministicPage(page)
    await gotoRoute(page, { path: "/shop", heading: "Cosmetic shop" })
    await page.evaluate(async () => { await Promise.all([...document.images].map(img => img.decode().catch(() => {}))) })
    for (const [shot, family] of [["arena", "arena_themes"], ["profile", "profile_images"]]) {
      await page.locator(`[data-shop-family="${family}"]`).evaluate(section => section.scrollIntoView({ block: "start" }))
      await page.screenshot({ path: path.join(out, `${phase}-${shot}-${size}.png`), animations: "disabled" })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    }
  })
}
