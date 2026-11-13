import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
const source = readFileSync('server/playerMysqlDatabase.js', 'utf8')
const code = source.slice(source.indexOf('export async function saveUserProgress('), source.indexOf('\nfunction mapSeasonRow(')).replace('export ', '')
test('a committed preference write survives refresh failure; failed writes still roll back', async () => {
  for (const failWrite of [false, true]) {
    const log = []
    const ctx = { pool: { getConnection: async () => ({ beginTransaction: async () => log.push('begin'), commit: async () => log.push('commit'), rollback: async () => log.push('rollback'), release: () => log.push('release') }) },
      getUserStateRow: async () => ({ id: 1 }), normalizeProgressInput: x => x, DEFAULT_PROGRESS: {},
      syncUserLoadouts: async () => { log.push('write'); if (failWrite) throw Error('write failed') }, findUserProgressByUserId: async () => { throw Error('refresh failed') } }
    vm.runInNewContext(code, ctx)
    const save = ctx.saveUserProgress({ userId: 1, providedFields: ['savedLoadouts'], savedLoadouts: [] })
    if (failWrite) { await assert.rejects(save, /write failed/); assert.deepEqual(log, ['begin', 'write', 'rollback', 'release']) }
    else { assert.equal(await save, null); assert.deepEqual(log, ['begin', 'write', 'commit', 'release']) }
  }
})
