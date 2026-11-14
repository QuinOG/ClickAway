import { beforeEach, expect, test, vi } from 'vitest'
const { pool } = vi.hoisted(() => ({ pool: { getConnection: vi.fn(), query: vi.fn() } }))
vi.mock('../server/db/pgPool.js', () => ({ default: pool, buildValuesClause: vi.fn() }))
import { findLeaderboardPage, LEADERBOARD_BOARDS } from '../server/playerMysqlDatabase.js'
beforeEach(() => vi.clearAllMocks())
test.each(Object.values(LEADERBOARD_BOARDS))('board %s uses one snapshot for every view, search and reverse', async board => {
  for (const view of ['top', 'aroundMe']) for (const missingSelf of [false, true]) {
    let snapshot, committed = 0, released = 0, liveRank = 1
    const connection = { beginTransaction: vi.fn(), query: vi.fn(async sql => {
      if (sql.startsWith('SET')) { expect(sql).toContain('REPEATABLE READ READ ONLY'); return [[]] }
      snapshot ??= liveRank
      liveRank++ // Concurrent writes cannot change this transaction's snapshot.
      if (sql.includes('SELECT COUNT(*)')) return [[{ totalCount: 1 }]]
      if (sql.includes('SELECT rank\n')) return [missingSelf ? [] : [{ rank: snapshot }]]
      return [[{ userId: 1, username: 'Player', rank: snapshot }]]
    }), commit: async () => committed++, rollback: vi.fn(), release: () => released++ }
    pool.getConnection.mockResolvedValue(connection)
    const result = await findLeaderboardPage({ board, view, userId: 1, search: 'player', reverse: true })
    expect(result.selfRank).toBe(missingSelf ? null : 1)
    if (result.rows.length) expect(result.rows[0].rank).toBe(1)
    expect(committed).toBe(1); expect(released).toBe(1)
    expect(pool.query).not.toHaveBeenCalled()
  }
})
test.each(['begin', 'read', 'commit'])('leaderboard %s failures preserve original error and release after failed rollback', async stage => {
  const error = Error('original')
  const connection = { beginTransaction: async () => { if (stage === 'begin') throw error }, query: async sql => { if (!sql.startsWith('SET') && stage === 'read') throw error; return [[]] }, commit: async () => { if (stage === 'commit') throw error }, rollback: vi.fn(async () => { throw Error('rollback') }), release: vi.fn() }
  pool.getConnection.mockResolvedValue(connection)
  await expect(findLeaderboardPage()).rejects.toBe(error)
  expect(connection.rollback).toHaveBeenCalledOnce(); expect(connection.release).toHaveBeenCalledOnce()
})
