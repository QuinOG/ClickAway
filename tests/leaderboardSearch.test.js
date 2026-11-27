import test from "node:test"
import assert from "node:assert/strict"

process.env.SUPABASE_DB_URL ||= "postgres://unit:unit@localhost:5432/unit"
const { default: pool, escapeLikePattern, findLeaderboardPage } =
  await import("../server/playerMysqlDatabase.js")

test("leaderboard search escapes LIKE wildcard and escape characters", () => {
  assert.equal(escapeLikePattern("a_b"), "a\\_b")
  assert.equal(escapeLikePattern("100%"), "100\\%")
  assert.equal(escapeLikePattern("a\\b"), "a\\\\b")
  assert.equal(escapeLikePattern("alice"), "alice")
})

test("a nonempty leaderboard page uses the count from the rows query", async (t) => {
  const query = t.mock.fn(async (sql, params) => {
    if (sql.startsWith("SET TRANSACTION")) return [[]]
    assert.ok(sql.includes("WHERE LOWER(username) LIKE ? ESCAPE '\\'"))
    assert.equal(params[1], "%a\\_b\\%%")
    assert.match(sql, /COUNT\(\*\) OVER \(\) AS totalCount/)
    return [[{ rank: 3, userId: 1, username: "a_b", totalCount: "8" }]]
  })
  t.mock.method(pool, "getConnection", async () => ({
    query,
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release() {},
  }))

  const result = await findLeaderboardPage({ search: " A_B% ", limit: 2 })
  assert.equal(result.totalCount, 8)
  assert.equal(result.totalPages, 4)
  assert.equal(result.rows[0].username, "a_b")
  assert.equal(Object.hasOwn(result.rows[0], "totalCount"), false)
  assert.equal(query.mock.callCount(), 2)
})

test("an empty leaderboard page falls back to counting all matches", async (t) => {
  const query = t.mock.fn(async (sql) => {
    if (sql.includes("SELECT COUNT(*) AS totalCount")) return [[{ totalCount: "3" }]]
    return [[]]
  })
  t.mock.method(pool, "getConnection", async () => ({
    query,
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release() {},
  }))

  const result = await findLeaderboardPage({ page: 3, limit: 2 })
  assert.deepEqual(result.rows, [])
  assert.equal(result.totalCount, 3)
  assert.equal(result.totalPages, 2)
  assert.equal(query.mock.callCount(), 3)
})
