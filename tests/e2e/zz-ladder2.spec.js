import { test, expect } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import path from "node:path"
import { prepareDeterministicPage, gotoRoute } from "./fixtures.js"

const out = "C:/Users/quinl/AppData/Local/Temp/claude/8f5fc2fbe33c61b7/52a8d379-0918-4105-90fd-d3f7d1db2f63/scratchpad/artpass/ladder2"
const phase = process.env.LADDER_PHASE || "before"
test.setTimeout(120_000)
async function capture(page, name) {
  await page.mouse.move(0, 0)
  await page.evaluate(async () => {
    document.querySelectorAll('img').forEach(image => { image.loading = 'eager' })
    await Promise.all(document.getAnimations().filter(a => a.effect?.getComputedTiming().iterations !== Infinity).map(a => {
      a.finish()
      return a.finished.catch(() => {})
    }))
  })
  await page.screenshot({ path: path.join(out, `${phase}-${name}.png`), fullPage: true })
  if (await page.locator(".ladderPlates").count()) {
    await page.locator(".ladderPlates").screenshot({ path: path.join(out, `${phase}-rows-${name}.png`), style: '.mobileDock, .topbar { visibility: hidden !important }' })
  }
  for (const selector of ['.leaderboardStatusCard', '.leaderboardSkeletonWrap']) {
    if (await page.locator(selector).count()) await page.locator(selector).screenshot({ path: path.join(out, `${phase}-detail-${name}.png`), style: '.mobileDock, .topbar { visibility: hidden !important }' })
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
}
for (const width of [1440, 768, 390, 320]) {
  test(`ladder states ${width}`, async ({ page }) => {
    await mkdir(out, { recursive: true })
    await page.setViewportSize({ width, height: 900 })
    await prepareDeterministicPage(page)
    await gotoRoute(page, { path: "/leaderboard", heading: "Climb the field" })
    await expect(page.locator(".ladderPlate")).toHaveCount(5)
    await capture(page, `default-${width}`)
    if (width === 768) return
    await page.locator('.leaderboardPlayerName').first().focus()
    await expect(page.locator('.ladderPlayerHoverCard').first()).toBeVisible()
    await capture(page, `player-focus-${width}`)
    await page.locator('.leaderboardPlayerName').first().evaluate(element => element.blur())
    for (const name of ["Best score", "Best streak", "Accuracy", "Reaction", "Rating"]) {
      await page.getByRole("tab", { name, exact: true }).click()
      await expect(page.locator(".ladderPlate")).toHaveCount(5)
      await capture(page, `${name.replaceAll(" ", "-")}-${width}`)
    }
    await page.getByRole("button", { name: "Around Me", exact: true }).click()
    await expect(page.locator(".ladderPlate")).toHaveCount(5)
    await capture(page, `around-me-${width}`)
    await page.getByRole("button", { name: /Sorted by/ }).click()
    await capture(page, `reverse-${width}`)
    await page.getByRole("searchbox").fill("NobodyWithThisName")
    await expect(page.locator(".leaderboardNoMatch")).toBeVisible()
    await capture(page, `no-match-${width}`)
    for (const state of ["tiers", "empty", "error", "loading"]) {
      await page.route("**/api/leaderboard?**", async route => {
        if (state === "loading") return
        if (state === "error") return route.fulfill({ status: 503, json: { error: "Standings are temporarily unavailable." } })
        const rows = state === "empty" ? [] : [1550, 1350, 1050, 764, 450, 150].map((mmr, index) => ({ rank: index + 1, userId: index === 3 ? 7 : 30 + index, username: index === 4 ? "AnExtremelyLongPlayerNameThatMustKeepItsEllipsis" : ["Deadeye", "Diamond", "Platinum", "Vector", "Silver", "Bronze"][index], mmr, rankedRounds: 12, bestScore: 1280, bestStreak: 21, accuracyPercent: 98, bestReactionMs: 196 }))
        return route.fulfill({ json: { rows, page: 1, totalPages: rows.length ? 1 : 0, totalCount: rows.length, selfRank: 4 } })
      })
      await page.reload({ waitUntil: 'commit' })
      await expect(page.getByRole("heading", { name: "Climb the field" })).toBeVisible()
      if (state === "tiers") await expect(page.locator(".ladderPlate")).toHaveCount(6)
      if (state === "empty") await expect(page.getByText("No ranked players yet.")).toBeVisible()
      if (state === "error") await expect(page.getByText("Ladder unavailable")).toBeVisible()
      if (state === "loading") await expect(page.locator(".leaderboardSkeletonWrap")).toBeVisible()
      await capture(page, `${state}-${width}`)
    }
  })
}
