import "dotenv/config"

import pool, { buildValuesClause } from "./db/pgPool.js"
import { calculateRoundRewards } from "./roundRewards.js"
import { ROUND_TOKEN_LIFETIME_MS } from "./roundToken.js"

import {
  DEFAULT_PROGRESS,
  buildHistoryEntry,
  normalizeOwnedItemIds,
  normalizePaginationLimit,
  normalizePaginationPage,
  normalizeRoundHistoryEntry,
  normalizeStringList,
  resolveEquippedItemId,
  toNonNegativeNumber,
  toNullableNonNegativeNumber,
} from "./db/shared.js"
import { getUserStateRow } from "./db/users.js"
import { normalizeLoadoutState } from "../src/constants/buildcraft.js"
import {
  BUILD_WALKTHROUGH_STATUS,
  normalizeBuildWalkthrough,
} from "../src/constants/buildWalkthrough.js"
import { normalizeSeenUnlockPartIds } from "../src/utils/unlockWallUtils.js"
import { getLevelProgress } from "../src/utils/progressionUtils.js"
import { isRankedModeEntry } from "../src/utils/gameModeLabelsAndRankedFilters.js"
import {
  evaluateAchievements,
  getUnlockedAchievementIds,
} from "../src/game/achievements/evaluateAchievements.js"
import {
  applyRankedMatchResult,
  PLACEMENT_MATCH_COUNT,
  migrateLegacyRankData,
  RANK_SYSTEM_VERSION,
} from "../src/utils/rankUtils.js"
import {
  DEFAULT_LIFETIME_STATS,
  RECENT_HISTORY_LIMIT,
  HISTORY_PAGE_SIZE,
  applyRoundToLifetimeStats,
  applyRoundToLoadoutStats,
  buildAchievementStatsFromLifetime,
  buildLifetimeStatsFromRounds,
  normalizeLifetimeStats,
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
  buildDailyGoalProgress,
  getNewlyCompletedDailyGoals,
  getNextUtcResetMs,
  sumDailyGoalRewards,
} from "../src/utils/dailyGoals.js"

export * from "./db/schema.js"
export { normalizePaginationLimit, normalizePaginationPage } from "./db/shared.js"
export * from "./db/sessions.js"
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

function normalizeProgressInput(record = {}) {
  const ownedItemIds = normalizeOwnedItemIds(record.ownedItemIds)
  const ownedItemIdSet = new Set(ownedItemIds)
  const levelXp = toNonNegativeNumber(record.levelXp, DEFAULT_PROGRESS.levelXp)
  const normalizedRoundHistory = (Array.isArray(record.roundHistory) ? record.roundHistory : []).map(
    normalizeRoundHistoryEntry
  )
  const migratedRankData = migrateLegacyRankData({
    rankMmr: record.rankMmr,
    rankedState: record.rankedState,
    roundHistory: normalizedRoundHistory,
  })
  const level = getLevelProgress(levelXp).level
  const normalizedLoadoutState = normalizeLoadoutState(
    level,
    record.savedLoadouts,
    record.activeLoadoutId
  )

  return {
    coins: toNonNegativeNumber(record.coins, DEFAULT_PROGRESS.coins),
    levelXp,
    rankMmr: migratedRankData.rankMmr,
    rankedState: migratedRankData.rankedState,
    ownedItemIds,
    equippedButtonSkinId: resolveEquippedItemId(
      record.equippedButtonSkinId,
      "button_skin",
      ownedItemIdSet
    ),
    equippedArenaThemeId: resolveEquippedItemId(
      record.equippedArenaThemeId,
      "arena_theme",
      ownedItemIdSet
    ),
    equippedProfileImageId: resolveEquippedItemId(
      record.equippedProfileImageId,
      "profile_image",
      ownedItemIdSet
    ),
    activeLoadoutId: normalizedLoadoutState.activeLoadoutId,
    savedLoadouts: normalizedLoadoutState.savedLoadouts,
    selectedModeId: String(record.selectedModeId || DEFAULT_PROGRESS.selectedModeId),
    roundHistory: normalizedRoundHistory,
    unlockedAchievementIds: normalizeStringList(record.unlockedAchievementIds),
    buildWalkthrough: normalizeBuildWalkthrough(
      record.buildWalkthrough ?? record.buildWalkthroughStatus,
      BUILD_WALKTHROUGH_STATUS.DISMISSED
    ),
    seenUnlockPartIds: normalizeSeenUnlockPartIds(record.seenUnlockPartIds),
  }
}

function parseSeenUnlockPartIdsJson(value) {
  if (!value) return []
  const parsed = typeof value === "string" ? JSON.parse(value) : value
  return normalizeSeenUnlockPartIds(parsed)
}

function mapLifetimeStatsRow(row = {}) {
  let drillStats = {}
  if (row.drillStatsJson) {
    drillStats = typeof row.drillStatsJson === "string"
      ? JSON.parse(row.drillStatsJson)
      : row.drillStatsJson
  }

  return normalizeLifetimeStats({
    totalRounds: row.totalRounds,
    rankedRounds: row.rankedRounds,
    bestStreak: row.bestStreak,
    bestSingleScore: row.bestSingleScore,
    bestRankedStreak: row.bestRankedStreak,
    bestSingleRoundAccuracy: row.bestSingleRoundAccuracy,
    cleanRounds: row.cleanRounds,
    totalCoinsEarned: row.totalCoinsEarned,
    totalHits: row.totalHits,
    totalMisses: row.totalMisses,
    maxConsecutiveRankedWins: row.maxConsecutiveRankedWins,
    currentConsecutiveRankedWins: row.currentConsecutiveRankedWins,
    reactionRounds: row.reactionRounds,
    totalReactionMs: row.totalReactionMs,
    bestReactionMs: row.bestReactionMs,
    drillStats,
  })
}

function mapLoadoutStatsRow(row = {}) {
  return normalizeLoadoutStatsEntry({
    loadoutId: row.loadoutId,
    loadoutName: row.loadoutName,
    totalRounds: row.totalRounds,
    rankedRounds: row.rankedRounds,
    rankedWins: row.rankedWins,
    bestScore: row.bestScore,
    bestStreak: row.bestStreak,
    bestRankedStreak: row.bestRankedStreak,
    totalHits: row.totalHits,
    totalMisses: row.totalMisses,
  })
}

async function getLifetimeStatsRow(executor, userId, options = {}) {
  const lockClause = options.forUpdate ? " FOR UPDATE" : ""
  const [rows] = await executor.query(
    `SELECT
       total_rounds AS totalRounds,
       ranked_rounds AS rankedRounds,
       best_streak AS bestStreak,
       best_single_score AS bestSingleScore,
       best_ranked_streak AS bestRankedStreak,
       best_single_round_accuracy AS bestSingleRoundAccuracy,
       clean_rounds AS cleanRounds,
       total_coins_earned AS totalCoinsEarned,
       total_hits AS totalHits,
       total_misses AS totalMisses,
       max_consecutive_ranked_wins AS maxConsecutiveRankedWins,
       current_consecutive_ranked_wins AS currentConsecutiveRankedWins,
       reaction_rounds AS reactionRounds,
       total_reaction_ms AS totalReactionMs,
       best_reaction_ms AS bestReactionMs,
       drill_stats_json AS drillStatsJson
     FROM user_lifetime_stats
     WHERE user_id = ?
     LIMIT 1${lockClause}`,
    [userId]
  )

  return rows[0] || null
}

async function ensureLifetimeStatsRow(executor, userId) {
  await executor.query(
    `INSERT INTO user_lifetime_stats (user_id) VALUES (?) ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  )
}

async function getLoadoutStatsRows(executor, userId) {
  const [rows] = await executor.query(
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
     WHERE user_id = ?
     ORDER BY total_rounds DESC, loadout_id ASC`,
    [userId]
  )

  return rows
    .map(mapLoadoutStatsRow)
    .filter(Boolean)
}

// Whether the player already had an XP-earning round today (UTC). The first one
// each day earns double XP; the save and the progress read both ask this.
// The current UTC day by the database clock. Inside a transaction now() is the
// transaction's start, and a saved round's played_at uses the same value, so the
// day a round is checked against is the day it is stored in. The upper bound
// keeps a round saved just before midnight from seeing the next day's rows.
const TODAY_UTC_WINDOW = `played_at >= (date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')
       AND played_at < ((date_trunc('day', now() AT TIME ZONE 'UTC') + interval '1 day') AT TIME ZONE 'UTC')`

async function hasXpRoundToday(executor, userId) {
  const [rows] = await executor.query(
    `SELECT 1 FROM round_history
     WHERE user_id = ? AND xp_earned > 0
       AND ${TODAY_UTC_WINDOW}
     LIMIT 1`,
    [userId]
  )
  return rows.length > 0
}

// Today's rounds that count toward daily goals (the ones that earned XP), with
// the UTC day taken from the database clock, matching hasXpRoundToday. The
// rounds are bounded by that same day key rather than a second now(): outside
// a transaction the two reads could straddle midnight and pair yesterday's
// goals with today's (empty) rounds.
async function getTodaysDailyGoalRounds(executor, userId) {
  const [[clock]] = await executor.query(
    "SELECT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day_key"
  )
  const dayKey = String(clock?.day_key ?? clock?.dayKey ?? "")
  const dayStartMs = Date.parse(`${dayKey}T00:00:00Z`)
  if (!Number.isFinite(dayStartMs)) return { dayKey, rounds: [] }
  const [rows] = await executor.query(
    `SELECT
       mode AS modeId,
       hits,
       misses,
       best_streak AS bestStreak
     FROM round_history
     WHERE user_id = ? AND xp_earned > 0
       AND played_at >= ? AND played_at < ?`,
    [userId, new Date(dayStartMs).toISOString(), new Date(dayStartMs + 86_400_000).toISOString()]
  )
  return { dayKey, rounds: rows }
}

async function getDailyGoalsSnapshot(executor, userId) {
  const { dayKey, rounds } = await getTodaysDailyGoalRounds(executor, userId)
  if (!dayKey) return null
  return {
    day: dayKey,
    resetsAt: new Date(getNextUtcResetMs(Date.parse(`${dayKey}T00:00:00Z`))).toISOString(),
    goals: buildDailyGoalProgress(dayKey, rounds).map(({ id, label, target, progress, isComplete, reward }) => ({
      id, label, target, progress, isComplete, reward,
    })),
  }
}

async function getRoundHistoryCount(executor, userId) {
  const [rows] = await executor.query(
    `SELECT COUNT(*) AS totalCount
     FROM round_history
     WHERE user_id = ?`,
    [userId]
  )

  return toNonNegativeNumber(rows[0]?.totalCount, 0)
}

// Reads total count, weekly count, and whether an XP round was played today
// (UTC) in one round_history scan instead of three separate round trips.
async function getRoundHistoryProgressCounts(executor, userId) {
  const [[counts]] = await executor.query(
    `SELECT
       COUNT(*) AS totalCount,
       COUNT(*) FILTER (
         WHERE played_at >= now() - interval '7 days' AND played_at <= now()
       ) AS roundsThisWeek,
       COALESCE(
         bool_or(xp_earned > 0 AND ${TODAY_UTC_WINDOW}),
         false
       ) AS hasXpRoundToday
     FROM round_history
     WHERE user_id = ?`,
    [userId]
  )

  return {
    totalRoundCount: toNonNegativeNumber(counts?.totalCount, 0),
    roundsThisWeek: toNonNegativeNumber(counts?.roundsThisWeek, 0),
    hasXpRoundToday: Boolean(counts?.hasXpRoundToday),
  }
}

// Rebuilds stats from history only for accounts that predate the stats table
// (no row yet). An existing row is authoritative even at zero rounds: history
// can hold unverified rounds that must never count toward stats.
async function backfillLifetimeStatsFromHistory(executor, userId) {
  const existingStats = await getLifetimeStatsRow(executor, userId)
  if (existingStats) {
    return mapLifetimeStatsRow(existingStats)
  }

  const [historyRows] = await executor.query(
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
     WHERE user_id = ? AND outcome <> 'forfeit'
     ORDER BY played_at ASC, id ASC`,
    [userId]
  )

  const chronologicalRounds = historyRows.map(buildHistoryEntry)
  const lifetimeStats = buildLifetimeStatsFromRounds(chronologicalRounds)
  const loadoutStatsById = new Map()

  chronologicalRounds.forEach((round) => {
    const loadoutId = round?.loadoutSnapshot?.loadoutId
    if (!loadoutId) return

    const nextStats = applyRoundToLoadoutStats(
      loadoutStatsById.get(loadoutId) ?? {},
      round
    )
    loadoutStatsById.set(loadoutId, nextStats)
  })

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
         best_reaction_ms = ?
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
      userId,
    ]
  )

  await executor.query("DELETE FROM user_loadout_stats WHERE user_id = ?", [userId])

  const loadoutRows = Array.from(loadoutStatsById.values()).map((stats) => [
    userId,
    stats.loadoutId,
    stats.loadoutName,
    stats.totalRounds,
    stats.rankedRounds,
    stats.rankedWins,
    stats.bestScore,
    stats.bestStreak,
    stats.bestRankedStreak,
    stats.totalHits,
    stats.totalMisses,
  ])

  if (loadoutRows.length > 0) {
    const { clause, params } = buildValuesClause(loadoutRows)
    await executor.query(
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
       ) VALUES ${clause}`,
      params
    )
  }

  return lifetimeStats
}

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

async function buildProgressRecord(executor, userId) {
  const userRow = await getUserStateRow(executor, userId)
  if (!userRow) {
    return { ...DEFAULT_PROGRESS }
  }

  const [collectionRows] = await executor.query(
    `SELECT item_type AS itemType, item_id AS itemId
     FROM user_collection
     WHERE user_id = ?`,
    [userId]
  )
  const [loadoutRows] = await executor.query(
    `SELECT
       slot_id AS id,
       name,
       tempo_core_id AS tempoCoreId,
       streak_lens_id AS streakLensId,
       power_rig_id AS powerRigId,
       powerup_slot_1_id AS powerupSlot1Id,
       powerup_slot_2_id AS powerupSlot2Id,
       powerup_slot_3_id AS powerupSlot3Id
     FROM user_loadouts
     WHERE user_id = ?
     ORDER BY slot_id ASC`,
    [userId]
  )
  const [historyRows] = await executor.query(
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
     LIMIT ?`,
    [userId, RECENT_HISTORY_LIMIT]
  )
  const [achievementRows] = await executor.query(
    `SELECT achievement_id AS achievementId
     FROM user_achievement_progress
     WHERE user_id = ?
     ORDER BY unlocked_at ASC, id ASC`,
    [userId]
  )

  const ownedItemIds = []
  const ownedItemIdSet = new Set()

  collectionRows.forEach((row) => {
    const frontendItemId = getFrontendItemIdByDbItemId(row.itemType, row.itemId)
    const catalogItem = getCatalogItemById(frontendItemId)

    if (!catalogItem || catalogItem.builtIn || ownedItemIdSet.has(frontendItemId)) {
      return
    }

    ownedItemIdSet.add(frontendItemId)
    ownedItemIds.push(frontendItemId)
  })

  const normalizedLoadoutState = normalizeLoadoutState(
    getLevelProgress(toNonNegativeNumber(userRow.xp, DEFAULT_PROGRESS.levelXp)).level,
    loadoutRows.map((row) => ({
      id: String(row.id || ""),
      name: String(row.name || ""),
      moduleIds: {
        tempoCoreId: String(row.tempoCoreId || ""),
        streakLensId: String(row.streakLensId || ""),
        powerRigId: String(row.powerRigId || ""),
      },
      powerupIds: [
        row.powerupSlot1Id,
        row.powerupSlot2Id,
        row.powerupSlot3Id,
      ],
    })),
    userRow.activeLoadoutId
  )
  const normalizedRoundHistory = historyRows.map(buildHistoryEntry)
  const {
    totalRoundCount,
    roundsThisWeek,
    hasXpRoundToday: playedXpRoundToday,
  } = await getRoundHistoryProgressCounts(executor, userId)
  const lifetimeStats = await backfillLifetimeStatsFromHistory(executor, userId)
  lifetimeStats.roundsThisWeek = roundsThisWeek
  // From the server, not the 50 loaded rounds, so the lobby never promises a
  // bonus that an older round today already used.
  const dailyBonusAvailable = !playedXpRoundToday
  const dailyGoals = await getDailyGoalsSnapshot(executor, userId)
  const loadoutStats = await getLoadoutStatsRows(executor, userId)
  const migratedRankData = migrateLegacyRankData({
    rankMmr: userRow.mmr,
    rankedState: {
      rankSystemVersion: userRow.rankSystemVersion,
      placementMatchesPlayed: userRow.placementMatchesPlayed,
      demotionProtectionRounds: userRow.demotionProtectionRounds,
    },
    roundHistory: normalizedRoundHistory,
  })

  return {
    dailyBonusAvailable,
    dailyGoals,
    coins: toNonNegativeNumber(userRow.coins, DEFAULT_PROGRESS.coins),
    levelXp: toNonNegativeNumber(userRow.xp, DEFAULT_PROGRESS.levelXp),
    rankMmr: migratedRankData.rankMmr,
    rankedState: migratedRankData.rankedState,
    ownedItemIds,
    equippedButtonSkinId: resolveEquippedItemId(
      getFrontendItemIdByDbItemId("button_skin", userRow.currentButtonSkinId) ||
        DEFAULT_PROGRESS.equippedButtonSkinId,
      "button_skin",
      ownedItemIdSet
    ),
    equippedArenaThemeId: resolveEquippedItemId(
      getFrontendItemIdByDbItemId("arena_theme", userRow.currentArenaThemeId) ||
        DEFAULT_PROGRESS.equippedArenaThemeId,
      "arena_theme",
      ownedItemIdSet
    ),
    equippedProfileImageId: resolveEquippedItemId(
      getFrontendItemIdByDbItemId("profile_theme", userRow.currentProfileThemeId) ||
        DEFAULT_PROGRESS.equippedProfileImageId,
      "profile_image",
      ownedItemIdSet
    ),
    activeLoadoutId: normalizedLoadoutState.activeLoadoutId,
    savedLoadouts: normalizedLoadoutState.savedLoadouts,
    selectedModeId: DEFAULT_PROGRESS.selectedModeId,
    roundHistory: normalizedRoundHistory,
    lifetimeStats,
    loadoutStats,
    totalRoundCount,
    unlockedAchievementIds: normalizeStringList(
      achievementRows.map((row) => row.achievementId)
    ),
    buildWalkthrough: normalizeBuildWalkthrough(
      userRow.buildWalkthroughStatus,
      BUILD_WALKTHROUGH_STATUS.DISMISSED
    ),
    seenUnlockPartIds: parseSeenUnlockPartIdsJson(userRow.seenUnlockPartIdsJson),
  }
}

async function syncUserLoadouts(executor, userId, progress) {
  await executor.query("DELETE FROM user_loadouts WHERE user_id = ?", [userId])

  if (!Array.isArray(progress.savedLoadouts) || progress.savedLoadouts.length === 0) {
    return
  }

  const rows = progress.savedLoadouts.map((loadout) => [
    userId,
    loadout.id,
    String(loadout.name || "Loadout"),
    loadout.moduleIds?.tempoCoreId || "",
    loadout.moduleIds?.streakLensId || "",
    loadout.moduleIds?.powerRigId || "",
    loadout.powerupIds?.[0] || "",
    loadout.powerupIds?.[1] || "",
    loadout.powerupIds?.[2] || "",
  ])

  const { clause, params } = buildValuesClause(rows)
  await executor.query(
    `INSERT INTO user_loadouts (
       user_id,
       slot_id,
       name,
       tempo_core_id,
       streak_lens_id,
       power_rig_id,
       powerup_slot_1_id,
       powerup_slot_2_id,
       powerup_slot_3_id
     ) VALUES ${clause}`,
    params
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

export async function createDefaultUserProgress(userId) {
  return buildProgressRecord(pool, userId)
}

// One statement supplies a coherent snapshot for simulation; legacy accounts
// still use the writable full read to initialize their lifetime statistics.
export async function findRoundCompletionContext(userId) {
  const [rows] = await pool.query(
    `SELECT u.xp, u.mmr,
       u.rank_system_version AS rankSystemVersion,
       u.placement_matches_played AS placementMatchesPlayed,
       u.demotion_protection_rounds AS demotionProtectionRounds,
       ls.user_id AS lifetimeUserId, ls.ranked_rounds AS rankedRounds,
       recent.history AS roundHistory
     FROM users u
     LEFT JOIN user_lifetime_stats ls ON ls.user_id = u.id
     LEFT JOIN LATERAL (
       SELECT json_agg(json_build_object(
         'modeId', h.mode, 'progressionMode', h.progression_mode
       ) ORDER BY h.played_at DESC, h.id DESC) AS history
       FROM (
         SELECT mode, progression_mode, played_at, id
         FROM round_history
         WHERE user_id = u.id
         ORDER BY played_at DESC, id DESC
         LIMIT ?
       ) h
     ) recent ON true
     WHERE u.id = ?`,
    [RECENT_HISTORY_LIMIT, userId]
  )
  const row = rows[0]
  if (!row) throw new Error("Round completion user no longer exists.")
  if (row.lifetimeUserId === null || row.lifetimeUserId === undefined) {
    const progress = await findUserProgressByUserId(userId)
    return {
      levelXp: progress.levelXp,
      rankMmr: progress.rankMmr,
      rankedState: progress.rankedState,
      hasRankedHistory: (progress.lifetimeStats?.rankedRounds ?? 0) > 0
        || progress.roundHistory.some(isRankedModeEntry),
    }
  }
  const roundHistory = (row.roundHistory || []).map(buildHistoryEntry)
  const migratedRankData = migrateLegacyRankData({
    rankMmr: row.mmr,
    rankedState: {
      rankSystemVersion: row.rankSystemVersion,
      placementMatchesPlayed: row.placementMatchesPlayed,
      demotionProtectionRounds: row.demotionProtectionRounds,
    },
    roundHistory,
  })
  return {
    levelXp: toNonNegativeNumber(row.xp, DEFAULT_PROGRESS.levelXp),
    rankMmr: migratedRankData.rankMmr,
    rankedState: migratedRankData.rankedState,
    hasRankedHistory: mapLifetimeStatsRow(row).rankedRounds > 0
      || roundHistory.some(isRankedModeEntry),
  }
}

// Read one writable snapshot: legacy progress reads may backfill stats.
// Timestamps remain a best-effort client hint, not database commit ordering.
export async function findUserProgressByUserId(userId) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let connection
    try {
      connection = await pool.getConnection()
      await connection.beginTransaction()
      await connection.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ")
      await connection.query("SELECT 1")
      const snapshotAtMs = Date.now()
      const record = await buildProgressRecord(connection, userId)
      await connection.commit()
      return record ? { ...record, snapshotAtMs } : record
    } catch (error) {
      if (connection) await connection.rollback().catch(() => {})
      if (attempt === 2 || !["40001", "40P01"].includes(error.code)) throw error
    } finally {
      connection?.release()
    }
  }
}

export const LEADERBOARD_BOARDS = {
  MMR: "mmr",
  BEST_SCORE: "bestScore",
  BEST_STREAK: "bestStreak",
  ACCURACY: "accuracy",
  REACTION: "reaction",
}

const LEADERBOARD_DEFAULT_LIMIT = 25
const LEADERBOARD_MAX_LIMIT = 50
const LEADERBOARD_AROUND_WINDOW = 5

function buildLeaderboardOrderClause(board = LEADERBOARD_BOARDS.MMR) {
  switch (board) {
    case LEADERBOARD_BOARDS.BEST_SCORE:
      return `
        bestScore DESC,
        mmr DESC,
        bestStreak DESC,
        accuracyPercent DESC,
        username ASC,
        userId ASC`
    case LEADERBOARD_BOARDS.BEST_STREAK:
      return `
        bestStreak DESC,
        mmr DESC,
        bestScore DESC,
        accuracyPercent DESC,
        username ASC,
        userId ASC`
    case LEADERBOARD_BOARDS.ACCURACY:
      return `
        accuracyPercent DESC,
        rankedRounds DESC,
        mmr DESC,
        bestScore DESC,
        username ASC,
        userId ASC`
    case LEADERBOARD_BOARDS.REACTION:
      return `
        bestReactionMs IS NULL ASC,
        bestReactionMs ASC,
        mmr DESC,
        bestScore DESC,
        username ASC,
        userId ASC`
    case LEADERBOARD_BOARDS.MMR:
    default:
      return `
        mmr DESC,
        bestScore DESC,
        bestStreak DESC,
        accuracyPercent DESC,
        username ASC,
        userId ASC`
  }
}

function mapLeaderboardRow(row = {}) {
  return {
    rank: Math.max(1, Number(row.rank) || 0),
    userId: Number(row.userId),
    username: String(row.username || ""),
    mmr: toNonNegativeNumber(row.mmr, 0),
    coins: toNonNegativeNumber(row.coins, 0),
    levelXp: toNonNegativeNumber(row.levelXp, 0),
    rankedRounds: toNonNegativeNumber(row.rankedRounds, 0),
    bestScore: toNonNegativeNumber(row.bestScore, 0),
    bestStreak: toNonNegativeNumber(row.bestStreak, 0),
    accuracyPercent: toNonNegativeNumber(row.accuracyPercent, 0),
    bestReactionMs: toNullableNonNegativeNumber(row.bestReactionMs),
  }
}

async function queryRankedLeaderboardRows(options = {}) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    await connection.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY")
    const result = await readRankedLeaderboardRows(connection, options)
    await connection.commit()
    return result
  } catch (error) {
    await connection.rollback().catch(() => {})
    throw error
  } finally {
    connection.release()
  }
}

export function escapeLikePattern(text) {
  return text.replace(/[\\%_]/g, "\\$&")
}

async function readRankedLeaderboardRows(connection, {
  board = LEADERBOARD_BOARDS.MMR,
  page = 1,
  limit = LEADERBOARD_DEFAULT_LIMIT,
  search = "",
  userId = null,
  view = "top",
  reverse = false,
} = {}) {
  const normalizedBoard = Object.values(LEADERBOARD_BOARDS).includes(board)
    ? board
    : LEADERBOARD_BOARDS.MMR
  const normalizedLimit = normalizePaginationLimit(limit, LEADERBOARD_MAX_LIMIT, LEADERBOARD_DEFAULT_LIMIT)
  const normalizedPage = normalizePaginationPage(page)
  const normalizedSearch = String(search || "").trim().toLowerCase()
  const orderClause = buildLeaderboardOrderClause(normalizedBoard)
  const isReactionBoard = normalizedBoard === LEADERBOARD_BOARDS.REACTION
  const reactionFilter = isReactionBoard ? "AND ls.verified_best_reaction_ms IS NOT NULL" : ""
  const reactionColumn = isReactionBoard ? "ls.verified_best_reaction_ms" : "ls.best_reaction_ms"

  const baseCte = `
    WITH ranked_players AS (
      SELECT
        u.id AS userId,
        u.username AS username,
        u.mmr AS mmr,
        u.coins AS coins,
        u.xp AS levelXp,
        COALESCE(ls.ranked_rounds, 0) AS rankedRounds,
        COALESCE(ls.best_single_score, 0) AS bestScore,
        COALESCE(ls.best_ranked_streak, 0) AS bestStreak,
        CASE
          WHEN COALESCE(ls.total_hits, 0) + COALESCE(ls.total_misses, 0) > 0
            THEN ROUND(100.0 * ls.total_hits / (ls.total_hits + ls.total_misses))
          ELSE 0
        END AS accuracyPercent,
        ${reactionColumn} AS bestReactionMs
      FROM users u
      LEFT JOIN user_lifetime_stats ls
        ON ls.user_id = u.id
      WHERE u.placement_matches_played >= ?
        -- Players still on an old rank system are unplaced until they replay
        -- placements (Profile shows them that way), so they aren't ranked here.
        AND u.rank_system_version = ${Number(RANK_SYSTEM_VERSION)}
        ${reactionFilter}
    ),
    ranked_ladder AS (
      SELECT
        ranked_players.*,
        RANK() OVER (ORDER BY ${orderClause}) AS rank
      FROM ranked_players
    ),
    -- Search narrows the rows shown, after ranks are computed over everyone,
    -- so a searched player keeps their real ladder position.
    filtered_ladder AS (
      SELECT *
      FROM ranked_ladder
      ${normalizedSearch ? "WHERE LOWER(username) LIKE ? ESCAPE '\\'" : ""}
    )`

  const filterParams = normalizedSearch
    ? [PLACEMENT_MATCH_COUNT, `%${escapeLikePattern(normalizedSearch)}%`]
    : [PLACEMENT_MATCH_COUNT]

  const readFilteredCount = async (rows) => {
    if (rows.length > 0) return toNonNegativeNumber(rows[0].totalCount, 0)

    const [[countRow]] = await connection.query(
      `${baseCte}
       SELECT COUNT(*) AS totalCount
       FROM filtered_ladder`,
      filterParams
    )
    return toNonNegativeNumber(countRow?.totalCount, 0)
  }

  if (view === "aroundMe" && userId) {
    const [[selfRow]] = await connection.query(
      `${baseCte}
       SELECT rank
       FROM ranked_ladder
       WHERE userId = ?
       LIMIT 1`,
      [...filterParams, userId]
    )

    if (!selfRow) {
      return {
        rows: [],
        page: 1,
        limit: normalizedLimit,
        totalCount: 0,
        totalPages: 0,
        selfRank: null,
        board: normalizedBoard,
      }
    }

    const selfRank = Math.max(1, Number(selfRow.rank) || 1)
    const minRank = Math.max(1, selfRank - LEADERBOARD_AROUND_WINDOW)
    const maxRank = selfRank + LEADERBOARD_AROUND_WINDOW

    // Count all search matches before limiting the rows to the rank window.
    const [rows] = await connection.query(
      `${baseCte}, counted_ladder AS (
         SELECT *, COUNT(*) OVER () AS totalCount
         FROM filtered_ladder
       )
       SELECT *
       FROM counted_ladder
       WHERE rank BETWEEN ? AND ?
       ORDER BY rank ASC`,
      [...filterParams, minRank, maxRank]
    )

    const totalCount = await readFilteredCount(rows)

    return {
      rows: rows.map(mapLeaderboardRow),
      page: 1,
      limit: rows.length,
      totalCount,
      totalPages: 1,
      selfRank,
      board: normalizedBoard,
      view: "aroundMe",
    }
  }

  const offset = (normalizedPage - 1) * normalizedLimit
  const [rows] = await connection.query(
    `${baseCte}
     SELECT *, COUNT(*) OVER () AS totalCount
     FROM filtered_ladder
     ORDER BY rank ${reverse ? "DESC" : "ASC"}
     LIMIT ? OFFSET ?`,
    [...filterParams, normalizedLimit, offset]
  )

  const totalCount = await readFilteredCount(rows)
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / normalizedLimit) : 0

  let selfRank = null
  if (userId) {
    const [[selfRow]] = await connection.query(
      `${baseCte}
       SELECT rank
       FROM ranked_ladder
       WHERE userId = ?
       LIMIT 1`,
      [...filterParams, userId]
    )
    selfRank = selfRow ? Math.max(1, Number(selfRow.rank) || 1) : null
  }

  return {
    rows: rows.map(mapLeaderboardRow),
    page: normalizedPage,
    limit: normalizedLimit,
    totalCount,
    totalPages,
    selfRank,
    board: normalizedBoard,
    view: "top",
  }
}

export async function findLeaderboardPage(options = {}) {
  return queryRankedLeaderboardRows(options)
}

export async function findLeaderboardRows({ limit = 25 } = {}) {
  const page = await queryRankedLeaderboardRows({
    board: LEADERBOARD_BOARDS.MMR,
    page: 1,
    limit,
    view: "top",
  })

  return page.rows
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

// Saves only the preferences the client actually sent: loadouts, active loadout,
// walkthrough state and seen unlocks. Fields that were not sent keep their stored
// values, so an unrelated save from another tab can't roll back a newer edit.
// Coins, XP, rank, the collection, equipped cosmetics and achievements are owned
// by rounds, purchases and equips, and are never written here.
export async function saveUserProgress({ userId, providedFields = [], ...progress }) {
  const provided = new Set(providedFields)
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    const userRow = await getUserStateRow(connection, userId, { forUpdate: true })
    if (!userRow) {
      throw new Error(`User ${userId} was not found.`)
    }

    const normalizedProgress = normalizeProgressInput({
      ...DEFAULT_PROGRESS,
      ...progress,
      // Normalize unlocks against the state protected by this transaction.
      levelXp: userRow.xp,
    })

    const assignments = []
    const values = []
    if (provided.has("activeLoadoutId")) {
      assignments.push("active_loadout_slot = ?")
      values.push(normalizedProgress.activeLoadoutId)
    }
    if (provided.has("buildWalkthrough")) {
      assignments.push("build_walkthrough_status = ?")
      values.push(normalizedProgress.buildWalkthrough.status)
    }
    if (provided.has("seenUnlockPartIds")) {
      assignments.push("seen_unlock_part_ids_json = ?")
      values.push(JSON.stringify(normalizedProgress.seenUnlockPartIds))
    }
    if (assignments.length > 0) {
      await connection.execute(
        `UPDATE users SET ${assignments.join(", ")} WHERE id = ?`,
        [...values, userId]
      )
    }

    if (provided.has("savedLoadouts")) {
      await syncUserLoadouts(connection, userId, normalizedProgress)
    }

    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }

  try {
    return await findUserProgressByUserId(userId)
  } catch {
    // The write committed; only the follow-up read failed.
    return null
  }
}

export default pool
