import pool from "./pgPool.js"
import { toNonNegativeNumber } from "./shared.js"

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

function mapReplaySummaryRow(row = {}) {
  if (!row?.id) {
    return null
  }

  return {
    id: Number(row.id),
    userId: Number(row.userId),
    username: String(row.username || ""),
    modeId: String(row.modeId || ""),
    score: toNonNegativeNumber(row.score, 0),
    hits: toNonNegativeNumber(row.hits, 0),
    misses: toNonNegativeNumber(row.misses, 0),
    bestStreak: toNonNegativeNumber(row.bestStreak, 0),
    visibility: String(row.visibility || "public"),
    playedAt: row.playedAt ?? null,
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
       score,
       hits,
       misses,
       best_streak AS bestStreak,
       visibility,
       played_at AS playedAt
     FROM round_replays
     WHERE user_id = ?
       AND loadout_snapshot_json->>'arenaWidth' IS NOT NULL
       AND loadout_snapshot_json->>'arenaHeight' IS NOT NULL
     ORDER BY played_at DESC, id DESC
     LIMIT ?`,
    [userId, normalizedLimit]
  )

  return rows.map(mapReplaySummaryRow).filter(Boolean)
}
