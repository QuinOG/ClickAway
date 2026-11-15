import assert from "node:assert/strict"
import test from "node:test"

import { createRoundClock } from "../src/game/engine/roundClock.js"
import { simulateRound } from "../server/roundRewards.js"

function fakeClock(start = 1_000_000) {
  let value = start
  return { now: () => value, set: (next) => { value = next }, add: (ms) => { value += ms } }
}

test("setting the system clock back never adds round time", () => {
  const wall = fakeClock()
  const clock = createRoundClock(30, 32, wall.now)
  wall.add(10_000)
  assert.equal(clock.elapsedMs(), 10_000)
  assert.equal(clock.remainingMs(), 20_000)

  wall.add(-5_000)
  assert.equal(clock.elapsedMs(), 10_000)
  assert.equal(clock.remainingMs(), 20_000)

  // Time keeps running from where it was, not from the old start.
  wall.add(1_000)
  assert.equal(clock.elapsedMs(), 11_000)
  assert.equal(clock.secondsLeft(), 19)
})

test("a forward jump still counts, as it does for sleep or a suspended tab", () => {
  const wall = fakeClock()
  const clock = createRoundClock(30, 32, wall.now)
  wall.add(25_000)
  assert.equal(clock.remainingMs(), 5_000)
})

test("Time Boost after a clock rollback extends from the real elapsed time", () => {
  const wall = fakeClock()
  const clock = createRoundClock(30, 32, wall.now)
  wall.add(12_000)
  clock.elapsedMs()
  wall.add(-4_000)
  clock.boost()
  assert.equal(clock.remainingMs(), 20_000)
})

test("events recorded across a clock rollback stay in order and replay", () => {
  const wall = fakeClock()
  const clock = createRoundClock(30, 32, wall.now)
  wall.add(10_000)
  const powerT = clock.elapsedMs()
  wall.add(-5_000)
  const missT = clock.elapsedMs()
  wall.add(300)
  const nextMissT = clock.elapsedMs()

  assert.ok(missT >= powerT && nextMissT > missT)
  const events = [
    { type: "powerup", powerupId: "time_boost", t: powerT },
    { type: "miss", t: missT },
    { type: "miss", t: nextMissT },
  ]
  const result = simulateRound(events, "normal")
  assert.notEqual(result.reason, "Events are out of order.")
})
