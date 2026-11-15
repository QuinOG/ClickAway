#!/usr/bin/env node
// Usage meter for agent-heavy work. Run: node .claude/tools/usage-meter.mjs [--json]
//   --record session=18 weekly=50 [fable=5]  log a reading from the Claude usage
//       page next to what the logs show right now, then refit the budgets
//   --as-of 2026-11-15T19:28:00Z             evaluate (or record) at a past moment
//
// Codex (ChatGPT): exact. Codex session logs carry the real rate-limit state
// (5-hour and weekly used %, reset times), the same numbers as the usage page.
// Claude Code: estimated. Transcripts carry per-message token counts; we sum a
// weighted total over the last 5 hours and 7 days and compare it with a budget
// in usage-budget.json (calibrate it from one reading of the Claude usage page).
//
// Pace: a window is "on pace" when used% <= elapsed% of the window (+ slack).
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

const HOME = homedir()
const argValue = (flag) => {
  const index = process.argv.indexOf(flag)
  return index >= 0 ? process.argv[index + 1] : null
}
const AS_OF = argValue("--as-of")
const NOW = AS_OF ? Date.parse(AS_OF) : Date.now()
if (!Number.isFinite(NOW)) throw new Error(`Bad --as-of time: ${AS_OF}`)
const FIVE_HOURS = 5 * 3600_000
const WEEK = 7 * 24 * 3600_000
const budgetPath = join(import.meta.dirname, "usage-budget.json")
const budget = existsSync(budgetPath) ? JSON.parse(readFileSync(budgetPath, "utf8")) : {}

function walk(dir, match, out = []) {
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    const stat = statSync(path)
    if (stat.isDirectory()) walk(path, match, out)
    else if (match(name)) out.push({ path, mtime: stat.mtimeMs })
  }
  return out
}

function pace(usedPercent, resetsAtMs, windowMs) {
  const elapsed = Math.min(1, Math.max(0, 1 - (resetsAtMs - NOW) / windowMs))
  const elapsedPercent = Math.round(elapsed * 100)
  const slack = 10
  return {
    elapsedPercent,
    status: usedPercent <= elapsedPercent + slack ? "on pace" : "ahead of pace",
  }
}

// ---- Codex: newest rate_limits event across recent session files
function codex() {
  const files = walk(join(HOME, ".codex", "sessions"), (n) => n.endsWith(".jsonl"))
    .filter((f) => NOW - f.mtime < WEEK)
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, 20)
  let latest = null
  for (const file of files) {
    const lines = readFileSync(file.path, "utf8").trimEnd().split("\n")
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      if (!lines[i].includes("\"rate_limits\"")) continue
      try {
        const event = JSON.parse(lines[i])
        const limits = event?.payload?.rate_limits ?? event?.rate_limits ?? event?.payload?.info?.rate_limits
        const at = Date.parse(event.timestamp ?? "") || file.mtime
        if (limits?.primary && (!latest || at > latest.at)) latest = { at, limits }
      } catch { /* partial line */ }
      break
    }
  }
  if (!latest) return null
  const window = (w, ms) => w && ({
    usedPercent: w.used_percent,
    resetsAt: new Date(w.resets_at * 1000).toISOString(),
    minutesToReset: Math.max(0, Math.round((w.resets_at * 1000 - NOW) / 60000)),
    ...pace(w.used_percent, w.resets_at * 1000, ms),
  })
  return {
    source: "exact (Codex logs)",
    observedAt: new Date(latest.at).toISOString(),
    fiveHour: window(latest.limits.primary, FIVE_HOURS),
    weekly: window(latest.limits.secondary, WEEK),
  }
}

// ---- Claude Code: weighted tokens from transcripts
// Weights approximate how much each kind counts toward limits; cache reads are cheap.
const W = budget.claudeWeights ?? { input: 1, cacheCreate: 1.25, cacheRead: 0.1, output: 5 }
// Fable has its own weekly limit on the usage page ("Weekly · Fable"), so its
// tokens are counted separately and kept out of Claude's session and weekly totals.
// (It also costs about twice Opus per token: $8/$40 vs $4/$20 per million.)
const isFableModel = (model = "") => String(model).toLowerCase().includes("fable")
function claude() {
  const files = walk(join(HOME, ".claude", "projects"), (n) => n.endsWith(".jsonl"))
    .filter((f) => NOW - f.mtime < WEEK)
  const events = []
  const fableEvents = []
  // A reply is written over several transcript lines that repeat its usage;
  // count each reply once (by message id + request id).
  const seen = new Set()
  for (const file of files) {
    for (const line of readFileSync(file.path, "utf8").split("\n")) {
      if (!line.includes('"usage"')) continue
      let event
      try { event = JSON.parse(line) } catch { continue }
      const usage = event?.message?.usage
      const at = Date.parse(event?.timestamp ?? "")
      if (!usage || !at || NOW - at > WEEK || at > NOW) continue
      const replyKey = `${event?.message?.id ?? ""}:${event?.requestId ?? ""}`
      if (replyKey !== ":") {
        if (seen.has(replyKey)) continue
        seen.add(replyKey)
      }
      const weighted = (usage.input_tokens ?? 0) * W.input
        + (usage.cache_creation_input_tokens ?? 0) * W.cacheCreate
        + (usage.cache_read_input_tokens ?? 0) * W.cacheRead
        + (usage.output_tokens ?? 0) * W.output
      ;(isFableModel(event?.message?.model) ? fableEvents : events).push([at, weighted])
    }
  }
  events.sort((a, b) => a[0] - b[0])

  // Session windows: a 5-hour window starts at the first message after the
  // previous window ended (how the Claude usage page counts a "session").
  // Chained forward from a session start read off the usage page, since activity
  // outside these logs (e.g. claude.ai on a phone) shifts where windows start.
  const anchor = budget.claudeSessionResetAt ? Date.parse(budget.claudeSessionResetAt) - FIVE_HOURS : null
  let windowStart = anchor
  for (const [at] of events) {
    if (anchor !== null && at < anchor) continue
    if (windowStart === null || at >= windowStart + FIVE_HOURS) windowStart = at
  }
  const sessionActive = windowStart !== null && NOW < windowStart + FIVE_HOURS
  const fiveHour = sessionActive ? events.filter(([at]) => at >= windowStart).reduce((sum, [, w]) => sum + w, 0) : 0

  // Weekly window: anchored to a reset time read once from the usage page,
  // rolled forward a week at a time.
  let weekStart = NOW - WEEK
  if (budget.claudeWeeklyResetAt) {
    let reset = Date.parse(budget.claudeWeeklyResetAt)
    while (reset <= NOW) reset += WEEK
    weekStart = reset - WEEK
  }
  const week = events.filter(([at]) => at >= weekStart).reduce((sum, [, w]) => sum + w, 0)
  const fableWeek = fableEvents.filter(([at]) => at >= weekStart).reduce((sum, [, w]) => sum + w, 0)

  const pct = (value, cap) => (cap ? Math.round((value / cap) * 100) : null)
  const sessionReset = sessionActive ? windowStart + FIVE_HOURS : null
  return {
    source: budget.claudeFiveHourBudget ? "estimate (calibrated)" : "estimate (uncalibrated: set budgets in usage-budget.json)",
    weightedTokens5h: Math.round(fiveHour),
    weightedTokens7d: Math.round(week),
    fiveHourPercent: pct(fiveHour, budget.claudeFiveHourBudget),
    weeklyPercent: pct(week, budget.claudeWeeklyBudget),
    weekElapsedPercent: Math.round(((NOW - weekStart) / WEEK) * 100),
    fableWeightedTokens7d: Math.round(fableWeek),
    fableWeeklyPercent: pct(fableWeek, budget.fableWeeklyBudget),
    minutesToSessionReset: sessionReset ? Math.round((sessionReset - NOW) / 60000) : null,
    fiveHourPace: sessionReset ? pace(pct(fiveHour, budget.claudeFiveHourBudget) ?? 0, sessionReset, FIVE_HOURS).status : "idle",
  }
}

const report = { at: new Date(NOW).toISOString(), codex: codex(), claude: claude() }

// ---- Calibration from usage-page readings
// Each reading pairs the page's percentages with the logged weighted tokens at
// that moment. Budgets (tokens per 100%) are a least-squares fit through zero
// over recent readings, so one rounded whole-percent reading can't skew them.
const readingsPath = join(import.meta.dirname, "usage-readings.json")
const MAX_READINGS_IN_FIT = 12
const MIN_PERCENT_IN_FIT = 3

function fitBudget(readings, pageKey, loggedKey) {
  const usable = readings.filter((r) => r.page?.[pageKey] >= MIN_PERCENT_IN_FIT && r.logged?.[loggedKey] > 0)
  if (!usable.length) return null
  const sumXY = usable.reduce((sum, r) => sum + r.logged[loggedKey] * r.page[pageKey], 0)
  const sumXX = usable.reduce((sum, r) => sum + r.page[pageKey] ** 2, 0)
  return Math.round((100 * sumXY) / sumXX)
}

if (process.argv.includes("--record")) {
  const values = Object.fromEntries(process.argv
    .filter((arg) => /^(session|weekly|fable)=\d+(\.\d+)?$/.test(arg))
    .map((arg) => { const [key, value] = arg.split("="); return [key, Number(value)] }))
  if (values.session === undefined && values.weekly === undefined) {
    throw new Error("--record needs session=<percent> and/or weekly=<percent> (and optionally fable=<percent>)")
  }
  const readings = existsSync(readingsPath) ? JSON.parse(readFileSync(readingsPath, "utf8")) : []
  readings.push({
    at: report.at,
    page: values,
    logged: { session: report.claude.weightedTokens5h, weekly: report.claude.weightedTokens7d, fable: report.claude.fableWeightedTokens7d },
  })
  readings.sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
  writeFileSync(readingsPath, `${JSON.stringify(readings, null, 2)}
`)

  const recent = readings.slice(-MAX_READINGS_IN_FIT)
  const fitted = {
    claudeFiveHourBudget: fitBudget(recent, "session", "session"),
    claudeWeeklyBudget: fitBudget(recent, "weekly", "weekly"),
    fableWeeklyBudget: fitBudget(recent, "fable", "fable"),
  }
  const nextBudget = { ...budget, calibratedAt: report.at }
  for (const [key, value] of Object.entries(fitted)) if (value) nextBudget[key] = value
  writeFileSync(budgetPath, `${JSON.stringify(nextBudget, null, 2)}
`)

  console.log(`Recorded ${JSON.stringify(values)} at ${report.at}; fitted from ${recent.length} reading(s):`)
  for (const [key, value] of Object.entries(fitted)) if (value) console.log(`  ${key}: ${budget[key] ?? "unset"} -> ${value}`)
  console.log("  reading residuals (page vs fitted estimate):")
  for (const r of recent) {
    const est = (loggedKey, budgetKey) => (nextBudget[budgetKey] ? ((100 * r.logged[loggedKey]) / nextBudget[budgetKey]).toFixed(1) : "?")
    console.log(`  ${r.at}  session ${r.page.session ?? "-"} vs ${est("session", "claudeFiveHourBudget")} | weekly ${r.page.weekly ?? "-"} vs ${est("weekly", "claudeWeeklyBudget")} | fable ${r.page.fable ?? "-"} vs ${est("fable", "fableWeeklyBudget")}`)
  }
  process.exit(0)
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report, null, 2))
} else {
  const c = report.codex
  console.log(c
    ? `Codex  5h: ${c.fiveHour.usedPercent}% used (${c.fiveHour.status}, ${c.fiveHour.elapsedPercent}% of window elapsed, resets in ${c.fiveHour.minutesToReset} min) | week: ${c.weekly?.usedPercent}% (${c.weekly?.status})`
    : "Codex  no rate-limit data found in ~/.codex/sessions")
  const k = report.claude
  console.log(`Claude 5h: ${k.fiveHourPercent ?? "?"}% est (${k.fiveHourPace}${k.minutesToSessionReset !== null ? `, resets in ${k.minutesToSessionReset} min` : ""}) | week: ${k.weeklyPercent ?? "?"}% est, ${k.weekElapsedPercent}% of week elapsed | Fable week: ${k.fableWeeklyPercent ?? "?"}% est [${k.source}]`)
}
