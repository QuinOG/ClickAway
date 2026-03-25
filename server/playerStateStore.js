import pool, {
  findUserById,
  findUserByUsername,
  findUserProgressByUserId,
} from "./db.js"
import {
  DEFAULT_PLAYER_STATE,
  getCatalogItemById,
  getMappedShopItemById,
} from "./shopItemMap.js"

export class PlayerStateError extends Error {
  constructor(status, message) {
    super(message)
    this.name = "PlayerStateError"
    this.status = status
  }
}

function normalizeOwnedItemIds(itemIds = []) {
  return Array.from(
    new Set(
      (Array.isArray(itemIds) ? itemIds : [])
        .filter((itemId) => typeof itemId === "string")
        .filter((itemId) => !getCatalogItemById(itemId)?.builtIn)
    )
  )
}

function normalizePlayerState(state = {}) {
  return {
    coins: Math.max(0, Number(state.coins) || 0),
    ownedItemIds: normalizeOwnedItemIds(state.ownedItemIds),
    equippedButtonSkinId: String(
      state.equippedButtonSkinId || DEFAULT_PLAYER_STATE.equippedButtonSkinId
    ),
    equippedArenaThemeId: String(
      state.equippedArenaThemeId || DEFAULT_PLAYER_STATE.equippedArenaThemeId
    ),
    equippedProfileImageId: String(
      state.equippedProfileImageId || DEFAULT_PLAYER_STATE.equippedProfileImageId
    ),
  }
}

function buildPlayerStateResponse(username, state = {}) {
  return {
    user: {
      username: String(username || "Player"),
    },
    state: normalizePlayerState(state),
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
      return buildPlayerStateResponse(existingUser.username, progress)
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
      return buildPlayerStateResponse(existingUser.username, progress)
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
      return buildPlayerStateResponse(existingUser.username, progress)
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
