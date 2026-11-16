import { test, expect } from '@playwright/test'
import { AUTHENTICATED_ROUTES, gotoRoute, prepareDeterministicPage } from './fixtures.js'

function clippedText(el) {
  const range = document.createRange()
  range.selectNodeContents(el)
  const text = range.getBoundingClientRect()
  const cuts = []
  for (let node = el; node; node = node.parentElement) {
    const style = getComputedStyle(node)
    if (/(auto|scroll)/.test(style.overflowX + style.overflowY)) break
    const box = node.getBoundingClientRect()
    if (/(hidden|clip)/.test(style.overflowX) && (text.left < box.left - 2 || text.right > box.right + 2)) cuts.push(node.className)
    if (/(hidden|clip)/.test(style.overflowY) && (text.top < box.top - 2 || text.bottom > box.bottom + 2)) cuts.push(node.className)
  }
  return cuts
}

for (const [width, height] of [[320, 640], [360, 740], [390, 844], [1280, 800]]) {
  test(`header wordmark is readable at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await prepareDeterministicPage(page)
    await gotoRoute(page, AUTHENTICATED_ROUTES[0])
    const brand = page.locator('.brand')
    await expect(brand).toBeVisible()
    const wordmark = await brand.boundingBox()
    const chip = await page.locator('.shellIdentityButton').boundingBox()
    expect(wordmark.x + wordmark.width).toBeLessThanOrEqual(chip.x)
    const clipping = await brand.evaluate(clippedText)
    const phase = process.env.CLIPPING_SHOTS
    if (phase && width === 360) await page.screenshot({ path: `docs/feature-improvement/shots/cleanup/${phase}-phone-branding.png` })
    if (phase && width === 1280) await page.screenshot({ path: `test-results/${phase}-desktop-branding.png` })
    expect(clipping).toEqual([])
    if (width < 400) {
      const brief = page.locator('.lobbyModeBrief')
      await brief.scrollIntoViewIfNeeded()
      if (process.env.LOBBY_SHOTS && width === 320) await page.screenshot({ path: `docs/feature-improvement/shots/cleanup/${process.env.LOBBY_SHOTS}-phone-lobby.png` })
      for (const label of await brief.locator('small, b').all()) expect(await label.evaluate(clippedText)).toEqual([])
    }
  })
}

for (const [width, height] of [[320, 640], [360, 740], [390, 844], [1280, 800]]) {
  for (const area of ['armory', 'round']) {
    test(`${area} text fits at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height })
      await prepareDeterministicPage(page)
      await gotoRoute(page, AUTHENTICATED_ROUTES.find(route => route.id === (area === 'round' ? 'play' : area)))
      if (area === 'round') {
        await page.clock.install()
        await page.locator('.arenaLobbyStart').click()
        await page.clock.runFor(3900)
        for (let i = 0; i < 8; i++) await page.locator('.arena .bigCircleButton').first().click({ force: true })
      }
      const target = page.locator(area === 'round' ? '.gameHud' : '.armoryPartFeature')
      await target.scrollIntoViewIfNeeded()
      const phase = process.env.CLIPPING_SHOTS
      if (phase && width === 360) await page.screenshot({ path: `docs/feature-improvement/shots/cleanup/${phase}-phone-${area}.png` })
      if (phase && width === 320) await page.screenshot({ path: `docs/feature-improvement/shots/cleanup/${phase}-phone-${area}-320.png` })
      const labels = page.locator(area === 'round'
        ? '.hudStreakLabel, .hudStreakValue'
        : width < 400 ? '.armoryPartFeatureInstall, .armoryPartCard.isLocked .armoryStateEmblemLabel' : '.armoryPartFeatureInstall')
      for (const label of await labels.all()) expect(await label.evaluate(clippedText)).toEqual([])
    })
  }
}
