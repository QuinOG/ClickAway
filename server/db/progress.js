import pool, { buildValuesClause } from "./pgPool.js"
import {
  DEFAULT_PROGRESS,
  buildHistoryEntry,
  normalizeOwnedItemIds,
  normalizeRoundHistoryEntry,
  normalizeStringList,
  resolveEquippedItemId,
  toNonNegativeNumber,
} from "./shared.js"
import { getUserStateRow } from "./users.js"

import { normalizeLoadoutState } from "../../src/constants/buildcraft.js"
import {
  BUILD_WALKTHROUGH_STATUS,
  normalizeBuildWalkthrough,
} from "../../src/constants/buildWalkthrough.js"
import { normalizeSeenUnlockPartIds } from "../../src/utils/unlockWallUtils.js"
import { getLevelProgress } from "../../src/utils/progressionUtils.js"
import { isRankedModeEntry } from "../../src/utils/gameModeLabelsAndRankedFilters.js"
import { migrateLegacyRankData } from "../../src/utils/rankUtils.js"
import {
  RECENT_HISTORY_LIMIT,
  applyRoundToLoadoutStats,
  buildLifetimeStatsFromRounds,
  normalizeLifetimeStats,
  normalizeLoadoutStatsEntry,
} from "../../src/utils/lifetimeStatsUtils.js"
import {
  getCatalogItemById,
  getFrontendItemIdByDbItemId,
} from "../serverShopCatalogIdMappings.js"
import {
  buildDailyGoalProgress,
  getNextUtcResetMs,
} from "../../src/utils/dailyGoals.js"

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

export {
  TODAY_UTC_WINDOW,
  backfillLifetimeStatsFromHistory,
  ensureLifetimeStatsRow,
  getLifetimeStatsRow,
  getRoundHistoryCount,
  getTodaysDailyGoalRounds,
  hasXpRoundToday,
  mapLifetimeStatsRow,
  mapLoadoutStatsRow,
}
