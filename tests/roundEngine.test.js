import test from "node:test"
import assert from "node:assert/strict"

import { buildRoundRules } from "../src/constants/buildcraft.js"
import { getDifficultyById } from "../src/constants/gameModesConfig.js"
import {
  createRoundSimulation,
  replayRoundEvents,
} from "../src/game/engine/roundEngine.js"
import { createSeededRng } from "../src/game/engine/seededRng.js"
import { simulateRound } from "../server/roundRewards.js"

const GLASS_CANNON_LOADOUT = {
  id: "loadout_3",
  name: "Glass Cannon",
  moduleIds: {
    tempoCoreId: "tempo_overdrive",
    streakLensId: "streak_momentum",
    powerRigId: "power_surge",
  },
  powerupIds: ["time_boost", "size_boost", "freeze_movement"],
}

function buildClickStream(pattern, intervalMs = 100) {
  return pattern.map((type, index) => ({ type, t: (index + 1) * intervalMs }))
}

test("engine matches the legacy base-mode formula for bare hit/miss streams", () => {
  const mode = getDifficultyById("hard")
  const events = buildClickStream([
    "hit", "hit", "hit", "hit", "miss", "hit", "hit", "hit", "hit", "hit", "miss",
  ])

  // Legacy server simulation: mult = 1 + floor(streak / comboStep), miss resets
  // streak and subtracts missPenalty.
  let expectedScore = 0
  let streak = 0
  for (const event of events) {
    if (event.type === "hit") {
      streak += 1
      expectedScore += mode.basePointsPerHit * (1 + Math.floor(streak / mode.comboStep))
    } else {
      streak = 0
      expectedScore = Math.max(0, expectedScore - mode.missPenalty)
    }
  }

  const replay = replayRoundEvents(mode, events)
  assert.equal(replay.valid, true)
  assert.equal(replay.score, expectedScore)
  assert.equal(replay.hits, 9)
  assert.equal(replay.misses, 2)
  assert.equal(replay.bestStreak, 5)
})

test("golden file: ranked round with Glass Cannon loadout and powerups", () => {
  const roundRules = buildRoundRules(getDifficultyById("hard"), GLASS_CANNON_LOADOUT)
  const events = [
    { type: "hit", t: 100 },
    { type: "hit", t: 250 },
    { type: "hit", t: 400 },
    { type: "hit", t: 550 },
    // power_surge rig: time_boost awardEvery 5 * 0.8 = 4 → charge at streak 4.
    { type: "powerup", powerupId: "time_boost", t: 600 },
    { type: "hit", t: 700 },
    { type: "miss", t: 850 },
    { type: "hit", t: 1000 },
    { type: "hit", t: 1150 },
  ]

  const replay = replayRoundEvents(roundRules, events)
  assert.equal(replay.valid, true)
  // Locked outputs: comboStep 4, missPenalty 4, scoreMultiplier 1.18.
  // Trace: streaks 1-3 → mult 1 → round(1.18) = 1 point each; streaks 4-5 →
  // mult 2 → round(2.36) = 2 each (score 7); miss → -4 (score 3); final two
  // hits at streaks 1-2 → 1 each (score 5).
  assert.equal(replay.score, 5)
  assert.equal(replay.hits, 7)
  assert.equal(replay.misses, 1)
  assert.equal(replay.bestStreak, 5)
})

test("powerup event without an earned charge invalidates the round", () => {
  const roundRules = buildRoundRules(getDifficultyById("hard"), GLASS_CANNON_LOADOUT)
  const replay = replayRoundEvents(roundRules, [
    { type: "hit", t: 100 },
    { type: "powerup", powerupId: "time_boost", t: 200 },
  ])

  assert.equal(replay.valid, false)
  assert.match(replay.reason, /without an available charge/)
})

test("guard charge absorbs the next miss within its window", () => {
  const roundRules = buildRoundRules(getDifficultyById("hard"), {
    ...GLASS_CANNON_LOADOUT,
    powerupIds: ["guard_charge", "time_boost", "size_boost"],
  })
  const simulation = createRoundSimulation(roundRules)

  // guard_charge awardEvery 16 * 0.8 (surge rig) = 13 hits to earn a charge.
  const chargesNeeded = roundRules.equippedPowerups
    .find((powerup) => powerup.id === "guard_charge").awardEvery
  for (let i = 0; i < chargesNeeded; i++) simulation.applyHit(100 * (i + 1))

  const beforeGuard = simulation.getState()
  assert.equal(beforeGuard.powerupCharges.guard_charge, 1)

  const activation = simulation.applyPowerup("guard_charge", 1400)
  assert.equal(activation.applied, true)

  const guardedMiss = simulation.applyMiss(1500)
  assert.equal(guardedMiss.guarded, true)
  assert.equal(guardedMiss.penaltyApplied, 0)
  assert.equal(guardedMiss.streak, beforeGuard.streak)
  assert.equal(guardedMiss.score, beforeGuard.score)

  // Guard is consumed: the next miss resets streak and applies the penalty.
  const unguardedMiss = simulation.applyMiss(1600)
  assert.equal(unguardedMiss.guarded, false)
  assert.equal(unguardedMiss.streak, 0)
  assert.equal(unguardedMiss.penaltyApplied, roundRules.missPenalty)
})

test("guard expires after its window in event time", () => {
  const roundRules = buildRoundRules(getDifficultyById("hard"), {
    ...GLASS_CANNON_LOADOUT,
    powerupIds: ["guard_charge", "time_boost", "size_boost"],
  })
  const simulation = createRoundSimulation(roundRules)
  const awardEvery = roundRules.equippedPowerups
    .find((powerup) => powerup.id === "guard_charge").awardEvery
  for (let i = 0; i < awardEvery; i++) simulation.applyHit(100 * (i + 1))

  simulation.applyPowerup("guard_charge", 2000)
  const lateMiss = simulation.applyMiss(2000 + 8000 + 1)
  assert.equal(lateMiss.guarded, false)
})

test("combo surge boosts exactly the next four hits", () => {
  const mode = getDifficultyById("hard") // comboStep 4
  const roundRules = buildRoundRules(mode, {
    ...GLASS_CANNON_LOADOUT,
    moduleIds: {
      tempoCoreId: "tempo_balanced",
      streakLensId: "streak_balanced",
      powerRigId: "power_balanced",
    },
    powerupIds: ["combo_surge", "time_boost", "size_boost"],
  })
  const simulation = createRoundSimulation(roundRules)

  const awardEvery = roundRules.equippedPowerups
    .find((powerup) => powerup.id === "combo_surge").awardEvery
  for (let i = 0; i < awardEvery; i++) simulation.applyHit(100 * (i + 1))

  const activation = simulation.applyPowerup("combo_surge", 1500)
  assert.equal(activation.applied, true)
  assert.equal(activation.comboSurgeHitsRemaining, 4)

  // Next hit scores as if streak were 4 higher.
  const streakBefore = simulation.getState().streak
  const boostedHit = simulation.applyHit(1600)
  const expectedBoostedPoints = Math.max(1, Math.round(
    mode.basePointsPerHit * (1 + Math.floor((streakBefore + 1 + 4) / mode.comboStep))
  ))
  assert.equal(boostedHit.pointsEarned, expectedBoostedPoints)
  assert.equal(boostedHit.comboSurgeHitsRemaining, 3)
})

test("client simulation and server simulateRound agree on loadout rounds", () => {
  const modeId = "normal"
  const roundRules = buildRoundRules(getDifficultyById(modeId), GLASS_CANNON_LOADOUT)
  const clientSimulation = createRoundSimulation(roundRules)
  const events = []
  let t = 0

  for (let i = 0; i < 30; i++) {
    t += 120
    const isMiss = i % 7 === 6
    events.push({ type: isMiss ? "miss" : "hit", t })
    if (isMiss) {
      clientSimulation.applyMiss(t)
    } else {
      const result = clientSimulation.applyHit(t)
      result.grantedPowerups.forEach((powerup) => {
        // Client immediately spends time_boost charges as they arrive.
        if (powerup.id !== "time_boost") return
        t += 10
        const outcome = clientSimulation.applyPowerup("time_boost", t)
        if (outcome.applied) {
          events.push({ type: "powerup", powerupId: "time_boost", t })
        }
      })
    }
  }

  const clientSummary = clientSimulation.getSummary()
  const serverResult = simulateRound(events, modeId, {
    loadoutSnapshot: {
      loadoutId: GLASS_CANNON_LOADOUT.id,
      loadoutName: GLASS_CANNON_LOADOUT.name,
      moduleIds: GLASS_CANNON_LOADOUT.moduleIds,
      powerupIds: GLASS_CANNON_LOADOUT.powerupIds,
    },
    playerLevel: 20,
  })

  assert.equal(serverResult.valid, true)
  assert.equal(serverResult.score, clientSummary.score)
  assert.equal(serverResult.hits, clientSummary.hits)
  assert.equal(serverResult.misses, clientSummary.misses)
  assert.equal(serverResult.bestStreak, clientSummary.bestStreak)
})

test("server simulateRound still accepts bare legacy submissions", () => {
  const events = buildClickStream(["hit", "hit", "hit", "miss", "hit"])
  const result = simulateRound(events, "normal")

  assert.equal(result.valid, true)
  assert.equal(result.hits, 4)
  assert.equal(result.misses, 1)
  assert.equal(result.loadoutSnapshot, null)
})

test("server simulateRound rejects inhuman, out-of-order, and overlong streams", () => {
  assert.equal(
    simulateRound([{ type: "hit", t: 100 }, { type: "hit", t: 150 }], "hard").valid,
    false
  )
  assert.equal(
    simulateRound([{ type: "hit", t: 200 }, { type: "hit", t: 100 }], "hard").valid,
    false
  )
  assert.equal(
    simulateRound([{ type: "hit", t: 24 * 1000 + 1 }], "hard").valid,
    false
  )
  assert.equal(simulateRound([{ type: "teleport", t: 100 }], "hard").valid, false)
})

test("server clamps loadout snapshots to the player's unlocked level", () => {
  // guard_charge unlocks at level 11 — a level-1 player claiming it gets the
  // starter powerups instead, so its activation event is illegal.
  const result = simulateRound(
    [
      { type: "hit", t: 100 },
      { type: "powerup", powerupId: "guard_charge", t: 200 },
    ],
    "hard",
    {
      loadoutSnapshot: {
        loadoutId: "loadout_1",
        loadoutName: "Forged",
        moduleIds: {
          tempoCoreId: "tempo_balanced",
          streakLensId: "streak_balanced",
          powerRigId: "power_balanced",
        },
        powerupIds: ["guard_charge", "time_boost", "size_boost"],
      },
      playerLevel: 1,
    }
  )

  assert.equal(result.valid, false)
  assert.match(result.reason, /Unknown powerup/)
})

test("seeded rng is deterministic and uniform-ish", () => {
  const first = createSeededRng(1234)
  const second = createSeededRng(1234)
  const other = createSeededRng(4321)

  const firstSequence = Array.from({ length: 5 }, () => first())
  const secondSequence = Array.from({ length: 5 }, () => second())
  const otherSequence = Array.from({ length: 5 }, () => other())

  assert.deepEqual(firstSequence, secondSequence)
  assert.notDeepEqual(firstSequence, otherSequence)
  firstSequence.forEach((value) => {
    assert.ok(value >= 0 && value < 1)
  })
})
