import { parsePositiveIntId } from "../server/positiveIntId.js"
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { isRaceableReplay } from '../server/roundRewards.js'
const source = readFileSync('server/index.js', 'utf8')
const code = source.slice(source.indexOf('app.post("/api/round/start"'), source.indexOf('app.post("/api/round/complete"'))
function duelStart(replay) {
  let handler
  const ctx = { parsePositiveIntId, app: { post: (p, a, b, h) => { handler = h } }, requireAuth: {}, roundRateLimiter: {}, isRaceableReplay, findReplayById: async () => replay,
    getDifficultyById: id => ({ id }), createRoundSeed: () => 99, findChallengeById: async () => ({ replayId: 42, replaySeed: 0, opponentUserId: 2, status: 'accepted', modeId: 'normal' }),
    signRoundToken: value => { assert.equal(value.challengeId, 7); assert.equal(value.seed, 0); return 'token' }, JWT_SECRET: 'test', handleRouteError: e => { throw e } }
  vm.runInNewContext(code, ctx)
  return handler
}

test('duel start returns the challenge replay identity and seed and binds completion token to challenge', async () => {
  const handler = duelStart({ id: 42, loadoutSnapshot: { arenaWidth: 600, arenaHeight: 400 } })
  let result
  await handler({ body: { modeId: 'normal', challengeId: 7, replayId: 999 }, auth: { userId: 2 } }, { json: value => { result = value } })
  assert.equal(result.replayId, 42); assert.equal(result.seed, 0); assert.equal(result.roundToken, 'token')
})

test('an open duel against a replay saved before Bullseye and Gold cannot be raced', async () => {
  const handler = duelStart({ id: 42, loadoutSnapshot: { equippedPowerups: [] } })
  let status, body
  await handler({ body: { modeId: 'normal', challengeId: 7 }, auth: { userId: 2 } }, { status(code) { status = code; return this }, json(value) { body = value } })
  assert.equal(status, 400); assert.match(body.error, /cannot be raced/)
})
