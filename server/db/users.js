import pool from "./pgPool.js"
import { BUILD_WALKTHROUGH_STATUS } from "../../src/constants/buildWalkthrough.js"

function mapUserRow(row) {
  if (!row) return null

  return {
    id: Number(row.id),
    username: String(row.username || ""),
    passwordHash: String(row.passwordHash || ""),
    role: row.role === "admin" ? "admin" : "player",
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
       build_walkthrough_status AS buildWalkthroughStatus,
       seen_unlock_part_ids_json AS seenUnlockPartIdsJson
     FROM users
     WHERE id = ?
     LIMIT 1${lockClause}`,
    [userId]
  )

  return rows[0] || null
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
     RETURNING id, username, password_hash AS passwordHash, role`,
    [
      String(username || "").trim(),
      String(passwordHash || ""),
      role === "admin" ? "admin" : "player",
      BUILD_WALKTHROUGH_STATUS.NOT_STARTED,
    ]
  )

  return mapUserRow(result.rows[0])
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

export { getUserStateRow }
