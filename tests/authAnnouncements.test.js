import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
const source = readFileSync('src/app/useAuthSession.js', 'utf8')
const code = source.slice(source.indexOf('const AUTH_CHANGE_KEY'), source.indexOf('async function runAuthAttempt'))
test('same-clock independent auth senders announce every change, with UUID and without crypto', () => {
  for (const crypto of [undefined, { randomUUID: (() => { let n = 0; return () => `uuid-${++n}` })() }]) {
    const writes = []
    const storage = { setItem: (key, value) => writes.push(value) }
    const tabs = [1, 2, 3].map(() => { const ctx = { crypto, localStorage: storage, Date: { now: () => 123 } }; vm.runInNewContext(code, ctx); return ctx })
    for (const tab of tabs) for (let i = 0; i < 3; i++) tab.announceAuthChange()
    assert.equal(new Set(writes).size, 9)
  }
})
test('unavailable storage does not break auth announcements', () => {
  const ctx = { localStorage: { setItem() { throw Error('denied') } } }
  vm.runInNewContext(code, ctx)
  assert.doesNotThrow(() => ctx.announceAuthChange())
})
