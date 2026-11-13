import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { applyRankedMatchResult, buildDefaultRankedState, PLACEMENT_MATCH_COUNT } from '../src/utils/rankUtils.js'
import { applyRoundToLifetimeStats, applyRoundToLoadoutStats } from '../src/utils/lifetimeStatsUtils.js'
import { buildAchievementStats } from '../src/game/achievements/evaluateAchievements.js'
const expression = readFileSync('server/playerMysqlDatabase.js', 'utf8').match(/rankedWin: ([^\r\n]+)/)[1].replace(/,$/, '')
test('first, middle, final and reset placements never count as ranked wins; placed wins do', () => {
  for (const played of [0, 1, PLACEMENT_MATCH_COUNT - 1, PLACEMENT_MATCH_COUNT]) for (const delta of [20, -20]) {
    const outcome = applyRankedMatchResult({ currentMmr: 200, currentRankedState: { ...buildDefaultRankedState(), placementMatchesPlayed: played }, hasRankedHistory: played > 0, baseRankDelta: delta, placementMatchScore: 20, allowsRankProgression: true })
    const rankedWin = vm.runInNewContext(expression, { rankOutcome: outcome })
    assert.equal(rankedWin, played === PLACEMENT_MATCH_COUNT && delta > 0)
    const round = { progressionMode: 'ranked', rankedWin, rankDelta: outcome.appliedRankDelta, hits: 5, misses: 0, loadoutSnapshot: { loadoutId: 'loadout_1' } }
    const lifetime = applyRoundToLifetimeStats({}, round)
    const build = applyRoundToLoadoutStats({}, round)
    assert.equal(build.rankedWins, rankedWin ? 1 : 0)
    assert.equal(lifetime.currentConsecutiveRankedWins, rankedWin ? 1 : 0)
    assert.equal(buildAchievementStats({ lifetimeStats: lifetime }).maxConsecutiveRankedWins, rankedWin ? 1 : 0)
  }
})
