import { expect, test } from "@playwright/test"
import { gotoRoute, prepareDeterministicPage } from "./fixtures.js"
import { DEFAULT_SAVED_LOADOUTS } from "../../src/constants/buildcraft.js"

const out = "C:/Users/quinl/AppData/Local/Temp/claude/8f5fc2fbe33c61b7/52a8d379-0918-4105-90fd-d3f7d1db2f63/scratchpad/artpass/lobby-loadout"
const phase = process.env.LOADOUT_PHASE || "after"
for (const state of ["default", "high", "low", "new"]) {
  for (const width of state === "default" ? [1440, 1280, 768, 390, 320] : [1440, 1280, 390, 320]) {
    test(`${state} build at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 1280 ? 720 : width === 1440 ? 900 : 844 })
      const progressOverrides = {}
      if (state === "new") progressOverrides.buildWalkthrough = { status: "not_started" }
      if (state === "high" || state === "low") {
        const savedLoadouts = structuredClone(DEFAULT_SAVED_LOADOUTS)
        savedLoadouts[0].moduleIds = state === "high"
          ? { tempoCoreId: "tempo_anchor", streakLensId: "streak_momentum", powerRigId: "power_surge" }
          : { tempoCoreId: "tempo_overdrive", streakLensId: "streak_stabilizer", powerRigId: "power_reserve" }
        progressOverrides.savedLoadouts = savedLoadouts
      }
      await prepareDeterministicPage(page, { progressOverrides })
      await gotoRoute(page, { path: "/game", heading: "Enter the arena" })
      const strip = page.locator(".lobbyStageLoadout")
      if (width <= 900 && phase === "after") await expect(strip).toBeHidden()
      if (width > 900) {
        await expect(strip).toBeVisible()
        await expect(strip.locator(".lobbyStageSpec")).toHaveCount(4)
        await expect(strip.locator(".lobbyStagePower")).toHaveCount(3)
        if (phase === "after") {
          expect(await strip.locator(".lobbyStageSpec").evaluateAll((stats) => stats.every((stat) => {
            const label = stat.querySelector("small").getBoundingClientRect()
            const value = stat.querySelector("b").getBoundingClientRect()
            return label.right <= value.left && value.right <= stat.getBoundingClientRect().right + 1
          }))).toBe(true)
        }
        if (state === "new") await expect(strip.locator(".lobbyStageEdit b")).toHaveText("New")
        if (state === "high") expect(await strip.locator(".isHigh").count()).toBeGreaterThan(0)
        if (state === "low") expect(await strip.locator(".isLow").count()).toBeGreaterThan(0)
        const plate = await strip.boundingBox()
        for (const selector of [".lobbyStageTarget", ".lobbyDailyGoals"]) {
          const other = await page.locator(selector).boundingBox()
          expect(plate.y).toBeGreaterThanOrEqual(other.y + other.height)
        }
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
      await page.evaluate(async () => {
        await Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {})))
      })
      await page.screenshot({ path: `${out}/${phase}-${state}-${width}-page.png`, fullPage: true })
      if (width > 900) await strip.screenshot({ path: `${out}/${phase}-${state}-${width}-strip.png` })
      if (phase === "after" && state === "default" && width === 1440) {
        await strip.locator("strong").focus()
        await expect(page.getByRole("tooltip")).toBeVisible()
        await page.keyboard.press("Escape")
        await expect(page.getByRole("tooltip")).toHaveCount(0)
        await strip.locator(".lobbyStageEdit").focus()
        await page.keyboard.press("Enter")
        await expect(page.getByRole("heading", { name: "Armory", exact: true })).toBeVisible()
      }
    })
  }
}
