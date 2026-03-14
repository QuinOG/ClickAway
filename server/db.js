import mysql from "mysql2/promise"
import dotenv from "dotenv"

dotenv.config()

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "clickaway",
  waitForConnections: true,
  connectionLimit: 10,
})

function mapUserRow(row) {
  if (!row) return null

  return {
    id: Number(row.id),
    username: row.username,
    passwordHash: row.passwordHash,
    role: "player",
  }
}

export async function findUserByUsername(username) {
  const [rows] = await pool.execute(
    `SELECT id, username, password_hash AS passwordHash
     FROM users
     WHERE username = ?
     LIMIT 1`,
    [username]
  )

  return mapUserRow(rows[0])
}

export async function findUserById(id) {
  const [rows] = await pool.execute(
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
    [username, passwordHash]
  )

  return findUserById(result.insertId)
}

export async function updateUserPassword({ id, passwordHash }) {
  await pool.execute(
    "UPDATE users SET password_hash = ? WHERE id = ?",
    [passwordHash, id]
  )

  return findUserById(id)
}

export default pool
