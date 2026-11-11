import { test } from "@playwright/test"
import { AUTHENTICATED_ROUTES, gotoRoute, installApiMocks } from "./fixtures.js"
test("probe", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await installApiMocks(page, {})
  const out = {}
  for (const id of ["shop","profile","ladder","duels","history","help"]) {
    await gotoRoute(page, AUTHENTICATED_ROUTES.find(r=>r.id===id))
    out[id] = await page.evaluate(() => Array.from(document.querySelectorAll(".mainContent *")).filter(e => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return r.width > 260 && r.height > 80 && parseFloat(s.borderRadius) >= 8 && (parseFloat(s.borderTopWidth) >= 1 || s.boxShadow !== "none") && s.backgroundImage + s.backgroundColor !== "nonergba(0, 0, 0, 0)" }).map(e => (e.className.baseVal ?? e.className).split(" ")[0]))
  }
  console.log("PROBE" + JSON.stringify(out))
})
