// Device audit: every page and key screen across phones, tablets and laptops, measured
// for sideways overflow, clipped text, overlapping text and small touch targets.
// Run against your own dev server (another worktree's server may be on 4173):
//   AUDIT_BASE_URL=http://127.0.0.1:4174 AUDIT_DIR=<dir> npx playwright test tests/e2e/zz-device-audit.spec.js --workers=2
// Writes <dir>/audit.json and one screenshot per device and screen.
import fs from "node:fs"
import { test } from "@playwright/test"
import { AUTHENTICATED_ROUTES, gotoRoute, installApiMocks } from "./fixtures.js"

const DIR = process.env.AUDIT_DIR || "test-results/device-audit"
const BASE = process.env.AUDIT_BASE_URL || "http://127.0.0.1:4173"
const DEVICES = [
  ["phone-small", 360, 740, true], ["phone", 390, 844, true], ["phone-large", 430, 932, true],
  ["phone-landscape", 844, 390, true], ["tablet", 768, 1024, true], ["tablet-air", 820, 1180, true],
  ["tablet-landscape", 1024, 768, true], ["laptop-small", 1280, 800, false], ["laptop", 1366, 768, false],
  ["desktop", 1440, 900, false],
]
const ONLY = process.env.AUDIT_DEVICES ? process.env.AUDIT_DEVICES.split(",") : null
const PREFS = { masterVolume: 0.7, sfxVolume: 0.75, muted: true, reduceMotion: true, screenShake: false, flashes: false, haptics: false, feedbackIntensity: "standard" }
const NEW_PLAYER = { coins: 0, levelXp: 0, rankMmr: 0, roundHistory: [], totalRoundCount: 0, loadoutStats: [], lifetimeStats: {}, unlockedAchievementIds: [], buildWalkthrough: { status: "not_started" }, seenUnlockPartIds: [], rankedState: { rankSystemVersion: 4, placementMatchesPlayed: 0, placementScoreTotal: 0, demotionProtectionRounds: 0, consecutiveRankedWins: 0 } }

// Screens: authenticated routes plus states reached by an action.
const SCREENS = [
  ...AUTHENTICATED_ROUTES.map((route) => ({ id: route.id, route })),
  { id: "login", anon: true, path: "/login" },
  { id: "signup", anon: true, path: "/signup" },
  { id: "first-round-lobby", route: { path: "/game", heading: "Your first round" }, progress: NEW_PLAYER },
  { id: "live-round", route: AUTHENTICATED_ROUTES[0], action: "round" },
  { id: "results", route: AUTHENTICATED_ROUTES[0], action: "results" },
  { id: "settings", route: AUTHENTICATED_ROUTES[0], action: "settings" },
  { id: "armory-compare", route: AUTHENTICATED_ROUTES[1], click: "Compare Modes" },
  { id: "armory-spec", route: AUTHENTICATED_ROUTES[1], click: "Spec Sheet" },
  { id: "armory-unlocks", route: AUTHENTICATED_ROUTES[1], click: "Unlock Wall" },
]

function audit({ touch }) {
  const vw = document.documentElement.clientWidth
  const describe = (el) => {
    const cls = [...el.classList].slice(0, 2).join(".")
    const text = (el.innerText || el.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 32)
    return `${el.tagName.toLowerCase()}${cls ? "." + cls : ""}${text ? ` "${text}"` : ""}`
  }
  const shown = (el) => {
    const s = getComputedStyle(el); const r = el.getBoundingClientRect()
    if (!(r.width > 1 && r.height > 1 && s.visibility !== "hidden" && s.display !== "none")) return false
    if (el.closest("[aria-hidden='true'], .uiVisuallyHidden, .srOnly, [hidden]")) return false
    for (let a = el; a; a = a.parentElement) if (Number(getComputedStyle(a).opacity) < 0.05) return false
    return true
  }
  // Is this element what a player actually sees at its centre (not layered under something)?
  const onTop = (el, r) => {
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    return Boolean(hit) && (hit === el || el.contains(hit) || hit.contains(el))
  }
  const inFixed = (el) => { for (let a = el; a; a = a.parentElement) { const p = getComputedStyle(a).position; if (p === "fixed" || p === "sticky") return true } return false }
  const all = [...document.querySelectorAll("body *")].filter(shown)
  const issues = { sideways: [], clipped: [], overlaps: [], smallTargets: [] }

  // 1. Content sticking out of the screen sideways (ignores decorative art).
  for (const el of all) {
    if (el.matches("img, svg, svg *, canvas, video, picture") || getComputedStyle(el).pointerEvents === "none") continue
    if (!el.innerText?.trim() && !el.matches("button, a, input, select, textarea")) continue
    const r = el.getBoundingClientRect()
    if (r.right > vw + 2 || r.left < -2) {
      let clipped = false
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        const s = getComputedStyle(a)
        if (/(hidden|clip|auto|scroll)/.test(s.overflowX) && a.getBoundingClientRect().right <= vw + 2) { clipped = true; break }
      }
      if (!clipped) issues.sideways.push(`${describe(el)} [${Math.round(r.left)}→${Math.round(r.right)} of ${vw}]`)
    }
  }

  // 2. Text cut off by a clipping parent, or overflowing its own box without an ellipsis.
  const textEls = all.filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))
  for (const el of textEls) {
    const range = document.createRange(); range.selectNodeContents(el)
    const tr = range.getBoundingClientRect(); if (tr.width < 2) continue
    const s = getComputedStyle(el)
    if (s.textOverflow === "ellipsis") continue
    if (!onTop(el, tr)) continue
    for (let a = el; a && a !== document.body; a = a.parentElement) {
      const as = getComputedStyle(a)
      // Scrolling areas keep their content reachable, so stop there.
      if (/(auto|scroll)/.test(as.overflowX + as.overflowY)) break
      const clipsX = /(hidden|clip)/.test(as.overflowX), clipsY = /(hidden|clip)/.test(as.overflowY)
      if (!clipsX && !clipsY) continue
      if (as.textOverflow === "ellipsis") break
      const ar = a.getBoundingClientRect()
      const outX = clipsX && (tr.right > ar.right + 2 || tr.left < ar.left - 2)
      const outY = clipsY && (tr.bottom > ar.bottom + 2 || tr.top < ar.top - 2)
      if (outX || outY) { issues.clipped.push(`${describe(el)} cut by ${describe(a).slice(0, 40)}`); break }
    }
  }

  // 3. Text drawn on top of other text.
  const leaves = textEls.filter((el) => !inFixed(el)).map((el) => {
    const range = document.createRange(); range.selectNodeContents(el); return { el, r: range.getBoundingClientRect() }
  }).filter(({ el, r }) => r.width > 4 && r.height > 4 && onTop(el, r))
  // Sweep top to bottom so only text on the same lines is compared.
  leaves.sort((x, y) => x.r.top - y.r.top)
  for (let i = 0; i < leaves.length; i += 1) {
    for (let j = i + 1; j < leaves.length && leaves[j].r.top < leaves[i].r.bottom; j += 1) {
      const a = leaves[i], b = leaves[j]
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue
      const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left)
      const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top)
      if (w <= 2 || h <= 2) continue
      const smaller = Math.min(a.r.width * a.r.height, b.r.width * b.r.height)
      if ((w * h) / smaller > 0.25) issues.overlaps.push(`${describe(a.el)} × ${describe(b.el)}`)
    }
  }

  // 4. Touch targets under 32px (touch devices only; 44px is the comfortable size).
  if (touch) {
    for (const el of all.filter((e) => e.matches("button, a[href], input, select, [role='tab'], [role='button']"))) {
      if (el.disabled) continue
      const r = el.getBoundingClientRect()
      if (r.width < 32 || r.height < 32) issues.smallTargets.push(`${describe(el)} ${Math.round(r.width)}×${Math.round(r.height)}`)
    }
  }
  for (const key of Object.keys(issues)) issues[key] = [...new Set(issues[key])].slice(0, 25)
  return { scrollWidth: document.documentElement.scrollWidth, viewportWidth: vw, issues }
}

for (const [device, width, height, touch] of DEVICES) {
  if (ONLY && !ONLY.includes(device)) continue
  test(`device audit ${device}`, async ({ browser }) => {
    test.setTimeout(1_500_000)
    fs.mkdirSync(DIR, { recursive: true })
    const results = {}
    for (const screen of SCREENS) {
      const context = await browser.newContext({ viewport: { width, height }, baseURL: BASE, reducedMotion: "reduce", hasTouch: touch, isMobile: touch && width < 900, colorScheme: "dark" })
      const page = await context.newPage()
      try {
        await page.clock.install({ time: new Date("2026-07-12T16:00:00.000Z") })
        if (!screen.anon) await installApiMocks(page, screen.progress ? { progressOverrides: screen.progress } : {})
        else await installApiMocks(page, { authenticated: false })
        await page.addInitScript((prefs) => localStorage.setItem("clickaway.feedback-preferences.v1", JSON.stringify(prefs)), PREFS)
        if (screen.anon) { await page.goto(screen.path); await page.waitForTimeout(1500) } else await gotoRoute(page, screen.route)
        await page.waitForTimeout(600)
        if (screen.click) { await page.getByRole("button", { name: screen.click, exact: true }).first().click(); await page.waitForTimeout(900) }
        if (screen.action === "settings") {
          const trigger = page.getByRole("button", { name: /Settings|More/ }).first()
          await trigger.click(); await page.waitForTimeout(500)
          const settings = page.getByRole("button", { name: /^Settings$/ })
          if (await settings.count()) await settings.last().click().catch(() => {})
          await page.waitForTimeout(800)
        }
        if (screen.action === "round" || screen.action === "results") {
          await page.locator(".arenaLobbyStart").click()
          await page.clock.runFor(3900); await page.waitForTimeout(600)
          for (let i = 0; i < 8; i += 1) await page.locator(".arena .bigCircleButton").first().click({ force: true, timeout: 1000 }).catch(() => {})
          if (screen.action === "results") { await page.keyboard.press("g"); await page.clock.runFor(2600); await page.waitForTimeout(800) }
        }
        // Show the whole page at once so nothing is judged by where the scroll happens to be.
        const fullHeight = await page.evaluate(() => {
          const scrollers = [...document.querySelectorAll(".mainContent, .gameOverCard, .gameOverlay")]
          return Math.max(document.documentElement.scrollHeight, ...scrollers.map((el) => el.scrollHeight + el.getBoundingClientRect().top))
        })
        if (fullHeight > height) { await page.setViewportSize({ width, height: Math.min(Math.ceil(fullHeight) + 40, 6000) }); await page.waitForTimeout(500) }
        const report = await page.evaluate(audit, { touch })
        results[screen.id] = report
        await page.screenshot({ path: `${DIR}/${device}-${screen.id}.png`, fullPage: true })
      } catch (error) {
        results[screen.id] = { error: String(error.message).split("\n")[0] }
      }
      await context.close().catch(() => {})
      // Saved after every screen so a slow device keeps what it finished.
      fs.writeFileSync(`${DIR}/audit-${device}.json`, JSON.stringify({ device, width, height, results }, null, 2))
    }
    fs.writeFileSync(`${DIR}/audit-${device}.json`, JSON.stringify({ device, width, height, results }, null, 2))
  })
}
