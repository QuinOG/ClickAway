import test from "node:test"
import assert from "node:assert/strict"

import { getDifficultyById } from "../src/constants/gameModesConfig.js"
import { simulateRound } from "../server/roundRewards.js"
import {
  createGeometrySimulation,
  getCenteredPosition,
  getRandomPosition,
  validateRoundGeometry,
} from "../src/game/engine/roundGeometry.js"
import { createSeededRng } from "../src/game/engine/seededRng.js"

const ARENA = { arenaWidth: 640, arenaHeight: 400 }
const SEED = 918273

test("geometry engine reproduces seeded button positions", () => {
  const mode = getDifficultyById("hard")
  const rng = createSeededRng(SEED)
  const simulation = createGeometrySimulation({
    roundRules: mode,
    arenaWidth: ARENA.arenaWidth,
    arenaHeight: ARENA.arenaHeight,
    rng,
  })

  const centered = getCenteredPosition(ARENA.arenaWidth, ARENA.arenaHeight, mode.initialButtonSize)
  assert.deepEqual(simulation.getState().position, centered)

  simulation.applyHit(500)
  const firstReposition = simulation.getState().position

  const replayRng = createSeededRng(SEED)
  const replaySimulation = createGeometrySimulation({
    roundRules: mode,
    arenaWidth: ARENA.arenaWidth,
    arenaHeight: ARENA.arenaHeight,
    rng: replayRng,
  })
  replaySimulation.applyHit(500)

  assert.deepEqual(replaySimulation.getState().position, firstReposition)
  assert.notDeepEqual(firstReposition, centered)
})

test("golden file: geometry replay accepts in-bounds ranked hits", () => {
  const mode = getDifficultyById("hard")
  const rng = createSeededRng(SEED)
  const simulation = createGeometrySimulation({
    roundRules: mode,
    arenaWidth: ARENA.arenaWidth,
    arenaHeight: ARENA.arenaHeight,
    rng,
  })

  const firstHit = {
    type: "hit",
    t: 500,
    x: simulation.getState().position.x + 4,
    y: simulation.getState().position.y + 4,
  }
  simulation.applyHit(firstHit.t)

  const secondHit = {
    type: "hit",
    t: 1200,
    x: simulation.getState().position.x + 2,
    y: simulation.getState().position.y + 2,
  }

  const events = [firstHit, secondHit]
  const geometry = validateRoundGeometry(mode, events, { seed: SEED, ...ARENA })

  assert.equal(geometry.valid, true)
  assert.equal(geometry.buttonSize, 84)
})

test("geometry replay rejects hits outside the active target", () => {
  const mode = getDifficultyById("hard")
  const centered = getCenteredPosition(ARENA.arenaWidth, ARENA.arenaHeight, mode.initialButtonSize)
  const geometry = validateRoundGeometry(mode, [
    {
      type: "hit",
      t: 400,
      x: centered.x + mode.initialButtonSize + 5,
      y: centered.y + 5,
    },
  ], { seed: SEED, ...ARENA })

  assert.equal(geometry.valid, false)
  assert.match(geometry.reason, /outside the target/)
})

test("ranked simulateRound requires a round seed and validates geometry", () => {
  const mode = getDifficultyById("hard")
  const rng = createSeededRng(SEED)
  const simulation = createGeometrySimulation({
    roundRules: mode,
    arenaWidth: ARENA.arenaWidth,
    arenaHeight: ARENA.arenaHeight,
    rng,
  })
  const hit = {
    type: "hit",
    t: 500,
    x: simulation.getState().position.x + 3,
    y: simulation.getState().position.y + 3,
  }

  const withoutSeed = simulateRound([hit], "hard", {
    arenaWidth: ARENA.arenaWidth,
    arenaHeight: ARENA.arenaHeight,
  })
  assert.equal(withoutSeed.valid, false)
  assert.match(withoutSeed.reason, /round seed/)

  const withSeed = simulateRound([hit], "hard", {
    roundSeed: SEED,
    arenaWidth: ARENA.arenaWidth,
    arenaHeight: ARENA.arenaHeight,
  })
  assert.equal(withSeed.valid, true)
  assert.equal(withSeed.hits, 1)
})

test("getRandomPosition stays inside arena bounds", () => {
  const rng = createSeededRng(SEED)
  for (let i = 0; i < 25; i += 1) {
    const position = getRandomPosition(ARENA.arenaWidth, ARENA.arenaHeight, 48, rng)
    assert.ok(position.x >= 0 && position.x <= ARENA.arenaWidth - 48)
    assert.ok(position.y >= 0 && position.y <= ARENA.arenaHeight - 48)
  }
})
