import "dotenv/config"

import pool, { buildValuesClause } from "./db/pgPool.js"

import {
  ACTIVE_LOADOUT_ID_DEFAULT,
  DEFAULT_SAVED_LOADOUTS,
  normalizeLoadoutState,
} from "../src/constants/buildcraft.js"
import {
  BUILD_WALKTHROUGH_STATUS,
  normalizeBuildWalkthrough,
} from "../src/constants/buildWalkthrough.js"
import { normalizeSeenUnlockPartIds } from "../src/utils/unlockWallUtils.js"
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
import { applyRoundToDrillStats } from "../src/utils/drillStatsUtils.js"
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
  seenUnlockPartIds: [],
}

const DEFAULT_PROGRESSION_MODE = "non_ranked"

export async function initializeSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS achievements_catalog (
      id varchar(60) NOT NULL,
      PRIMARY KEY (id)
    );

    CREATE TABLE IF NOT EXISTS arena_themes (
      id bigint NOT NULL,
      PRIMARY KEY (id)
    );

    CREATE TABLE IF NOT EXISTS button_skins (
      id bigint NOT NULL,
      PRIMARY KEY (id)
    );

    CREATE TABLE IF NOT EXISTS profile_images (
      id bigint NOT NULL,
      PRIMARY KEY (id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id bigint GENERATED ALWAYS AS IDENTITY,
      username varchar(50) NOT NULL,
      password_hash varchar(255) NOT NULL,
      coins bigint NOT NULL DEFAULT 0,
      xp int NOT NULL DEFAULT 0,
      mmr int NOT NULL DEFAULT 0,
      current_button_skin_id bigint DEFAULT NULL,
      current_arena_theme_id bigint DEFAULT NULL,
      current_profile_theme_id bigint DEFAULT NULL,
      PRIMARY KEY (id),
      UNIQUE (username)
    );
    CREATE INDEX IF NOT EXISTS idx_users_mmr_id ON users (mmr, id);

    CREATE TABLE IF NOT EXISTS round_history (
      id bigint GENERATED ALWAYS AS IDENTITY,
      user_id bigint NOT NULL,
      mode varchar(50) NOT NULL DEFAULT 'normal',
      progression_mode varchar(50) NOT NULL DEFAULT 'non_ranked',
      score int NOT NULL DEFAULT 0,
      hits int NOT NULL DEFAULT 0,
      misses int NOT NULL DEFAULT 0,
      best_streak int NOT NULL DEFAULT 0,
      coins_earned int NOT NULL DEFAULT 0,
      xp_earned int NOT NULL DEFAULT 0,
      rank_delta int NOT NULL DEFAULT 0,
      played_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (id),
      CONSTRAINT fk_round_history_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_user_played ON round_history (user_id, played_at);
    CREATE INDEX IF NOT EXISTS idx_round_history_progression_user ON round_history (progression_mode, user_id);

    CREATE TABLE IF NOT EXISTS user_achievement_progress (
      id bigint GENERATED ALWAYS AS IDENTITY,
      user_id bigint NOT NULL,
      achievement_id varchar(60) NOT NULL,
      unlocked_at timestamptz NULL DEFAULT NULL,
      PRIMARY KEY (id),
      UNIQUE (user_id, achievement_id),
      CONSTRAINT fk_achprog_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_user_unlocked ON user_achievement_progress (user_id, unlocked_at);
    CREATE INDEX IF NOT EXISTS idx_achprog_catalog ON user_achievement_progress (achievement_id);

    CREATE TABLE IF NOT EXISTS user_collection (
      id bigint GENERATED ALWAYS AS IDENTITY,
      user_id bigint NOT NULL,
      item_type varchar(50) NOT NULL,
      item_id bigint NOT NULL,
      PRIMARY KEY (id),
      UNIQUE (user_id, item_type, item_id),
      CONSTRAINT fk_collection_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    INSERT INTO arena_themes (id) VALUES (1),(2),(3),(4) ON CONFLICT (id) DO NOTHING;

    INSERT INTO button_skins (id) VALUES
      (1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(12),(13),(14),(15),(16)
      ON CONFLICT (id) DO NOTHING;

    INSERT INTO profile_images (id) VALUES (1),(2),(3),(4),(5),(6),(7) ON CONFLICT (id) DO NOTHING;
  `)

  // The achievement catalog is seeded from ACHIEVEMENTS (the single source of truth
  // shared with the frontend) instead of a hand-maintained id list, so the two can
  // never drift out of sync again.
  if (ACHIEVEMENTS.length > 0) {
    const { clause, params } = buildValuesClause(
      ACHIEVEMENTS.map((achievement) => [achievement.id])
    )
    await pool.query(
      `INSERT INTO achievements_catalog (id) VALUES ${clause} ON CONFLICT (id) DO NOTHING`,
      params
    )
  }

  // Migrations: add columns that may be missing from older deployments.
  // Postgres supports ADD COLUMN IF NOT EXISTS natively, unlike MySQL 5.7.
  async function addColumnIfMissing(table, column, definition) {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${definition}`)
  }

  await addColumnIfMissing("users", "role", "varchar(20) NOT NULL DEFAULT 'player'")
  await addColumnIfMissing("users", "rank_system_version", "int NOT NULL DEFAULT 0")
  await addColumnIfMissing("users", "placement_matches_played", "int NOT NULL DEFAULT 0")
  await addColumnIfMissing("users", "demotion_protection_rounds", "int NOT NULL DEFAULT 0")
  await addColumnIfMissing("users", "active_loadout_slot", "varchar(60) DEFAULT NULL")
  await addColumnIfMissing("users", "build_walkthrough_status", "varchar(60) NOT NULL DEFAULT 'not_started'")
  await addColumnIfMissing("users", "seen_unlock_part_ids_json", "jsonb DEFAULT NULL")
  await addColumnIfMissing("round_history", "avg_reaction_ms", "int DEFAULT NULL")
  await addColumnIfMissing("round_history", "best_reaction_ms", "int DEFAULT NULL")
  await addColumnIfMissing("round_history", "loadout_name", "varchar(100) DEFAULT NULL")
  await addColumnIfMissing("round_history", "loadout_id", "varchar(60) DEFAULT NULL")
  await addColumnIfMissing("round_history", "tempo_core_id", "varchar(60) DEFAULT NULL")
  await addColumnIfMissing("round_history", "streak_lens_id", "varchar(60) DEFAULT NULL")
  await addColumnIfMissing("round_history", "power_rig_id", "varchar(60) DEFAULT NULL")
  await addColumnIfMissing("round_history", "powerup_slot_1_id", "varchar(60) DEFAULT NULL")
  await addColumnIfMissing("round_history", "powerup_slot_2_id", "varchar(60) DEFAULT NULL")
  await addColumnIfMissing("round_history", "powerup_slot_3_id", "varchar(60) DEFAULT NULL")

  await pool.query(`CREATE TABLE IF NOT EXISTS user_lifetime_stats (
    user_id bigint NOT NULL,
    total_rounds int NOT NULL DEFAULT 0,
    ranked_rounds int NOT NULL DEFAULT 0,
    best_streak int NOT NULL DEFAULT 0,
    best_single_score int NOT NULL DEFAULT 0,
    best_ranked_streak int NOT NULL DEFAULT 0,
    best_single_round_accuracy int NOT NULL DEFAULT 0,
    clean_rounds int NOT NULL DEFAULT 0,
    total_coins_earned bigint NOT NULL DEFAULT 0,
    total_hits bigint NOT NULL DEFAULT 0,
    total_misses bigint NOT NULL DEFAULT 0,
    max_consecutive_ranked_wins int NOT NULL DEFAULT 0,
    current_consecutive_ranked_wins int NOT NULL DEFAULT 0,
    reaction_rounds int NOT NULL DEFAULT 0,
    total_reaction_ms bigint NOT NULL DEFAULT 0,
    best_reaction_ms int DEFAULT NULL,
    PRIMARY KEY (user_id),
    CONSTRAINT fk_lifetime_stats_user
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  )`)

  await addColumnIfMissing("user_lifetime_stats", "drill_stats_json", "jsonb DEFAULT NULL")

  await pool.query(`CREATE TABLE IF NOT EXISTS user_loadout_stats (
    user_id bigint NOT NULL,
    loadout_id varchar(60) NOT NULL,
    loadout_name varchar(100) NOT NULL DEFAULT 'Loadout',
    total_rounds int NOT NULL DEFAULT 0,
    ranked_rounds int NOT NULL DEFAULT 0,
    ranked_wins int NOT NULL DEFAULT 0,
    best_score int NOT NULL DEFAULT 0,
    best_streak int NOT NULL DEFAULT 0,
    best_ranked_streak int NOT NULL DEFAULT 0,
    total_hits bigint NOT NULL DEFAULT 0,
    total_misses bigint NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, loadout_id),
    CONSTRAINT fk_loadout_stats_user
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  )`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_loadout_stats_user_rounds ON user_loadout_stats (user_id, total_rounds)`)

  await pool.query(`CREATE TABLE IF NOT EXISTS user_loadouts (
    slot_id varchar(60) NOT NULL,
    user_id bigint NOT NULL,
    name varchar(100) NOT NULL DEFAULT '',
    tempo_core_id varchar(60) DEFAULT NULL,
    streak_lens_id varchar(60) DEFAULT NULL,
    power_rig_id varchar(60) DEFAULT NULL,
    powerup_slot_1_id varchar(60) DEFAULT NULL,
    powerup_slot_2_id varchar(60) DEFAULT NULL,
    powerup_slot_3_id varchar(60) DEFAULT NULL,
    PRIMARY KEY (slot_id, user_id),
    CONSTRAINT fk_loadout_user
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  )`)

  await pool.query(`CREATE TABLE IF NOT EXISTS seasons (
    id bigint GENERATED ALWAYS AS IDENTITY,
    slug varchar(60) NOT NULL,
    name varchar(100) NOT NULL,
    starts_at timestamptz NOT NULL,
    ends_at timestamptz NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'active',
    PRIMARY KEY (id),
    UNIQUE (slug)
  )`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_season_status_dates ON seasons (status, starts_at, ends_at)`)

  await pool.query(`CREATE TABLE IF NOT EXISTS user_season_stats (
    user_id bigint NOT NULL,
    season_id bigint NOT NULL,
    ranked_rounds int NOT NULL DEFAULT 0,
    peak_mmr int NOT NULL DEFAULT 0,
    reward_tier int NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, season_id),
    CONSTRAINT fk_user_season_user
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_season_season
      FOREIGN KEY (season_id) REFERENCES seasons (id) ON DELETE CASCADE
  )`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_season_peak_mmr ON user_season_stats (season_id, peak_mmr)`)

  await pool.query(`CREATE TABLE IF NOT EXISTS round_replays (
    id bigint GENERATED ALWAYS AS IDENTITY,
    user_id bigint NOT NULL,
    username varchar(50) NOT NULL,
    mode_id varchar(50) NOT NULL,
    seed bigint NOT NULL,
    events_json jsonb NOT NULL,
    loadout_snapshot_json jsonb DEFAULT NULL,
    score int NOT NULL DEFAULT 0,
    hits int NOT NULL DEFAULT 0,
    misses int NOT NULL DEFAULT 0,
    best_streak int NOT NULL DEFAULT 0,
    visibility varchar(20) NOT NULL DEFAULT 'public',
    round_history_id bigint DEFAULT NULL,
    played_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    CONSTRAINT fk_replays_user
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  )`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_replays_user_played ON round_replays (user_id, played_at)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_replays_visibility_score ON round_replays (visibility, score)`)

  await pool.query(`CREATE TABLE IF NOT EXISTS challenges (
    id bigint GENERATED ALWAYS AS IDENTITY,
    challenger_user_id bigint NOT NULL,
    challenger_username varchar(50) NOT NULL,
    opponent_user_id bigint NOT NULL,
    opponent_username varchar(50) NOT NULL,
    replay_id bigint NOT NULL,
    mode_id varchar(50) NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'pending',
    message varchar(280) DEFAULT NULL,
    opponent_replay_id bigint DEFAULT NULL,
    challenger_won boolean DEFAULT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    responded_at timestamptz NULL DEFAULT NULL,
    completed_at timestamptz NULL DEFAULT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_challenges_challenger
      FOREIGN KEY (challenger_user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_challenges_opponent
      FOREIGN KEY (opponent_user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_challenges_replay
      FOREIGN KEY (replay_id) REFERENCES round_replays (id) ON DELETE CASCADE
  )`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_challenges_opponent_status ON challenges (opponent_user_id, status, created_at)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_challenges_challenger_status ON challenges (challenger_user_id, status, created_at)`)

  await ensureActiveSeason()

  console.log("Database schema initialized.")
}

async function ensureActiveSeason() {
  const [rows] = await pool.query(
    "SELECT id FROM seasons WHERE status = 'active' LIMIT 1"
  )
  if (rows.length > 0) {
    return
  }

  const startsAt = new Date()
  const endsAt = new Date(startsAt)
  endsAt.setDate(endsAt.getDate() + 90)

  await pool.query(
    `INSERT INTO seasons (slug, name, starts_at, ends_at, status)
     VALUES (?, ?, ?, ?, 'active')`,
    ["season-1", "Season 1", startsAt, endsAt]
  )
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
    seenUnlockPartIds: normalizeSeenUnlockPartIds(record.seenUnlockPartIds),
  }
}

function parseSeenUnlockPartIdsJson(value) {
  if (!value) return []
  const parsed = typeof value === "string" ? JSON.parse(value) : value
  return normalizeSeenUnlockPartIds(parsed)
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
       loadout_name,
       loadout_id,
       tempo_core_id,
       streak_lens_id,
       power_rig_id,
       powerup_slot_1_id,
       powerup_slot_2_id,
       powerup_slot_3_id,
       played_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
       build_walkthrough_status AS buildWalkthroughStatus,
       seen_unlock_part_ids_json AS seenUnlockPartIdsJson
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
    seenUnlockPartIds: parseSeenUnlockPartIdsJson(userRow.seenUnlockPartIdsJson),
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
    const { clause, params } = buildValuesClause(rows)
    await executor.query(
      `INSERT INTO user_collection (user_id, item_type, item_id) VALUES ${clause}`,
      params
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

async function syncUnlockedAchievements(executor, userId, progress) {
  await executor.query("DELETE FROM user_achievement_progress WHERE user_id = ?", [userId])

  if (progress.unlockedAchievementIds.length === 0) {
    return
  }

  const [rows] = await executor.query(
    `SELECT id
     FROM achievements_catalog
     WHERE id = ANY(?)`,
    [progress.unlockedAchievementIds]
  )

  const insertRows = rows.map((row) => [userId, row.id, new Date()])

  if (insertRows.length > 0) {
    const { clause, params } = buildValuesClause(insertRows)
    await executor.query(
      `INSERT INTO user_achievement_progress (
         user_id,
         achievement_id,
         unlocked_at
       ) VALUES ${clause}`,
      params
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
     ) VALUES (?, ?, ?, ?)
     RETURNING id`,
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

async function queryRankedLeaderboardRows({
  board = LEADERBOARD_BOARDS.MMR,
  page = 1,
  limit = LEADERBOARD_DEFAULT_LIMIT,
  search = "",
  userId = null,
  view = "top",
} = {}) {
  const normalizedBoard = Object.values(LEADERBOARD_BOARDS).includes(board)
    ? board
    : LEADERBOARD_BOARDS.MMR
  const normalizedLimit = Math.max(
    1,
    Math.min(LEADERBOARD_MAX_LIMIT, Math.floor(Number(limit) || LEADERBOARD_DEFAULT_LIMIT))
  )
  const normalizedPage = Math.max(1, Math.floor(Number(page) || 1))
  const normalizedSearch = String(search || "").trim().toLowerCase()
  const orderClause = buildLeaderboardOrderClause(normalizedBoard)
  const reactionFilter = normalizedBoard === LEADERBOARD_BOARDS.REACTION
    ? "AND ls.best_reaction_ms IS NOT NULL"
    : ""

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
            THEN ROUND(100 * ls.total_hits / (ls.total_hits + ls.total_misses))
          ELSE 0
        END AS accuracyPercent,
        ls.best_reaction_ms AS bestReactionMs
      FROM users u
      LEFT JOIN user_lifetime_stats ls
        ON ls.user_id = u.id
      WHERE u.placement_matches_played >= ?
        ${reactionFilter}
        ${normalizedSearch ? "AND LOWER(u.username) LIKE ?" : ""}
    ),
    ranked_ladder AS (
      SELECT
        ranked_players.*,
        RANK() OVER (ORDER BY ${orderClause}) AS rank
      FROM ranked_players
    )`

  const searchParams = normalizedSearch ? [`%${normalizedSearch}%`] : []

  if (view === "aroundMe" && userId) {
    const [[selfRow]] = await pool.query(
      `${baseCte}
       SELECT rank
       FROM ranked_ladder
       WHERE userId = ?
       LIMIT 1`,
      [PLACEMENT_MATCH_COUNT, ...searchParams, userId]
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

    const [rows] = await pool.query(
      `${baseCte}
       SELECT *
       FROM ranked_ladder
       WHERE rank BETWEEN ? AND ?
       ORDER BY rank ASC`,
      [PLACEMENT_MATCH_COUNT, ...searchParams, minRank, maxRank]
    )

    const [[countRow]] = await pool.query(
      `${baseCte}
       SELECT COUNT(*) AS totalCount
       FROM ranked_ladder`,
      [PLACEMENT_MATCH_COUNT, ...searchParams]
    )

    const totalCount = toNonNegativeNumber(countRow?.totalCount, 0)

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
  const [rows] = await pool.query(
    `${baseCte}
     SELECT *
     FROM ranked_ladder
     ORDER BY rank ASC
     LIMIT ? OFFSET ?`,
    [PLACEMENT_MATCH_COUNT, ...searchParams, normalizedLimit, offset]
  )

  const [[countRow]] = await pool.query(
    `${baseCte}
     SELECT COUNT(*) AS totalCount
     FROM ranked_ladder`,
    [PLACEMENT_MATCH_COUNT, ...searchParams]
  )

  const totalCount = toNonNegativeNumber(countRow?.totalCount, 0)
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / normalizedLimit) : 0

  let selfRank = null
  if (userId) {
    const [[selfRow]] = await pool.query(
      `${baseCte}
       SELECT rank
       FROM ranked_ladder
       WHERE userId = ?
       LIMIT 1`,
      [PLACEMENT_MATCH_COUNT, ...searchParams, userId]
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
  seenUnlockPartIds,
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
           build_walkthrough_status = ?,
           seen_unlock_part_ids_json = ?
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
        JSON.stringify(normalizeSeenUnlockPartIds(seenUnlockPartIds)),
        userId,
      ]
    )

    const insertedHistoryEntry = await insertRoundHistoryEntry(connection, userId, historyEntry)

    const existingLifetimeStatsRow = await getLifetimeStatsRow(connection, userId, { forUpdate: true })
    let nextLifetimeStats = applyRoundToLifetimeStats(
      existingLifetimeStatsRow ? mapLifetimeStatsRow(existingLifetimeStatsRow) : DEFAULT_LIFETIME_STATS,
      historyEntry
    )
    if (historyEntry?.drillId) {
      nextLifetimeStats = {
        ...nextLifetimeStats,
        drillStats: applyRoundToDrillStats(
          nextLifetimeStats.drillStats,
          historyEntry.drillId,
          historyEntry
        ),
      }
    }
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
           build_walkthrough_status = ?,
           seen_unlock_part_ids_json = ?
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
        JSON.stringify(normalizedProgress.seenUnlockPartIds),
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

function mapSeasonRow(row = {}) {
  if (!row?.id) {
    return null
  }

  return {
    id: Number(row.id),
    slug: String(row.slug || ""),
    name: String(row.name || ""),
    status: String(row.status || "active"),
    startsAt: row.startsAt ?? row.starts_at ?? null,
    endsAt: row.endsAt ?? row.ends_at ?? null,
  }
}

function mapReplayRow(row = {}) {
  if (!row?.id) {
    return null
  }

  return {
    id: Number(row.id),
    userId: Number(row.userId),
    username: String(row.username || ""),
    modeId: String(row.modeId || ""),
    seed: Number(row.seed) >>> 0,
    events: typeof row.eventsJson === "string"
      ? JSON.parse(row.eventsJson)
      : (row.eventsJson ?? []),
    loadoutSnapshot: row.loadoutSnapshotJson
      ? (typeof row.loadoutSnapshotJson === "string"
        ? JSON.parse(row.loadoutSnapshotJson)
        : row.loadoutSnapshotJson)
      : null,
    score: toNonNegativeNumber(row.score, 0),
    hits: toNonNegativeNumber(row.hits, 0),
    misses: toNonNegativeNumber(row.misses, 0),
    bestStreak: toNonNegativeNumber(row.bestStreak, 0),
    visibility: String(row.visibility || "public"),
    playedAt: row.playedAt ?? null,
  }
}

function mapChallengeRow(row = {}) {
  if (!row?.id) {
    return null
  }

  return {
    id: Number(row.id),
    challengerUserId: Number(row.challengerUserId),
    challengerUsername: String(row.challengerUsername || ""),
    opponentUserId: Number(row.opponentUserId),
    opponentUsername: String(row.opponentUsername || ""),
    replayId: Number(row.replayId),
    opponentReplayId: row.opponentReplayId ? Number(row.opponentReplayId) : null,
    modeId: String(row.modeId || ""),
    status: String(row.status || "pending"),
    message: row.message ? String(row.message) : null,
    challengerWon: row.challengerWon === null || row.challengerWon === undefined
      ? null
      : Boolean(row.challengerWon),
    createdAt: row.createdAt ?? null,
    respondedAt: row.respondedAt ?? null,
    completedAt: row.completedAt ?? null,
    replayScore: toNonNegativeNumber(row.replayScore, 0),
    opponentReplayScore: row.opponentReplayScore === null || row.opponentReplayScore === undefined
      ? null
      : toNonNegativeNumber(row.opponentReplayScore, 0),
  }
}

export async function findCurrentSeason() {
  const [rows] = await pool.query(
    `SELECT
       id,
       slug,
       name,
       status,
       starts_at AS startsAt,
       ends_at AS endsAt
     FROM seasons
     WHERE status = 'active'
     ORDER BY starts_at DESC
     LIMIT 1`
  )

  return mapSeasonRow(rows[0])
}

export async function applyUserSeasonProgress(userId, { rankMmr, isRankedRound = false } = {}) {
  const season = await findCurrentSeason()
  if (!season?.id || !isRankedRound) {
    return null
  }

  const normalizedMmr = toNonNegativeNumber(rankMmr, 0)
  const rewardTier = Math.min(
    5,
    Math.floor(normalizedMmr / 400)
  )

  await pool.execute(
    `INSERT INTO user_season_stats (user_id, season_id, ranked_rounds, peak_mmr, reward_tier)
     VALUES (?, ?, 1, ?, ?)
     ON CONFLICT (user_id, season_id) DO UPDATE SET
       ranked_rounds = user_season_stats.ranked_rounds + 1,
       peak_mmr = GREATEST(user_season_stats.peak_mmr, EXCLUDED.peak_mmr),
       reward_tier = GREATEST(user_season_stats.reward_tier, EXCLUDED.reward_tier)`,
    [userId, season.id, normalizedMmr, rewardTier]
  )

  const [[statsRow]] = await pool.query(
    `SELECT ranked_rounds AS rankedRounds, peak_mmr AS peakMmr, reward_tier AS rewardTier
     FROM user_season_stats
     WHERE user_id = ? AND season_id = ?
     LIMIT 1`,
    [userId, season.id]
  )

  return {
    season,
    rankedRounds: toNonNegativeNumber(statsRow?.rankedRounds, 0),
    peakMmr: toNonNegativeNumber(statsRow?.peakMmr, 0),
    rewardTier: toNonNegativeNumber(statsRow?.rewardTier, 0),
  }
}

export async function insertRoundReplay({
  userId,
  username,
  modeId,
  seed,
  events = [],
  loadoutSnapshot = null,
  score = 0,
  hits = 0,
  misses = 0,
  bestStreak = 0,
  roundHistoryId = null,
  visibility = "public",
} = {}) {
  const normalizedEvents = Array.isArray(events) ? events : []
  const [result] = await pool.execute(
    `INSERT INTO round_replays (
       user_id,
       username,
       mode_id,
       seed,
       events_json,
       loadout_snapshot_json,
       score,
       hits,
       misses,
       best_streak,
       visibility,
       round_history_id
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING id`,
    [
      userId,
      String(username || "Player"),
      String(modeId || ""),
      Number(seed) >>> 0,
      JSON.stringify(normalizedEvents),
      loadoutSnapshot ? JSON.stringify(loadoutSnapshot) : null,
      toNonNegativeNumber(score, 0),
      toNonNegativeNumber(hits, 0),
      toNonNegativeNumber(misses, 0),
      toNonNegativeNumber(bestStreak, 0),
      visibility === "private" ? "private" : "public",
      roundHistoryId,
    ]
  )

  return findReplayById(result.insertId)
}

export async function findReplayById(replayId) {
  const [rows] = await pool.query(
    `SELECT
       id,
       user_id AS userId,
       username,
       mode_id AS modeId,
       seed,
       events_json AS eventsJson,
       loadout_snapshot_json AS loadoutSnapshotJson,
       score,
       hits,
       misses,
       best_streak AS bestStreak,
       visibility,
       played_at AS playedAt
     FROM round_replays
     WHERE id = ?
     LIMIT 1`,
    [replayId]
  )

  return mapReplayRow(rows[0])
}

export async function findUserReplays(userId, { limit = 10 } = {}) {
  const normalizedLimit = Math.max(1, Math.min(25, Math.floor(Number(limit) || 10)))
  const [rows] = await pool.query(
    `SELECT
       id,
       user_id AS userId,
       username,
       mode_id AS modeId,
       seed,
       events_json AS eventsJson,
       loadout_snapshot_json AS loadoutSnapshotJson,
       score,
       hits,
       misses,
       best_streak AS bestStreak,
       visibility,
       played_at AS playedAt
     FROM round_replays
     WHERE user_id = ?
     ORDER BY played_at DESC, id DESC
     LIMIT ?`,
    [userId, normalizedLimit]
  )

  return rows.map(mapReplayRow).filter(Boolean)
}

export async function findUserByUsernameForChallenge(username) {
  const normalizedUsername = String(username || "").trim()
  if (!normalizedUsername) {
    return null
  }

  const [rows] = await pool.query(
    `SELECT id, username
     FROM users
     WHERE LOWER(username) = LOWER(?)
     LIMIT 1`,
    [normalizedUsername]
  )

  if (!rows[0]) {
    return null
  }

  return {
    id: Number(rows[0].id),
    username: String(rows[0].username || ""),
  }
}

export async function createChallenge({
  challengerUserId,
  challengerUsername,
  opponentUserId,
  opponentUsername,
  replayId,
  modeId,
  message = "",
} = {}) {
  const [result] = await pool.execute(
    `INSERT INTO challenges (
       challenger_user_id,
       challenger_username,
       opponent_user_id,
       opponent_username,
       replay_id,
       mode_id,
       message
     ) VALUES (?, ?, ?, ?, ?, ?, ?)
     RETURNING id`,
    [
      challengerUserId,
      challengerUsername,
      opponentUserId,
      opponentUsername,
      replayId,
      modeId,
      message ? String(message).slice(0, 280) : null,
    ]
  )

  return findChallengeById(result.insertId)
}

export async function findChallengeById(challengeId) {
  const [rows] = await pool.query(
    `SELECT
       c.id,
       c.challenger_user_id AS challengerUserId,
       c.challenger_username AS challengerUsername,
       c.opponent_user_id AS opponentUserId,
       c.opponent_username AS opponentUsername,
       c.replay_id AS replayId,
       c.opponent_replay_id AS opponentReplayId,
       c.mode_id AS modeId,
       c.status,
       c.message,
       c.challenger_won AS challengerWon,
       c.created_at AS createdAt,
       c.responded_at AS respondedAt,
       c.completed_at AS completedAt,
       replay.score AS replayScore,
       opponent_replay.score AS opponentReplayScore
     FROM challenges c
     INNER JOIN round_replays replay
       ON replay.id = c.replay_id
     LEFT JOIN round_replays opponent_replay
       ON opponent_replay.id = c.opponent_replay_id
     WHERE c.id = ?
     LIMIT 1`,
    [challengeId]
  )

  return mapChallengeRow(rows[0])
}

export async function findChallengesForUser(userId, { role = "all" } = {}) {
  const normalizedRole = ["incoming", "outgoing", "all"].includes(role) ? role : "all"
  let whereClause = "c.challenger_user_id = ? OR c.opponent_user_id = ?"
  if (normalizedRole === "incoming") {
    whereClause = "c.opponent_user_id = ?"
  } else if (normalizedRole === "outgoing") {
    whereClause = "c.challenger_user_id = ?"
  }

  const params = normalizedRole === "all" ? [userId, userId] : [userId]
  const [rows] = await pool.query(
    `SELECT
       c.id,
       c.challenger_user_id AS challengerUserId,
       c.challenger_username AS challengerUsername,
       c.opponent_user_id AS opponentUserId,
       c.opponent_username AS opponentUsername,
       c.replay_id AS replayId,
       c.opponent_replay_id AS opponentReplayId,
       c.mode_id AS modeId,
       c.status,
       c.message,
       c.challenger_won AS challengerWon,
       c.created_at AS createdAt,
       c.responded_at AS respondedAt,
       c.completed_at AS completedAt,
       replay.score AS replayScore,
       opponent_replay.score AS opponentReplayScore
     FROM challenges c
     INNER JOIN round_replays replay
       ON replay.id = c.replay_id
     LEFT JOIN round_replays opponent_replay
       ON opponent_replay.id = c.opponent_replay_id
     WHERE ${whereClause}
     ORDER BY c.created_at DESC, c.id DESC
     LIMIT 50`,
    params
  )

  return rows.map(mapChallengeRow).filter(Boolean)
}

export async function respondToChallenge({
  challengeId,
  userId,
  action,
} = {}) {
  const challenge = await findChallengeById(challengeId)
  if (!challenge) {
    return { ok: false, reason: "Challenge not found." }
  }
  if (challenge.opponentUserId !== userId) {
    return { ok: false, reason: "Only the challenged player can respond." }
  }
  if (challenge.status !== "pending") {
    return { ok: false, reason: "Challenge is no longer pending." }
  }

  const nextStatus = action === "accept" ? "accepted" : "declined"
  await pool.execute(
    `UPDATE challenges
     SET status = ?, responded_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [nextStatus, challengeId]
  )

  return { ok: true, challenge: await findChallengeById(challengeId) }
}

export async function completeChallenge({
  challengeId,
  userId,
  opponentReplayId,
  opponentScore = 0,
} = {}) {
  const challenge = await findChallengeById(challengeId)
  if (!challenge) {
    return { ok: false, reason: "Challenge not found." }
  }
  if (challenge.opponentUserId !== userId) {
    return { ok: false, reason: "Only the challenged player can complete this duel." }
  }
  if (challenge.status !== "accepted") {
    return { ok: false, reason: "Challenge must be accepted before completing." }
  }

  const challengerWon = toNonNegativeNumber(challenge.replayScore, 0) > toNonNegativeNumber(opponentScore, 0)

  await pool.execute(
    `UPDATE challenges
     SET status = 'completed',
         opponent_replay_id = ?,
         challenger_won = ?,
         completed_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [opponentReplayId, challengerWon, challengeId]
  )

  return { ok: true, challenge: await findChallengeById(challengeId), challengerWon }
}

export default pool
