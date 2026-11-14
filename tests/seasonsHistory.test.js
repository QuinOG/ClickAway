import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { normalizeHistoryEntry } from '../src/utils/historyUtils.js'
import { normalizeLifetimeStats, buildProfileStatsFromLifetime } from '../src/utils/lifetimeStatsUtils.js'
import { getSeasonRewardTier } from '../src/utils/seasonUtils.js'
import { buildHistorySnapshot } from '../src/features/history/historyRoundsSnapshotBuilder.js'
const source = readFileSync('server/playerMysqlDatabase.js', 'utf8')

test('history preserves result kind and RR summaries exclude placement points, including zero', () => {
  const rows = ['placement', 'rr', null].map((rankResultKind, i) => normalizeHistoryEntry({ progressionMode: 'ranked', rankResultKind, rankDelta: [120, 15, -3][i] }))
  assert.deepEqual(rows.map(r => r.rankResultKind), ['placement', 'rr', null])
  const snapshot = buildHistorySnapshot(rows)
  assert.equal(snapshot.recentRankDelta, 12)
  assert.equal(snapshot.bestRankGain, 15)
})

test('server weekly count survives progress normalization and exceeds loaded history', async () => {
  const code = source.slice(source.indexOf('async function getWeeklyRoundCount('), source.indexOf('async function getRoundHistoryCount('))
  const ctx = { toNonNegativeNumber: v => Number(v) || 0 }
  vm.runInNewContext(code, ctx)
  const executor = { query: async (sql, params) => {
    assert.deepEqual(Array.from(params), [7])
    assert.doesNotMatch(sql, /LIMIT/)
    assert.match(sql, /COUNT\(\*\)/)
    return [[{ roundsThisWeek: '125' }]]
  } }
  const stats = normalizeLifetimeStats({ roundsThisWeek: await ctx.getWeeklyRoundCount(executor, 7) })
  assert.equal(buildProfileStatsFromLifetime(stats, []).roundsThisWeek, 125)
  assert.match(source, /played_at >= now\(\) - interval '7 days' AND played_at <= now\(\)/)
})

test('rollover serializes concurrent requests, preserves duration and catches up after downtime', async () => {
  const duration = 86400000
  const now = new Date('2026-11-14T12:00:00Z')
  let seasons = [{ id: 1, slug: 'season-1', status: 'active', startsAt: new Date(now - duration * 3), endsAt: new Date(now - duration * 2) }]
  let queue = Promise.resolve(), releases = 0, commits = 0
  const pool = { getConnection: async () => {
    let unlock
    return { beginTransaction: async () => {}, query: async (sql, params) => {
      if (sql.includes('pg_advisory_xact_lock')) {
        const previous = queue
        queue = new Promise(resolve => { unlock = resolve })
        await previous
        return [[]]
      }
      if (sql.includes('clock_timestamp')) return [[{ now }]]
      if (sql.includes('FROM seasons')) return [[seasons.at(-1)]]
      if (sql.startsWith('UPDATE')) { seasons.find(s => s.id === params[0]).status = 'ended'; return [[]] }
      if (sql.includes('INSERT INTO seasons')) {
        const row = { id: seasons.length + 1, slug: params[0], name: params[1], startsAt: params[2], endsAt: params[3], status: 'active' }
        seasons.push(row); return [[row]]
      }
      throw Error(sql)
    }, commit: async () => { commits++; unlock() }, rollback: async () => unlock?.(), release: () => releases++ }
  } }
  const code = source.slice(source.indexOf('async function withCurrentSeason('), source.indexOf('function toNonNegativeNumber'))
  const ctx = { pool, mapSeasonRow: s => s }
  vm.runInNewContext(code, ctx)
  const results = await Promise.all([ctx.withCurrentSeason(async (c, s) => s), ctx.withCurrentSeason(async (c, s) => s)])
  assert.equal(results[0].id, results[1].id)
  assert.equal(seasons.filter(s => s.status === 'active').length, 1)
  assert.equal(seasons.length, 4) // Exact end boundary also expires.
  for (const season of seasons) assert.equal(season.endsAt - season.startsAt, duration)
  assert.equal(commits, 2); assert.equal(releases, 2)
  seasons = []
  await Promise.all([ctx.withCurrentSeason(async (c, s) => s), ctx.withCurrentSeason(async (c, s) => s)])
  assert.equal(seasons.length, 1) // Concurrent first reads seed only once.
})

test('new ranked history kind comes from pre-round placement state, never client input', () => {
  const expression = source.match(/rankResultKind: historyEntry\?\.progressionMode === 'ranked'\s*\?[^,]+/)[0].replace('rankResultKind: ', '')
  for (const state of [{ isUnranked: true }, { isPlacement: true }, { isPlacement: false }]) {
    const result = vm.runInNewContext(expression, { historyEntry: { progressionMode: 'ranked' }, rankOutcome: { previousRankProgress: state } })
    assert.equal(result, state.isUnranked || state.isPlacement ? 'placement' : 'rr')
  }
})

test('season progress upsert and reads share the rollover transaction and preserve peaks', async () => {
  let stats = { rankedRounds: 0, peakMmr: 0, rewardTier: 0 }, writes = 0
  const connection = {
    execute: async (sql, params) => {
      assert.match(sql, /GREATEST\(user_season_stats.peak_mmr/)
      assert.deepEqual(Array.from(params).slice(0, 2), [7, 3])
      writes++
      stats = { rankedRounds: stats.rankedRounds + 1, peakMmr: Math.max(stats.peakMmr, params[2]), rewardTier: Math.max(stats.rewardTier, params[3]) }
    },
    query: async (sql, params) => { assert.deepEqual(Array.from(params), [7, 3]); return [[stats]] },
  }
  const ctx = { withCurrentSeason: work => work(connection, { id: 3 }), toNonNegativeNumber: v => Number(v) || 0, getSeasonRewardTier }
  const code = source.slice(source.indexOf('async function readUserSeasonStats('), source.indexOf('export async function insertRoundReplay')).replaceAll('export ', '')
  vm.runInNewContext(code, ctx)
  await ctx.applyUserSeasonProgress(7, { isRankedRound: true, isPlaced: false, rankMmr: 2000 })
  assert.equal(stats.peakMmr, 0); assert.equal(stats.rewardTier, 0)
  await ctx.applyUserSeasonProgress(7, { isRankedRound: true, rankMmr: 1600 })
  await ctx.applyUserSeasonProgress(7, { isRankedRound: true, rankMmr: 10 })
  const season = await ctx.findCurrentSeason(7)
  assert.equal(season.stats.peakMmr, 1600); assert.equal(season.stats.rankedRounds, 3)
  assert.equal(await ctx.applyUserSeasonProgress(7, { rankMmr: 2000 }), null)
  assert.equal(writes, 3)
  stats = undefined
  const empty = await ctx.findCurrentSeason(7)
  assert.equal(empty.stats.rankedRounds, 0); assert.equal(empty.stats.rewardTier, 0)
})

test('restricted startup rejects a missing migration 013 column', async () => {
  const code = source.slice(source.indexOf('const REQUIRED_DATABASE_TABLES'), source.indexOf('export async function initializeSchema')).replace('export ', '')
  let columnExists = false
  const tables = [...source.matchAll(/^  "([a-z_]+)",$/gm)].map(match => ({ tableName: match[1] }))
  const ctx = { pool: { query: async sql => [sql.includes('information_schema.tables') ? tables : columnExists ? [{ columnName: 'rank_result_kind' }] : []] }, console: { log() {} } }
  vm.runInNewContext(code, ctx)
  await assert.rejects(ctx.verifySchema(), /migration 013/)
  columnExists = true
  await ctx.verifySchema()
  const migration = readFileSync('server/data/migrations/013_add_rank_result_kind.sql', 'utf8')
  assert.match(migration, /DEFAULT NULL/)
  assert.match(migration, /CHECK \(rank_result_kind IN \('rr', 'placement'\)\)/)
})
