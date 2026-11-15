// Every mode's lobby fits phones and tablets: its extra panel (Casual record,
// Ranked status, Practice lab) sits in the content column at full width, and
// the panel, daily goals line, double-XP note and Start don't overlap.
// Ranked's panel used to be squeezed into the empty stage column and Practice's
// drawer to a 2px-tall row, hiding the drills.
import { expect, test } from "@playwright/test"
import { AUTHENTICATED_ROUTES, gotoRoute, installApiMocks } from "./fixtures.js"

const PANEL_BY_MODE = { Casual: ".lobbyModeRecord", Ranked: ".rankedPreflight", Practice: ".practiceDrawer" }

for (const [width, height] of [[390, 844], [360, 640], [820, 1180]]) {
  for (const mode of Object.keys(PANEL_BY_MODE)) {
    test(`${mode} lobby fits ${width}x${height}`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" })
      const page = await context.newPage()
      await installApiMocks(page)
      await gotoRoute(page, AUTHENTICATED_ROUTES.find((route) => route.id === "play"))
      await page.locator(".lobbyModeChoice", { hasText: mode }).first().click()
      await expect(page.locator(PANEL_BY_MODE[mode])).toBeVisible()

      const layout = await page.evaluate((panelSelector) => {
        const box = (selector) => {
          const element = document.querySelector(selector)
          if (!element || getComputedStyle(element).display === "none") return null
          const rect = element.getBoundingClientRect()
          return { top: rect.top, bottom: rect.bottom, left: rect.left, width: rect.width }
        }
        return {
          start: box(".arenaLobbyStart"),
          stack: [box(panelSelector), box(".lobbyDailyGoalsSummary"), box(".arenaLobbyDailyBonus"), box(".arenaLobbyStart")].filter(Boolean),
          pageWidth: document.documentElement.scrollWidth,
        }
      }, PANEL_BY_MODE[mode])

      expect(layout.pageWidth).toBeLessThanOrEqual(width)
      const [panel] = layout.stack
      expect(panel.width).toBeGreaterThanOrEqual(layout.start.width - 4)
      expect(Math.abs(panel.left - layout.start.left)).toBeLessThanOrEqual(4)
      for (let index = 1; index < layout.stack.length; index += 1) {
        expect(layout.stack[index].top).toBeGreaterThanOrEqual(layout.stack[index - 1].bottom - 1)
      }
      await context.close()
    })
  }
}

// Laptop screens: Start is in view and clickable without scrolling, in every
// mode. It used to sit up to 144px below the fold at 1280x720 with Ranked.
for (const [width, height] of [[1280, 720], [1366, 768], [1024, 768], [1280, 800], [1440, 900]]) {
  for (const mode of Object.keys(PANEL_BY_MODE)) {
    test(`${mode} Start is in view at ${width}x${height}`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" })
      const page = await context.newPage()
      await installApiMocks(page)
      await gotoRoute(page, AUTHENTICATED_ROUTES.find((route) => route.id === "play"))
      await page.locator(".lobbyModeChoice", { hasText: mode }).first().click()
      const start = page.locator(".arenaLobbyStart")
      const box = await start.boundingBox()
      expect(box.y + box.height).toBeLessThanOrEqual(height)
      const isOnTop = await start.evaluate((element) => {
        const rect = element.getBoundingClientRect()
        return element.contains(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2))
      })
      expect(isOnTop).toBe(true)
      await context.close()
    })
  }
}
