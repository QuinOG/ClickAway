#!/usr/bin/env node
// Usage meter for agent-heavy work. Run: node .claude/tools/usage-meter.mjs [--json]
//
// Codex (ChatGPT): exact. Codex session logs carry the real rate-limit state
// (5-hour and weekly used %, reset times), the same numbers as the usage page.
// Claude Code: estimated. Transcripts carry per-message token counts; we sum a
// weighted total over the last 5 hours and 7 days and compare it with a budget
// in usage-budget.json (calibrate it from one reading of the Claude usage page).
//
// Pace: a window is "on pace" when used% <= elapsed% of the window (+ slack).
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

const HOME = homedir()
const NOW = Date.now()
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
function claude() {
  const files = walk(join(HOME, ".claude", "projects"), (n) => n.endsWith(".jsonl"))
    .filter((f) => NOW - f.mtime < WEEK)
  let fiveHour = 0
  let week = 0
  for (const file of files) {
    for (const line of readFileSync(file.path, "utf8").split("\n")) {
      if (!line.includes("\"usage\"")) continue
      let event
      try { event = JSON.parse(line) } catch { continue }
      const usage = event?.message?.usage
      const at = Date.parse(event?.timestamp ?? "")
      if (!usage || !at || NOW - at > WEEK) continue
      const weighted = (usage.input_tokens ?? 0) * W.input
        + (usage.cache_creation_input_tokens ?? 0) * W.cacheCreate
        + (usage.cache_read_input_tokens ?? 0) * W.cacheRead
        + (usage.output_tokens ?? 0) * W.output
      week += weighted
      if (NOW - at <= FIVE_HOURS) fiveHour += weighted
    }
  }
  const pct = (value, cap) => (cap ? Math.round((value / cap) * 100) : null)
  return {
    source: budget.claudeFiveHourBudget ? "estimate (calibrated)" : "estimate (uncalibrated: set budgets in usage-budget.json)",
    weightedTokens5h: Math.round(fiveHour),
    weightedTokens7d: Math.round(week),
    fiveHourPercent: pct(fiveHour, budget.claudeFiveHourBudget),
    weeklyPercent: pct(week, budget.claudeWeeklyBudget),
  }
}

const report = { at: new Date(NOW).toISOString(), codex: codex(), claude: claude() }

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report, null, 2))
} else {
  const c = report.codex
  console.log(c
    ? `Codex  5h: ${c.fiveHour.usedPercent}% used (${c.fiveHour.status}, ${c.fiveHour.elapsedPercent}% of window elapsed, resets in ${c.fiveHour.minutesToReset} min) | week: ${c.weekly?.usedPercent}% (${c.weekly?.status})`
    : "Codex  no rate-limit data found in ~/.codex/sessions")
  const k = report.claude
  console.log(`Claude 5h: ${k.fiveHourPercent ?? "?"}% est (${k.weightedTokens5h.toLocaleString()} weighted tok) | week: ${k.weeklyPercent ?? "?"}% est (${k.weightedTokens7d.toLocaleString()}) [${k.source}]`)
}
