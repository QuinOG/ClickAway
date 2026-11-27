import { createSeededRng } from "../../src/game/engine/seededRng.js"
import { createGeometrySimulation, deriveGoldSeed, isGoldHit, isBullseyeHit } from "../../src/game/engine/roundGeometry.js"
import { createRoundSimulation, MIN_CLICK_INTERVAL_MS } from "../../src/game/engine/roundEngine.js"
import { getDifficultyById } from "../../src/constants/gameModesConfig.js"
import { applyRankedMatchResult } from "../../src/utils/rankUtils.js"
import { calculateRoundRewards, simulateRound } from "../roundRewards.js"
import { validateUsername } from "../validation.js"
import { DEMO_PLAYER_USERNAMES } from "../demoPlayerNames.js"

export { DEMO_PLAYER_USERNAMES }
export const DEMO_ARENA = Object.freeze({ arenaWidth: 960, arenaHeight: 640 })

export function usernameSeed(username) {
  let seed = 2166136261
  for (const character of username) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619) >>> 0
  return seed || 1
}

export function generateDemoRound({ seed, modeId, skill, playedAtIso = null }) {
  const rng = createSeededRng(seed ^ 0xa53a9)
  const rules = getDifficultyById(modeId)
  const geometry = createGeometrySimulation({ roundRules: rules, ...DEMO_ARENA, rng: createSeededRng(seed), goldRng: createSeededRng(deriveGoldSeed(seed)) })
  const engine = createRoundSimulation(rules)
  const events = []
  let t = 250 + Math.floor(rng() * 500)
  let lastHit = false
  while (t < rules.durationSeconds * 1000 - 100) {
    const hit = rng() < Math.min(0.995, skill.accuracy + (lastHit ? skill.streakTendency : -0.03))
    const { position, buttonSize } = geometry.getState()
    let x, y
    if (hit) {
      const angle = rng() * Math.PI * 2
      const radius = rng() < skill.bullseyeRate ? 0 : buttonSize * (0.2 + rng() * 0.22)
      x = position.x + buttonSize / 2 + Math.cos(angle) * radius
      y = position.y + buttonSize / 2 + Math.sin(angle) * radius
      engine.applyHit(t, { bullseye: isBullseyeHit(x, y, position, buttonSize), gold: isGoldHit(geometry.getState(), t) })
      geometry.applyHit(t)
    } else {
      // Opposite arena corner is safely outside the target, including at minimum size.
      x = position.x < DEMO_ARENA.arenaWidth / 2 ? DEMO_ARENA.arenaWidth : 0
      y = position.y < DEMO_ARENA.arenaHeight / 2 ? DEMO_ARENA.arenaHeight : 0
      engine.applyMiss(t)
      geometry.applyMiss(t)
    }
    events.push({ type: hit ? "hit" : "miss", t, x, y })
    lastHit = hit
    t += Math.max(MIN_CLICK_INTERVAL_MS, Math.round(1000 / skill.clicksPerSecond * (0.7 + rng() * 0.6)))
  }
  const summary = engine.getSummary()
  const verified = simulateRound(events, modeId, { roundSeed: seed, ...DEMO_ARENA })
  if (!verified.valid || ["score", "hits", "misses", "bestStreak", "bullseyes", "goldHits"].some((key) => summary[key] !== verified[key])) {
    throw new Error(`Generated replay failed validation: ${verified.reason || "score mismatch"}`)
  }
  return {
    seed, modeId, events, playedAtIso, ...summary,
    loadoutSnapshot: { ...DEMO_ARENA },
    avgReactionMs: Math.round(1000 / skill.clicksPerSecond),
    bestReactionMs: Math.round(700 / skill.clicksPerSecond),
    rewards: calculateRoundRewards({ modeId, ...summary }),
  }
}

export function generateDemoPlayer(username, { days = 21, now = new Date() } = {}) {
  if (!DEMO_PLAYER_USERNAMES.includes(username) || validateUsername(username)) throw new Error("Unknown demo username.")
  const rng = createSeededRng(usernameSeed(username))
  // Most players sit mid-ladder: talent leans to the middle (average of two
  // draws), with a floor so even weak players don't lose rating every round.
  const talent = 0.25 + 0.75 * ((rng() + rng()) / 2)
  const skill = {
    clicksPerSecond: 1.2 + talent * 5.5,
    accuracy: 0.62 + talent * 0.34,
    streakTendency: rng() * 0.035,
    bullseyeRate: 0.05 + talent * 0.4,
    rankedShare: rng() < 0.15 ? 0 : 0.25 + rng() * 0.7,
  }
  const regular = rng() > 0.3
  const lapsed = rng() < 0.2
  const count = regular ? 40 + Math.floor(rng() * 51) : 8 + Math.floor(rng() * 20)
  const rounds = Array.from({ length: count }, () => {
    const ageDays = lapsed ? days * (0.55 + rng() * 0.45) : rng() * days
    return generateDemoRound({
      seed: Math.floor(rng() * 0xffffffff), modeId: rng() < skill.rankedShare ? "hard" : "normal", skill,
      playedAtIso: new Date(new Date(now).getTime() - ageDays * 86400000).toISOString(),
    })
  }).sort((a, b) => a.playedAtIso.localeCompare(b.playedAtIso))
  let rankMmr = 0, rankedState, hasRankedHistory = false, rank = "Unranked"
  for (const round of rounds) {
    const outcome = applyRankedMatchResult({ ...round.rewards, currentMmr: rankMmr, currentRankedState: rankedState, hasRankedHistory })
    rankMmr = outcome.nextMmr
    rankedState = outcome.nextRankedState
    hasRankedHistory ||= round.modeId === "hard"
    rank = outcome.nextRankProgress.tierLabel
    round.rankDelta = outcome.appliedRankDelta
  }
  return { username, skill, regular, lapsed, rounds, rankMmr, rank }
}

export function buildDemoPlan({ count = 24, days = 21, now = new Date(), duelsTo = null } = {}) {
  if (!Number.isInteger(count) || count < 1 || count > DEMO_PLAYER_USERNAMES.length) throw new Error("Count must be between 1 and 30.")
  if (!Number.isInteger(days) || days < 1 || days > 365) throw new Error("Days must be between 1 and 365.")
  const players = DEMO_PLAYER_USERNAMES.slice(0, count).map((username) => generateDemoPlayer(username, { days, now }))
  const duels = []
  if (duelsTo) {
    for (const player of players.filter((p) => p.username !== duelsTo).slice(0, 3)) {
      duels.push({ challenger: player.username, opponent: duelsTo, completed: false,
        round: generateDemoRound({ seed: usernameSeed(`${player.username}:duel`), modeId: "normal", skill: player.skill }) })
    }
  }
  for (let i = 0; i + 1 < Math.min(players.length, 4); i += 2) {
    const seed = usernameSeed(`${players[i].username}:race`)
    duels.push({ challenger: players[i].username, opponent: players[i + 1].username, completed: true,
      round: generateDemoRound({ seed, modeId: "normal", skill: players[i].skill }),
      opponentRound: generateDemoRound({ seed, modeId: "normal", skill: players[i + 1].skill }) })
  }
  return { players, duels }
}

export function summarizeDemoPlan(plan) {
  return plan.players.map((player) => ({ player: player.username, rounds: player.rounds.length,
    ranked: player.rounds.filter((r) => r.modeId === "hard").length, rank: player.rank, mmr: player.rankMmr,
    duels: plan.duels.filter((d) => d.challenger === player.username).length }))
}

export async function removeDemoPlayers(deleteByUsername, usernames = DEMO_PLAYER_USERNAMES) {
  // Validate the entire request before deleting anything; no partial allowlist bypass.
  if (usernames.some((name) => !DEMO_PLAYER_USERNAMES.includes(name))) throw new Error("Refusing to remove a non-demo account.")
  let removed = 0
  for (const username of new Set(usernames)) removed += await deleteByUsername(username)
  return removed
}
