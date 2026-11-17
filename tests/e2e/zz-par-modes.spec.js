import { test, expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { prepareDeterministicPage, gotoRoute } from './fixtures.js'
test.setTimeout(120_000)
const out = 'C:/Users/quinl/AppData/Local/Temp/claude/8f5fc2fbe33c61b7/52a8d379-0918-4105-90fd-d3f7d1db2f63/scratchpad/par1/modes'
for (const [name, viewport] of [['desktop', {width:1440,height:900}], ['phone', {width:390,height:844}]]) test(name, async ({page}) => {
 await mkdir(out,{recursive:true}); await page.setViewportSize(viewport); await prepareDeterministicPage(page); await gotoRoute(page,{path:'/armory',heading:'Armory'});
 await page.getByRole('button',{name:'Compare Modes'}).click();
 await page.screenshot({path:`${out}/${process.env.PHASE || 'before'}-compare-modes-${name}.png`,animations:'disabled'});
 await page.getByRole('tab',{name:'Mode Matrix'}).click();
 await page.screenshot({path:`${out}/${process.env.PHASE || 'before'}-mode-matrix-${name}.png`,animations:'disabled'});
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

