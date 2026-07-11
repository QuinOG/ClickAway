import test from "node:test"
import assert from "node:assert/strict"

import { FEEDBACK_EVENTS } from "../src/constants/feedbackEvents.js"
import {
  FeedbackService,
  createFeedbackEventGate,
} from "../src/services/feedbackService.js"

class FakeAudioParam {
  constructor() {
    this.values = []
  }

  setValueAtTime(value) {
    this.values.push(value)
  }

  exponentialRampToValueAtTime(value) {
    this.values.push(value)
  }
}

class FakeNode {
  connect() {}
  disconnect() {}
}

class FakeOscillator extends FakeNode {
  constructor() {
    super()
    this.frequency = new FakeAudioParam()
    this.listeners = new Map()
    this.stopCount = 0
  }

  addEventListener(name, callback) {
    this.listeners.set(name, callback)
  }

  start() {}

  stop() {
    this.stopCount += 1
  }
}

class FakeGain extends FakeNode {
  constructor() {
    super()
    this.gain = new FakeAudioParam()
  }
}

class FakeAudioContext {
  constructor() {
    this.state = "running"
    this.currentTime = 0
    this.destination = new FakeNode()
    this.oscillators = []
  }

  createOscillator() {
    const oscillator = new FakeOscillator()
    this.oscillators.push(oscillator)
    return oscillator
  }

  createGain() {
    return new FakeGain()
  }

  async resume() {
    this.state = "running"
  }

  async close() {
    this.state = "closed"
  }
}

class ThrowingAudioContext extends FakeAudioContext {
  createOscillator() {
    throw new DOMException("Audio hardware failed", "NotSupportedError")
  }
}

test("feedback event gate rejects a duplicate id only inside its window", () => {
  let currentTime = 100
  const gate = createFeedbackEventGate({
    duplicateWindowMs: 50,
    now: () => currentTime,
  })

  assert.equal(gate.shouldDispatch("hit:1"), true)
  assert.equal(gate.shouldDispatch("hit:1"), false)
  currentTime += 51
  assert.equal(gate.shouldDispatch("hit:1"), true)
})

test("feedback service remains silent until trusted activation unlocks audio", async () => {
  const service = new FeedbackService({ AudioContextConstructor: FakeAudioContext })
  assert.equal(service.dispatch(FEEDBACK_EVENTS.HIT).played, false)
  assert.equal(await service.unlock(), true)
  assert.equal(service.dispatch(FEEDBACK_EVENTS.HIT).played, true)
  await service.destroy()
})

test("feedback service deduplicates matching event ids but permits rapid distinct hits", async () => {
  const service = new FeedbackService({ AudioContextConstructor: FakeAudioContext })
  await service.unlock()

  assert.equal(service.dispatch(FEEDBACK_EVENTS.HIT, { eventId: "1" }).played, true)
  assert.equal(service.dispatch(FEEDBACK_EVENTS.HIT, { eventId: "1" }).reason, "duplicate")
  assert.equal(service.dispatch(FEEDBACK_EVENTS.HIT, { eventId: "2" }).played, true)
  assert.equal(
    service.dispatch(FEEDBACK_EVENTS.MISS, { eventId: "1" }).played,
    true
  )
  await service.destroy()
})

test("feedback service honors mute, haptic opt-in, voice caps, and scope stops", async () => {
  const vibrations = []
  const service = new FeedbackService({
    AudioContextConstructor: FakeAudioContext,
    vibrate: (pattern) => {
      vibrations.push(pattern)
      return true
    },
    maxVoices: 2,
  })
  await service.unlock()

  service.configure({ muted: true, haptics: false })
  assert.deepEqual(
    service.dispatch(FEEDBACK_EVENTS.MISS),
    { played: false, vibrated: false, reason: "muted" }
  )

  service.configure({ muted: false, haptics: true })
  const result = service.dispatch(FEEDBACK_EVENTS.HIT, { scope: "round" })
  assert.equal(result.played, true)
  assert.equal(result.vibrated, true)
  assert.ok(vibrations.length > 0)
  assert.ok(service.voices.size <= 2)

  service.stopScope("round")
  assert.equal(service.voices.size, 0)
  await service.destroy()
})

test("feedback failures never throw through a gameplay input handler", async () => {
  const service = new FeedbackService({ AudioContextConstructor: ThrowingAudioContext })
  await service.unlock()

  assert.doesNotThrow(() => {
    const result = service.dispatch(FEEDBACK_EVENTS.HIT, { eventId: "gameplay-hit" })
    assert.equal(result.played, false)
  })
  assert.equal(service.getStatus().audio, "unavailable")
  await service.destroy()
})

test("a suspended audio context stays silent until a later activation resumes it", async () => {
  const service = new FeedbackService({ AudioContextConstructor: FakeAudioContext })
  await service.unlock()
  service.audioContext.state = "suspended"

  const suspendedResult = service.dispatch(FEEDBACK_EVENTS.COUNTDOWN_TICK)
  assert.equal(suspendedResult.played, false)
  assert.equal(service.getStatus().audio, "locked")

  assert.equal(await service.unlock(), true)
  assert.equal(service.dispatch(FEEDBACK_EVENTS.COUNTDOWN_TICK).played, true)
  await service.destroy()
})

test("muting cancels active voices and any vibration pattern", async () => {
  const vibrations = []
  const service = new FeedbackService({
    AudioContextConstructor: FakeAudioContext,
    vibrate: (pattern) => {
      vibrations.push(pattern)
      return true
    },
  })
  await service.unlock()
  service.configure({ haptics: true, muted: false })
  service.dispatch(FEEDBACK_EVENTS.HIT, { scope: "round" })
  assert.ok(service.voices.size > 0)

  service.configure({ muted: true })
  assert.equal(service.voices.size, 0)
  assert.equal(vibrations.at(-1), 0)
  await service.destroy()
})
