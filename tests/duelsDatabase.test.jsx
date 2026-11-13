import { expect, test, vi } from "vitest"

const { query } = vi.hoisted(() => ({ query: vi.fn() }))
vi.mock("../server/db/pgPool.js", () => ({
  default: { query },
  buildValuesClause: vi.fn(),
}))

import { findChallengesForUser } from "../server/playerMysqlDatabase.js"

test.each(["all", "incoming", "outgoing"])("%s duels do not cap actionable results", async (role) => {
  const rows = Array.from({ length: 351 }, (_, id) => ({
    id: id + 1, status: "pending", challengerUserId: 1, opponentUserId: 2,
  }))
  query.mockResolvedValue([rows])
  expect(await findChallengesForUser(2, { role })).toHaveLength(351)
  const [sql, params] = query.mock.calls.at(-1)
  expect(sql).toContain("c.status IN ('pending', 'accepted')")
  expect(sql.match(/LIMIT/g)).toHaveLength(1)
  expect(sql).toContain("LIMIT 50")
  expect(params).toEqual(role === "all" ? [2, 2, 2, 2] : [2, 2])
})
