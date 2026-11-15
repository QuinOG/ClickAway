import test from "node:test"
import assert from "node:assert/strict"
import { createRoundSimulation, replayRoundEvents } from "../src/game/engine/roundEngine.js"
import { createGeometrySimulation, deriveGoldSeed, isGoldHit, isBullseyeHit } from "../src/game/engine/roundGeometry.js"
import { createSeededRng } from "../src/game/engine/seededRng.js"
import { getDifficultyById } from "../src/constants/gameModesConfig.js"
import { computeGhostScoreAtElapsed } from "../src/utils/replayUtils.js"
import { simulateRound } from "../server/roundRewards.js"

test("Bullseye geometry includes center and boundary, excludes just outside and missing coordinates", () => {
  for (const size of [120, 0.03]) {
    const center = size / 2
    assert.equal(isBullseyeHit(center, center, { x: 0, y: 0 }, size), true)
    assert.equal(isBullseyeHit(center + size / 6, center, { x: 0, y: 0 }, size), true)
    assert.equal(isBullseyeHit(center + size / 6 + 0.00001, center, { x: 0, y: 0 }, size), false)
  }
  assert.equal(isBullseyeHit(undefined, undefined, { x: 0, y: 0 }, 100), false)
})

test("Bullseye multiplies the per-hit product with combos, surge and overclock without changing charges or streak", () => {
  const rules = { basePointsPerHit: 3, scoreMultiplier: 1.2, comboStep: 2, startingPowerupCharges: 1,
    equippedPowerups: [{ id: "surge", effectType: "combo_surge", awardEvery: 2 }, { id: "clock", effectType: "overclock", awardEvery: 2 }] }
  const normal = createRoundSimulation(rules)
  const precise = createRoundSimulation(rules)
  for (const sim of [normal, precise]) { sim.applyPowerup("surge", 0); sim.applyPowerup("clock", 0) }
  for (let i = 1; i <= 6; i++) {
    const a = normal.applyHit(i * 100)
    const b = precise.applyHit(i * 100, { bullseye: true })
    const effectiveStreak = i <= 4 ? i + 4 : i
    assert.equal(b.pointsEarned, Math.round(3 * (1 + Math.floor(effectiveStreak / 2)) * 1.2 * 1.5 * 2))
    assert.equal(b.streak, a.streak)
    assert.equal(b.bestStreak, a.bestStreak)
    assert.deepEqual(b.powerupCharges, a.powerupCharges)
    assert.equal(b.comboSurgeHitsRemaining, a.comboSurgeHitsRemaining)
  }
  assert.equal(precise.getSummary().bullseyes, 6)
  assert.equal(normal.getSummary().bullseyes, 0)
})

test("server derives Bullseyes from seeded pre-hit geometry and agrees with live and ghost scoring", () => {
  const rules = getDifficultyById("normal")
  const options = { seed: 9876, arenaWidth: 600, arenaHeight: 400 }
  const geometry = createGeometrySimulation({ roundRules: rules, ...options, rng: createSeededRng(options.seed), goldRng: createSeededRng(deriveGoldSeed(options.seed)) })
  const live = createRoundSimulation(rules)
  const events = []
  for (let i = 0; i < 12; i++) {
    const { position, buttonSize } = geometry.getState()
    const x = Math.round((position.x + buttonSize * (i % 2 ? 0.9 : 0.5)) * 100) / 100
    const y = Math.round((position.y + buttonSize / 2) * 100) / 100
    const t = i * 100
    events.push({ type: "hit", x, y, t, bullseye: Boolean(i % 2) })
    live.applyHit(t, { bullseye: isBullseyeHit(x, y, position, buttonSize), gold: isGoldHit(geometry.getState(), t) })
    geometry.applyHit(t)
  }
  const result = simulateRound(events, "normal", { ...options, roundSeed: options.seed })
  assert.equal(result.valid, true)
  assert.equal(result.bullseyes, 6)
  assert.equal(result.score, live.getSummary().score)
  assert.equal(replayRoundEvents(rules, events, options).score, result.score)
  assert.equal(computeGhostScoreAtElapsed({ modeId: "normal", seed: options.seed, events, loadoutSnapshot: options }, 2000), result.score)
  const legacy = simulateRound(events, "normal")
  assert.equal(legacy.bullseyes, 0)
  assert.equal(legacy.score, replayRoundEvents(rules, events).score)
  assert.equal(simulateRound(events.map(({ t }) => ({ type: "hit", t, bullseye: true })), "normal").score, legacy.score)
})
