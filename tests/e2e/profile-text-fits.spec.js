import { test, expect } from '@playwright/test'
import { AUTHENTICATED_ROUTES, gotoRoute, prepareDeterministicPage } from './fixtures.js'

for (const [width, height] of [[320, 640], [360, 740], [390, 844]]) {
  test(`Profile text fits at ${width}x${height}`, async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width, height })
    await prepareDeterministicPage(page)
    await gotoRoute(page, AUTHENTICATED_ROUTES.find(route => route.id === 'profile'))
    await page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; }' })
    const phase = process.env.PROFILE_SHOTS || 'after'
    if (process.env.PROFILE_SHOTS) {
      for (const [section, selector] of [['card', '.profileCompetitorCard'], ['attributes', '.profileAttributes'], ['form', '.profileFormPanel'], ['achievements', '.profileAchievementsSection']]) {
        await page.locator(selector).scrollIntoViewIfNeeded()
        await page.screenshot({ path: `docs/feature-improvement/shots/cleanup/${phase}-phone-profile-${width}x${height}-${section}.png` })
      }
    }
    async function assertTextFits() {
      const clipped = await page.locator('.profilePageCenter').evaluate(root =>
      [...root.querySelectorAll('*')].filter(el => el.getBoundingClientRect().width > 0 && [...el.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim()))
        .filter(el => {
          if (el.scrollWidth > el.clientWidth) return true
          if (/(hidden|clip)/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 1) return true
          const range = document.createRange()
          range.selectNodeContents(el)
          const text = range.getBoundingClientRect()
          for (let parent = el.parentElement; parent && root.contains(parent); parent = parent.parentElement) {
            const style = getComputedStyle(parent)
            if (/(auto|scroll)/.test(style.overflowX + style.overflowY)) break
            const box = parent.getBoundingClientRect()
            if (/(hidden|clip)/.test(style.overflowX) && (text.left < box.left - 1 || text.right > box.right + 1)) return true
            if (/(hidden|clip)/.test(style.overflowY) && (text.top < box.top - 1 || text.bottom > box.bottom + 1)) return true
          }
          return false
        })
        .map(el => ({ element: el.className, text: el.textContent, width: el.clientWidth, scroll: el.scrollWidth, height: el.clientHeight, scrollHeight: el.scrollHeight })))
      expect(clipped).toEqual([])
    }
    await assertTextFits()
    for (const tab of await page.getByRole('tab').all()) {
      await tab.click()
      await expect(tab).toHaveAttribute('aria-selected', 'true')
      await assertTextFits()
      const next = page.getByRole('button', { name: 'View next achievement page' })
      for (let index = 0; index < 20 && await next.count() && await next.isEnabled(); index++) {
        const label = page.locator('.achievementsPageLabel')
        const previousPage = await label.textContent()
        // Exercise keyboard paging without hover feedback moving the arrow.
        await next.focus()
        await next.press('Enter')
        await expect(label).not.toHaveText(previousPage)
        await assertTextFits()
      }
      if (await next.count()) await expect(next).toBeDisabled()
    }
  })
}

test('Profile keeps its desktop geometry at 1280x800', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await prepareDeterministicPage(page)
  await gotoRoute(page, AUTHENTICATED_ROUTES.find(route => route.id === 'profile'))
  const result = await page.evaluate(() => {
    const geometry = () => [...document.querySelectorAll('.profilePageCenter *')].map(el => {
      const { x, y, width, height } = el.getBoundingClientRect()
      return { x, y, width, height }
    })
    const before = geometry()
    let removed = 0
    for (const sheet of document.styleSheets) {
      for (let index = sheet.cssRules.length - 1; index >= 0; index--) {
        const rule = sheet.cssRules[index]
        if (rule instanceof CSSMediaRule && rule.conditionText === '(max-width: 600px)' && rule.cssText.includes('.profilePageCenter .profileCompetitorCard .profilePlayerName')) {
          sheet.deleteRule(index)
          removed++
        }
      }
    }
    return { before, after: geometry(), removed }
  })
  expect(result.removed).toBe(1)
  expect(result.after).toEqual(result.before)
})
