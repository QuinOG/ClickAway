import pool from "./pgPool.js"
import { toNonNegativeNumber } from "./shared.js"
import { findReplayById } from "./replays.js"

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
    replaySeed: row.replaySeed === null || row.replaySeed === undefined ? null : Number(row.replaySeed) >>> 0,
    opponentReplayScore: row.opponentReplayScore === null || row.opponentReplayScore === undefined
      ? null
      : toNonNegativeNumber(row.opponentReplayScore, 0),
  }
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
     ORDER BY CASE WHEN username = ? THEN 0 ELSE 1 END, id ASC
     LIMIT 1`,
    [normalizedUsername, normalizedUsername]
  )

  if (!rows[0]) {
    return null
  }

  return {
    id: Number(rows[0].id),
    username: String(rows[0].username || ""),
  }
}

export async function countOpenChallenges({ challengerUserId, opponentUserId }, connection = pool) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) FILTER (
              WHERE challenger_user_id = ? AND opponent_user_id = ? AND status IN ('pending', 'accepted')
            ) AS with_opponent,
            COUNT(*) FILTER (
              WHERE challenger_user_id = ? AND status IN ('pending', 'accepted')
            ) AS total,
            COUNT(*) FILTER (
              WHERE opponent_user_id = ? AND status = 'pending'
            ) AS opponent_pending_incoming
     FROM challenges
     WHERE (challenger_user_id = ? AND status IN ('pending', 'accepted'))
        OR (opponent_user_id = ? AND status = 'pending')`,
    [challengerUserId, opponentUserId, challengerUserId, opponentUserId, challengerUserId, opponentUserId]
  )
  return {
    withOpponent: Number(rows[0].with_opponent),
    total: Number(rows[0].total),
    opponentPendingIncoming: Number(rows[0].opponent_pending_incoming),
  }
}

export class ChallengeCapError extends Error {}

async function insertChallengeWithCap(challengerUserId, opponentUserId, insert) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    // Lock both players in a fixed order so concurrent invitations cannot
    // count the same remaining slot or deadlock on reversed player roles.
    await connection.query(
      "SELECT id FROM users WHERE id IN (?, ?) ORDER BY id FOR NO KEY UPDATE",
      [challengerUserId, opponentUserId]
    )
    const { withOpponent, total, opponentPendingIncoming } = await countOpenChallenges({
      challengerUserId,
      opponentUserId,
    }, connection)
    if (withOpponent >= 3) {
      throw new ChallengeCapError("You already have open duels with this player. Wait for them to finish.")
    }
    if (total >= 20) {
      throw new ChallengeCapError("You already have too many open duels. Wait for them to finish.")
    }
    if (opponentPendingIncoming >= 50) {
      throw new ChallengeCapError("This player has too many open duels right now. Try again later.")
    }
    const result = await insert(connection)
    await connection.commit()
    return result
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
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
  enforceOpenCaps = false,
} = {}) {
  const insert = (connection) => connection.execute(
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
  const [result] = enforceOpenCaps
    ? await insertChallengeWithCap(challengerUserId, opponentUserId, insert)
    : await insert(pool)

  try {
    return await findChallengeById(result.insertId)
  } catch (error) {
    console.error("Challenge created, but its response read failed:", error)
    return {
      id: Number(result.insertId),
      challengerUserId,
      challengerUsername,
      opponentUserId,
      opponentUsername,
      replayId,
      opponentReplayId: null,
      modeId,
      status: "pending",
      message: message ? String(message).slice(0, 280) : null,
      challengerWon: null,
      createdAt: null,
      respondedAt: null,
      completedAt: null,
      replayScore: null,
      replaySeed: null,
      opponentReplayScore: null,
    }
  }
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
       replay.seed AS replaySeed,
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
     WHERE (${whereClause})
       AND (
         c.status IN ('pending', 'accepted')
         OR c.id IN (
           SELECT recent.id FROM challenges recent
           WHERE ${whereClause.replaceAll("c.", "recent.")}
           ORDER BY recent.created_at DESC, recent.id DESC
           LIMIT 50
         )
       )
     ORDER BY c.created_at DESC, c.id DESC`,
    [...params, ...params]
  )

  // Every duel still waiting on a reply or a race is returned, however old,
  // plus the 50 most recent for history; otherwise newer duels could push an
  // actionable one off the list (and off the pending badge).
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
  // Conditional on the status read above, so overlapping requests cannot both
  // apply (for example a late decline overwriting an accepted or finished duel).
  const [result] = await pool.execute(
    `UPDATE challenges
     SET status = ?, responded_at = CURRENT_TIMESTAMP
     WHERE id = ? AND opponent_user_id = ? AND status = 'pending'`,
    [nextStatus, challengeId, userId]
  )
  if (!result.affectedRows) {
    return { ok: false, reason: "Challenge is no longer pending." }
  }

  try {
    return { ok: true, challenge: await findChallengeById(challengeId) }
  } catch (error) {
    console.error("Challenge response saved, but its response read failed:", error)
    return { ok: true, challenge: { ...challenge, status: nextStatus } }
  }
}

// The opponent's score always comes from their stored replay, which must be
// their own run of the challenged ghost (same mode and seed). The status change
// is conditional, so a duel can only be completed once.
export async function completeChallenge({
  challengeId,
  userId,
  opponentReplayId,
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

  const opponentReplay = await findReplayById(opponentReplayId)
  if (
    !opponentReplay
    || opponentReplay.id === challenge.replayId
    || Number(opponentReplay.userId) !== Number(userId)
    || opponentReplay.modeId !== challenge.modeId
    || challenge.replaySeed === null
    || (Number(opponentReplay.seed) >>> 0) !== challenge.replaySeed
  ) {
    return { ok: false, reason: "That run does not race this challenge's ghost." }
  }

  const opponentScore = toNonNegativeNumber(opponentReplay.score, 0)
  const challengerWon = toNonNegativeNumber(challenge.replayScore, 0) > opponentScore

  const [result] = await pool.execute(
    `UPDATE challenges
     SET status = 'completed',
         opponent_replay_id = ?,
         challenger_won = ?,
         completed_at = CURRENT_TIMESTAMP
     WHERE id = ? AND status = 'accepted'`,
    [opponentReplay.id, challengerWon, challengeId]
  )
  if (!result.affectedRows) {
    return { ok: false, reason: "Challenge was already completed." }
  }

  try {
    return { ok: true, challenge: await findChallengeById(challengeId), challengerWon }
  } catch (error) {
    console.error("Challenge completed, but its response read failed:", error)
    return {
      ok: true,
      challenge: {
        ...challenge,
        status: "completed",
        opponentReplayId: opponentReplay.id,
        challengerWon,
        opponentReplayScore: opponentScore,
      },
      challengerWon,
    }
  }
}
