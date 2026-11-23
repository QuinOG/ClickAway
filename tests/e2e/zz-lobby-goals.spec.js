import { expect, test } from "@playwright/test"
import { gotoRoute, prepareDeterministicPage, sessionFixture } from "./fixtures.js"

const out = "C:/Users/quinl/AppData/Local/Temp/claude/8f5fc2fbe33c61b7/52a8d379-0918-4105-90fd-d3f7d1db2f63/scratchpad/artpass/lobby-goals"
test.setTimeout(90000)
const phase = process.env.GOALS_PHASE || "after"
for (const state of ["partial", "complete", "ready"]) {
  for (const width of state === "partial" ? [1440, 768, 390, 320] : [1440, 390, 320]) {
    test(`${state} goals at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 })
      const dailyGoals = structuredClone(sessionFixture.progress.dailyGoals)
      if (state === "complete") dailyGoals.goals.forEach((goal) => { goal.progress = goal.target; goal.isComplete = true })
      if (state === "ready") dailyGoals.resetsAt = "2026-07-11T00:00:00Z"
      await prepareDeterministicPage(page, { progressOverrides: { dailyGoals } })
      await gotoRoute(page, { path: "/game", heading: "Enter the arena" })
      await expect(page.getByRole("region", { name: "Daily goals", exact: true })).toBeVisible()
      if (state === "complete") await expect(page.locator(".lobbyDailyGoals li.isComplete")).toHaveCount(3)
      if (state === "ready") await expect(page.locator(".lobbyDailyGoalsNote").first()).toContainText("New goals are ready")
      await page.evaluate(async () => {
        await Promise.all(document.getAnimations().filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity).map((animation) => animation.finished.catch(() => {})))
      })
      if (phase === "after") {
        await expect(page.locator(".lobbyDailyGoalsSummary")).toBeHidden()
        await expect(page.locator(".arenaLobbyDailyBonus.hasDailyGoals")).toBeHidden()
        await expect(page.locator(".lobbyDailyGoalsNote.isBonus")).toBeVisible()
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
        if (width === 390) {
          const start = await page.locator(".arenaLobbyStart").boundingBox()
          expect(start.y).toBeGreaterThanOrEqual(0)
          expect(start.y + start.height).toBeLessThanOrEqual(844)
        }
      }
      await page.screenshot({ path: `${out}/${phase}-${state}-${width}-page.png`, fullPage: true })
      await page.locator(".lobbyDailyGoals").screenshot({ path: `${out}/${phase}-${state}-${width}-board.png` })
    })
  }
}

for (const mode of ["Practice", "Practice-open", "Ranked"]) {
  for (const width of [1440, 390, 320]) {
    test(`${mode} mission board at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 })
      await prepareDeterministicPage(page)
      await gotoRoute(page, { path: "/game", heading: "Enter the arena" })
      await page.locator(".lobbyModeChoice", { hasText: mode.split("-")[0] }).click()
      if (mode === "Practice-open") await page.locator(".practiceDrawerTrigger").click()
      await page.mouse.move(0, 0)
      const board = page.getByRole("region", { name: "Daily goals", exact: true })
      if (mode.startsWith("Practice")) await expect(board).toContainText("Practice rounds don't count toward goals.")
      await expect(page.locator(".lobbyDailyGoalsSummary")).toBeHidden()
      await page.evaluate(async () => {
        await Promise.all(document.getAnimations().filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity).map((animation) => animation.finished.catch(() => {})))
      })
      await page.screenshot({ path: `${out}/${phase}-${mode}-${width}-page.png`, fullPage: true })
      await board.screenshot({ path: `${out}/${phase}-${mode}-${width}-board.png` })
    })
  }
}
