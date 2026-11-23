import { test, expect } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import path from "node:path"
import { prepareDeterministicPage, gotoRoute } from "./fixtures.js"

const out = "C:/Users/quinl/AppData/Local/Temp/claude/8f5fc2fbe33c61b7/52a8d379-0918-4105-90fd-d3f7d1db2f63/scratchpad/artpass/materials/duels"
const phase = process.env.DUEL_PHASE || "before"
const only = process.env.DUEL_ONLY ? process.env.DUEL_ONLY.split(",") : null
test.setTimeout(600_000)

const base = { replayId: 101, replayScore: 920, modeId: "normal", status: "pending", createdAt: "2026-07-11T16:00:00.000Z" }
const mixed = [
  { ...base, id: 41, challengerUserId: "21", challengerUsername: "Nova", opponentUserId: "7", opponentUsername: "Vector", message: "Catch this line." },
  { ...base, id: 43, challengerUserId: "22", challengerUsername: "Orbit", opponentUserId: "7", opponentUsername: "Vector", status: "accepted", modeId: "hard", replayScore: 1480 },
  { ...base, id: 44, challengerUserId: "7", challengerUsername: "Vector", opponentUserId: "23", opponentUsername: "Kestrel", message: "Bring your best", replayScore: 874 },
  { ...base, id: 45, challengerUserId: "7", challengerUsername: "Vector", opponentUserId: "24", opponentUsername: "Prism", status: "completed", challengerWon: true, replayScore: 1010, opponentReplayScore: 760 },
  { ...base, id: 46, challengerUserId: "25", challengerUsername: "Helix", opponentUserId: "7", opponentUsername: "Vector", status: "completed", challengerWon: true, replayScore: 1320, opponentReplayScore: 990, modeId: "easy" },
  { ...base, id: 47, challengerUserId: "7", challengerUsername: "Vector", opponentUserId: "26", opponentUsername: "Quasar", status: "expired", createdAt: "2026-06-20T16:00:00.000Z" },
  { ...base, id: 48, challengerUserId: "27", challengerUsername: "Mx", opponentUserId: "7", opponentUsername: "Vector", status: "declined" },
]
const replays = [{ id: 101, modeId: "normal", score: 920 }, { id: 102, modeId: "easy", score: 873 }, { id: 103, modeId: "hard", score: 1204 }, { id: 104, modeId: "normal", score: 640 }, { id: 105, modeId: "easy", score: 410 }]

const widths = [[1440, 900], [390, 844], [320, 640]]
const states = {
  default: {},
  mixed: { mixed: true },
  "mixed-incoming": { mixed: true, tab: "Incoming" },
  "mixed-sent": { mixed: true, tab: "Sent" },
  empty: { empty: true },
  "rival-typed": { rival: true },
  error: { rival: true, error: true },
}

async function settle(page) {
  await page.evaluate(async () => {
    await Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {})))
    await Promise.all([...document.images].map((img) => img.decode().catch(() => {})))
  })
}

async function shots(page, name, vw, steps = 4) {
  const info = await page.evaluate(() => {
    let el = document.querySelector(".duelPage")
    while (el && el !== document.documentElement) {
      const s = getComputedStyle(el)
      if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 2) { el.setAttribute("data-zz-scroll", "1"); return { found: true, sh: el.scrollHeight, ch: el.clientHeight } }
      el = el.parentElement
    }
    return { found: false, sh: document.documentElement.scrollHeight, ch: innerHeight }
  })
  const n = Math.min(steps, Math.max(1, Math.ceil(info.sh / (info.ch - 80))))
  for (let i = 0; i < n; i++) {
    await page.evaluate((y) => {
      const el = document.querySelector("[data-zz-scroll]")
      if (el) el.scrollTop = y; else window.scrollTo(0, y)
    }, i * (info.ch - 80))
    await settle(page)
    await page.screenshot({ path: path.join(out, `${phase}-${name}-${vw}-${i}.png`), animations: "disabled" })
  }
  const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  expect(over).toBeLessThanOrEqual(0)
  const offenders = await page.evaluate(() => [...document.querySelectorAll(".duelPage *")].filter((el) => {
    const r = el.getBoundingClientRect()
    return r.width > 0 && getComputedStyle(el).position !== "fixed" && (r.left < -1 || r.right > innerWidth + 1)
  }).map((el) => `${el.tagName}.${String(el.className).slice(0, 40)}`).slice(0, 8))
  expect(offenders).toEqual([])
}

for (const [name, cfg] of Object.entries(states)) {
  if (only && !only.includes(name)) continue
  for (const [w, h] of widths) {
    test(`duels ${name} ${w}`, async ({ page }) => {
      await mkdir(out, { recursive: true })
      await page.setViewportSize({ width: w, height: h })
      await prepareDeterministicPage(page, cfg.empty ? { dataState: "empty" } : {})
      if (cfg.mixed) await page.route("**/api/challenges*", (route) => route.request().method() === "GET" ? route.fulfill({ contentType: "application/json", body: JSON.stringify({ challenges: mixed }) }) : route.fallback())
      if (cfg.mixed) await page.route("**/api/replays**", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ replays: replays.map((r) => ({ ...r, username: "Vector", seed: 1, events: [], createdAt: "2026-07-10T00:00:00Z" })) }) }))
      if (cfg.error) await page.route("**/api/challenges*", (route) => route.request().method() === "POST" ? route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "No player named that was found." }) }) : route.fallback())
      await gotoRoute(page, { path: "/challenges", heading: "Duel command" })
      await page.waitForTimeout(400)
      if (cfg.tab) await page.getByRole("tab", { name: new RegExp(cfg.tab) }).click()
      if (cfg.rival) {
        await page.getByLabel("Opponent username").fill("Orbit")
        await page.getByRole("radio").first().click()
      }
      if (cfg.error) await page.getByRole("button", { name: /Send duel/ }).click()
      await page.waitForTimeout(300)
      await shots(page, name, w, name === "default" || name === "mixed" ? 5 : 4)
    })
  }
}
for (const [name, w, h] of [["default", 768, 1024], ["default", 1280, 720]]) {
  test(`duels extra ${w}`, async ({ page }) => {
    await mkdir(out, { recursive: true })
    await page.setViewportSize({ width: w, height: h })
    await prepareDeterministicPage(page)
    await gotoRoute(page, { path: "/challenges", heading: "Duel command" })
    await page.waitForTimeout(400)
    await shots(page, name, w, 5)
  })
}
test("duels focus accept 1440", async ({ page }) => {
  await mkdir(out, { recursive: true })
  await page.setViewportSize({ width: 1440, height: 900 })
  await prepareDeterministicPage(page)
  await gotoRoute(page, { path: "/challenges", heading: "Duel command" })
  await page.waitForTimeout(400)
  await page.getByRole("button", { name: /Accept/ }).focus()
  await page.getByRole("button", { name: /Decline/ }).hover()
  await settle(page)
  await page.screenshot({ path: path.join(out, `${phase}-focus-1440.png`), animations: "disabled" })
})
