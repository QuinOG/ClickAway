import { test, expect } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import path from "node:path"
import { prepareDeterministicPage, gotoRoute } from "./fixtures.js"

const out = "C:/Users/quinl/AppData/Local/Temp/claude/8f5fc2fbe33c61b7/52a8d379-0918-4105-90fd-d3f7d1db2f63/scratchpad/par1/help"
const phase = process.env.COUNCIL_PHASE || "before"
test.setTimeout(300_000)
for (const [name, viewport] of [["desktop", { width: 1440, height: 900 }], ["phone", { width: 390, height: 844 }]]) {
  test(`help capture ${name}`, async ({ page }) => {
    await mkdir(out, { recursive: true })
    await page.setViewportSize(viewport)
    await prepareDeterministicPage(page)
    await gotoRoute(page, { path: "/help", heading: phase === "before" ? "Learn by sight" : "Field Guide" })
    await page.evaluate(async () => Promise.all([...document.images].filter(img => img.loading !== "lazy").map(img => img.decode().catch(() => {}))))
    await page.screenshot({ path: path.join(out, `${phase}-top-${name}.png`), animations: "disabled" })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.locator(".helpRulebook > summary").first().click()
    await page.locator(".helpRulebook").first().evaluate(el => el.scrollIntoView({ block: "start" }))
    await expect(page.locator(".helpRulebookBody").first()).toBeVisible()
    await page.screenshot({ path: path.join(out, `${phase}-expanded-${name}.png`), animations: "disabled" })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}
