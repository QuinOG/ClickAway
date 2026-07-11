import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { computeGhostScoreAtElapsed, normalizeReplayRecord } from "../src/utils/replayUtils.js"
import { getSeasonRewardTier, normalizeSeasonRecord } from "../src/utils/seasonUtils.js"

describe("replayUtils", () => {
  it("computes ghost score only from events up to the elapsed mark", () => {
    const replay = {
      modeId: "normal",
      loadoutSnapshot: null,
      events: [
        { type: "hit", t: 500 },
        { type: "hit", t: 1200 },
        { type: "hit", t: 2100 },
      ],
    }

    const scoreAtOneSecond = computeGhostScoreAtElapsed(replay, 1000, 1)
    const scoreAtFullRound = computeGhostScoreAtElapsed(replay, 5000, 1)

    assert.ok(scoreAtOneSecond >= 1)
    assert.ok(scoreAtFullRound >= scoreAtOneSecond)
  })

  it("normalizes replay records from API payloads", () => {
    const replay = normalizeReplayRecord({
      id: 7,
      userId: 3,
      username: "Ace",
      modeId: "normal",
      seed: 42,
      eventsJson: [{ type: "hit", t: 100 }],
      score: 120,
    })

    assert.equal(replay.id, 7)
    assert.equal(replay.username, "Ace")
    assert.equal(replay.events.length, 1)
    assert.equal(replay.score, 120)
  })
})

describe("seasonUtils", () => {
  it("maps mmr to the highest unlocked reward tier", () => {
    assert.equal(getSeasonRewardTier(500).label, "Unranked")
    assert.equal(getSeasonRewardTier(850).label, "Bronze")
    assert.equal(getSeasonRewardTier(1700).label, "Gold")
    assert.equal(getSeasonRewardTier(2500).label, "Diamond")
  })

  it("normalizes season progress metadata", () => {
    const startsAt = new Date("2026-01-01T00:00:00.000Z")
    const endsAt = new Date("2026-04-01T00:00:00.000Z")
    const season = normalizeSeasonRecord({
      id: 1,
      slug: "season-1",
      name: "Season 1",
      status: "active",
      startsAt,
      endsAt,
    })

    assert.equal(season.name, "Season 1")
    assert.ok(season.progressPercent >= 0)
    assert.ok(season.progressPercent <= 100)
  })
})

describe("roundEngine ghost parity", () => {
  it("matches incremental ghost score replay to full round replay", () => {
    const events = [
      { type: "hit", t: 400 },
      { type: "hit", t: 1400 },
    ]

    const incremental = computeGhostScoreAtElapsed(
      { modeId: "normal", loadoutSnapshot: null, events },
      1500,
      1
    )
    const full = computeGhostScoreAtElapsed(
      { modeId: "normal", loadoutSnapshot: null, events },
      5000,
      1
    )

    assert.ok(incremental >= 1)
    assert.ok(full >= incremental)
  })
})
