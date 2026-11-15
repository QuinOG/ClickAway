import test from "node:test"
import assert from "node:assert/strict"
import { createGeometrySimulation, deriveGoldSeed, isGoldHit, isBullseyeHit, GOLD_TARGET_WINDOW_MS } from "../src/game/engine/roundGeometry.js"
import { createSeededRng } from "../src/game/engine/seededRng.js"
import { createRoundSimulation } from "../src/game/engine/roundEngine.js"
import { simulateRound } from "../server/roundRewards.js"
import { getDifficultyById } from "../src/constants/gameModesConfig.js"

const arena = { arenaWidth: 600, arenaHeight: 400 }
const rules = getDifficultyById("normal")
function geometry(seed, gold = true) {
  return createGeometrySimulation({ roundRules: rules, ...arena, rng: createSeededRng(seed),
    goldRng: gold ? createSeededRng(deriveGoldSeed(seed)) : null })
}

test("gold uses deterministic independent draws and preserves all positions; first and seedless targets never gold", () => {
  for (const seed of [0, 1, 42, 9876, 0xffffffff]) {
    const a = geometry(seed), b = geometry(seed), legacy = geometry(seed, false)
    const rolls = createSeededRng(deriveGoldSeed(seed))
    assert.equal(a.getState().isGold, false)
    for (let i = 1; i <= 100; i++) {
      const state = a.applyHit(i * 100)
      assert.deepEqual(state, b.applyHit(i * 100))
      const old = legacy.applyHit(i * 100)
      assert.deepEqual(state.position, old.position)
      assert.equal(state.buttonSize, old.buttonSize)
      assert.equal(old.isGold, false)
      assert.equal(state.isGold, rolls() < 0.1)
      assert.equal(state.spawnIndex, i)
      assert.equal(state.spawnedAtMs, i * 100)
    }
  }
})

test("gold window includes 1500ms but excludes 1501ms; powers do not spawn", () => {
  let draws = 0
  const sim = createGeometrySimulation({ ...arena, goldRng: () => { draws++; return 0 },
    roundRules: { equippedPowerups: [{ id: "grow", effectType: "size_boost" }, { id: "freeze", effectType: "freeze_movement" }, { id: "magnet", effectType: "magnet_center" }] } })
  sim.applyHit(100)
  for (const id of ["grow", "freeze", "magnet"]) sim.applyPowerup(id, 200)
  assert.equal(draws, 1)
  assert.equal(sim.getState().spawnIndex, 1)
  assert.equal(isGoldHit(sim.getState(), 100 + GOLD_TARGET_WINDOW_MS), true)
  assert.equal(isGoldHit(sim.getState(), 1601), false)
})

test("gold triples the full product and stacks with bullseye, combos, surge and overclock", () => {
  for (const bullseye of [false, true]) {
    const plain = createRoundSimulation()
    assert.equal(plain.applyHit(0, { gold: true, bullseye }).pointsEarned, bullseye ? 6 : 3)
    const sim = createRoundSimulation({ basePointsPerHit: 3, scoreMultiplier: 1.2, comboStep: 2, startingPowerupCharges: 1,
      equippedPowerups: [{ id: "s", effectType: "combo_surge", awardEvery: 2 }, { id: "o", effectType: "overclock", awardEvery: 2 }] })
    sim.applyPowerup("s", 0); sim.applyPowerup("o", 0)
    for (let i = 1; i <= 6; i++) {
      const result = sim.applyHit(i * 100, { gold: true, bullseye })
      assert.equal(result.pointsEarned, Math.round(3 * 1.2 * (1 + Math.floor((i <= 4 ? i + 4 : i) / 2)) * 1.5 * 3 * (bullseye ? 2 : 1)))
      assert.equal(result.goldHits, i)
    }
    assert.equal(sim.getSummary().goldHits, 6)
  }
})

test("authoritative server matches real client geometry, expires gold and ignores forged flags; seedless unchanged", () => {
  for (const delay of [100, 1500, 1501]) {
    const seed = 38, geo = geometry(seed), live = createRoundSimulation(rules), events = []
    let t = 0, expectedGold = 0
    for (let i = 0; i < 16; i++) {
      const state = geo.getState()
      t += delay
      const x = state.position.x + state.buttonSize / 2, y = state.position.y + state.buttonSize / 2
      const gold = isGoldHit(state, t)
      expectedGold += Number(gold)
      live.applyHit(t, { bullseye: isBullseyeHit(x, y, state.position, state.buttonSize), gold })
      events.push({ type: "hit", t, x, y, gold: !gold })
      geo.applyHit(t)
    }
    const result = simulateRound(events, "normal", { roundSeed: seed, ...arena })
    assert.equal(result.valid, true)
    assert.equal(result.score, live.getSummary().score)
    assert.equal(result.goldHits, expectedGold)
    assert.equal(expectedGold > 0, delay <= 1500)
    const legacy = simulateRound(events, "normal")
    const honest = simulateRound(events.map(({ t }) => ({ type: "hit", t })), "normal")
    assert.deepEqual(legacy, honest)
    assert.equal(legacy.goldHits, 0)
  }
})
