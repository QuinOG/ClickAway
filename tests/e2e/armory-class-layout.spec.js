import { test, expect } from "@playwright/test"
import { prepareDeterministicPage } from "./fixtures.js"
import path from "node:path"

const before = process.env.ARMORY_BEFORE === "1"
const shots = path.resolve("docs/feature-improvement/shots/fix-list")
for (const width of [1440, 1280, 390]) {
  test(`new player class layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await prepareDeterministicPage(page, { progressOverrides: {
      levelXp: 0, coins: 0, rankMmr: 0, roundHistory: [], totalRoundCount: 0,
      rankedState: { rankSystemVersion: 4, placementMatchesPlayed: 0, placementScoreTotal: 0, demotionProtectionRounds: 0, consecutiveRankedWins: 0 },
      lifetimeStats: {}, loadoutStats: [], savedLoadouts: undefined, activeLoadoutId: "loadout_1",
      ownedItemIds: ["skin_button", "theme_default", "profile_default"], equippedButtonSkinId: "skin_button",
      buildWalkthrough: { status: "dismissed" },
    } })
    await page.goto(before ? "http://127.0.0.1:4296/armory" : "/armory")
    await expect(page.getByRole("heading", { name: "Armory", exact: true })).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    if (!before) {
      await expect(page.getByLabel("Target details")).toContainText("Target size: Big")
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      const overflow = await page.locator(".armoryMachineHousing, .armoryMachineRackSlot").evaluateAll(nodes => nodes.filter(n => n.scrollWidth > n.clientWidth + 1).map(n => n.textContent))
      expect(overflow).toEqual([])
      const bays = await page.locator(".armoryCart").evaluateAll(nodes => nodes.map(n => ({ left: n.getBoundingClientRect().left, right: n.getBoundingClientRect().right })))
      for (const bay of bays) {
        expect(bay.left).toBeGreaterThanOrEqual(0)
        expect(bay.right).toBeLessThanOrEqual(width)
      }
    }
    const phase = before ? "before" : "after"
    if (width === 390) {
      await page.locator(".armoryStage").evaluate(node => node.scrollIntoView({ block: "start" }))
      await page.locator(".mainContent").evaluate(node => { node.scrollTop -= 95 })
    }
    if (width !== 1280) await page.screenshot({ path: path.join(shots, `armory-build-${phase}-${width === 390 ? "phone" : "desktop"}.png`), fullPage: true, animations: "disabled" })
    await page.getByRole("button", { name: "Compare Modes", exact: true }).click()
    await expect(page.getByRole("dialog", { name: "Compare bench" })).toBeVisible()
    if (width === 1440) await page.screenshot({ path: path.join(shots, `armory-matrix-${phase}-desktop.png`), fullPage: true, animations: "disabled" })
    if (!before) await expect(page.locator(".armoryModeManifestColumnGlyph img")).toHaveCount(3)
    await page.locator(".armoryCompareHeader button").click()
    await page.getByRole("button", { name: "Compare with active", exact: true }).first().click()
    if (width === 1440) await page.screenshot({ path: path.join(shots, `armory-compare-${phase}-desktop.png`), fullPage: true, animations: "disabled" })
  })
}

