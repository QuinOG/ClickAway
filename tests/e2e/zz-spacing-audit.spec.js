// Spacing audit against the 8px / 4px grid (Material spacing methods as a guideline).
// AUDIT_OUT=<file.json> npx playwright test tests/e2e/zz-spacing-audit.spec.js --workers=1
import fs from "node:fs"
import { test } from "@playwright/test"
import { AUTHENTICATED_ROUTES, gotoRoute, installApiMocks } from "./fixtures.js"

const OUT = process.env.AUDIT_OUT || "spacing-audit.json"

function auditPage() {
  const root = document.querySelector(".mainContent") || document.body
  const label = (el) => {
    const cls = [...el.classList].filter((c) => !/^is[A-Z]|^tone-|^slot-|^count-/.test(c)).slice(0, 2).join(".")
    const text = (el.innerText || el.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 28)
    return `${el.tagName.toLowerCase()}${cls ? "." + cls : ""}${text ? ` "${text}"` : ""}`
  }
  const visible = (el) => {
    const r = el.getBoundingClientRect(); const s = getComputedStyle(el)
    return r.width > 4 && r.height > 4 && s.visibility !== "hidden" && s.display !== "none" && s.position !== "absolute" && s.position !== "fixed" && Number(s.opacity) > 0.05
  }
  const offGrid = (v) => Math.round(v) % 4 !== 0
  const issues = { gapsOffGrid: [], unevenGaps: [], paddingOffGrid: [], edgeNearMiss: [], smallTargets: [], tightTargets: [] }
  const containers = [...root.querySelectorAll("*")].filter((el) => el.children.length >= 2 && visible(el) && el.getBoundingClientRect().width > 120)
  for (const c of containers) {
    const kids = [...c.children].filter(visible)
    if (kids.length < 2) continue
    const rects = kids.map((k) => k.getBoundingClientRect())
    // vertical stack gaps (children laid out top-to-bottom, overlapping horizontally)
    const vGaps = []
    for (let i = 1; i < rects.length; i++) {
      const a = rects[i - 1], b = rects[i]
      if (b.top >= a.bottom - 1 && Math.min(a.right, b.right) - Math.max(a.left, b.left) > 20) vGaps.push(Math.round(b.top - a.bottom))
    }
    const hGaps = []
    for (let i = 1; i < rects.length; i++) {
      const a = rects[i - 1], b = rects[i]
      if (b.left >= a.right - 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 10) hGaps.push(Math.round(b.left - a.right))
    }
    for (const [dir, gaps] of [["v", vGaps], ["h", hGaps]]) {
      const real = gaps.filter((g) => g > 0 && g < 120)
      const bad = real.filter(offGrid)
      if (bad.length) issues.gapsOffGrid.push({ el: label(c), dir, gaps: real })
      if (real.length >= 2 && Math.max(...real) - Math.min(...real) >= 6 && Math.max(...real) <= 64) issues.unevenGaps.push({ el: label(c), dir, gaps: real })
    }
    // edge near-misses between siblings stacked vertically (should share a keyline)
    const lefts = rects.filter((r, i) => vGaps.length).map((r) => Math.round(r.left))
    for (let i = 0; i < lefts.length; i++) for (let j = i + 1; j < lefts.length; j++) {
      const d = Math.abs(lefts[i] - lefts[j])
      if (d >= 2 && d <= 7) { issues.edgeNearMiss.push({ el: label(c), a: label(kids[i]), b: label(kids[j]), dx: d }); i = lefts.length; break }
    }
  }
  const boxes = [...root.querySelectorAll("section, article, aside, [class*='Card'], [class*='Panel'], [class*='panel'], [class*='card']")].filter(visible)
  for (const b of boxes) {
    const s = getComputedStyle(b)
    const pads = [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft].map(parseFloat)
    if (pads.some((p) => p > 0 && offGrid(p))) issues.paddingOffGrid.push({ el: label(b), pad: pads.map(Math.round) })
  }
  const targets = [...root.querySelectorAll("button, a[href], input, select, [role='tab'], [role='button']")].filter(visible)
  const trs = targets.map((t) => t.getBoundingClientRect())
  targets.forEach((t, i) => {
    const r = trs[i]
    if (r.height < 40 || r.width < 40) issues.smallTargets.push({ el: label(t), w: Math.round(r.width), h: Math.round(r.height) })
    for (let j = i + 1; j < targets.length; j++) {
      const o = trs[j]
      const hGap = Math.max(o.left - r.right, r.left - o.right), vGap = Math.max(o.top - r.bottom, r.top - o.bottom)
      const gap = Math.max(hGap, vGap)
      if (gap >= 0 && gap < 8 && !t.contains(targets[j]) && !targets[j].contains(t)) issues.tightTargets.push({ a: label(t), b: label(targets[j]), gap: Math.round(gap) })
    }
  })
  for (const k of Object.keys(issues)) issues[k] = issues[k].slice(0, 40)
  const frame = [...root.querySelectorAll("section, article, div")].find((el) => visible(el) && el.getBoundingClientRect().width > 700)
  if (frame) {
    const fr = frame.getBoundingClientRect(), fs = getComputedStyle(frame)
    const firstKids = [...frame.children].filter(visible).slice(0, 4).map((k) => { const r = k.getBoundingClientRect(); return { el: label(k), dx: Math.round(r.left - fr.left), dy: Math.round(r.top - fr.top), w: Math.round(r.width) } })
    issues.frame = { el: label(frame), x: Math.round(fr.left), y: Math.round(fr.top), w: Math.round(fr.width), pad: [fs.paddingTop, fs.paddingRight, fs.paddingBottom, fs.paddingLeft].map((v) => Math.round(parseFloat(v))), firstKids }
  }
  return issues
}

test("spacing audit", async ({ browser }) => {
  test.setTimeout(300_000)
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark", baseURL: process.env.SHOT_BASE_URL || "http://127.0.0.1:4173" })
  const page = await context.newPage()
  await page.clock.install({ time: new Date("2026-07-12T16:00:00.000Z") })
  await installApiMocks(page, {})
  const report = {}
  for (const r of AUTHENTICATED_ROUTES) {
    try { await gotoRoute(page, r); await page.waitForTimeout(900); report[r.id] = await page.evaluate(auditPage) } catch (e) { report[r.id] = { error: e.message.split("\n")[0] } }
  }
  const anon = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark", baseURL: process.env.SHOT_BASE_URL || "http://127.0.0.1:4173" })).newPage()
  for (const path of ["/login", "/signup"]) { await anon.goto(path); await anon.waitForTimeout(1200); report[path.slice(1)] = await anon.evaluate(auditPage) }
  fs.writeFileSync(OUT, JSON.stringify(report, null, 1))
})
