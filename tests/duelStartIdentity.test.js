import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
const source = readFileSync('server/index.js', 'utf8')
const code = source.slice(source.indexOf('app.post("/api/round/start"'), source.indexOf('app.post("/api/round/complete"'))
test('duel start returns the challenge replay identity and seed and binds completion token to challenge', async () => {
  let handler
  const ctx = { app: { post: (p, a, b, h) => { handler = h } }, requireAuth: {}, roundRateLimiter: {},
    getDifficultyById: id => ({ id }), createRoundSeed: () => 99, findChallengeById: async () => ({ replayId: 42, replaySeed: 0, opponentUserId: 2, status: 'accepted', modeId: 'normal' }),
    signRoundToken: value => { assert.equal(value.challengeId, 7); assert.equal(value.seed, 0); return 'token' }, JWT_SECRET: 'test', handleRouteError: e => { throw e } }
  vm.runInNewContext(code, ctx)
  let result
  await handler({ body: { modeId: 'normal', challengeId: 7, replayId: 999 }, auth: { userId: 2 } }, { json: value => { result = value } })
  assert.equal(result.replayId, 42); assert.equal(result.seed, 0); assert.equal(result.roundToken, 'token')
})
