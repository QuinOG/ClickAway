import "dotenv/config"

import mysql from "mysql2/promise"

import {
  DEFAULT_PLAYER_STATE,
  getCatalogItemById,
  getDefaultItemIdForType,
  getFrontendItemIdByDbItemId,
  getMappedShopItemById,
} from "./shopItemMap.js"

const DEFAULT_PROGRESS = {
  coins: 0,
  levelXp: 0,
  rankMmr: 0,
  ownedItemIds: [],
  equippedButtonSkinId: DEFAULT_PLAYER_STATE.equippedButtonSkinId,
  equippedArenaThemeId: DEFAULT_PLAYER_STATE.equippedArenaThemeId,
  equippedProfileImageId: DEFAULT_PLAYER_STATE.equippedProfileImageId,
  selectedModeId: "normal",
  roundHistory: [],
  unlockedAchievementIds: [],
}

const DEFAULT_ADMIN_USERNAME = "admin"
const DEFAULT_DATABASE_PORT = 3306
const DEFAULT_ACCURACY = "0%"
const DEFAULT_PROGRESSION_MODE = "non_ranked"

const pool = mysql.createPool({
  host: process.env.DB_HOST || process.env.MYSQL_HOST || "localhost",
  port: Number(process.env.DB_PORT || process.env.MYSQL_PORT || DEFAULT_DATABASE_PORT),
  user: process.env.DB_USER || process.env.MYSQL_USER || "root",
  password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || "",
  database: process.env.DB_NAME || process.env.MYSQL_DATABASE || "clickaway",
  waitForConnections: true,
  connectionLimit: 10,
})

function toNonNegativeNumber(value, fallback = 0) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : fallback
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

  return {
    playedAtDate,
    modeId: String(entry.modeId || entry.difficultyId || DEFAULT_PROGRESS.selectedModeId),
    progressionMode: String(entry.progressionMode || DEFAULT_PROGRESSION_MODE),
    score: toNonNegativeNumber(entry.score, 0),
    hits,
    misses,
    bestStreak: toNonNegativeNumber(entry.bestStreak, 0),
    coinsEarned: toNonNegativeNumber(entry.coinsEarned, 0),
    xpEarned: toNonNegativeNumber(entry.xpEarned, 0),
    rankDelta: Number.isFinite(Number(entry.rankDelta)) ? Number(entry.rankDelta) : 0,
    accuracyPercent: totalAttempts > 0 ? (hits / totalAttempts) * 100 : 0,
  }
}

function normalizeProgressInput(record = {}) {
  const ownedItemIds = normalizeOwnedItemIds(record.ownedItemIds)
  const ownedItemIdSet = new Set(ownedItemIds)

  return {
    coins: toNonNegativeNumber(record.coins, DEFAULT_PROGRESS.coins),
    levelXp: toNonNegativeNumber(record.levelXp, DEFAULT_PROGRESS.levelXp),
    rankMmr: toNonNegativeNumber(record.rankMmr, DEFAULT_PROGRESS.rankMmr),
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
    selectedModeId: String(record.selectedModeId || DEFAULT_PROGRESS.selectedModeId),
    roundHistory: (Array.isArray(record.roundHistory) ? record.roundHistory : []).map(
      normalizeRoundHistoryEntry
    ),
    unlockedAchievementIds: normalizeStringList(record.unlockedAchievementIds),
  }
}

function formatPlayedAtLabel(playedAtDate) {
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)

  const isSameDay = (firstDate, secondDate) => (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  )

  const formatTimeOnly = (date) => date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })

  if (isSameDay(playedAtDate, now)) {
    return `Today, ${formatTimeOnly(playedAtDate)}`
  }

  if (isSameDay(playedAtDate, yesterday)) {
    return `Yesterday, ${formatTimeOnly(playedAtDate)}`
  }

  return playedAtDate.toLocaleString([], {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatAccuracy(hits, misses) {
  const totalAttempts = hits + misses
  if (totalAttempts <= 0) return DEFAULT_ACCURACY
  return `${Math.round((hits / totalAttempts) * 100)}%`
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

  return {
    id: `r-${row.id}`,
    playedAt: formatPlayedAtLabel(playedAtDate),
    playedAtIso: playedAtDate.toISOString(),
    score: toNonNegativeNumber(row.score, 0),
    hits,
    misses,
    bestStreak: toNonNegativeNumber(row.bestStreak, 0),
    accuracy: formatAccuracy(hits, misses),
    coinsEarned: toNonNegativeNumber(row.coinsEarned, 0),
    modeId: String(row.modeId || DEFAULT_PROGRESS.selectedModeId),
    difficultyId: String(row.modeId || DEFAULT_PROGRESS.selectedModeId),
    progressionMode: String(row.progressionMode || DEFAULT_PROGRESSION_MODE),
    xpEarned: toNonNegativeNumber(row.xpEarned, 0),
    rankDelta: Number.isFinite(Number(row.rankDelta)) ? Number(row.rankDelta) : 0,
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
       current_button_skin_id AS currentButtonSkinId,
       current_arena_theme_id AS currentArenaThemeId,
       current_profile_theme_id AS currentProfileThemeId
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
  const [historyRows] = await executor.query(
    `SELECT
       id,
       mode AS modeId,
       progression_mode AS progressionMode,
       score,
       hits,
       misses,
       best_streak AS bestStreak,
       coins_earned AS coinsEarned,
       xp_earned AS xpEarned,
       rank_delta AS rankDelta,
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

  return {
    coins: toNonNegativeNumber(userRow.coins, DEFAULT_PROGRESS.coins),
    levelXp: toNonNegativeNumber(userRow.xp, DEFAULT_PROGRESS.levelXp),
    rankMmr: toNonNegativeNumber(userRow.mmr, DEFAULT_PROGRESS.rankMmr),
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
    selectedModeId: DEFAULT_PROGRESS.selectedModeId,
    roundHistory: historyRows.map(buildHistoryEntry),
    unlockedAchievementIds: normalizeStringList(
      achievementRows.map((row) => row.achievementId)
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
      entry.coinsEarned,
      entry.xpEarned,
      entry.rankDelta,
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
       coins_earned,
       xp_earned,
       rank_delta,
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
    "INSERT INTO users (username, password_hash) VALUES (?, ?)",
    [String(username || "").trim(), String(passwordHash || "")]
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
     ORDER BY
       users.mmr DESC,
       ranked_stats.bestScore DESC,
       ranked_stats.bestStreak DESC,
       ranked_stats.accuracyPercent DESC,
       users.username ASC,
       users.id ASC
     LIMIT ?`,
    [normalizedLimit]
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
           current_button_skin_id = ?,
           current_arena_theme_id = ?,
           current_profile_theme_id = ?
       WHERE id = ?`,
      [
        normalizedProgress.coins,
        normalizedProgress.levelXp,
        normalizedProgress.rankMmr,
        buttonSkin?.dbItemId ?? null,
        arenaTheme?.dbItemId ?? null,
        profileImage?.dbItemId ?? null,
        userId,
      ]
    )

    await syncUserCollection(connection, userId, normalizedProgress)
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
