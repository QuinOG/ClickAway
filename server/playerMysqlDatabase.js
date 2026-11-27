import "dotenv/config"

import pool, { buildValuesClause } from "./db/pgPool.js"
import { calculateRoundRewards } from "./roundRewards.js"
import { ROUND_TOKEN_LIFETIME_MS } from "./roundToken.js"

import {
  buildHistoryEntry,
  normalizePaginationLimit,
  normalizePaginationPage,
  normalizeRoundHistoryEntry,
} from "./db/shared.js"
import { getUserStateRow } from "./db/users.js"
import {
  backfillLifetimeStatsFromHistory,
  ensureLifetimeStatsRow,
  getLifetimeStatsRow,
  getRoundHistoryCount,
  getTodaysDailyGoalRounds,
  hasXpRoundToday,
  mapLifetimeStatsRow,
  mapLoadoutStatsRow,
} from "./db/progress.js"
import { getLevelProgress } from "../src/utils/progressionUtils.js"
import {
  evaluateAchievements,
  getUnlockedAchievementIds,
} from "../src/game/achievements/evaluateAchievements.js"
import {
  applyRankedMatchResult,
  migrateLegacyRankData,
  RANK_SYSTEM_VERSION,
} from "../src/utils/rankUtils.js"
import {
  DEFAULT_LIFETIME_STATS,
  HISTORY_PAGE_SIZE,
  applyRoundToLifetimeStats,
  applyRoundToLoadoutStats,
  buildAchievementStatsFromLifetime,
  normalizeLoadoutStatsEntry,
} from "../src/utils/lifetimeStatsUtils.js"
import { applyRoundToDrillStats } from "../src/utils/drillStatsUtils.js"
import {
  DEFAULT_PLAYER_STATE,
  getCatalogItemById,
  getDefaultItemIdForType,
  getFrontendItemIdByDbItemId,
  getMappedShopItemById,
} from "./serverShopCatalogIdMappings.js"
import {
  getNewlyCompletedDailyGoals,
  sumDailyGoalRewards,
} from "../src/utils/dailyGoals.js"

export * from "./db/schema.js"
export { normalizePaginationLimit, normalizePaginationPage } from "./db/shared.js"
export * from "./db/sessions.js"
export * from "./db/leaderboard.js"
export {
  createDefaultUserProgress,
  findRoundCompletionContext,
  findUserProgressByUserId,
  saveUserProgress,
} from "./db/progress.js"
export * from "./db/replays.js"
export * from "./db/challenges.js"
export {
  applyUserSeasonProgress,
  findCurrentSeason,
} from "./db/seasons.js"
export {
  createUser,
  findUserById,
  findUserByUsername,
  updateUserPassword,
  updateUserRole,
} from "./db/users.js"

async function insertRoundHistoryEntry(executor, userId, entry = {}) {
  const normalizedEntry = normalizeRoundHistoryEntry(entry)
  const [result] = await executor.execute(
    `INSERT INTO round_history (
       user_id,
       mode,
       progression_mode,
       score,
       hits,
       misses,
       best_streak,
       avg_reaction_ms,
       best_reaction_ms,
       coins_earned,
       xp_earned,
       rank_delta,
       rank_result_kind,
       outcome,
       loadout_name,
       loadout_id,
       tempo_core_id,
       streak_lens_id,
       power_rig_id,
       powerup_slot_1_id,
       powerup_slot_2_id,
       powerup_slot_3_id,
       played_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING id`,
    [
      userId,
      normalizedEntry.modeId,
      normalizedEntry.progressionMode,
      normalizedEntry.score,
      normalizedEntry.hits,
      normalizedEntry.misses,
      normalizedEntry.bestStreak,
      normalizedEntry.avgReactionMs,
      normalizedEntry.bestReactionMs,
      normalizedEntry.coinsEarned,
      normalizedEntry.xpEarned,
      normalizedEntry.rankDelta,
      normalizedEntry.rankResultKind,
      normalizedEntry.outcome,
      normalizedEntry.loadoutSnapshot?.loadoutName || null,
      normalizedEntry.loadoutSnapshot?.loadoutId || null,
      normalizedEntry.loadoutSnapshot?.moduleIds?.tempoCoreId || null,
      normalizedEntry.loadoutSnapshot?.moduleIds?.streakLensId || null,
      normalizedEntry.loadoutSnapshot?.moduleIds?.powerRigId || null,
      normalizedEntry.loadoutSnapshot?.powerupIds?.[0] || null,
      normalizedEntry.loadoutSnapshot?.powerupIds?.[1] || null,
      normalizedEntry.loadoutSnapshot?.powerupIds?.[2] || null,
      normalizedEntry.playedAtDate,
    ]
  )

  return buildHistoryEntry({
    id: result.insertId,
    modeId: normalizedEntry.modeId,
    progressionMode: normalizedEntry.progressionMode,
    score: normalizedEntry.score,
    hits: normalizedEntry.hits,
    misses: normalizedEntry.misses,
    bestStreak: normalizedEntry.bestStreak,
    avgReactionMs: normalizedEntry.avgReactionMs,
    bestReactionMs: normalizedEntry.bestReactionMs,
    coinsEarned: normalizedEntry.coinsEarned,
    xpEarned: normalizedEntry.xpEarned,
    rankDelta: normalizedEntry.rankDelta,
    rankResultKind: normalizedEntry.rankResultKind,
    outcome: normalizedEntry.outcome,
    loadoutName: normalizedEntry.loadoutSnapshot?.loadoutName,
    loadoutId: normalizedEntry.loadoutSnapshot?.loadoutId,
    tempoCoreId: normalizedEntry.loadoutSnapshot?.moduleIds?.tempoCoreId,
    streakLensId: normalizedEntry.loadoutSnapshot?.moduleIds?.streakLensId,
    powerRigId: normalizedEntry.loadoutSnapshot?.moduleIds?.powerRigId,
    powerupSlot1Id: normalizedEntry.loadoutSnapshot?.powerupIds?.[0],
    powerupSlot2Id: normalizedEntry.loadoutSnapshot?.powerupIds?.[1],
    powerupSlot3Id: normalizedEntry.loadoutSnapshot?.powerupIds?.[2],
    playedAt: normalizedEntry.playedAtDate,
  })
}

async function persistLifetimeStats(executor, userId, lifetimeStats) {
  await ensureLifetimeStatsRow(executor, userId)
  await executor.execute(
    `UPDATE user_lifetime_stats
     SET total_rounds = ?,
         ranked_rounds = ?,
         best_streak = ?,
         best_single_score = ?,
         best_ranked_streak = ?,
         best_single_round_accuracy = ?,
         clean_rounds = ?,
         total_coins_earned = ?,
         total_hits = ?,
         total_misses = ?,
         max_consecutive_ranked_wins = ?,
         current_consecutive_ranked_wins = ?,
         reaction_rounds = ?,
         total_reaction_ms = ?,
         best_reaction_ms = ?,
         drill_stats_json = ?
     WHERE user_id = ?`,
    [
      lifetimeStats.totalRounds,
      lifetimeStats.rankedRounds,
      lifetimeStats.bestStreak,
      lifetimeStats.bestSingleScore,
      lifetimeStats.bestRankedStreak,
      lifetimeStats.bestSingleRoundAccuracy,
      lifetimeStats.cleanRounds,
      lifetimeStats.totalCoinsEarned,
      lifetimeStats.totalHits,
      lifetimeStats.totalMisses,
      lifetimeStats.maxConsecutiveRankedWins,
      lifetimeStats.currentConsecutiveRankedWins,
      lifetimeStats.reactionRounds,
      lifetimeStats.totalReactionMs,
      lifetimeStats.bestReactionMs,
      JSON.stringify(lifetimeStats.drillStats ?? {}),
      userId,
    ]
  )
}

async function persistLoadoutStats(executor, userId, loadoutStats = {}) {
  const normalizedStats = normalizeLoadoutStatsEntry(loadoutStats)
  if (!normalizedStats) {
    return
  }

  await executor.execute(
    `INSERT INTO user_loadout_stats (
       user_id,
       loadout_id,
       loadout_name,
       total_rounds,
       ranked_rounds,
       ranked_wins,
       best_score,
       best_streak,
       best_ranked_streak,
       total_hits,
       total_misses
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (user_id, loadout_id) DO UPDATE SET
       loadout_name = EXCLUDED.loadout_name,
       total_rounds = EXCLUDED.total_rounds,
       ranked_rounds = EXCLUDED.ranked_rounds,
       ranked_wins = EXCLUDED.ranked_wins,
       best_score = EXCLUDED.best_score,
       best_streak = EXCLUDED.best_streak,
       best_ranked_streak = EXCLUDED.best_ranked_streak,
       total_hits = EXCLUDED.total_hits,
       total_misses = EXCLUDED.total_misses`,
    [
      userId,
      normalizedStats.loadoutId,
      normalizedStats.loadoutName,
      normalizedStats.totalRounds,
      normalizedStats.rankedRounds,
      normalizedStats.rankedWins,
      normalizedStats.bestScore,
      normalizedStats.bestStreak,
      normalizedStats.bestRankedStreak,
      normalizedStats.totalHits,
      normalizedStats.totalMisses,
    ]
  )
}

async function addUnlockedAchievements(executor, userId, achievementIds = []) {
  const ids = Array.from(new Set(achievementIds.map(String)))
  if (ids.length === 0) return

  const [rows] = await executor.query(
    `SELECT id
     FROM achievements_catalog
     WHERE id = ANY(?)`,
    [ids]
  )
  const insertRows = rows.map((row) => [userId, row.id, new Date()])
  if (insertRows.length === 0) return

  const { clause, params } = buildValuesClause(insertRows)
  await executor.query(
    `INSERT INTO user_achievement_progress (
       user_id,
       achievement_id,
       unlocked_at
     ) VALUES ${clause}
     ON CONFLICT (user_id, achievement_id) DO NOTHING`,
    params
  )
}

export async function findRoundHistoryPage(userId, { page = 1, limit = HISTORY_PAGE_SIZE } = {}) {
  const normalizedLimit = normalizePaginationLimit(limit, 100, HISTORY_PAGE_SIZE)
  const normalizedPage = normalizePaginationPage(page)
  const offset = (normalizedPage - 1) * normalizedLimit
  const totalCount = await getRoundHistoryCount(pool, userId)
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / normalizedLimit) : 0

  const [historyRows] = await pool.query(
    `SELECT
       id,
       mode AS modeId,
       progression_mode AS progressionMode,
       score,
       hits,
       misses,
       best_streak AS bestStreak,
       avg_reaction_ms AS avgReactionMs,
       best_reaction_ms AS bestReactionMs,
       coins_earned AS coinsEarned,
       xp_earned AS xpEarned,
       rank_delta AS rankDelta,
       rank_result_kind AS rankResultKind,
       outcome,
       loadout_name AS loadoutName,
       loadout_id AS loadoutId,
       tempo_core_id AS tempoCoreId,
       streak_lens_id AS streakLensId,
       power_rig_id AS powerRigId,
       powerup_slot_1_id AS powerupSlot1Id,
       powerup_slot_2_id AS powerupSlot2Id,
       powerup_slot_3_id AS powerupSlot3Id,
       played_at AS playedAt
     FROM round_history
     WHERE user_id = ?
     ORDER BY played_at DESC, id DESC
     LIMIT ? OFFSET ?`,
    [userId, normalizedLimit, offset]
  )

  return {
    entries: historyRows.map(buildHistoryEntry),
    page: normalizedPage,
    limit: normalizedLimit,
    totalCount,
    totalPages,
    hasMore: normalizedPage < totalPages,
  }
}

// Starting and completing rounds take the same user row lock before touching
// pending rounds or token claims. The caller owns the transaction.
async function settlePendingRankedRounds(connection, userId, { olderThanMs = 0 } = {}) {
  const userRow = await getUserStateRow(connection, userId, { forUpdate: true })
  if (!userRow) throw new Error(`User ${userId} was not found.`)

  const [pendingRounds] = await connection.query(
    `SELECT round_id AS roundId, mode_id AS modeId
     FROM pending_ranked_rounds
     WHERE user_id = ?
       AND (?::double precision = 0 OR issued_at <= now() - ?::double precision * interval '1 millisecond')
     ORDER BY issued_at, round_id`,
    [userId, olderThanMs, olderThanMs]
  )
  if (!pendingRounds.length) return

  let { rankMmr, rankedState } = migrateLegacyRankData({
    rankMmr: userRow.mmr,
    rankedState: {
      rankSystemVersion: userRow.rankSystemVersion,
      placementMatchesPlayed: userRow.placementMatchesPlayed,
      demotionProtectionRounds: userRow.demotionProtectionRounds,
    },
  })

  for (const { roundId, modeId } of pendingRounds) {
    const { progressionMode, baseRankDelta, placementMatchScore, allowsRankProgression } =
      calculateRoundRewards({ modeId, hits: 0, misses: 0, score: 0, bestStreak: 0 })
    const rankOutcome = applyRankedMatchResult({
      currentMmr: rankMmr,
      currentRankedState: rankedState,
      hasRankedHistory: rankedState.placementMatchesPlayed > 0,
      baseRankDelta,
      placementMatchScore,
      allowsRankProgression,
    })
    rankMmr = rankOutcome.nextMmr
    rankedState = rankOutcome.nextRankedState

    const forfeitEntry = await insertRoundHistoryEntry(connection, userId, {
      modeId,
      progressionMode,
      score: 0,
      coinsEarned: 0,
      xpEarned: 0,
      rankDelta: rankOutcome.appliedRankDelta,
      rankResultKind: rankOutcome.previousRankProgress.isUnranked || rankOutcome.previousRankProgress.isPlacement
        ? "placement"
        : "rr",
      outcome: "forfeit",
    })
    const forfeitHistoryId = Number(String(forfeitEntry?.id ?? "").replace(/^r-/, ""))
    await connection.execute(
      "INSERT INTO consumed_round_tokens (token_id, user_id, round_history_id) VALUES (?, ?, ?)",
      [roundId, userId, Number.isSafeInteger(forfeitHistoryId) && forfeitHistoryId > 0 ? forfeitHistoryId : null]
    )
    await connection.execute(
      "DELETE FROM pending_ranked_rounds WHERE round_id = ? AND user_id = ?",
      [roundId, userId]
    )
  }

  await connection.execute(
    `UPDATE users
     SET mmr = ?, rank_system_version = ?, placement_matches_played = ?, demotion_protection_rounds = ?
     WHERE id = ?`,
    [rankMmr, rankedState.rankSystemVersion, rankedState.placementMatchesPlayed, rankedState.demotionProtectionRounds, userId]
  )
}

export async function recordPendingRankedRound({ userId, modeId, roundId }) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    await settlePendingRankedRounds(connection, userId)
    await connection.execute(
      "INSERT INTO pending_ranked_rounds (round_id, user_id, mode_id) VALUES (?, ?, ?)",
      [roundId, userId, modeId]
    )
    await connection.commit()
  } catch (error) {
    await connection.rollback().catch(() => {})
    throw error
  } finally {
    connection.release()
  }
}

export async function settleExpiredRankedRounds(userId) {
  const [expired] = await pool.query(
    `SELECT 1 FROM pending_ranked_rounds
     WHERE user_id = ? AND issued_at <= now() - ?::double precision * interval '1 millisecond'
     LIMIT 1`,
    [userId, ROUND_TOKEN_LIFETIME_MS]
  )
  if (!expired.length) return

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    await settlePendingRankedRounds(connection, userId, { olderThanMs: ROUND_TOKEN_LIFETIME_MS })
    await connection.commit()
  } catch (error) {
    await connection.rollback().catch(() => {})
    throw error
  } finally {
    connection.release()
  }
}

export async function findConsumedRoundHistoryEntry(tokenId, userId) {
  const [rows] = await pool.query(
    `SELECT
       h.id,
       h.mode AS modeId,
       h.progression_mode AS progressionMode,
       h.score,
       h.hits,
       h.misses,
       h.best_streak AS bestStreak,
       h.avg_reaction_ms AS avgReactionMs,
       h.best_reaction_ms AS bestReactionMs,
       h.coins_earned AS coinsEarned,
       h.xp_earned AS xpEarned,
       h.rank_delta AS rankDelta,
       h.rank_result_kind AS rankResultKind,
       h.outcome,
       h.loadout_name AS loadoutName,
       h.loadout_id AS loadoutId,
       h.tempo_core_id AS tempoCoreId,
       h.streak_lens_id AS streakLensId,
       h.power_rig_id AS powerRigId,
       h.powerup_slot_1_id AS powerupSlot1Id,
       h.powerup_slot_2_id AS powerupSlot2Id,
       h.powerup_slot_3_id AS powerupSlot3Id,
       h.played_at AS playedAt
     FROM consumed_round_tokens t
     INNER JOIN round_history h
       ON h.id = t.round_history_id
       AND h.user_id = t.user_id
     WHERE t.token_id = ? AND t.user_id = ?
     LIMIT 1`,
    [String(tokenId), userId]
  )

  return rows[0] ? buildHistoryEntry(rows[0]) : null
}

export class RoundAlreadySubmittedError extends Error {
  constructor() {
    super("This round has already been submitted.")
    this.name = "RoundAlreadySubmittedError"
    this.status = 409
  }
}

export class RoundForfeitedError extends Error {
  constructor() {
    super("This ranked round was already counted as a loss because a new one was started.")
    this.name = "RoundForfeitedError"
    this.status = 409
  }
}

// Round completion only adds what the round earned. Coins and XP are applied as
// deltas to the row locked inside this transaction, and inventory, equipment,
// loadouts and walkthrough state are left alone, so a purchase, equip or
// loadout edit that commits while the round is being validated is never undone.
export async function completeUserRound({
  userId,
  earnedCoins = 0,
  earnedXp = 0,
  maxCoins = Number.MAX_SAFE_INTEGER,
  maxXp = Number.MAX_SAFE_INTEGER,
  roundTokenId = null,
  requiresPendingRankedRound = false,
  maxMmr = Number.MAX_SAFE_INTEGER,
  // Inputs for the ranked result. It is calculated here from the locked row, so
  // two rounds finishing together both count, and a non-ranked round never
  // writes rank. The fallback state is used only for legacy rank-system rows.
  rankInputs = {},
  fallbackRankState = {},
  // Only server-started rounds count toward lifetime and loadout stats and
  // achievements. Unverified rounds are kept in history but can't be farmed.
  countsTowardStats = true,
  historyEntry,
}) {
  const connection = await pool.getConnection()
  let rankOutcome = null
  let insertedHistoryEntry = null
  let dailyBonusXp = 0
  let dailyGoalRewards = { goals: [], coins: 0, xp: 0 }

  try {
    await connection.beginTransaction()

    const userRow = await getUserStateRow(connection, userId, { forUpdate: true })
    if (!userRow) {
      throw new Error(`User ${userId} was not found.`)
    }

    if (roundTokenId) {
      const [claim] = await connection.execute(
        `INSERT INTO consumed_round_tokens (token_id, user_id)
         VALUES (?, ?)
         ON CONFLICT (token_id) DO NOTHING`,
        [String(roundTokenId), userId]
      )
      if (!claim.affectedRows) {
        throw new RoundAlreadySubmittedError()
      }
      if (requiresPendingRankedRound) {
        const [pending] = await connection.execute(
          "DELETE FROM pending_ranked_rounds WHERE round_id = ? AND user_id = ?",
          [String(roundTokenId), userId]
        )
        if (!pending.affectedRows) throw new RoundForfeitedError()
      }
    }

    // The round is stored at the transaction's time, the same now() the daily
    // bonus and goal checks use, so a save that crosses midnight can't be checked
    // against one day and stored in the next (which would let it pay twice).
    const [[transactionClock]] = await connection.query("SELECT now() AS round_time")
    const roundTime = transactionClock?.round_time ?? transactionClock?.roundTime ?? null
    const storedPlayedAtIso = roundTime ? new Date(roundTime).toISOString() : historyEntry?.playedAtIso

    // The first XP-earning round of each UTC day earns its XP twice: a reason to
    // come back daily that never takes anything away. Checked under the user row
    // lock, so two rounds finishing together can't both claim it. Practice and
    // unverified rounds earn no XP, so they neither get nor use up the bonus.
    if ((Number(earnedXp) || 0) > 0 && !(await hasXpRoundToday(connection, userId))) {
      dailyBonusXp = Number(earnedXp)
    }
    // Daily goals this round finishes pay once. Progress comes from today's
    // XP-earning rounds, read under the same row lock, so two rounds finishing
    // together can't both complete (and be paid for) the same goal.
    if ((Number(earnedXp) || 0) > 0) {
      const { dayKey, rounds } = await getTodaysDailyGoalRounds(connection, userId)
      const completedGoals = dayKey
        ? getNewlyCompletedDailyGoals(dayKey, rounds, {
          modeId: historyEntry?.modeId,
          hits: historyEntry?.hits,
          misses: historyEntry?.misses,
          bestStreak: historyEntry?.bestStreak,
        })
        : []
      dailyGoalRewards = {
        goals: completedGoals.map(({ id, label, reward }) => ({ id, label, reward })),
        ...sumDailyGoalRewards(completedGoals),
      }
    }
    const totalXp = (Number(earnedXp) || 0) + dailyBonusXp + dailyGoalRewards.xp
    const totalCoins = (Number(earnedCoins) || 0) + dailyGoalRewards.coins

    const coins = Math.min(maxCoins, Math.max(0, (Number(userRow.coins) || 0) + totalCoins))
    const levelXp = Math.min(maxXp, Math.max(0, (Number(userRow.xp) || 0) + totalXp))

    const isCurrentRankSystem = Number(userRow.rankSystemVersion) === RANK_SYSTEM_VERSION
    rankOutcome = applyRankedMatchResult({
      currentMmr: isCurrentRankSystem ? Number(userRow.mmr) || 0 : fallbackRankState.currentMmr,
      currentRankedState: isCurrentRankSystem
        ? {
          rankSystemVersion: RANK_SYSTEM_VERSION,
          placementMatchesPlayed: Number(userRow.placementMatchesPlayed) || 0,
          demotionProtectionRounds: Number(userRow.demotionProtectionRounds) || 0,
        }
        : fallbackRankState.currentRankedState,
      hasRankedHistory: Boolean(rankInputs.hasRankedHistory),
      baseRankDelta: rankInputs.baseRankDelta,
      placementMatchScore: rankInputs.placementMatchScore,
      allowsRankProgression: Boolean(rankInputs.allowsRankProgression),
    })
    const rankMmr = Math.min(maxMmr, Math.max(0, Number(rankOutcome.nextMmr) || 0))
    const rankedState = rankOutcome.nextRankedState
    rankOutcome = { ...rankOutcome, nextMmr: rankMmr }

    await connection.execute(
      `UPDATE users SET coins = ?, xp = ? WHERE id = ?`,
      [coins, levelXp, userId]
    )

    if (rankInputs.allowsRankProgression) {
      await connection.execute(
        `UPDATE users
         SET mmr = ?,
             rank_system_version = ?,
             placement_matches_played = ?,
             demotion_protection_rounds = ?
         WHERE id = ?`,
        [
          rankMmr,
          rankedState.rankSystemVersion,
          rankedState.placementMatchesPlayed,
          rankedState.demotionProtectionRounds,
          userId,
        ]
      )
    }

    // Settle any one-time legacy backfill before this round's history row exists,
    // so an unverified round can't be swept into stats by a later rebuild.
    await backfillLifetimeStatsFromHistory(connection, userId)

    insertedHistoryEntry = await insertRoundHistoryEntry(connection, userId, {
      ...historyEntry,
      playedAtIso: storedPlayedAtIso,
      coinsEarned: (Number(historyEntry?.coinsEarned) || 0) + dailyGoalRewards.coins,
      xpEarned: totalXp,
      rankDelta: rankOutcome.appliedRankDelta,
      rankResultKind: historyEntry?.progressionMode === 'ranked'
        ? (rankOutcome.previousRankProgress?.isUnranked || rankOutcome.previousRankProgress?.isPlacement ? 'placement' : 'rr')
        : null,
    })

    if (roundTokenId) {
      const historyRowId = Number(String(insertedHistoryEntry?.id ?? "").replace(/^r-/, ""))
      if (Number.isSafeInteger(historyRowId) && historyRowId > 0) {
        await connection.execute(
          "UPDATE consumed_round_tokens SET round_history_id = ? WHERE token_id = ? AND user_id = ?",
          [historyRowId, String(roundTokenId), userId]
        )
      }
    }

    if (countsTowardStats) {
      const committedHistoryEntry = {
        ...historyEntry,
        // Coins earned include daily goal rewards, matching the wallet and the
        // history row, so lifetime coin totals and coin achievements count them.
        coinsEarned: (Number(historyEntry?.coinsEarned) || 0) + dailyGoalRewards.coins,
        rankDelta: rankOutcome.appliedRankDelta,
        // Placement rounds award a placement score, not a ranked win.
        rankedWin: !rankOutcome.previousRankProgress?.isUnranked && !rankOutcome.previousRankProgress?.isPlacement && rankOutcome.appliedRankDelta > 0,
      }
      const existingLifetimeStatsRow = await getLifetimeStatsRow(connection, userId, { forUpdate: true })
      let nextLifetimeStats = applyRoundToLifetimeStats(
        existingLifetimeStatsRow ? mapLifetimeStatsRow(existingLifetimeStatsRow) : DEFAULT_LIFETIME_STATS,
        committedHistoryEntry
      )
      if (committedHistoryEntry?.drillId) {
        nextLifetimeStats = {
          ...nextLifetimeStats,
          drillStats: applyRoundToDrillStats(
            nextLifetimeStats.drillStats,
            committedHistoryEntry.drillId,
            committedHistoryEntry
          ),
        }
      }
      await persistLifetimeStats(connection, userId, nextLifetimeStats)

      // The demo seeder also counts rounds toward stats. Only token-backed
      // completions contribute to the Reaction ladder.
      const bestReactionMs = insertedHistoryEntry?.bestReactionMs ?? null
      if (roundTokenId && bestReactionMs !== null) {
        await connection.execute(
          `UPDATE user_lifetime_stats
           SET verified_best_reaction_ms = LEAST(verified_best_reaction_ms, ?)
           WHERE user_id = ?`,
          [bestReactionMs, userId]
        )
      }

      const loadoutId = committedHistoryEntry?.loadoutSnapshot?.loadoutId
      if (loadoutId) {
        const [existingLoadoutRows] = await connection.query(
          `SELECT
             loadout_id AS loadoutId,
             loadout_name AS loadoutName,
             total_rounds AS totalRounds,
             ranked_rounds AS rankedRounds,
             ranked_wins AS rankedWins,
             best_score AS bestScore,
             best_streak AS bestStreak,
             best_ranked_streak AS bestRankedStreak,
             total_hits AS totalHits,
             total_misses AS totalMisses
           FROM user_loadout_stats
           WHERE user_id = ? AND loadout_id = ?
           LIMIT 1
           FOR UPDATE`,
          [userId, loadoutId]
        )
        const nextLoadoutStats = applyRoundToLoadoutStats(
          existingLoadoutRows[0] ? mapLoadoutStatsRow(existingLoadoutRows[0]) : {},
          committedHistoryEntry
        )
        await persistLoadoutStats(connection, userId, nextLoadoutStats)
      }

      // Achievements are worked out here from the totals this transaction just
      // wrote, and only ever added, so two rounds finishing together can't erase
      // each other's unlocks or miss a threshold their combined totals reached.
      const [unlockedRows] = await connection.query(
        "SELECT achievement_id AS achievementId FROM user_achievement_progress WHERE user_id = ?",
        [userId]
      )
      const evaluatedAchievements = evaluateAchievements(
        buildAchievementStatsFromLifetime({
          lifetimeStats: nextLifetimeStats,
          levelProgress: getLevelProgress(levelXp),
          coins,
        }),
        { persistedUnlockedIds: unlockedRows.map((row) => String(row.achievementId)) }
      )
      await addUnlockedAchievements(connection, userId, getUnlockedAchievementIds(evaluatedAchievements))
    }

    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }

  // The caller reads progress once its follow-up writes are done; reading it
  // here as well could fail after the commit and report a saved round as lost.
  return {
    historyEntry: insertedHistoryEntry,
    rankOutcome,
    dailyBonusXp,
    dailyGoalRewards,
  }
}

export default pool
