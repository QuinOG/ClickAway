import { expect, test, vi } from "vitest"

const { connection, getConnection, buildValuesClause } = vi.hoisted(() => ({
  getConnection: vi.fn(async () => { throw Error("read unavailable") }),
  connection: {
    beginTransaction: vi.fn(), query: vi.fn(), execute: vi.fn(),
    commit: vi.fn(), rollback: vi.fn(), release: vi.fn(),
  },
  buildValuesClause: vi.fn(rows => ({ clause: "(?)", params: rows.flat() })),
}))
vi.mock("../server/db/pgPool.js", () => ({
  default: { getConnection, query: vi.fn(async () => { throw Error("read unavailable") }) },
  buildValuesClause,
}))

import { saveUserProgress } from "../server/playerMysqlDatabase.js"

test.each([0, undefined])("save normalizes unlocks using locked XP instead of caller XP %s", async (levelXp) => {
  getConnection.mockResolvedValueOnce(connection)
  connection.query.mockResolvedValue([[]])
  connection.query.mockResolvedValueOnce([[{ id: 1, xp: 700 }]]) // Level 5, reached while the request waited.
  await saveUserProgress({
    userId: 1,
    levelXp,
    providedFields: ["savedLoadouts"],
    savedLoadouts: [{
      id: "loadout_1", name: "New unlocks",
      moduleIds: { tempoCoreId: "tempo_bastion" },
      powerupIds: ["magnet_center", "size_boost", "time_boost"],
    }],
  })
  expect(connection.query.mock.calls[0][0]).toContain("FOR UPDATE")
  const rows = buildValuesClause.mock.calls[0][0]
  expect(rows[0][3]).toBe("tempo_bastion")
  expect(rows[0][6]).toBe("magnet_center")
  expect(connection.commit).toHaveBeenCalledOnce()
  expect(connection.rollback).not.toHaveBeenCalled()
})
