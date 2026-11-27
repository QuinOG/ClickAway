import test from "node:test"
import assert from "node:assert/strict"
import { simulateRound } from "../server/roundRewards.js"
import { getDifficultyById } from "../src/constants/gameModesConfig.js"
import { replayRoundEvents } from "../src/game/engine/roundEngine.js"
import { createGeometrySimulation } from "../src/game/engine/roundGeometry.js"
import { createSeededRng } from "../src/game/engine/seededRng.js"

test("server derives the rounded mean and fastest time from hits on seeded targets", () => {
  const options = { roundSeed: 42, arenaWidth: 600, arenaHeight: 400 }
  const geometry = createGeometrySimulation({
    ...options,
    roundRules: getDifficultyById("normal"),
    rng: createSeededRng(options.roundSeed),
  })
  const events = [251, 451, 931].map((t) => {
    const { position, buttonSize } = geometry.getState()
    geometry.applyHit(t)
    return { type: "hit", t, x: position.x + buttonSize / 2, y: position.y + buttonSize / 2 }
  })

  const result = simulateRound(events, "normal", options)

  assert.equal(result.valid, true)
  assert.equal(result.hits, 3)
  assert.equal(result.avgReactionMs, 310)
  assert.equal(result.bestReactionMs, 200)
})

test("a round without hits has no reaction measurements", () => {
  const result = simulateRound([{ type: "miss", t: 120 }], "normal")

  assert.equal(result.valid, true)
  assert.equal(result.avgReactionMs, null)
  assert.equal(result.bestReactionMs, null)
})

test("a miss does not restart the reaction timer", () => {
  const result = simulateRound([
    { type: "hit", t: 300 },
    { type: "miss", t: 800 },
    { type: "hit", t: 900 },
  ], "normal")

  assert.equal(result.valid, true)
  assert.equal(result.misses, 1)
  assert.equal(result.avgReactionMs, 450)
  assert.equal(result.bestReactionMs, 300)
})

test("Magnet restarts the reaction timer when it moves the target", () => {
  const rules = {
    startingPowerupCharges: 1,
    equippedPowerups: [{ id: "magnet", effectType: "magnet_center", awardEvery: 5 }],
  }
  const result = replayRoundEvents(rules, [
    { type: "hit", t: 300 },
    { type: "powerup", powerupId: "magnet", t: 800 },
    { type: "hit", t: 900 },
  ])

  assert.equal(result.valid, true)
  assert.equal(result.avgReactionMs, 200)
  assert.equal(result.bestReactionMs, 100)
})
