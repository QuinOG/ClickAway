import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
const db = readFileSync('server/playerMysqlDatabase.js', 'utf8')
const server = readFileSync('server/index.js', 'utf8')
const createCode = db.slice(db.indexOf('export async function createUser('), db.indexOf('export async function updateUserPassword(')).replace('export ', '')
const signupCode = server.slice(server.indexOf('app.post("/api/auth/signup"'), server.indexOf('app.post("/api/auth/login"'))
test('createUser returns the INSERT identity, including admin hash and role, without another read', async () => {
  for (const role of ['player', 'admin']) {
    const ctx = { pool: { execute: async (sql, args) => {
      assert.match(sql, /RETURNING id, username, password_hash AS passwordHash, role/)
      return [{ rows: [{ id: 17, username: args[0], passwordHash: args[1], role: args[2] }] }]
    } }, BUILD_WALKTHROUGH_STATUS: {}, mapUserRow: x => x, findUserById: () => { throw Error('unexpected read') } }
    vm.runInNewContext(createCode, ctx)
    assert.deepEqual(await ctx.createUser({ username: 'player', passwordHash: 'hash', role }), { id: 17, username: 'player', passwordHash: 'hash', role })
  }
})
test('signup distinguishes username races, unrelated insert errors and post-create failure', async () => {
  let handler
  let inserts = 0
  const ctx = { app: { post: (p, l, h) => { handler = h } }, authRateLimiter: {},
    sanitizeUsername: x => x, sanitizePassword: x => x, validateUsername: () => '', validatePassword: () => '',
    findUserByUsername: async () => null, bcrypt: { hash: async () => 'hash' },
    createUser: async () => { if (++inserts > 1) throw Object.assign(Error('duplicate'), { code: '23505', constraint: 'users_username_key' }); return { id: 1 } },
    playerStateStore: { ensurePlayerUser: async () => {} }, createAuthResponse: async () => ({ user: { id: 1 } }),
    handleRouteError: (e, r) => r.status(500).json({ error: e.message }), console: { error() {} } }
  vm.runInNewContext(signupCode, ctx)
  const run = async () => { const r = { code: 200, status(n) { this.code = n; return this }, json(v) { this.body = v } }; await handler({ body: { username: 'player', password: 'password123' } }, r); return r }
  assert.deepEqual((await Promise.all([run(), run()])).map(r => r.code).sort(), [201, 409])
  for (const error of [Object.assign(Error('other unique'), { code: '23505', constraint: 'other_key' }), Error('offline')]) {
    ctx.createUser = async () => { throw error }; assert.equal((await run()).code, 500)
  }
  ctx.createUser = async () => ({ id: 1 })
  ctx.playerStateStore.ensurePlayerUser = async () => { throw Error('progress') }
  const r = await run(); assert.equal(r.code, 503); assert.equal(r.body.code, 'account_created')
})
