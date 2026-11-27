import pool from "./pgPool.js"
import {
  normalizePaginationLimit,
  normalizePaginationPage,
  toNonNegativeNumber,
  toNullableNonNegativeNumber,
} from "./shared.js"
import {
  PLACEMENT_MATCH_COUNT,
  RANK_SYSTEM_VERSION,
} from "../../src/utils/rankUtils.js"

export const LEADERBOARD_BOARDS = {
  MMR: "mmr",
  BEST_SCORE: "bestScore",
  BEST_STREAK: "bestStreak",
  ACCURACY: "accuracy",
  REACTION: "reaction",
}

const LEADERBOARD_DEFAULT_LIMIT = 25
const LEADERBOARD_MAX_LIMIT = 50
const LEADERBOARD_AROUND_WINDOW = 5

function buildLeaderboardOrderClause(board = LEADERBOARD_BOARDS.MMR) {
  switch (board) {
    case LEADERBOARD_BOARDS.BEST_SCORE:
      return `
        bestScore DESC,
        mmr DESC,
        bestStreak DESC,
        accuracyPercent DESC,
        username ASC,
        userId ASC`
    case LEADERBOARD_BOARDS.BEST_STREAK:
      return `
        bestStreak DESC,
        mmr DESC,
        bestScore DESC,
        accuracyPercent DESC,
        username ASC,
        userId ASC`
    case LEADERBOARD_BOARDS.ACCURACY:
      return `
        accuracyPercent DESC,
        rankedRounds DESC,
        mmr DESC,
        bestScore DESC,
        username ASC,
        userId ASC`
    case LEADERBOARD_BOARDS.REACTION:
      return `
        bestReactionMs IS NULL ASC,
        bestReactionMs ASC,
        mmr DESC,
        bestScore DESC,
        username ASC,
        userId ASC`
    case LEADERBOARD_BOARDS.MMR:
    default:
      return `
        mmr DESC,
        bestScore DESC,
        bestStreak DESC,
        accuracyPercent DESC,
        username ASC,
        userId ASC`
  }
}

function mapLeaderboardRow(row = {}) {
  return {
    rank: Math.max(1, Number(row.rank) || 0),
    userId: Number(row.userId),
    username: String(row.username || ""),
    mmr: toNonNegativeNumber(row.mmr, 0),
    coins: toNonNegativeNumber(row.coins, 0),
    levelXp: toNonNegativeNumber(row.levelXp, 0),
    rankedRounds: toNonNegativeNumber(row.rankedRounds, 0),
    bestScore: toNonNegativeNumber(row.bestScore, 0),
    bestStreak: toNonNegativeNumber(row.bestStreak, 0),
    accuracyPercent: toNonNegativeNumber(row.accuracyPercent, 0),
    bestReactionMs: toNullableNonNegativeNumber(row.bestReactionMs),
  }
}

async function queryRankedLeaderboardRows(options = {}) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    await connection.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY")
    const result = await readRankedLeaderboardRows(connection, options)
    await connection.commit()
    return result
  } catch (error) {
    await connection.rollback().catch(() => {})
    throw error
  } finally {
    connection.release()
  }
}

export function escapeLikePattern(text) {
  return text.replace(/[\\%_]/g, "\\$&")
}

async function readRankedLeaderboardRows(connection, {
  board = LEADERBOARD_BOARDS.MMR,
  page = 1,
  limit = LEADERBOARD_DEFAULT_LIMIT,
  search = "",
  userId = null,
  view = "top",
  reverse = false,
} = {}) {
  const normalizedBoard = Object.values(LEADERBOARD_BOARDS).includes(board)
    ? board
    : LEADERBOARD_BOARDS.MMR
  const normalizedLimit = normalizePaginationLimit(limit, LEADERBOARD_MAX_LIMIT, LEADERBOARD_DEFAULT_LIMIT)
  const normalizedPage = normalizePaginationPage(page)
  const normalizedSearch = String(search || "").trim().toLowerCase()
  const orderClause = buildLeaderboardOrderClause(normalizedBoard)
  const isReactionBoard = normalizedBoard === LEADERBOARD_BOARDS.REACTION
  const reactionFilter = isReactionBoard ? "AND ls.verified_best_reaction_ms IS NOT NULL" : ""
  const reactionColumn = isReactionBoard ? "ls.verified_best_reaction_ms" : "ls.best_reaction_ms"

  const baseCte = `
    WITH ranked_players AS (
      SELECT
        u.id AS userId,
        u.username AS username,
        u.mmr AS mmr,
        u.coins AS coins,
        u.xp AS levelXp,
        COALESCE(ls.ranked_rounds, 0) AS rankedRounds,
        COALESCE(ls.best_single_score, 0) AS bestScore,
        COALESCE(ls.best_ranked_streak, 0) AS bestStreak,
        CASE
          WHEN COALESCE(ls.total_hits, 0) + COALESCE(ls.total_misses, 0) > 0
            THEN ROUND(100.0 * ls.total_hits / (ls.total_hits + ls.total_misses))
          ELSE 0
        END AS accuracyPercent,
        ${reactionColumn} AS bestReactionMs
      FROM users u
      LEFT JOIN user_lifetime_stats ls
        ON ls.user_id = u.id
      WHERE u.placement_matches_played >= ?
        -- Players still on an old rank system are unplaced until they replay
        -- placements (Profile shows them that way), so they aren't ranked here.
        AND u.rank_system_version = ${Number(RANK_SYSTEM_VERSION)}
        ${reactionFilter}
    ),
    ranked_ladder AS (
      SELECT
        ranked_players.*,
        RANK() OVER (ORDER BY ${orderClause}) AS rank
      FROM ranked_players
    ),
    -- Search narrows the rows shown, after ranks are computed over everyone,
    -- so a searched player keeps their real ladder position.
    filtered_ladder AS (
      SELECT *
      FROM ranked_ladder
      ${normalizedSearch ? "WHERE LOWER(username) LIKE ? ESCAPE '\\'" : ""}
    )`

  const filterParams = normalizedSearch
    ? [PLACEMENT_MATCH_COUNT, `%${escapeLikePattern(normalizedSearch)}%`]
    : [PLACEMENT_MATCH_COUNT]

  const readFilteredCount = async (rows) => {
    if (rows.length > 0) return toNonNegativeNumber(rows[0].totalCount, 0)

    const [[countRow]] = await connection.query(
      `${baseCte}
       SELECT COUNT(*) AS totalCount
       FROM filtered_ladder`,
      filterParams
    )
    return toNonNegativeNumber(countRow?.totalCount, 0)
  }

  if (view === "aroundMe" && userId) {
    const [[selfRow]] = await connection.query(
      `${baseCte}
       SELECT rank
       FROM ranked_ladder
       WHERE userId = ?
       LIMIT 1`,
      [...filterParams, userId]
    )

    if (!selfRow) {
      return {
        rows: [],
        page: 1,
        limit: normalizedLimit,
        totalCount: 0,
        totalPages: 0,
        selfRank: null,
        board: normalizedBoard,
      }
    }

    const selfRank = Math.max(1, Number(selfRow.rank) || 1)
    const minRank = Math.max(1, selfRank - LEADERBOARD_AROUND_WINDOW)
    const maxRank = selfRank + LEADERBOARD_AROUND_WINDOW

    // Count all search matches before limiting the rows to the rank window.
    const [rows] = await connection.query(
      `${baseCte}, counted_ladder AS (
         SELECT *, COUNT(*) OVER () AS totalCount
         FROM filtered_ladder
       )
       SELECT *
       FROM counted_ladder
       WHERE rank BETWEEN ? AND ?
       ORDER BY rank ASC`,
      [...filterParams, minRank, maxRank]
    )

    const totalCount = await readFilteredCount(rows)

    return {
      rows: rows.map(mapLeaderboardRow),
      page: 1,
      limit: rows.length,
      totalCount,
      totalPages: 1,
      selfRank,
      board: normalizedBoard,
      view: "aroundMe",
    }
  }

  const offset = (normalizedPage - 1) * normalizedLimit
  const [rows] = await connection.query(
    `${baseCte}
     SELECT *, COUNT(*) OVER () AS totalCount
     FROM filtered_ladder
     ORDER BY rank ${reverse ? "DESC" : "ASC"}
     LIMIT ? OFFSET ?`,
    [...filterParams, normalizedLimit, offset]
  )

  const totalCount = await readFilteredCount(rows)
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / normalizedLimit) : 0

  let selfRank = null
  if (userId) {
    const [[selfRow]] = await connection.query(
      `${baseCte}
       SELECT rank
       FROM ranked_ladder
       WHERE userId = ?
       LIMIT 1`,
      [...filterParams, userId]
    )
    selfRank = selfRow ? Math.max(1, Number(selfRow.rank) || 1) : null
  }

  return {
    rows: rows.map(mapLeaderboardRow),
    page: normalizedPage,
    limit: normalizedLimit,
    totalCount,
    totalPages,
    selfRank,
    board: normalizedBoard,
    view: "top",
  }
}

export async function findLeaderboardPage(options = {}) {
  return queryRankedLeaderboardRows(options)
}

export async function findLeaderboardRows({ limit = 25 } = {}) {
  const page = await queryRankedLeaderboardRows({
    board: LEADERBOARD_BOARDS.MMR,
    page: 1,
    limit,
    view: "top",
  })

  return page.rows
}
