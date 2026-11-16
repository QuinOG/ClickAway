import path from "node:path"
import { expect, test } from "@playwright/test"
import { gotoRoute, prepareDeterministicPage } from "./fixtures.js"

test("Shop layout and requested comparison captures", async ({ page }) => {
  test.skip(!process.env.SHOP_CAPTURE, "Explicit comparison capture only")
  test.setTimeout(120_000)
  const phase = process.env.SHOP_CAPTURE
  const root = process.env.SHOP_SHOTS || "docs/feature-improvement/shots/fix-list"
  await prepareDeterministicPage(page)
  for (const width of [1440, 1280, 390]) {
    const size = width === 390 ? "phone" : "desktop"
    await page.setViewportSize({ width, height: 1000 })
    await gotoRoute(page, { path: "/shop", heading: "Cosmetic shop" })
    await page.evaluate(async () => Promise.all([...document.images].map(img => img.decode().catch(() => {}))))
    await expect(page.locator("html")).toHaveJSProperty("scrollWidth", width)
    if (width === 1280) await page.screenshot({ path: "test-results/playwright/shop-1280.png" })
    if (width !== 1280) await page.screenshot({ path: path.join(root, `shop-preview-${phase}-${size}.png`) })
    await page.getByRole("tab", { name: /Button Skins/ }).click()
    await page.locator(".shopTabRail").scrollIntoViewIfNeeded()
    await page.addStyleTag({ content: ".appShell, .mainContent { height: auto !important; overflow: visible !important; } body { overflow: auto !important; }" })
    await page.evaluate(() => { document.querySelector(".mainContent").scrollTop = 0; window.scrollTo(0, 0) })
    await expect(page.locator(".routeOutlet")).toHaveCSS("opacity", "1")
    if (width === 1440) await page.screenshot({ path: path.join(root, `shop-skins-${phase}-desktop.png`), fullPage: true })
    await page.getByRole("tab", { name: /Arena Themes/ }).click()
    await page.locator("[data-shop-family]").scrollIntoViewIfNeeded()
    await page.evaluate(() => { document.querySelector(".mainContent").scrollTop = 0; window.scrollTo(0, 0) })
    await expect(page.locator(".routeOutlet")).toHaveCSS("opacity", "1")
    if (width !== 1280) await page.screenshot({ path: path.join(root, `shop-themes-${phase}-${size}.png`), fullPage: true })
    await expect(page.locator("html")).toHaveJSProperty("scrollWidth", width)
  }
})
