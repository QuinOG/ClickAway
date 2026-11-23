import test from "node:test"
import assert from "node:assert/strict"

// Import the database module without requiring local credentials; all database
// access below is stubbed, so these unit tests never connect to Postgres.
process.env.SUPABASE_DB_URL ||= "postgres://unit:unit@localhost:5432/unit"
const {
  default: pool,
  findLeaderboardPage,
  findRoundHistoryPage,
  normalizePaginationPage,
  normalizePaginationLimit,
} = await import("../server/playerMysqlDatabase.js")
const { createPlayerStateStore, PlayerStateError } = await import("../server/playerStateStore.js")

const PAGE_CASES = [
  [Infinity, 1], [-Infinity, 1], [NaN, 1], [1e30, 1_000_000], ["1e20", 1_000_000],
  [0, 1], [-5, 1], [1, 1], [12, 12], ["3.9", 3], [1_000_001, 1_000_000],
]
const LIMIT_CASES = [
  [Infinity, 25], [-Infinity, 25], [NaN, 25], [undefined, 25], ["", 25], [null, 25],
  [1e30, 50], ["1e20", 50], [0, 25], [-5, 1], ["3.9", 3], [12, 12],
]

test("pagination helpers bound non-finite, overflowing, negative and fractional inputs", () => {
  for (const [input, expected] of PAGE_CASES) {
    assert.equal(normalizePaginationPage(input), expected)
  }
  for (const [input, expected] of LIMIT_CASES) {
    assert.equal(normalizePaginationLimit(input, 50, 25), expected)
  }
})

test("leaderboard and history queries send only bounded safe integers to SQL", async (t) => {
  const paginationParams = []
  const query = async (sql, params) => {
    if (sql.includes("LIMIT ? OFFSET ?")) paginationParams.push(params.slice(-2))
    return sql.includes("COUNT(*)") ? [[{ totalCount: 0 }]] : [[]]
  }
  t.mock.method(pool, "query", query)
  t.mock.method(pool, "getConnection", async () => ({
    query,
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release() {},
  }))

  for (const [page, expectedPage] of PAGE_CASES) {
    for (const [limit, expectedLeaderboardLimit] of LIMIT_CASES) {
      for (const history of [false, true]) {
        const result = history
          ? await findRoundHistoryPage(1, { page, limit })
          : await findLeaderboardPage({ page, limit })
        assert.equal(result.page, expectedPage)
        if (!history) assert.equal(result.limit, expectedLeaderboardLimit)
        assert.ok(result.limit >= 1 && result.limit <= (history ? 100 : 50))
        assert.deepEqual(paginationParams.at(-1), [result.limit, (expectedPage - 1) * result.limit])
        for (const value of paginationParams.at(-1)) {
          assert.ok(Number.isSafeInteger(value) && value >= 0)
        }
      }
    }
  }
  assert.equal(paginationParams.length, PAGE_CASES.length * LIMIT_CASES.length * 2)
})

test("shop purchase and equip reject prototype ids with 400 before database access", async (t) => {
  const failDatabaseAccess = () => { throw new Error("Invalid item reached database") }
  const query = t.mock.method(pool, "query", failDatabaseAccess)
  const getConnection = t.mock.method(pool, "getConnection", failDatabaseAccess)
  const store = createPlayerStateStore()
  for (const itemId of ["toString", "constructor", "valueOf", "__proto__"]) {
    for (const action of ["purchaseItem", "equipItem"]) {
      await assert.rejects(store[action]({ user: { id: 1 }, itemId }), (error) => {
        assert.ok(error instanceof PlayerStateError)
        assert.equal(error.status, 400)
        assert.equal(error.message, "Unknown itemId.")
        return true
      })
    }
  }
  assert.equal(query.mock.callCount(), 0)
  assert.equal(getConnection.mock.callCount(), 0)
})
