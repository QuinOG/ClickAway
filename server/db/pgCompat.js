export function toPositionalSql(sql) {
  let index = 0
  return sql.replace(/\?/g, () => `$${++index}`)
}

// PostgreSQL folds unquoted identifiers (including SELECT aliases) to lowercase.
// The existing database layer intentionally keeps its mysql2-era camelCase aliases,
// so restore those aliases on returned rows in one place instead of quoting and
// updating every alias reference throughout the query set.
export function restoreMysqlAliasCasing(sql, rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return rows
  }

  const aliases = new Map()
  const aliasPattern = /\bAS\s+(?:"([^"]+)"|([A-Za-z_][A-Za-z0-9_]*))/gi
  let match = aliasPattern.exec(sql)

  while (match) {
    const alias = match[1] || match[2]
    const postgresAlias = alias.toLowerCase()
    if (alias !== postgresAlias) {
      aliases.set(postgresAlias, alias)
    }
    match = aliasPattern.exec(sql)
  }

  if (aliases.size === 0) {
    return rows
  }

  return rows.map((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      return row
    }

    const restoredRow = { ...row }
    aliases.forEach((mysqlAlias, postgresAlias) => {
      if (
        Object.hasOwn(restoredRow, postgresAlias) &&
        !Object.hasOwn(restoredRow, mysqlAlias)
      ) {
        restoredRow[mysqlAlias] = restoredRow[postgresAlias]
        delete restoredRow[postgresAlias]
      }
    })
    return restoredRow
  })
}
