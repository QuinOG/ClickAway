import { test, expect } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import path from "node:path"
import { prepareDeterministicPage, gotoRoute } from "./fixtures.js"

const out = "C:/Users/quinl/AppData/Local/Temp/claude/8f5fc2fbe33c61b7/52a8d379-0918-4105-90fd-d3f7d1db2f63/scratchpad/councilT1/shop"
test.setTimeout(120_000)
const phase = process.env.COUNCIL_PHASE || "before"

for (const [name, viewport] of [["desktop", { width: 1440, height: 900 }], ["phone", { width: 390, height: 844 }]]) {
  test(`shop capture ${name}`, async ({ page }) => {
    await mkdir(out, { recursive: true })
    await page.setViewportSize(viewport)
    await prepareDeterministicPage(page)
    await gotoRoute(page, { path: "/shop", heading: "Cosmetic shop" })
    await page.evaluate(async () => {
      await Promise.all([...document.images].map(img => img.decode().catch(() => {})))
    })
    await expect(page.locator(".shopInspectStage")).toBeVisible()
    await page.screenshot({ path: path.join(out, `${phase}-preview-${name}.png`), animations: "disabled" })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (name === "desktop") {
      await page.locator('[data-shop-family="button_skins"] .shopGrid').evaluate(grid => { grid.style.zoom = "0.6" })
      await page.locator('[data-shop-family="button_skins"] .shopGrid').scrollIntoViewIfNeeded()
      await page.screenshot({ path: path.join(out, `${phase}-podiums-desktop.png`), animations: "disabled" })
      for (const rarity of ["common", "rare", "epic", "legendary"]) {
        await expect(page.locator(`.shopItemCard.rarity-${rarity}`).first()).toBeVisible()
      }
    }
  })
}
