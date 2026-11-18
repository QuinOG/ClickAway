import { test, expect } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import path from "node:path"
import { prepareDeterministicPage, gotoRoute } from "./fixtures.js"

const out = "C:/Users/quinl/AppData/Local/Temp/claude/8f5fc2fbe33c61b7/52a8d379-0918-4105-90fd-d3f7d1db2f63/scratchpad/artpass/ladder"
test.setTimeout(120_000)
const phase = process.env.LADDER_PHASE || "before"

for (const [name, viewport] of [["1440", { width: 1440, height: 900 }], ["768", { width: 768, height: 1024 }], ["390", { width: 390, height: 844 }], ["320", { width: 320, height: 700 }]]) {
  test(`ladder capture ${name}`, async ({ page }) => {
    await mkdir(out, { recursive: true })
    await page.setViewportSize(viewport)
    await prepareDeterministicPage(page)
    await gotoRoute(page, { path: "/leaderboard", heading: "Climb the field" })
    await page.evaluate(async () => {
      await Promise.all([...document.images].map(img => img.decode().catch(() => {})))
    })
    await expect(page.locator(".leaderboardPodium")).toBeVisible()
    await page.screenshot({ path: path.join(out, `${phase}-page-${name}.png`), animations: "disabled" })
    await page.evaluate(() => document.querySelectorAll("body *").forEach(el => { if (getComputedStyle(el).position === "fixed") el.style.visibility = "hidden" }))
    await page.locator(".leaderboardPodium").screenshot({ path: path.join(out, `${phase}-podium-${name}.png`), animations: "disabled" })
    await page.locator(".leaderboardStandingPanel").first().screenshot({ path: path.join(out, `${phase}-standing-${name}.png`), animations: "disabled" })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    // each podium column's text stays inside its column and the columns do not overlap
    const bad = await page.evaluate(() => {
      const players = [...document.querySelectorAll(".leaderboardPodiumPlayer")].sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left)
      const boxes = players.map(p => p.getBoundingClientRect())
      const issues = []
      players.forEach((p, i) => {
        p.querySelectorAll("strong, .leaderboardPodiumTier, .leaderboardPodiumRating").forEach(el => {
          const r = el.getBoundingClientRect()
          if (r.left < boxes[i].left - 1 || r.right > boxes[i].right + 1) issues.push(`${p.className} ${el.className} escapes column`)
          if (el.scrollWidth > el.clientWidth + 1 && !el.matches("strong")) issues.push(`${el.className} clipped`)
        })
        if (i > 0 && boxes[i].left < boxes[i - 1].right - 1) issues.push("columns overlap")
      })
      return issues
    })
    expect(bad).toEqual([])
  })
}
