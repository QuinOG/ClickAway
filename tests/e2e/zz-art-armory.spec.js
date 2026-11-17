import { test, expect } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import path from "node:path"
import { prepareDeterministicPage, gotoRoute } from "./fixtures.js"

const out = "C:/Users/quinl/AppData/Local/Temp/claude/8f5fc2fbe33c61b7/52a8d379-0918-4105-90fd-d3f7d1db2f63/scratchpad/artpass/armory"
const phase = process.env.ARMORY_PHASE || "before"
test.setTimeout(120_000)
for (const [name, viewport] of [["desktop", { width: 1440, height: 900 }], ["phone", { width: 390, height: 844 }]]) {
  test(`armory capture ${name}`, async ({ page }) => {
    await mkdir(out, { recursive: true })
    await page.setViewportSize(viewport)
    await prepareDeterministicPage(page)
    await gotoRoute(page, { path: "/armory", heading: "Armory" })
    await page.locator(".armoryMachineCoreStage").scrollIntoViewIfNeeded()
    await page.evaluate(async () => Promise.all([...document.images].map(img => img.decode().catch(() => {}))))
    await page.screenshot({ path: path.join(out, `${phase}-${name}.png`), animations: "disabled" })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}
