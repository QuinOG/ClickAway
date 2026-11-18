import { expect, test } from "@playwright/test"
import { prepareDeterministicPage, gotoRoute } from "./fixtures.js"

const out = "C:/Users/quinl/AppData/Local/Temp/claude/8f5fc2fbe33c61b7/52a8d379-0918-4105-90fd-d3f7d1db2f63/scratchpad/artpass/duels-int"
for (const [name, width, height] of [["desktop", 1440, 900], ["phone", 390, 844], ["narrow", 320, 844]]) {
  test(`duels ticket ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await prepareDeterministicPage(page)
    await gotoRoute(page, { path: "/challenges", heading: "Duel command" })
    const ticket = page.locator(".challengeCard").first()
    await expect(ticket).toBeVisible()
    await ticket.scrollIntoViewIfNeeded()
    await page.waitForTimeout(1100)
    await expect(page.locator('.duelPage')).toHaveCSS('opacity', '1')
    await page.evaluate(async () => {
      await Promise.all(Array.from(document.images).map((image) => image.decode().catch(() => {})))
    })
    const phase = process.env.ART_PHASE || "after"
    await ticket.screenshot({ path: `${out}/${phase}-${name}-ticket.png`, animations: "disabled" })
    await page.screenshot({ path: `${out}/${phase}-${name}-page.png`, fullPage: true, animations: "disabled" })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (phase === "after") {
      const action = name === "narrow" ? "Decline" : "Accept"
      await ticket.getByRole("button", { name: action, exact: true }).click()
      await expect(ticket).toHaveAttribute("data-status", action === "Accept" ? "accepted" : "declined")
      if (action === "Accept") {
        await ticket.getByRole("button", { name: "Race Ghost" }).click()
        await expect(page).toHaveURL(/\/game\?challengeId=41&replayId=101/)
      }
    }
  })
}
