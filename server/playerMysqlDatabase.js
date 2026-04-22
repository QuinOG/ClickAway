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
import { getLevelProgress } from "../src/utils/progressionUtils.js"
import {
  buildDefaultRankedState,
  PLACEMENT_MATCH_COUNT,
  migrateLegacyRankData,
} from "../src/utils/rankUtils.js"
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
  unlockedAchievementIds: [],
  buildWalkthrough: normalizeBuildWalkthrough(
    {},
    BUILD_WALKTHROUGH_STATUS.DISMISSED
  ),
}

const DEFAULT_ADMIN_USERNAME = "admin"
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

    INSERT IGNORE INTO \`achievements_catalog\` (\`id\`) VALUES
      ('career-coins-100000'),('career-coins-25000'),('career-level-30'),('career-level-50'),
      ('career-ranked-1000'),('career-ranked-250'),('career-rounds-1000'),('career-rounds-250'),
      ('easy-coins-500'),('easy-level-5'),('easy-ranked-1'),('easy-rounds-1'),('easy-rounds-10'),
      ('hard-coins-5000'),('hard-level-15'),('hard-ranked-10'),('hard-ranked-50'),('hard-rounds-50'),
      ('master-economy'),('master-level'),('master-of-masters'),('master-ranked'),('master-rounds');

    INSERT IGNORE INTO \`arena_themes\` (\`id\`) VALUES (1),(2),(3),(4);

    INSERT IGNORE INTO \`button_skins\` (\`id\`) VALUES
      (1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(12),(13),(14),(15),(16);

    INSERT IGNORE INTO \`profile_images\` (\`id\`) VALUES (1),(2),(3),(4),(5),(6),(7);
  `)

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

  const adminUsername = String(
    process.env.ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME
  ).trim().toLowerCase()

  return {
    id: Number(row.id),
    username: String(row.username || ""),
    passwordHash: String(row.passwordHash || ""),
    role: String(row.username || "").trim().toLowerCase() === adminUsername ? "admin" : "player",
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
     ORDER BY played_at DESC, id DESC`,
    [userId]
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

async function syncRoundHistory(executor, userId, progress) {
  await executor.query("DELETE FROM round_history WHERE user_id = ?", [userId])

  if (progress.roundHistory.length === 0) {
    return
  }

  const chronologicalEntries = [...progress.roundHistory].sort(
    (leftEntry, rightEntry) => leftEntry.playedAtDate - rightEntry.playedAtDate
  )
  const rows = []

  for (const entry of chronologicalEntries) {
    rows.push([
      userId,
      entry.modeId,
      entry.progressionMode,
      entry.score,
      entry.hits,
      entry.misses,
      entry.bestStreak,
      entry.avgReactionMs,
      entry.bestReactionMs,
      entry.coinsEarned,
      entry.xpEarned,
      entry.rankDelta,
      entry.loadoutSnapshot?.loadoutName || null,
      entry.loadoutSnapshot?.loadoutId || null,
      entry.loadoutSnapshot?.moduleIds?.tempoCoreId || null,
      entry.loadoutSnapshot?.moduleIds?.streakLensId || null,
      entry.loadoutSnapshot?.moduleIds?.powerRigId || null,
      entry.loadoutSnapshot?.powerupIds?.[0] || null,
      entry.loadoutSnapshot?.powerupIds?.[1] || null,
      entry.loadoutSnapshot?.powerupIds?.[2] || null,
      entry.playedAtDate,
    ])
  }

  await executor.query(
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
    `SELECT id, username, password_hash AS passwordHash
     FROM users
     WHERE username = ?
     LIMIT 1`,
    [String(username || "").trim()]
  )

  return mapUserRow(rows[0])
}

export async function findUserById(id) {
  const [rows] = await pool.query(
    `SELECT id, username, password_hash AS passwordHash
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [id]
  )

  return mapUserRow(rows[0])
}

export async function createUser({ username, passwordHash }) {
  const [result] = await pool.execute(
    `INSERT INTO users (
       username,
       password_hash,
       build_walkthrough_status
     ) VALUES (?, ?, ?)`,
    [
      String(username || "").trim(),
      String(passwordHash || ""),
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
    await syncRoundHistory(connection, userId, normalizedProgress)
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
