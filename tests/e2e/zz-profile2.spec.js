import { test, expect } from '@playwright/test'
import { prepareDeterministicPage, gotoRoute, sessionFixture } from './fixtures.js'
const out = 'C:/Users/quinl/AppData/Local/Temp/claude/8f5fc2fbe33c61b7/52a8d379-0918-4105-90fd-d3f7d1db2f63/scratchpad/artpass/profile'
const phase = process.env.PROFILE_PHASE || 'after'
async function shot(page, name) {
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.allSettled(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished))
  })
  await page.screenshot({ path: `${out}/${phase}-${name}.png` })
}
for (const [width,height] of [[1440,1000],[390,844],[320,844],[768,1024],[1280,720]]) {
 test(`profile complete states ${width}`, async ({page}) => {
  test.setTimeout(180000)
  await page.setViewportSize({width,height})
  await prepareDeterministicPage(page)
  await gotoRoute(page, {path:'/profile',heading:'Vector'})
  await shot(page, `${width}-top`)
  const scroll = await page.evaluate(() => {
    const el = [...document.querySelectorAll('*')].filter(e => e.scrollHeight > e.clientHeight+100 && /auto|scroll/.test(getComputedStyle(e).overflowY)).sort((a,b)=>b.clientHeight-a.clientHeight)[0] || document.scrollingElement
    el.setAttribute('data-profile-scroll','true')
    return {height:el.clientHeight,total:el.scrollHeight}
  })
  for (let y=Math.round(scroll.height*.75),i=1;y<scroll.total;y+=Math.round(scroll.height*.75),i++) {
    await page.locator('[data-profile-scroll]').evaluate((el,y)=>el.scrollTop=y,y)
    await shot(page,`${width}-scroll-${i}`)
  }
  if (width===768 || width===1280) return
  for (const tab of await page.getByRole('tab').all()) {
    await tab.click()
    await page.locator('.profileAchievementsSection').scrollIntoViewIfNeeded()
    const label=(await tab.textContent()).trim()
    await shot(page,`${width}-${label}`)
    const next=page.getByRole('button',{name:'View next achievement page'})
    let i=1
    while(await next.count() && await next.isEnabled()) {
      await next.focus(); await next.press('Enter')
      await shot(page,`${width}-${label}-${++i}`)
    }
  }
  await page.getByRole('tab',{name:'Rounds',exact:true}).hover()
  await shot(page,`${width}-hover`)
  await page.getByRole('tab',{name:'Rounds',exact:true}).focus()
  await shot(page,`${width}-focus`)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  await page.locator('[data-profile-scroll]').evaluate(el=>el.scrollTop=0)
  await page.locator('.shellIdentityButton').click()
  await expect(page.locator('.shellIdentityPass')).toBeVisible()
  await shot(page,`${width}-identity-pass`)
 })
}
for (const width of [1440,390,320]) {
 test(`profile new player ${width}`,async({page})=>{
   await page.setViewportSize({width,height:844})
   await prepareDeterministicPage(page)
   await page.route('**/api/auth/me',r=>r.fulfill({json:{...sessionFixture,progress:{...sessionFixture.progress,coins:0,roundHistory:[],totalRoundCount:0,lifetimeStats:{},loadoutStats:[],unlockedAchievementIds:[],levelXp:0,rankMmr:0,rankedState:{placementMatchesPlayed:0}}}}))
   await gotoRoute(page,{path:'/profile',heading:'Vector'})
   await shot(page,`${width}-new-player`)
   await expect(page.getByRole('heading',{name:'Attributes'})).toBeVisible()
   for (const [name,selector] of [['attributes','.profileAttributes'],['form','.profileFormPanel'],['achievements','.profileAchievementsSection']]) {
     await page.locator(selector).scrollIntoViewIfNeeded()
     await shot(page,`${width}-new-player-${name}`)
   }
   expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
 })
}
