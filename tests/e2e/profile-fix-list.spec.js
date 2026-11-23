import { test, expect } from '@playwright/test'
import { prepareDeterministicPage, sessionFixture } from './fixtures.js'
const phase = process.env.PROFILE_FIX_SHOTS || 'after'
for (const [device, width, height] of [['desktop', 1440, 1000], ['phone', 390, 844]]) {
  for (const username of ['ABCDEFGHIJKLMNOPQRSTUVWXYZ1234', 'ABCDEFGHIJKLMN OPQRSTUVWXYZ123']) {
    test(`profile and pass legacy name ${device} ${username.includes(' ') ? 'spaced' : 'unbroken'}`, async ({ page }) => {
      test.setTimeout(120_000)
      await page.setViewportSize({ width, height })
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await prepareDeterministicPage(page)
      await page.route('**/api/auth/me', route => route.fulfill({ json: { ...sessionFixture, user: { ...sessionFixture.user, username } } }))
      await page.goto('/profile')
      await expect(page.locator('#profile-player-name')).toBeVisible({ timeout: 90_000 })
      await page.evaluate(async () => document.fonts.ready)
      const shots = 'test-results/profile-fix-list'
      if (!username.includes(' ')) {
        await page.screenshot({ path: `${shots}/profile-${phase}-${device}.png` })
        if (device === 'desktop') {
          await page.locator('.profileAchievementsSection').scrollIntoViewIfNeeded()
          await page.screenshot({ path: `${shots}/profile-achievements-${phase}-desktop.png` })
          await page.evaluate(() => scrollTo(0,0))
        }
      }
      if (phase !== 'before') {
        await expect(page.getByRole('link', { name: 'View milestones' })).toHaveCount(0)
        await expect(page.locator('.profileAttributeEmblem')).toHaveCount(0)
        expect(await page.locator('#profile-player-name').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
        await expect(page.getByRole('progressbar', { name: 'Nearest achievement' })).toBeVisible()
      }
      await page.locator('.shellIdentityButton').click()
      await expect(page.locator('.shellIdentityPass')).toBeVisible()
      if (!username.includes(' ')) await page.screenshot({ path: `${shots}/pass-longname-${phase}-${device}.png` })
      if (phase !== 'before') {
        await expect(page.locator('.shellPassSeal')).toHaveCount(0)
        expect(await page.locator('.shellPassName').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
        const box = await page.locator('.shellPassName').boundingBox()
        expect(box.x + box.width).toBeLessThanOrEqual(width)
      }
    })
  }
}
