import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { prepareDeterministicPage, gotoRoute } from "./fixtures.js"

const out = "C:/Users/quinl/AppData/Local/Temp/claude/8f5fc2fbe33c61b7/52a8d379-0918-4105-90fd-d3f7d1db2f63/scratchpad/artpass/lobby-panel"
test.setTimeout(120_000)
const phase = process.env.PANEL_PHASE || "before"
for (const width of [1440, 768, 390, 320]) {
  test(`selected panels at ${width}`, async ({ page }) => {
    await mkdir(out, { recursive: true })
    await page.setViewportSize({ width, height: width > 900 ? 900 : 1000 })
    await prepareDeterministicPage(page)
    await gotoRoute(page, { path: "/game", heading: "Enter the arena" })
    const shot = async (state) => {
      await page.mouse.move(0, 0)
      await page.locator(".readyCard.arenaLobby").evaluate(element => element.focus({ preventScroll: true }))
      await expect(page.locator("[role=tooltip]")).toHaveCount(0)
      await page.evaluate(async () => {
        await Promise.all(document.getAnimations().filter(a => a.effect?.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => {})))
      })
      await page.screenshot({ path: `${out}/${phase}-${width}-${state}.png`, fullPage: true })
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    }
    await page.getByRole("button", { name: "Select Casual", exact: true }).click()
    await shot("casual")
    if (width === 768) return
    await page.getByRole("button", { name: "Select Ranked", exact: true }).click()
    await shot("ranked-closed")
    await page.locator(".rankedPreflightDetails > summary").click()
    await shot("ranked-open")
    await page.locator(".arenaLobbyStart").scrollIntoViewIfNeeded()
    await shot("ranked-open-bottom")
    await page.getByRole("button", { name: "Select Practice", exact: true }).click()
    await shot("practice-closed")
    await page.locator(".practiceDrawerTrigger").click()
    await shot("practice-open")
    await page.locator(".arenaLobbyStart").scrollIntoViewIfNeeded()
    await shot("practice-open-bottom")
    await page.getByRole("button", { name: "Free Practice", exact: false }).last().click()
    await expect(page.locator(".practiceDrillChoice").first()).toHaveAttribute("aria-pressed", "true")
    await page.locator(".practiceDrillChoice").nth(1).click()
    await expect(page.locator(".practiceDrillChoice").nth(1)).toHaveAttribute("aria-pressed", "true")
    await shot("practice-selected")
    await page.keyboard.press("Escape")
    await expect(page.locator(".practiceDrawerTrigger")).toHaveAttribute("aria-expanded", "false")
  })
}
for (const width of [1440, 390, 320]) {
  test(`new player at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await prepareDeterministicPage(page, { progressOverrides: { roundHistory: [], totalRoundCount: 0, lifetimeStats: { totalRounds: 0 } } })
    await gotoRoute(page, { path: "/game", heading: "Enter the arena" })
    await page.getByRole("button", { name: "Select Casual", exact: true }).click()
    await page.mouse.move(0, 0)
    await page.locator(".readyCard.arenaLobby").evaluate(element => element.focus({ preventScroll: true }))
    await expect(page.locator("[role=tooltip]")).toHaveCount(0)
    await page.evaluate(async () => { await Promise.all(document.getAnimations().filter(a => a.effect?.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))) })
    await expect(page.locator(".lobbyModeRecord")).toHaveCount(0)
    await page.screenshot({ path: `${out}/${phase}-${width}-empty.png`, fullPage: true })
  })
}
