import test from "node:test"
import assert from "node:assert/strict"

import {
  restoreMysqlAliasCasing,
  toPositionalSql,
} from "../server/db/pgCompat.js"

test("Postgres compatibility converts mysql2 positional placeholders", () => {
  assert.equal(
    toPositionalSql("SELECT * FROM users WHERE id = ? AND role = ?"),
    "SELECT * FROM users WHERE id = $1 AND role = $2"
  )
})

test("Postgres compatibility restores camelCase SELECT aliases", () => {
  const rows = restoreMysqlAliasCasing(
    `SELECT
       password_hash AS passwordHash,
       current_button_skin_id AS currentButtonSkinId,
       COUNT(*) AS totalCount
     FROM users`,
    [{
      passwordhash: "hash",
      currentbuttonskinid: "2",
      totalcount: "1",
    }]
  )

  assert.deepEqual(rows, [{
    passwordHash: "hash",
    currentButtonSkinId: "2",
    totalCount: "1",
  }])
})

test("Postgres compatibility also restores aliases returned through a CTE star", () => {
  const rows = restoreMysqlAliasCasing(
    `WITH ranked_players AS (
       SELECT u.id AS userId, u.mmr AS rankMmr
     )
     SELECT * FROM ranked_players`,
    [{ userid: "7", rankmmr: 1200 }]
  )

  assert.deepEqual(rows, [{ userId: "7", rankMmr: 1200 }])
})
