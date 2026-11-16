import { test, expect } from "@playwright/test"
import path from "node:path"
import fs from "node:fs/promises"
import { prepareDeterministicPage, gotoRoute } from "./fixtures.js"

test.setTimeout(60000)
const out = process.env.COUNCIL_OUT || "C:/Users/quinl/AppData/Local/Temp/claude/8f5fc2fbe33c61b7/52a8d379-0918-4105-90fd-d3f7d1db2f63/scratchpad/councilT1/armory"
const phase = process.env.COUNCIL_PHASE || "before"
for (const shot of ["default-desktop", "default-phone", "powerrig-desktop", "powerups-desktop"]) {
  test(`Armory council ${shot}`, async ({ page }) => {
    await page.setViewportSize(shot === "default-phone" ? { width: 390, height: 844 } : { width: 1440, height: 900 })
    await prepareDeterministicPage(page, { progressOverrides: { levelXp: 0, totalRoundCount: 0, roundHistory: [], loadoutStats: [], equippedButtonSkinId: "skin_button" } })
    await gotoRoute(page, { path: "/armory", heading: "Armory" })
    if (shot === "powerrig-desktop") await page.locator(".armoryMachineHousing.housing-powerRig").click()
    if (shot === "powerups-desktop") await page.getByLabel("Armory steps").getByRole("button", { name: /Powerups/ }).click()
    if (shot === "default-phone") await page.locator(".armoryMachineCoreStage").scrollIntoViewIfNeeded()
    await page.evaluate(async () => { await Promise.all([...document.images].map(img => img.decode().catch(() => {}))) })
    await fs.mkdir(out, { recursive: true })
    await page.screenshot({ path: path.join(out, `${phase}-${shot}.png`), animations: "disabled" })
    if (phase === "after") {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
      const target = page.locator(".armoryMachineAimReadout")
      await expect(target).toContainText("Shrinks as you hit")
      await expect(page.locator(".armoryPartCard").first()).toBeAttached()
      expect(await page.locator(".armoryPartCard").first().evaluate(el => getComputedStyle(el, "::after").content)).toBe("none")
      if (shot === "powerrig-desktop" || shot === "default-phone") {
        await gotoRoute(page, { path: "/armory?step=passives&lane=powerRig", heading: "Armory" })
        await page.locator('[data-part-id="power_reserve"]').hover()
        await expect(page.locator(".armoryPartFeatureName")).toHaveText("Reserve Rig")
        const overflow = await page.locator(".armoryPartFeature").evaluate(el => {
          const card = el.getBoundingClientRect()
          return [...el.querySelectorAll("strong, button, [role=cell], [role=columnheader]")].filter(child => {
            const rect = child.getBoundingClientRect()
            return rect.right > card.right + 1 || rect.left < card.left - 1 || child.scrollWidth > child.clientWidth + 1
          }).map(child => child.textContent)
        })
        expect(overflow).toEqual([])
      }
    }
  })
}
