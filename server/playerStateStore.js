import pool, {
  findUserById,
  findUserByUsername,
  findUserProgressByUserId,
} from "./playerMysqlDatabase.js"
import {
  getCatalogItemById,
  getMappedShopItemById,
} from "./serverShopCatalogIdMappings.js"

export class PlayerStateError extends Error {
  constructor(status, message) {
    super(message)
    this.name = "PlayerStateError"
    this.status = status
  }
}

function buildPlayerProgressResponse(user, progress = {}) {
  return {
    user: {
      id: user?.id,
      username: String(user?.username || "Player"),
      role: String(user?.role || "player"),
    },
    progress,
  }
}

function resolveMappedItemOrThrow(itemId) {
  const mappedItem = getMappedShopItemById(itemId)
  const catalogItem = getCatalogItemById(itemId)

  if (!mappedItem || !catalogItem) {
    throw new PlayerStateError(400, "Unknown itemId.")
  }

  return {
    ...mappedItem,
    catalogItem,
  }
}

async function resolveExistingUser(user) {
  if (user?.id) {
    const matchedUser = await findUserById(user.id)
    if (matchedUser) return matchedUser
  }

  if (user?.username) {
    const matchedUser = await findUserByUsername(user.username)
    if (matchedUser) return matchedUser
  }

  throw new PlayerStateError(404, "Player state was not found.")
}

export function createPlayerStateStore() {
  return {
    provider: "mysql",

    async ensurePlayerUser(user) {
      return resolveExistingUser(user)
    },

    async getPlayerState({ user }) {
      const existingUser = await resolveExistingUser(user)
      const progress = await findUserProgressByUserId(existingUser.id)
      return buildPlayerProgressResponse(existingUser, progress)
    },

    async purchaseItem({ user, itemId }) {
      const mappedItem = resolveMappedItemOrThrow(itemId)
      if (mappedItem.builtIn) {
        throw new PlayerStateError(400, "Built-in items cannot be purchased.")
      }

      const existingUser = await resolveExistingUser(user)
      const connection = await pool.getConnection()

      try {
        await connection.beginTransaction()

        const [userRows] = await connection.query(
          `SELECT id, coins
           FROM users
           WHERE id = ?
           LIMIT 1 FOR UPDATE`,
          [existingUser.id]
        )

        if (userRows.length === 0) {
          throw new PlayerStateError(404, "Player state was not found.")
        }

        const [ownedRows] = await connection.query(
          `SELECT 1
           FROM user_collection
           WHERE user_id = ? AND item_type = ? AND item_id = ?
           LIMIT 1`,
          [existingUser.id, mappedItem.collectionType, mappedItem.dbItemId]
        )

        if (ownedRows.length > 0) {
          throw new PlayerStateError(409, "Item is already owned.")
        }

        if ((Number(userRows[0].coins) || 0) < mappedItem.cost) {
          throw new PlayerStateError(400, "Not enough coins.")
        }

        await connection.execute(
          "INSERT INTO user_collection (user_id, item_type, item_id) VALUES (?, ?, ?)",
          [existingUser.id, mappedItem.collectionType, mappedItem.dbItemId]
        )
        await connection.execute(
          "UPDATE users SET coins = coins - ? WHERE id = ?",
          [mappedItem.cost, existingUser.id]
        )

        await connection.commit()
      } catch (error) {
        await connection.rollback()
        throw error
      } finally {
        connection.release()
      }

      const progress = await findUserProgressByUserId(existingUser.id)
      return buildPlayerProgressResponse(existingUser, progress)
    },

    async equipItem({ user, itemId }) {
      const mappedItem = resolveMappedItemOrThrow(itemId)
      const existingUser = await resolveExistingUser(user)
      const connection = await pool.getConnection()

      try {
        await connection.beginTransaction()

        const [userRows] = await connection.query(
          `SELECT id
           FROM users
           WHERE id = ?
           LIMIT 1 FOR UPDATE`,
          [existingUser.id]
        )

        if (userRows.length === 0) {
          throw new PlayerStateError(404, "Player state was not found.")
        }

        if (!mappedItem.builtIn) {
          const [ownedRows] = await connection.query(
            `SELECT 1
             FROM user_collection
             WHERE user_id = ? AND item_type = ? AND item_id = ?
             LIMIT 1`,
            [existingUser.id, mappedItem.collectionType, mappedItem.dbItemId]
          )

          if (ownedRows.length === 0) {
            throw new PlayerStateError(403, "Item must be owned before it can be equipped.")
          }
        }

        await connection.query(
          `UPDATE users
           SET ${mappedItem.currentUserColumn} = ?
           WHERE id = ?`,
          [mappedItem.dbItemId, existingUser.id]
        )

        await connection.commit()
      } catch (error) {
        await connection.rollback()
        throw error
      } finally {
        connection.release()
      }

      const progress = await findUserProgressByUserId(existingUser.id)
      return buildPlayerProgressResponse(existingUser, progress)
    },

    async syncCoins({ user, coins }) {
      const existingUser = await resolveExistingUser(user)

      await pool.execute(
        "UPDATE users SET coins = ? WHERE id = ?",
        [Math.max(0, Number(coins) || 0), existingUser.id]
      )
    },
  }
}
