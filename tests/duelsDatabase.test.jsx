import { expect, test, vi } from "vitest"

const { query, execute } = vi.hoisted(() => ({ query: vi.fn(), execute: vi.fn(async () => [{ affectedRows: 0 }]) }))
vi.mock("../server/db/pgPool.js", () => ({
  default: { query, execute },
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
  expect(sql).toContain("c.status IN ('pending', 'accepted', 'racing')")
  // Races left unfinished past their token's life are settled first.
  expect(execute.mock.calls.at(-1)[0]).toContain("racing_started_at < now() - interval '65 minutes'")
  expect(sql.match(/LIMIT/g)).toHaveLength(1)
  expect(sql).toContain("LIMIT 50")
  expect(params).toEqual(role === "all" ? [2, 2, 2, 2] : [2, 2])
})
