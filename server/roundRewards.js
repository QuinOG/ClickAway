const PROGRESSION_MODE = { PRACTICE: "practice", NON_RANKED: "non_ranked", RANKED: "ranked" }

const DIFFICULTIES_BY_ID = {
  easy:   { allowsCoinRewards: false, allowsLevelProgression: false, allowsRankProgression: false, coinMultiplier: 1,   progressionMode: PROGRESSION_MODE.PRACTICE,   comboStep: 6, basePointsPerHit: 1, missPenalty: 0, maxEvents: 800  },
  normal: { allowsCoinRewards: true,  allowsLevelProgression: true,  allowsRankProgression: false, coinMultiplier: 1,   progressionMode: PROGRESSION_MODE.NON_RANKED, comboStep: 5, basePointsPerHit: 1, missPenalty: 1, maxEvents: 400  },
  hard:   { allowsCoinRewards: true,  allowsLevelProgression: true,  allowsRankProgression: true,  coinMultiplier: 1.5, progressionMode: PROGRESSION_MODE.RANKED,     comboStep: 4, basePointsPerHit: 1, missPenalty: 2, maxEvents: 300  },
}

// Minimum milliseconds between any two clicks — below this is inhuman/scripted
const MIN_CLICK_INTERVAL_MS = 80

function clamp(value) {
  const n = Number.isFinite(value) ? value : 0
  return Math.max(0, n)
}

function accuracyPercent(hits, misses) {
  const total = hits + misses
  return total > 0 ? (hits / total) * 100 : 0
}

export function simulateRound(events, modeId) {
  const mode = DIFFICULTIES_BY_ID[modeId]
  if (!mode) return { valid: false, reason: "Invalid modeId." }

  if (!Array.isArray(events)) return { valid: false, reason: "Events must be an array." }
  if (events.length > mode.maxEvents) return { valid: false, reason: "Too many events." }

  // Validate and sort events by timestamp
  const sorted = [...events].sort((a, b) => a.t - b.t)

  for (let i = 0; i < sorted.length; i++) {
    const event = sorted[i]
    if (event.type !== "hit" && event.type !== "miss") {
      return { valid: false, reason: "Invalid event type." }
    }
    if (typeof event.t !== "number" || !Number.isFinite(event.t) || event.t < 0) {
      return { valid: false, reason: "Invalid event timestamp." }
    }
    if (i > 0 && event.t - sorted[i - 1].t < MIN_CLICK_INTERVAL_MS) {
      return { valid: false, reason: "Events too fast to be human." }
    }
  }

  // Simulate the round
  let score = 0
  let streak = 0
  let bestStreak = 0
  let hits = 0
  let misses = 0

  for (const event of sorted) {
    if (event.type === "hit") {
      const nextStreak = streak + 1
      const multiplier = 1 + Math.floor(nextStreak / mode.comboStep)
      score += mode.basePointsPerHit * multiplier
      streak = nextStreak
      bestStreak = Math.max(bestStreak, streak)
      hits++
    } else {
      score = Math.max(0, score - mode.missPenalty)
      streak = 0
      misses++
    }
  }

  return { valid: true, hits, misses, score: Math.floor(score), bestStreak }
}

export function calculateRewards({ modeId, hits, misses, score, bestStreak }) {
  const mode = DIFFICULTIES_BY_ID[modeId] ?? DIFFICULTIES_BY_ID.normal
  const h = clamp(hits)
  const m = clamp(misses)
  const s = clamp(score)
  const bs = clamp(bestStreak)
  const acc = accuracyPercent(h, m)

  // Coins
  const earnedCoins = mode.allowsCoinRewards
    ? Math.max(0, Math.floor(h * mode.coinMultiplier))
    : 0

  // XP
  let xp = 0
  if (mode.allowsLevelProgression) {
    xp += h * 5
    xp += bs * 3
    xp += Math.floor(s * 0.2)
    if (acc >= 90) xp += 25
    else if (acc >= 75) xp += 10
    xp = Math.floor(Math.max(0, xp))
  }

  // MMR delta
  let rankDelta = 0
  if (mode.allowsRankProgression) {
    rankDelta += Math.floor(s / 40)
    rankDelta += Math.floor(bs / 3)
    if (acc >= 99) rankDelta += 8
    else if (acc >= 96) rankDelta += 6
    else if (acc >= 93) rankDelta += 3
    else if (acc >= 90) rankDelta += 1
    else if (acc >= 85) rankDelta -= 3
    else if (acc >= 80) rankDelta -= 6
    else rankDelta -= 10
    if (m >= 18) rankDelta -= 10
    if (h <= 8) rankDelta -= 12
    rankDelta = Math.max(-25, Math.min(35, Math.floor(rankDelta)))
  }

  return {
    earnedCoins,
    earnedXp: xp,
    rankDelta,
    progressionMode: mode.progressionMode,
  }
}
