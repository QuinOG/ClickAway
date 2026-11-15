import { test, expect } from '@playwright/test'
import { AUTHENTICATED_ROUTES, gotoRoute, prepareDeterministicPage } from './fixtures.js'
const phase = process.env.CLEANUP_SHOTS || 'after'
for (const [name, width, height] of [['desktop',1280,800],['phone',360,800]]) {
 test(`cleanup help and ranks ${name}`, async ({ page }) => {
  test.setTimeout(90000)
  await page.setViewportSize({width,height})
  await prepareDeterministicPage(page)
  await gotoRoute(page, AUTHENTICATED_ROUTES.find(r=>r.id==='help'))
  for (const summary of await page.locator('.helpRulebook > summary').all()) {
   await summary.click()
   await expect(summary.locator('..')).toHaveAttribute('open','')
  }
  await page.locator('.helpRulebook > summary').first().scrollIntoViewIfNeeded()
  await page.screenshot({path:`docs/feature-improvement/shots/cleanup/${phase}-help-expanded-${name}.png`})
  await page.locator('.rankTierGrid').scrollIntoViewIfNeeded()
  await page.screenshot({path:`docs/feature-improvement/shots/cleanup/${phase}-help-ranks-${name}.png`})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  if (phase !== 'before') {
   expect(await page.locator('.helpRulebook').first().evaluate(el=>el.clientWidth)).toBeGreaterThan(width < 600 ? 240 : 600)
   for (const card of await page.locator('.rankTierCard').all()) {
    expect(await card.evaluate(el=>el.scrollWidth <= el.clientWidth + 1)).toBe(true)
   }
   for (const img of await page.locator('.rankTierEmblem').all()) {
    await expect(img).toHaveAttribute('src', /\/art\/ranks\/.*\.png$/)
    await expect.poll(()=>img.evaluate(el=>el.complete && el.naturalWidth > 0)).toBe(true)
   }
  }
  await gotoRoute(page, AUTHENTICATED_ROUTES.find(r=>r.id==='ladder'))
  await page.screenshot({path:`docs/feature-improvement/shots/cleanup/${phase}-ladder-${name}.png`})
  await page.locator('.ladderPlate').first().scrollIntoViewIfNeeded()
  await page.screenshot({path:`docs/feature-improvement/shots/cleanup/${phase}-ladder-rows-${name}.png`})
  await gotoRoute(page, AUTHENTICATED_ROUTES.find(r=>r.id==='profile'))
  await page.locator('.shellIdentityButton').click()
  await expect(page.locator('.shellIdentityPass')).toBeVisible()
  await page.screenshot({path:`docs/feature-improvement/shots/cleanup/${phase}-pass-${name}.png`})
 })
}
