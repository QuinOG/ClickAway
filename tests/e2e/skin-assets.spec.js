import { execFileSync } from 'node:child_process'
import { test, expect } from '@playwright/test'
import { prepareDeterministicPage, gotoRoute } from './fixtures.js'
for (const width of [1440,390]) test(`skin capture ${width}`, async ({page}) => {
 test.setTimeout(120000)
 if (process.env.SKIN_PHASE === 'before') {
  const base = (path) => execFileSync('git', ['show', `72f03cade5161ee043713208be6240e5111031ee:${path}`], { encoding: 'utf8' })
  await page.route('**/src/constants/shopCatalog.js*', route => route.fulfill({ contentType: 'text/javascript', body: base('src/constants/shopCatalog.js') }))
  await page.route('**/src/styles/game-play.css*', async route => {
   const response = await route.fetch(); const body = await response.text()
   await route.fulfill({ response, body: body.replace(/const __vite__css = ("(?:\\.|[^"\\])*")/, () => `const __vite__css = ${JSON.stringify(base('src/styles/game-play.css'))}`) })
  })
  await page.route('**/skins/*.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: base(`public${new URL(route.request().url()).pathname}`) }))
 }
 await page.setViewportSize({width,height:1000}); await prepareDeterministicPage(page, { progressOverrides: { equippedButtonSkinId: "skin_button" } })
 await gotoRoute(page,{path:'/game',heading:'Enter the arena'})
 await page.clock.install(); await page.getByRole('button',{name:/^Start /}).last().click(); await page.clock.runFor(4000)
 await expect(page.locator('.arena .bigCircleButton').first()).toBeVisible()
 if (process.env.SKIN_PHASE) {
  await page.screenshot({path:`docs/feature-improvement/shots/round-complete/${process.env.SKIN_PHASE || 'after'}-default-skin${width===390?'-phone':''}.png`})
 }
 if(process.env.SKIN_PHASE==='after') for(const route of [{path:'/armory',heading:'Armory'},{path:'/shop',heading:'Cosmetic shop'}]) {
 await gotoRoute(page,route); await page.screenshot({path:`docs/feature-improvement/shots/round-complete/after-${route.path.slice(1)}-skins-${width}.png`,fullPage:true})
 }
})
