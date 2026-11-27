import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { sanitizeUsername, sanitizePassword, validateUsername, validatePassword } from '../server/validation.js'
const source = readFileSync('server/app.js', 'utf8')
for (const [length, status] of [[24, 201], [25, 400]]) {
  test(`signup username ${length} characters returns ${status}`, async () => {
    let handler
    let created = false
    const context = { app: { post: (_path, _limiter, callback) => { handler = callback } }, authRateLimiter: {},
      sanitizeUsername, sanitizePassword, validateUsername, validatePassword,
      findUserByUsername: async () => null, bcrypt: { hash: async () => 'hash' },
      createUser: async ({ username }) => { created = true; return { id: 1, username } },
      playerStateStore: { ensurePlayerUser: async () => {} }, createAuthResponse: async user => ({ user }),
      handleRouteError: error => { throw error }, console }
    vm.runInNewContext(source.slice(source.indexOf('app.post("/api/auth/signup"'), source.indexOf('app.post("/api/auth/login"')), context)
    const response = { code: 200, status(code) { this.code = code; return this }, json(body) { this.body = body } }
    await handler({ body: { username: 'x'.repeat(length), password: 'password123' } }, response)
    assert.equal(response.code, status)
    assert.equal(created, status === 201)
    if (status === 400) assert.match(response.body.error, /24 characters/)
  })
}
test('existing 30-character username still logs in', async () => {
  let handler
  const username = 'x'.repeat(30)
  const user = { id: 1, username, passwordHash: 'hash' }
  const context = { app: { post: (_path, _limiter, callback) => { handler = callback } }, authRateLimiter: {},
    sanitizeUsername, sanitizePassword, validateUsername: () => { throw Error('login must not apply signup limit') },
    findUserByUsername: async name => { assert.equal(name, username); return user }, bcrypt: { compare: async () => true },
    playerStateStore: { ensurePlayerUser: async () => {} }, createAuthResponse: async value => ({ user: value }),
    handleRouteError: error => { throw error } }
  vm.runInNewContext(source.slice(source.indexOf('app.post("/api/auth/login"'), source.indexOf('app.post("/api/auth/logout"')), context)
  const response = { status() { throw Error('unexpected login error') }, json(body) { this.body = body } }
  await handler({ body: { username, password: 'password123' } }, response)
  assert.equal(response.body.user.username, username)
})
