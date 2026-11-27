// Daily goals: three small tasks per UTC day, the same for every player, each
// paying coins and XP once. Shared by the server (which awards them while saving
// a round) and the client (which shows progress). Only rounds that earned XP
// count: Practice and unverified rounds earn none, so they can't be farmed.

const DAY_MS = 86400000

// One pool per slot: a "show up" goal, a skill goal and a variety goal.
const GOAL_POOLS = [
  [
    { kind: "rounds", target: 3, label: "Play 3 rounds" },
    { kind: "rounds", target: 4, label: "Play 4 rounds" },
  ],
  [
    { kind: "streak", target: 15, label: "Hit a 15 streak" },
    { kind: "streak", target: 20, label: "Hit a 20 streak" },
    { kind: "accurateRound", target: 1, minHits: 15, minAccuracy: 90, label: "90% accuracy, 15+ hits" },
  ],
  [
    { kind: "rounds", modeId: "hard", target: 2, label: "Play 2 Ranked rounds" },
    { kind: "hits", target: 100, label: "Land 100 hits" },
    { kind: "hits", target: 150, label: "Land 150 hits" },
  ],
]

export const DAILY_GOAL_REWARDS = [
  { coins: 40, xp: 80 },
  { coins: 60, xp: 120 },
  { coins: 50, xp: 100 },
]

export function getUtcDayKey(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date)
  return (Number.isNaN(value.getTime()) ? new Date() : value).toISOString().slice(0, 10)
}

export function getNextUtcResetMs(nowMs = Date.now()) {
  const value = Number(nowMs)
  return (Math.floor((Number.isFinite(value) ? value : Date.now()) / DAY_MS) + 1) * DAY_MS
}

function hashDay(dayKey) {
  let hash = 2166136261
  for (const character of String(dayKey)) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619) >>> 0
  }
  return hash
}

export function getDailyGoals(dayKey) {
  const hash = hashDay(dayKey)
  return GOAL_POOLS.map((pool, slot) => {
    // A different slice of the hash per slot, so the slots don't move together.
    const goal = pool[(hash >>> (slot * 8)) % pool.length]
    const id = [goal.kind, goal.modeId, goal.target].filter((part) => part !== undefined).join("-")
    return { ...goal, id, reward: DAILY_GOAL_REWARDS[slot] }
  })
}

function toCount(value) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : 0
}

export function measureDailyGoal(goal, rounds = []) {
  const list = Array.isArray(rounds) ? rounds : []
  switch (goal.kind) {
    case "rounds":
      return list.filter((round) => !goal.modeId || round?.modeId === goal.modeId).length
    case "hits":
      return list.reduce((total, round) => total + toCount(round?.hits), 0)
    case "streak":
      return list.reduce((best, round) => Math.max(best, toCount(round?.bestStreak)), 0)
    case "accurateRound":
      return list.filter((round) => {
        const hits = toCount(round?.hits)
        const attempts = hits + toCount(round?.misses)
        return hits >= goal.minHits && attempts > 0 && (hits / attempts) * 100 >= goal.minAccuracy
      }).length
    default:
      return 0
  }
}

// Progress for each of the day's goals over the rounds that count.
export function buildDailyGoalProgress(dayKey, rounds = []) {
  return getDailyGoals(dayKey).map((goal) => {
    const progress = Math.min(goal.target, measureDailyGoal(goal, rounds))
    return { ...goal, progress, isComplete: progress >= goal.target }
  })
}

// The goals this round finishes: not complete before it, complete with it.
export function getNewlyCompletedDailyGoals(dayKey, roundsBefore = [], round) {
  if (!round) return []
  const roundsAfter = [...(Array.isArray(roundsBefore) ? roundsBefore : []), round]
  return getDailyGoals(dayKey).filter((goal) => (
    measureDailyGoal(goal, roundsBefore) < goal.target &&
    measureDailyGoal(goal, roundsAfter) >= goal.target
  ))
}

export function sumDailyGoalRewards(goals = []) {
  return goals.reduce(
    (total, goal) => ({ coins: total.coins + toCount(goal.reward?.coins), xp: total.xp + toCount(goal.reward?.xp) }),
    { coins: 0, xp: 0 }
  )
}

// Normalizes the server's dailyGoals payload for the client; null when missing.
export function normalizeDailyGoals(value) {
  if (!value || typeof value !== "object" || !Array.isArray(value.goals)) return null
  const goals = value.goals
    .filter((goal) => goal && typeof goal.id === "string" && typeof goal.label === "string")
    .map((goal) => {
      const target = Math.max(1, toCount(goal.target))
      const progress = Math.min(target, toCount(goal.progress))
      return {
        id: goal.id,
        label: goal.label,
        target,
        progress,
        isComplete: progress >= target,
        reward: { coins: toCount(goal.reward?.coins), xp: toCount(goal.reward?.xp) },
      }
    })
  if (goals.length === 0) return null
  const resetsAtMs = Date.parse(value.resetsAt)
  return { day: String(value.day || ""), resetsAt: Number.isFinite(resetsAtMs) ? new Date(resetsAtMs).toISOString() : null, goals }
}

// Normalizes a round save's dailyGoalRewards; null when the round finished none.
export function normalizeDailyGoalRewards(value) {
  const goals = (Array.isArray(value?.goals) ? value.goals : [])
    .filter((goal) => goal && typeof goal.label === "string")
    .map((goal) => ({
      id: String(goal.id || goal.label),
      label: goal.label,
      reward: { coins: toCount(goal.reward?.coins), xp: toCount(goal.reward?.xp) },
    }))
  if (goals.length === 0) return null
  return { goals, ...sumDailyGoalRewards(goals) }
}

// A goal of today's that one more round like this one could finish, for the
// line above Play Again. Uses the day's goal definitions (matched by id) for
// what each goal measures; `round` is the round just played.
export function findDailyGoalWithinReach(dailyGoals, round) {
  if (!dailyGoals?.goals?.length || !dailyGoals.day || !round) return null
  const definitions = new Map(getDailyGoals(dailyGoals.day).map((goal) => [goal.id, goal]))
  const hits = toCount(round.hits)
  const attempts = hits + toCount(round.misses)
  for (const goal of dailyGoals.goals) {
    const definition = definitions.get(goal.id)
    if (goal.isComplete || !definition) continue
    const left = goal.target - goal.progress
    let isWithinReach = false
    switch (definition.kind) {
      case "rounds":
        isWithinReach = left <= 1 && (!definition.modeId || definition.modeId === round.modeId)
        break
      case "hits":
        isWithinReach = left <= hits
        break
      case "streak":
        // Close enough to be worth naming: three quarters of the way there.
        isWithinReach = toCount(round.bestStreak) >= Math.ceil(definition.target * 0.75)
        break
      case "accurateRound":
        isWithinReach = hits >= definition.minHits && attempts > 0 && (hits / attempts) * 100 >= definition.minAccuracy - 5
        break
      default:
        break
    }
    if (isWithinReach) return { ...goal, kind: definition.kind }
  }
  return null
}
