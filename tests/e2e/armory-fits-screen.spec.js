// The Armory's panels and its Install action must fit on screen from phones to wide desktops.
import { expect, test } from "@playwright/test"
import { AUTHENTICATED_ROUTES, gotoRoute, installApiMocks } from "./fixtures.js"

const armory = AUTHENTICATED_ROUTES.find((route) => route.id === "armory")

for (const [width, height] of [[320, 740], [390, 844], [768, 1024], [900, 700], [1024, 700], [1100, 760], [1180, 760], [1259, 760], [1280, 720], [1366, 768], [1440, 900]]) {
  test(`Armory fits at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await installApiMocks(page)
    await gotoRoute(page, armory)

    const report = await page.evaluate(() => {
      const viewport = document.documentElement.clientWidth
      const box = (selector) => document.querySelector(selector)?.getBoundingClientRect()
      const install = box(".armoryPartFeatureInstall")
      const card = box(".armoryStepCard")
      const panels = [".armoryRail", ".armoryStage", ".armoryWorkspace", ".armoryCommandBar"]
        .map((selector) => [selector, box(selector)])
        .filter(([, rect]) => rect && rect.width > 0)
        .map(([selector, rect]) => ({ selector, left: rect.left, right: rect.right, width: rect.width }))
      return { viewport, install: install && { left: install.left, right: install.right }, card: card && { left: card.left, right: card.right }, panels }
    })

    expect(report.install, "Install action is rendered").toBeTruthy()
    expect(report.install.right, "Install action fits on screen").toBeLessThanOrEqual(report.viewport + 1)
    expect(report.install.left, "Install action fits on screen").toBeGreaterThanOrEqual(-1)
    expect(report.install.right, "Install action isn't clipped by its card").toBeLessThanOrEqual(report.card.right + 1)
    for (const panel of report.panels) {
      expect(panel.right, `${panel.selector} fits on screen`).toBeLessThanOrEqual(report.viewport + 1)
    }
    if (width <= 940) {
      // Narrow screens stack the Armory into one column that uses the screen width.
      for (const panel of report.panels) expect(panel.width, `${panel.selector} uses the screen width`).toBeGreaterThan(report.viewport * 0.8)
    }
  })
}
