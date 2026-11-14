import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import vm from "node:vm"

const source = readFileSync("server/playerMysqlDatabase.js", "utf8")
const create = source.slice(source.indexOf("export async function createChallenge("), source.indexOf("export async function findChallengeById("))
const transitions = source.slice(source.indexOf("export async function respondToChallenge("), source.indexOf("export default pool"))
const inputs = { challengeId: 11, userId: 2, action: "accept", opponentReplayId: 8,
  challengerUserId: 1, challengerUsername: "Player", opponentUserId: 2, opponentUsername: "Rival",
  replayId: 7, modeId: "normal", message: "a".repeat(300) }

function harness(name, { failWrite = false, affectedRows = 1, failRead = true } = {}) {
  let reads = 0
  let writes = 0
  const logs = []
  const before = { id: 11, challengerUserId: 1, opponentUserId: 2,
    status: name === "respondToChallenge" ? "pending" : "accepted",
    replayId: 7, modeId: "normal", replaySeed: 0, replayScore: 20 }
  const context = {
    console: { error: (...args) => logs.push(args) },
    pool: { execute: async () => {
      writes++
      if (failWrite) throw new Error("write failed")
      return [{ insertId: 11, affectedRows }]
    } },
    findChallengeById: async () => {
      reads++
      if (failRead && (name === "createChallenge" || reads > 1)) throw new Error("read failed")
      return before
    },
    findReplayById: async () => ({ id: 8, userId: 2, modeId: "normal", seed: 0, score: 30 }),
    toNonNegativeNumber: (value, fallback) => Math.max(0, Number(value) || fallback),
  }
  vm.runInNewContext((create + transitions).replaceAll("export async function", "async function"), context)
  return { run: () => context[name](inputs), logs, before, writes: () => writes }
}

for (const name of ["createChallenge", "respondToChallenge", "completeChallenge"]) {
  test(`${name} returns the saved change when its final read fails`, async () => {
    const h = harness(name)
    const result = await h.run()
    assert.equal(h.writes(), 1)
    assert.equal(h.logs.length, 1)
    assert.match(h.logs[0][1].message, /read failed/)
    const challenge = name === "createChallenge" ? result : result.challenge
    assert.equal(challenge.id, 11)
    if (name === "createChallenge") {
      assert.equal(challenge.status, "pending")
      for (const key of ["challengerUserId", "challengerUsername", "opponentUserId", "opponentUsername", "replayId", "modeId"]) {
        assert.equal(challenge[key], inputs[key])
      }
      assert.equal(challenge.message, "a".repeat(280))
      assert.equal(challenge.replayScore, null)
      assert.equal(challenge.createdAt, null)
    } else {
      assert.equal(result.ok, true)
      assert.equal(challenge.replaySeed, h.before.replaySeed)
      assert.equal(challenge.status, name === "respondToChallenge" ? "accepted" : "completed")
      if (name === "completeChallenge") {
        assert.equal(challenge.opponentReplayId, 8)
        assert.equal(challenge.opponentReplayScore, 30)
        assert.equal(challenge.challengerWon, false)
        assert.equal(result.challengerWon, false)
      }
    }
  })

  test(`${name} still rejects a failed write`, async () => {
    const h = harness(name, { failWrite: true })
    await assert.rejects(h.run(), /write failed/)
    assert.equal(h.logs.length, 0)
  })

  if (name !== "createChallenge") {
    test(`${name} still rejects a write whose status condition no longer matches`, async () => {
      const h = harness(name, { affectedRows: 0 })
      assert.equal((await h.run()).ok, false)
      assert.equal(h.logs.length, 0)
    })
  }
}
