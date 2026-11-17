import { test, expect } from "@playwright/test"
import { mkdir, unlink } from "node:fs/promises"
import path from "node:path"
import { execFileSync } from "node:child_process"
import { prepareDeterministicPage, gotoRoute } from "./fixtures.js"

const out = process.env.ART_OUT || "C:/Users/quinl/AppData/Local/Temp/claude/8f5fc2fbe33c61b7/52a8d379-0918-4105-90fd-d3f7d1db2f63/scratchpad/artpass/armory3/final"
test.setTimeout(120_000)
async function crop(page, selector, filename) {
  await page.evaluate(() => {
    window.scrollTo(0, 0)
    document.querySelectorAll("*").forEach(el => { if (el.scrollTop) el.scrollTop = 0 })
  })
  const rect = await page.locator(selector).evaluate(el => {
    const r = el.getBoundingClientRect()
    return [Math.floor(r.x + scrollX), Math.floor(r.y + scrollY), Math.ceil(r.right + scrollX), Math.ceil(r.bottom + scrollY)]
  })
  const source = path.join(out, "capture.png")
  await page.screenshot({ path: source, fullPage: true, animations: "disabled", style: `
    .mainContent.armoryMain { overflow: visible !important; height: auto !important; max-height: none !important; }
    .mobileDock { visibility: hidden !important; }
    .appShell:has(.armoryMain) { height: auto !important; overflow: visible !important; }
  ` })
  execFileSync("python", ["-c", "from PIL import Image; import sys,json; Image.open(sys.argv[1]).crop(tuple(json.loads(sys.argv[3]))).save(sys.argv[2])", source, path.join(out, filename), JSON.stringify(rect)])
  await unlink(source)
}
for (const [name, viewport] of [["desktop", { width: 1440, height: 900 }], ["phone", { width: 390, height: 844 }]]) {
  test(`armory capture ${name}`, async ({ page }) => {
    await mkdir(out, { recursive: true })
    await page.setViewportSize(viewport)
    await prepareDeterministicPage(page)
    await gotoRoute(page, { path: "/armory", heading: "Armory" })
    await page.evaluate(async () => Promise.all([...document.images].map(img => img.decode().catch(() => {}))))
    for (const slot of ["tempoCore", "powerRig", "streakLens"]) {
      await page.locator(`.armoryMachineHousing.housing-${slot}`).click()
      await expect(page.locator(".armoryMachineHousing.isSelected")).toHaveCount(1)
      await expect(page.locator(`.armoryMachineRigMount.mount-${slot}`)).toHaveClass(/isSelected/)
      for (const other of ["tempoCore", "powerRig", "streakLens"].filter(id => id !== slot)) {
        await expect(page.locator(`.armoryMachineRigMount.mount-${other}`)).toHaveCSS("box-shadow", "none")
      }
      await crop(page, ".armoryMachine", `${name}-${slot}.png`)
      if (name === "desktop") await crop(page, ".armoryWorkspace", `panel-${slot}.png`)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    }
    await page.locator(".armoryMachineHousing.housing-tempoCore").click()
    const target = page.locator(".armoryMachineTarget")
    const installedSize = await target.evaluate(el => el.getBoundingClientRect().width)
    await page.locator('[data-part-id="tempo_anchor"]').click()
    await expect(page.locator(".armoryPartFeatureName")).toHaveText("Anchor")
    await expect(page.locator(".armoryMachineAimReadout b")).toHaveText("112px")
    await expect.poll(() => target.evaluate(el => el.getBoundingClientRect().width)).toBeGreaterThan(installedSize)
    await page.screenshot({
      path: path.join(out, `${name}-full.png`), fullPage: true, animations: "disabled",
      style: `
        .mainContent.armoryMain { overflow: visible !important; height: auto !important; max-height: none !important; }
        .armoryWorkspace, .armoryStepStack { overflow: visible !important; max-height: none !important; }
        .mobileDock { visibility: hidden !important; }
        .appShell:has(.armoryMain) { height: auto !important; overflow: visible !important; }
      `,
    })
    await crop(page, ".armoryPartsShelf", `${name}-locked-cards.png`)
    await expect(page.locator(".armoryPartCard.isLocked .armoryPartBody").first()).toBeHidden()
    for (const lamp of await page.locator(".armoryMachineRackSlot").all()) {
      const shape = await lamp.evaluate(el => {
        const css = getComputedStyle(el, "::after")
        return [css.width, css.height]
      })
      expect(shape[0]).toBe(shape[1])
    }
    await expect(page.locator(".housing-tempoCore .armoryMachineHousingLabel")).toHaveText("Tempo")
    await crop(page, ".armoryWorkspace", `${name}-clicked-preview.png`)
    await page.getByRole("button", { name: "Install Anchor", exact: true }).click()
    await expect(page.locator(".housing-tempoCore .armoryMachineHousingLabel")).toHaveText("Anchor")
    await crop(page, ".armoryWorkspace", `${name}-installed.png`)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    execFileSync("python", ["-c", `from PIL import Image,ImageDraw
import sys
from pathlib import Path
p=Path(sys.argv[1]); name=sys.argv[2]
a=Image.open(p/(name+'-clicked-preview.png')); b=Image.open(p/(name+'-installed.png'))
c=Image.new('RGB',(a.width+b.width,max(a.height,b.height)+28),'#0b1322'); c.paste(a,(0,28)); c.paste(b,(a.width,28)); d=ImageDraw.Draw(c); d.text((12,8),'CLICKED PREVIEW',fill='white'); d.text((a.width+12,8),'INSTALLED',fill='white'); c.save(p/(name+'-preview-vs-installed.png'))
if name=='desktop':
 imgs=[Image.open(p/('panel-'+slot+'.png')) for slot in ['tempoCore','streakLens','powerRig']]
 c=Image.new('RGB',(sum(i.width for i in imgs),max(i.height for i in imgs)+28),'#0b1322'); d=ImageDraw.Draw(c); x=0
 for i,label in zip(imgs,['TEMPO CORE','STREAK LENS','POWER RIG']):
  c.paste(i,(x,28)); d.text((x+12,8),label,fill='white'); x+=i.width
 c.save(p/'panels-comparison.png')`, out, name])
  })
}
