import pool from "./pgPool.js"

export async function createUserSession(userId) {
  await pool.query(
    "DELETE FROM user_sessions WHERE user_id = ? AND expires_at < now() - interval '7 days'",
    [userId]
  )
  const [[session]] = await pool.query(
    "INSERT INTO user_sessions (user_id, expires_at) VALUES (?, now() + interval '168 hours') RETURNING id",
    [userId]
  )
  return session.id
}

export async function isUserSessionActive(sessionId, userId) {
  const [rows] = await pool.query(
    `SELECT 1 FROM user_sessions
     WHERE id = ? AND user_id = ? AND revoked_at IS NULL AND expires_at > now()`,
    [sessionId, userId]
  )
  return rows.length > 0
}

export async function revokeUserSession(sessionId, userId) {
  await pool.query(
    "UPDATE user_sessions SET revoked_at = now() WHERE id = ? AND user_id = ? AND revoked_at IS NULL",
    [sessionId, userId]
  )
}

export async function revokeAllUserSessions(userId) {
  await pool.query(
    "UPDATE user_sessions SET revoked_at = now() WHERE user_id = ? AND revoked_at IS NULL",
    [userId]
  )
}
