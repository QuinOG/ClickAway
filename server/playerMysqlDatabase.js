import "dotenv/config"

import mysql from "mysql2/promise"

import {
  ACTIVE_LOADOUT_ID_DEFAULT,
  DEFAULT_SAVED_LOADOUTS,
  normalizeLoadoutState,
} from "../src/constants/buildcraft.js"
import {
  BUILD_WALKTHROUGH_STATUS,
  normalizeBuildWalkthrough,
} from "../src/constants/buildWalkthrough.js"
import { ACHIEVEMENTS } from "../src/game/achievements/achievementsList.js"
import { getLevelProgress } from "../src/utils/progressionUtils.js"
import {
  buildDefaultRankedState,
  PLACEMENT_MATCH_COUNT,
  migrateLegacyRankData,
} from "../src/utils/rankUtils.js"
import {
  DEFAULT_LIFETIME_STATS,
  RECENT_HISTORY_LIMIT,
  HISTORY_PAGE_SIZE,
  applyRoundToLifetimeStats,
  applyRoundToLoadoutStats,
  buildLifetimeStatsFromRounds,
  normalizeLifetimeStats,
  normalizeLoadoutStatsEntry,
} from "../src/utils/lifetimeStatsUtils.js"
import {
  DEFAULT_PLAYER_STATE,
  getCatalogItemById,
  getDefaultItemIdForType,
  getFrontendItemIdByDbItemId,
  getMappedShopItemById,
} from "./serverShopCatalogIdMappings.js"

const DEFAULT_PROGRESS = {
  coins: 0,
  levelXp: 0,
  rankMmr: 0,
  rankedState: buildDefaultRankedState(),
  ownedItemIds: [],
  equippedButtonSkinId: DEFAULT_PLAYER_STATE.equippedButtonSkinId,
  equippedArenaThemeId: DEFAULT_PLAYER_STATE.equippedArenaThemeId,
  equippedProfileImageId: DEFAULT_PLAYER_STATE.equippedProfileImageId,
  activeLoadoutId: ACTIVE_LOADOUT_ID_DEFAULT,
  savedLoadouts: DEFAULT_SAVED_LOADOUTS,
  selectedModeId: "normal",
  roundHistory: [],
  lifetimeStats: normalizeLifetimeStats(DEFAULT_LIFETIME_STATS),
  loadoutStats: [],
  totalRoundCount: 0,
  unlockedAchievementIds: [],
  buildWalkthrough: normalizeBuildWalkthrough(
    {},
    BUILD_WALKTHROUGH_STATUS.DISMISSED
  ),
}

const DEFAULT_DATABASE_PORT = 3306
const DEFAULT_PROGRESSION_MODE = "non_ranked"

const pool = mysql.createPool({
  host: process.env.DB_HOST || process.env.MYSQL_HOST || "localhost",
  port: Number(process.env.DB_PORT || process.env.MYSQL_PORT || DEFAULT_DATABASE_PORT),
  user: process.env.DB_USER || process.env.MYSQL_USER || "root",
  password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || "",
  database: process.env.DB_NAME || process.env.MYSQL_DATABASE || "clickaway",
  waitForConnections: true,
  connectionLimit: 10,
  multipleStatements: true,
})

export async function initializeSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`achievements_catalog\` (
      \`id\` varchar(60) NOT NULL,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

    CREATE TABLE IF NOT EXISTS \`arena_themes\` (
      \`id\` bigint(20) NOT NULL,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

    CREATE TABLE IF NOT EXISTS \`button_skins\` (
      \`id\` bigint(20) NOT NULL,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

    CREATE TABLE IF NOT EXISTS \`profile_images\` (
      \`id\` bigint(20) NOT NULL,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

    CREATE TABLE IF NOT EXISTS \`users\` (
      \`id\` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
      \`username\` varchar(50) NOT NULL,
      \`password_hash\` varchar(255) NOT NULL,
      \`coins\` bigint(20) NOT NULL DEFAULT 0,
      \`xp\` int(11) NOT NULL DEFAULT 0,
      \`mmr\` int(11) NOT NULL DEFAULT 0,
      \`current_button_skin_id\` bigint(20) DEFAULT NULL,
      \`current_arena_theme_id\` bigint(20) DEFAULT NULL,
      \`current_profile_theme_id\` bigint(20) DEFAULT NULL,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_username\` (\`username\`),
      KEY \`idx_users_mmr_id\` (\`mmr\`, \`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

    CREATE TABLE IF NOT EXISTS \`round_history\` (
      \`id\` bigint(20) NOT NULL AUTO_INCREMENT,
      \`user_id\` bigint(20) UNSIGNED NOT NULL,
      \`mode\` varchar(50) NOT NULL DEFAULT 'normal',
      \`progression_mode\` varchar(50) NOT NULL DEFAULT 'non_ranked',
      \`score\` int(11) NOT NULL DEFAULT 0,
      \`hits\` int(11) NOT NULL DEFAULT 0,
      \`misses\` int(11) NOT NULL DEFAULT 0,
      \`best_streak\` int(11) NOT NULL DEFAULT 0,
      \`coins_earned\` int(11) NOT NULL DEFAULT 0,
      \`xp_earned\` int(11) NOT NULL DEFAULT 0,
      \`rank_delta\` int(11) NOT NULL DEFAULT 0,
      \`played_at\` timestamp NOT NULL DEFAULT current_timestamp(),
      PRIMARY KEY (\`id\`),
      KEY \`idx_user_played\` (\`user_id\`, \`played_at\`),
      KEY \`idx_round_history_progression_user\` (\`progression_mode\`, \`user_id\`),
      CONSTRAINT \`fk_round_history_user\`
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

    CREATE TABLE IF NOT EXISTS \`user_achievement_progress\` (
      \`id\` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
      \`user_id\` bigint(20) UNSIGNED NOT NULL,
      \`achievement_id\` varchar(60) NOT NULL,
      \`unlocked_at\` timestamp NULL DEFAULT NULL,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_user_achievement\` (\`user_id\`, \`achievement_id\`),
      KEY \`idx_user_unlocked\` (\`user_id\`, \`unlocked_at\`),
      KEY \`idx_achprog_catalog\` (\`achievement_id\`),
      CONSTRAINT \`fk_achprog_user\`
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

    CREATE TABLE IF NOT EXISTS \`user_collection\` (
      \`id\` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
      \`user_id\` bigint(20) UNSIGNED NOT NULL,
      \`item_type\` varchar(50) NOT NULL,
      \`item_id\` bigint(20) NOT NULL,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_user_item\` (\`user_id\`, \`item_type\`, \`item_id\`),
      CONSTRAINT \`fk_collection_user\`
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

    INSERT IGNORE INTO \`arena_themes\` (\`id\`) VALUES (1),(2),(3),(4);

    INSERT IGNORE INTO \`button_skins\` (\`id\`) VALUES
      (1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(12),(13),(14),(15),(16);

    INSERT IGNORE INTO \`profile_images\` (\`id\`) VALUES (1),(2),(3),(4),(5),(6),(7);
  `)

  // The achievement catalog is seeded from ACHIEVEMENTS (the single source of truth
  // shared with the frontend) instead of a hand-maintained id list, so the two can
  // never drift out of sync again.
  await pool.query(
    "INSERT IGNORE INTO `achievements_catalog` (`id`) VALUES ?",
    [ACHIEVEMENTS.map((achievement) => [achievement.id])]
  )

  // Migrations: add columns that may be missing from older deployments.
  // MySQL 5.7 does not support ALTER TABLE ADD COLUMN IF NOT EXISTS,
  // so we check information_schema first and skip columns that already exist.
  async function addColumnIfMissing(table, column, definition) {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column]
    )
    if (rows[0].cnt === 0) {
      await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`)
    }
  }

  await addColumnIfMissing("users", "role", "varchar(20) NOT NULL DEFAULT 'player'")
  await addColumnIfMissing("users", "rank_system_version", "int(11) NOT NULL DEFAULT 0")
  await addColumnIfMissing("users", "placement_matches_played", "int(11) NOT NULL DEFAULT 0")
  await addColumnIfMissing("users", "demotion_protection_rounds", "int(11) NOT NULL DEFAULT 0")
  await addColumnIfMissing("users", "active_loadout_slot", "varchar(60) DEFAULT NULL")
  await addColumnIfMissing("users", "build_walkthrough_status", "varchar(60) NOT NULL DEFAULT 'not_started'")
  await addColumnIfMissing("round_history", "avg_reaction_ms", "int(11) DEFAULT NULL")
  await addColumnIfMissing("round_history", "best_reaction_ms", "int(11) DEFAULT NULL")
  await addColumnIfMissing("round_history", "loadout_name", "varchar(100) DEFAULT NULL")
  await addColumnIfMissing("round_history", "loadout_id", "varchar(60) DEFAULT NULL")
  await addColumnIfMissing("round_history", "tempo_core_id", "varchar(60) DEFAULT NULL")
  await addColumnIfMissing("round_history", "streak_lens_id", "varchar(60) DEFAULT NULL")
  await addColumnIfMissing("round_history", "power_rig_id", "varchar(60) DEFAULT NULL")
  await addColumnIfMissing("round_history", "powerup_slot_1_id", "varchar(60) DEFAULT NULL")
  await addColumnIfMissing("round_history", "powerup_slot_2_id", "varchar(60) DEFAULT NULL")
  await addColumnIfMissing("round_history", "powerup_slot_3_id", "varchar(60) DEFAULT NULL")

  await pool.query(`CREATE TABLE IF NOT EXISTS \`user_lifetime_stats\` (
    \`user_id\` bigint(20) UNSIGNED NOT NULL,
    \`total_rounds\` int(11) NOT NULL DEFAULT 0,
    \`ranked_rounds\` int(11) NOT NULL DEFAULT 0,
    \`best_streak\` int(11) NOT NULL DEFAULT 0,
    \`best_single_score\` int(11) NOT NULL DEFAULT 0,
    \`best_ranked_streak\` int(11) NOT NULL DEFAULT 0,
    \`best_single_round_accuracy\` int(11) NOT NULL DEFAULT 0,
    \`clean_rounds\` int(11) NOT NULL DEFAULT 0,
    \`total_coins_earned\` bigint(20) NOT NULL DEFAULT 0,
    \`total_hits\` bigint(20) NOT NULL DEFAULT 0,
    \`total_misses\` bigint(20) NOT NULL DEFAULT 0,
    \`max_consecutive_ranked_wins\` int(11) NOT NULL DEFAULT 0,
    \`current_consecutive_ranked_wins\` int(11) NOT NULL DEFAULT 0,
    \`reaction_rounds\` int(11) NOT NULL DEFAULT 0,
    \`total_reaction_ms\` bigint(20) NOT NULL DEFAULT 0,
    \`best_reaction_ms\` int(11) DEFAULT NULL,
    PRIMARY KEY (\`user_id\`),
    CONSTRAINT \`fk_lifetime_stats_user\`
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`)

  await pool.query(`CREATE TABLE IF NOT EXISTS \`user_loadout_stats\` (
    \`user_id\` bigint(20) UNSIGNED NOT NULL,
    \`loadout_id\` varchar(60) NOT NULL,
    \`loadout_name\` varchar(100) NOT NULL DEFAULT 'Loadout',
    \`total_rounds\` int(11) NOT NULL DEFAULT 0,
    \`ranked_rounds\` int(11) NOT NULL DEFAULT 0,
    \`ranked_wins\` int(11) NOT NULL DEFAULT 0,
    \`best_score\` int(11) NOT NULL DEFAULT 0,
    \`best_streak\` int(11) NOT NULL DEFAULT 0,
    \`best_ranked_streak\` int(11) NOT NULL DEFAULT 0,
    \`total_hits\` bigint(20) NOT NULL DEFAULT 0,
    \`total_misses\` bigint(20) NOT NULL DEFAULT 0,
    PRIMARY KEY (\`user_id\`, \`loadout_id\`),
    KEY \`idx_loadout_stats_user_rounds\` (\`user_id\`, \`total_rounds\`),
    CONSTRAINT \`fk_loadout_stats_user\`
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`)

  await pool.query(`CREATE TABLE IF NOT EXISTS \`user_loadouts\` (
    \`slot_id\` varchar(60) NOT NULL,
    \`user_id\` bigint(20) UNSIGNED NOT NULL,
    \`name\` varchar(100) NOT NULL DEFAULT '',
    \`tempo_core_id\` varchar(60) DEFAULT NULL,
    \`streak_lens_id\` varchar(60) DEFAULT NULL,
    \`power_rig_id\` varchar(60) DEFAULT NULL,
    \`powerup_slot_1_id\` varchar(60) DEFAULT NULL,
    \`powerup_slot_2_id\` varchar(60) DEFAULT NULL,
    \`powerup_slot_3_id\` varchar(60) DEFAULT NULL,
    PRIMARY KEY (\`slot_id\`, \`user_id\`),
    CONSTRAINT \`fk_loadout_user\`
      FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`)

  console.log("Database schema initialized.")
}

function toNonNegativeNumber(value, fallback = 0) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : fallback
}

function toNullableNonNegativeNumber(value) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) && numericValue >= 0
    ? Math.round(numericValue)
    : null
}

function parseDateValue(value) {
  if (!value) return null
  const parsedDate = value instanceof Date ? value : new Date(value)
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
}

function normalizeStringList(values = []) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )
  )
}

function normalizeOwnedItemIds(itemIds = []) {
  return normalizeStringList(itemIds).filter((itemId) => {
    const catalogItem = getCatalogItemById(itemId)
    return catalogItem && !catalogItem.builtIn
  })
}

function normalizeLoadoutSnapshot(snapshot = {}) {
  const moduleIds = snapshot?.moduleIds ?? {}
  const powerupIds = Array.isArray(snapshot?.powerupIds)
    ? snapshot.powerupIds
        .map((powerupId) => String(powerupId || "").trim())
        .filter(Boolean)
        .slice(0, 3)
    : []

  const loadoutId = String(snapshot?.loadoutId || "")
  const loadoutName = String(snapshot?.loadoutName || "").trim()

  if (!loadoutId && !loadoutName && !powerupIds.length) {
    return null
  }

  return {
    loadoutId,
    loadoutName: loadoutName || "Loadout",
    moduleIds: {
      tempoCoreId: String(moduleIds.tempoCoreId || ""),
      streakLensId: String(moduleIds.streakLensId || ""),
      powerRigId: String(moduleIds.powerRigId || ""),
    },
    powerupIds,
  }
}

function resolveEquippedItemId(itemId, type, ownedItemIdSet) {
  const mappedItem = getMappedShopItemById(itemId)
  const defaultItemId = getDefaultItemIdForType(type)

  if (!mappedItem || mappedItem.type !== type) {
    return defaultItemId
  }

  if (!mappedItem.builtIn && !ownedItemIdSet.has(mappedItem.frontendItemId)) {
    return defaultItemId
  }

  return mappedItem.frontendItemId
}

function normalizeRoundHistoryEntry(entry = {}, index = 0) {
  const playedAtDate =
    parseDateValue(entry.playedAtIso) ||
    parseDateValue(entry.playedAt) ||
    new Date(Date.now() - index)

  const hits = toNonNegativeNumber(entry.hits, 0)
  const misses = toNonNegativeNumber(entry.misses, 0)
  const totalAttempts = hits + misses
  const loadoutSnapshot = normalizeLoadoutSnapshot(
    entry.loadoutSnapshot ?? {
      loadoutId: entry.loadoutId,
      loadoutName: entry.loadoutName,
      moduleIds: {
        tempoCoreId: entry.tempoCoreId,
        streakLensId: entry.streakLensId,
        powerRigId: entry.powerRigId,
      },
      powerupIds: [
        entry.powerupSlot1Id,
        entry.powerupSlot2Id,
        entry.powerupSlot3Id,
      ],
    }
  )

  return {
    playedAtDate,
    modeId: String(entry.modeId || entry.difficultyId || DEFAULT_PROGRESS.selectedModeId),
    progressionMode: String(entry.progressionMode || DEFAULT_PROGRESSION_MODE),
    score: toNonNegativeNumber(entry.score, 0),
    hits,
    misses,
    bestStreak: toNonNegativeNumber(entry.bestStreak, 0),
    avgReactionMs: toNullableNonNegativeNumber(entry.avgReactionMs),
    bestReactionMs: toNullableNonNegativeNumber(entry.bestReactionMs),
    coinsEarned: toNonNegativeNumber(entry.coinsEarned, 0),
    xpEarned: toNonNegativeNumber(entry.xpEarned, 0),
    rankDelta: Number.isFinite(Number(entry.rankDelta)) ? Number(entry.rankDelta) : 0,
    accuracyPercent: totalAttempts > 0 ? (hits / totalAttempts) * 100 : 0,
    loadoutSnapshot,
  }
}

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
  }
}

function mapUserRow(row) {
  if (!row) return null

  return {
    id: Number(row.id),
    username: String(row.username || ""),
    passwordHash: String(row.passwordHash || ""),
    role: row.role === "admin" ? "admin" : "player",
  }
}

function buildHistoryEntry(row) {
  const playedAtDate = parseDateValue(row.playedAt) || new Date()
  const hits = toNonNegativeNumber(row.hits, 0)
  const misses = toNonNegativeNumber(row.misses, 0)
  const loadoutSnapshot = normalizeLoadoutSnapshot({
    loadoutId: row.loadoutId,
    loadoutName: row.loadoutName,
    moduleIds: {
      tempoCoreId: row.tempoCoreId,
      streakLensId: row.streakLensId,
      powerRigId: row.powerRigId,
    },
    powerupIds: [
      row.powerupSlot1Id,
      row.powerupSlot2Id,
      row.powerupSlot3Id,
    ],
  })

  return {
    id: `r-${row.id}`,
    playedAtIso: playedAtDate.toISOString(),
    score: toNonNegativeNumber(row.score, 0),
    hits,
    misses,
    bestStreak: toNonNegativeNumber(row.bestStreak, 0),
    accuracyPercent: hits + misses > 0 ? (hits / (hits + misses)) * 100 : 0,
    avgReactionMs: toNullableNonNegativeNumber(row.avgReactionMs),
    bestReactionMs: toNullableNonNegativeNumber(row.bestReactionMs),
    coinsEarned: toNonNegativeNumber(row.coinsEarned, 0),
    modeId: String(row.modeId || DEFAULT_PROGRESS.selectedModeId),
    difficultyId: String(row.modeId || DEFAULT_PROGRESS.selectedModeId),
    progressionMode: String(row.progressionMode || DEFAULT_PROGRESSION_MODE),
    xpEarned: toNonNegativeNumber(row.xpEarned, 0),
    rankDelta: Number.isFinite(Number(row.rankDelta)) ? Number(row.rankDelta) : 0,
    loadoutSnapshot,
  }
}

function mapLifetimeStatsRow(row = {}) {
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
       best_reaction_ms AS bestReactionMs
     FROM user_lifetime_stats
     WHERE user_id = ?
     LIMIT 1${lockClause}`,
    [userId]
  )

  return rows[0] || null
}

async function ensureLifetimeStatsRow(executor, userId) {
  await executor.query(
    `INSERT IGNORE INTO user_lifetime_stats (user_id) VALUES (?)`,
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

async function getRoundHistoryCount(executor, userId) {
  const [rows] = await executor.query(
    `SELECT COUNT(*) AS totalCount
     FROM round_history
     WHERE user_id = ?`,
    [userId]
  )

  return toNonNegativeNumber(rows[0]?.totalCount, 0)
}

async function backfillLifetimeStatsFromHistory(executor, userId) {
  const existingStats = await getLifetimeStatsRow(executor, userId)
  if (existingStats && toNonNegativeNumber(existingStats.totalRounds, 0) > 0) {
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
       ) VALUES ?`,
      [loadoutRows]
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
       loadout_name,
       loadout_id,
       tempo_core_id,
       streak_lens_id,
       power_rig_id,
       powerup_slot_1_id,
       powerup_slot_2_id,
       powerup_slot_3_id,
       played_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
     ON DUPLICATE KEY UPDATE
       loadout_name = VALUES(loadout_name),
       total_rounds = VALUES(total_rounds),
       ranked_rounds = VALUES(ranked_rounds),
       ranked_wins = VALUES(ranked_wins),
       best_score = VALUES(best_score),
       best_streak = VALUES(best_streak),
       best_ranked_streak = VALUES(best_ranked_streak),
       total_hits = VALUES(total_hits),
       total_misses = VALUES(total_misses)`,
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

async function getUserStateRow(executor, userId, options = {}) {
  const lockClause = options.forUpdate ? " FOR UPDATE" : ""
  const [rows] = await executor.query(
    `SELECT
       id,
       username,
       password_hash AS passwordHash,
       coins,
       xp,
       mmr,
       rank_system_version AS rankSystemVersion,
       placement_matches_played AS placementMatchesPlayed,
       demotion_protection_rounds AS demotionProtectionRounds,
       current_button_skin_id AS currentButtonSkinId,
       current_arena_theme_id AS currentArenaThemeId,
       current_profile_theme_id AS currentProfileThemeId,
       active_loadout_slot AS activeLoadoutId,
       build_walkthrough_status AS buildWalkthroughStatus
     FROM users
     WHERE id = ?
     LIMIT 1${lockClause}`,
    [userId]
  )

  return rows[0] || null
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
  const totalRoundCount = await getRoundHistoryCount(executor, userId)
  const lifetimeStats = await backfillLifetimeStatsFromHistory(executor, userId)
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
  }
}

async function syncUserCollection(executor, userId, progress) {
  const ownedItemIds = new Set(progress.ownedItemIds)

  ;[
    progress.equippedButtonSkinId,
    progress.equippedArenaThemeId,
    progress.equippedProfileImageId,
  ].forEach((itemId) => {
    const mappedItem = getMappedShopItemById(itemId)
    if (mappedItem && !mappedItem.builtIn) {
      ownedItemIds.add(mappedItem.frontendItemId)
    }
  })

  await executor.query("DELETE FROM user_collection WHERE user_id = ?", [userId])

  const rows = Array.from(ownedItemIds)
    .map((itemId) => getMappedShopItemById(itemId))
    .filter(Boolean)
    .map((mappedItem) => [userId, mappedItem.collectionType, mappedItem.dbItemId])

  if (rows.length > 0) {
    await executor.query(
      "INSERT INTO user_collection (user_id, item_type, item_id) VALUES ?",
      [rows]
    )
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
     ) VALUES ?`,
    [rows]
  )
}

async function syncUnlockedAchievements(executor, userId, progress) {
  await executor.query("DELETE FROM user_achievement_progress WHERE user_id = ?", [userId])

  if (progress.unlockedAchievementIds.length === 0) {
    return
  }

  const [rows] = await executor.query(
    `SELECT id
     FROM achievements_catalog
     WHERE id IN (?)`,
    [progress.unlockedAchievementIds]
  )

  const insertRows = rows.map((row) => [userId, row.id, new Date()])

  if (insertRows.length > 0) {
    await executor.query(
      `INSERT INTO user_achievement_progress (
         user_id,
         achievement_id,
         unlocked_at
       ) VALUES ?`,
      [insertRows]
    )
  }
}

export async function findUserByUsername(username) {
  const [rows] = await pool.query(
    `SELECT id, username, password_hash AS passwordHash, role
     FROM users
     WHERE username = ?
     LIMIT 1`,
    [String(username || "").trim()]
  )

  return mapUserRow(rows[0])
}

export async function findUserById(id) {
  const [rows] = await pool.query(
    `SELECT id, username, password_hash AS passwordHash, role
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [id]
  )

  return mapUserRow(rows[0])
}

export async function createUser({ username, passwordHash, role = "player" }) {
  const [result] = await pool.execute(
    `INSERT INTO users (
       username,
       password_hash,
       role,
       build_walkthrough_status
     ) VALUES (?, ?, ?, ?)`,
    [
      String(username || "").trim(),
      String(passwordHash || ""),
      role === "admin" ? "admin" : "player",
      BUILD_WALKTHROUGH_STATUS.NOT_STARTED,
    ]
  )

  return findUserById(result.insertId)
}

export async function updateUserPassword({ id, passwordHash }) {
  await pool.execute(
    "UPDATE users SET password_hash = ? WHERE id = ?",
    [String(passwordHash || ""), id]
  )

  return findUserById(id)
}

export async function updateUserRole({ id, role }) {
  await pool.execute(
    "UPDATE users SET role = ? WHERE id = ?",
    [role === "admin" ? "admin" : "player", id]
  )

  return findUserById(id)
}

export async function createDefaultUserProgress(userId) {
  return buildProgressRecord(pool, userId)
}

export async function findUserProgressByUserId(userId) {
  return buildProgressRecord(pool, userId)
}

export async function findLeaderboardRows({ limit = 25 } = {}) {
  const normalizedLimit = Math.max(1, Math.min(100, Math.floor(Number(limit) || 25)))
  const [rows] = await pool.query(
    `SELECT
       users.id AS userId,
       users.username AS username,
       users.mmr AS mmr,
       users.coins AS coins,
       users.xp AS levelXp,
       ranked_stats.rankedRounds AS rankedRounds,
       ranked_stats.bestScore AS bestScore,
       ranked_stats.bestStreak AS bestStreak,
       ranked_stats.accuracyPercent AS accuracyPercent
     FROM users
     INNER JOIN (
       SELECT
         user_id AS userId,
         COUNT(*) AS rankedRounds,
         MAX(score) AS bestScore,
         MAX(best_streak) AS bestStreak,
         COALESCE(
           ROUND(100 * SUM(hits) / NULLIF(SUM(hits) + SUM(misses), 0)),
           0
         ) AS accuracyPercent
       FROM round_history
       WHERE progression_mode = 'ranked'
       GROUP BY user_id
     ) AS ranked_stats
       ON ranked_stats.userId = users.id
     WHERE users.placement_matches_played >= ?
     ORDER BY
       users.mmr DESC,
       ranked_stats.bestScore DESC,
       ranked_stats.bestStreak DESC,
       ranked_stats.accuracyPercent DESC,
       users.username ASC,
       users.id ASC
     LIMIT ?`,
    [PLACEMENT_MATCH_COUNT, normalizedLimit]
  )

  return rows.map((row, index) => ({
    rank: index + 1,
    userId: Number(row.userId),
    username: String(row.username || ""),
    mmr: toNonNegativeNumber(row.mmr, 0),
    coins: toNonNegativeNumber(row.coins, 0),
    levelXp: toNonNegativeNumber(row.levelXp, 0),
    rankedRounds: toNonNegativeNumber(row.rankedRounds, 0),
    bestScore: toNonNegativeNumber(row.bestScore, 0),
    bestStreak: toNonNegativeNumber(row.bestStreak, 0),
    accuracyPercent: toNonNegativeNumber(row.accuracyPercent, 0),
  }))
}

export async function findRoundHistoryPage(userId, { page = 1, limit = HISTORY_PAGE_SIZE } = {}) {
  const normalizedLimit = Math.max(1, Math.min(100, Math.floor(Number(limit) || HISTORY_PAGE_SIZE)))
  const normalizedPage = Math.max(1, Math.floor(Number(page) || 1))
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

export async function completeUserRound({
  userId,
  coins,
  levelXp,
  rankMmr,
  rankedState,
  ownedItemIds,
  equippedButtonSkinId,
  equippedArenaThemeId,
  equippedProfileImageId,
  activeLoadoutId,
  savedLoadouts,
  selectedModeId,
  unlockedAchievementIds,
  buildWalkthrough,
  historyEntry,
}) {
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    const userRow = await getUserStateRow(connection, userId, { forUpdate: true })
    if (!userRow) {
      throw new Error(`User ${userId} was not found.`)
    }

    const buttonSkin = getMappedShopItemById(equippedButtonSkinId)
    const arenaTheme = getMappedShopItemById(equippedArenaThemeId)
    const profileImage = getMappedShopItemById(equippedProfileImageId)

    await connection.execute(
      `UPDATE users
       SET coins = ?,
           xp = ?,
           mmr = ?,
           rank_system_version = ?,
           placement_matches_played = ?,
           demotion_protection_rounds = ?,
           current_button_skin_id = ?,
           current_arena_theme_id = ?,
           current_profile_theme_id = ?,
           active_loadout_slot = ?,
           build_walkthrough_status = ?
       WHERE id = ?`,
      [
        coins,
        levelXp,
        rankMmr,
        rankedState.rankSystemVersion,
        rankedState.placementMatchesPlayed,
        rankedState.demotionProtectionRounds,
        buttonSkin?.dbItemId ?? null,
        arenaTheme?.dbItemId ?? null,
        profileImage?.dbItemId ?? null,
        activeLoadoutId,
        buildWalkthrough.status,
        userId,
      ]
    )

    const insertedHistoryEntry = await insertRoundHistoryEntry(connection, userId, historyEntry)

    const existingLifetimeStatsRow = await getLifetimeStatsRow(connection, userId, { forUpdate: true })
    const nextLifetimeStats = applyRoundToLifetimeStats(
      existingLifetimeStatsRow ? mapLifetimeStatsRow(existingLifetimeStatsRow) : DEFAULT_LIFETIME_STATS,
      historyEntry
    )
    await persistLifetimeStats(connection, userId, nextLifetimeStats)

    const loadoutId = historyEntry?.loadoutSnapshot?.loadoutId
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
        historyEntry
      )
      await persistLoadoutStats(connection, userId, nextLoadoutStats)
    }

    const normalizedProgress = normalizeProgressInput({
      coins,
      levelXp,
      rankMmr,
      rankedState,
      ownedItemIds,
      equippedButtonSkinId,
      equippedArenaThemeId,
      equippedProfileImageId,
      activeLoadoutId,
      savedLoadouts,
      selectedModeId,
      unlockedAchievementIds,
      buildWalkthrough,
      roundHistory: [insertedHistoryEntry],
    })

    await syncUserCollection(connection, userId, normalizedProgress)
    await syncUserLoadouts(connection, userId, normalizedProgress)
    await syncUnlockedAchievements(connection, userId, normalizedProgress)

    await connection.commit()

    const progress = await findUserProgressByUserId(userId)
    return {
      progress,
      historyEntry: insertedHistoryEntry,
    }
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function saveUserProgress({ userId, ...progress }) {
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
    })
    const buttonSkin = getMappedShopItemById(normalizedProgress.equippedButtonSkinId)
    const arenaTheme = getMappedShopItemById(normalizedProgress.equippedArenaThemeId)
    const profileImage = getMappedShopItemById(normalizedProgress.equippedProfileImageId)

    await connection.execute(
      `UPDATE users
       SET coins = ?,
           xp = ?,
           mmr = ?,
           rank_system_version = ?,
           placement_matches_played = ?,
           demotion_protection_rounds = ?,
           current_button_skin_id = ?,
           current_arena_theme_id = ?,
           current_profile_theme_id = ?,
           active_loadout_slot = ?,
           build_walkthrough_status = ?
       WHERE id = ?`,
      [
        normalizedProgress.coins,
        normalizedProgress.levelXp,
        normalizedProgress.rankMmr,
        normalizedProgress.rankedState.rankSystemVersion,
        normalizedProgress.rankedState.placementMatchesPlayed,
        normalizedProgress.rankedState.demotionProtectionRounds,
        buttonSkin?.dbItemId ?? null,
        arenaTheme?.dbItemId ?? null,
        profileImage?.dbItemId ?? null,
        normalizedProgress.activeLoadoutId,
        normalizedProgress.buildWalkthrough.status,
        userId,
      ]
    )

    await syncUserCollection(connection, userId, normalizedProgress)
    await syncUserLoadouts(connection, userId, normalizedProgress)
    await syncUnlockedAchievements(connection, userId, normalizedProgress)

    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }

  return findUserProgressByUserId(userId)
}

export default pool
