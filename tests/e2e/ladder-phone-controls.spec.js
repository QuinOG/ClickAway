// Feature trial 004: every Ladder control must be on screen and usable on phones.
import { expect, test } from "@playwright/test"
import { AUTHENTICATED_ROUTES, gotoRoute, installApiMocks } from "./fixtures.js"

const ladder = AUTHENTICATED_ROUTES.find((route) => route.id === "ladder")

for (const width of [320, 390]) {
  test(`Ladder controls fit and work at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await installApiMocks(page)
    await gotoRoute(page, ladder)

    const controls = page.locator(".leaderboardControls").locator("button, input")
    const boxes = await controls.evaluateAll((elements) => elements.map((element) => {
      const box = element.getBoundingClientRect()
      return { name: element.getAttribute("aria-label") || element.textContent.trim(), left: box.left, right: box.right, height: box.height }
    }))
    expect(boxes.length).toBeGreaterThanOrEqual(9)
    for (const box of boxes) {
      expect(box.left, `${box.name} left edge`).toBeGreaterThanOrEqual(0)
      expect(box.right, `${box.name} right edge`).toBeLessThanOrEqual(width)
      expect(box.height, `${box.name} tap height`).toBeGreaterThanOrEqual(36)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)

    // Duel links on rows (trial 003) must also be comfortable to tap.
    const duelHeights = await page.locator(".ladderPlateDuel").evaluateAll((links) => links.map((link) => link.getBoundingClientRect().height))
    expect(duelHeights.length).toBeGreaterThan(0)
    for (const height of duelHeights) expect(height, "Duel link tap height").toBeGreaterThanOrEqual(40)

    // A player can reach their own spot and change the board without scrolling sideways.
    await page.getByRole("button", { name: "Around Me" }).click()
    await expect(page.getByRole("button", { name: "Around Me" })).toHaveAttribute("aria-pressed", "true")
    await page.getByRole("tab", { name: "Reaction" }).click()
    await expect(page.getByRole("tab", { name: "Reaction" })).toHaveAttribute("aria-selected", "true")
  })
}
