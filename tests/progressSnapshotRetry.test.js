import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
const source = readFileSync('server/playerMysqlDatabase.js', 'utf8')
const code = source.slice(source.indexOf('export async function findUserProgressByUserId('), source.indexOf('\nexport const LEADERBOARD_BOARDS')).replace('export ', '')
test('progress snapshots release before bounded transient retries and never use the pool for reads', async () => {
  for (const stage of ['acquire', 'begin', 'read', 'commit']) for (const errorCode of ['40001', '40P01', '08006']) {
    let held = false, attempts = 0, releases = 0
    const error = Object.assign(Error('original'), { code: errorCode })
    const fail = () => { if (attempts === 1) throw error }
    const ctx = { pool: { getConnection: async () => {
      assert.equal(held, false); attempts++
      if (stage === 'acquire') fail()
      held = true
      return { beginTransaction: async () => { if (stage === 'begin') fail() }, query: async sql => assert.doesNotMatch(sql, /READ ONLY/), commit: async () => { if (stage === 'commit') fail() }, rollback: async () => { throw Error('rollback') }, release: () => { assert.equal(held, true); held = false; releases++ } }
    } }, buildProgressRecord: async () => { if (stage === 'read') fail(); return { coins: 20 } } }
    vm.runInNewContext(code, ctx)
    if (errorCode === '08006') await assert.rejects(ctx.findUserProgressByUserId(1), e => e === error)
    else { assert.equal((await ctx.findUserProgressByUserId(1)).coins, 20); assert.equal(attempts, 2) }
    assert.equal(held, false); assert.equal(releases, attempts - (stage === 'acquire' ? 1 : 0))
  }
})
test('transient exhaustion is finite and releases every connection', async () => {
  let releases = 0
  const error = Object.assign(Error('conflict'), { code: '40001' })
  const ctx = { pool: { getConnection: async () => ({ beginTransaction: async () => { throw error }, rollback: async () => {}, release: () => releases++ }) } }
  vm.runInNewContext(code, ctx)
  await assert.rejects(ctx.findUserProgressByUserId(1), e => e === error)
  assert.equal(releases, 3)
})
