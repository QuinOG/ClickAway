import "dotenv/config"

import pg from "pg"

const { Pool } = pg

// mysql2-compatible shim over `pg`. playerMysqlDatabase.js was written against
// mysql2/promise's API surface: pool.query()/execute() resolving to [rows, fields],
// pool.getConnection() giving a connection with query/execute/beginTransaction/
// commit/rollback/release, and `?` positional placeholders. This shim preserves
// that shape so the ~90 query call sites in playerMysqlDatabase.js don't need to
// change — only genuinely MySQL-only syntax (INSERT IGNORE, ON DUPLICATE KEY,
// bulk `VALUES ?`, insertId) needed manual conversion at the call sites.

function toPositionalSql(sql) {
  let index = 0
  return sql.replace(/\?/g, () => `$${++index}`)
}

function toExecResult(result) {
  const insertId = result.rows?.[0]?.id ?? null
  return {
    insertId,
    affectedRows: result.rowCount ?? 0,
    rows: result.rows,
  }
}

function wrapQueryable(queryable) {
  return {
    async query(sql, params = []) {
      const result = await queryable.query(toPositionalSql(sql), params)
      return [result.rows, result.fields]
    },
    async execute(sql, params = []) {
      const result = await queryable.query(toPositionalSql(sql), params)
      return [toExecResult(result)]
    },
  }
}

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
})

const wrappedPool = {
  ...wrapQueryable(pool),
  async getConnection() {
    const client = await pool.connect()
    return {
      ...wrapQueryable(client),
      async beginTransaction() {
        await client.query("BEGIN")
      },
      async commit() {
        await client.query("COMMIT")
      },
      async rollback() {
        await client.query("ROLLBACK")
      },
      release() {
        client.release()
      },
    }
  },
}

// Builds a multi-row VALUES clause + flat param array for bulk inserts.
// Replaces mysql2's `VALUES ?` array-of-arrays extension, which pg doesn't support.
export function buildValuesClause(rows, startIndex = 1) {
  let paramIndex = startIndex
  const params = []
  const tuples = rows.map((row) => {
    const placeholders = row.map((value) => {
      params.push(value)
      return `$${paramIndex++}`
    })
    return `(${placeholders.join(", ")})`
  })

  return { clause: tuples.join(", "), params }
}

export default wrappedPool
