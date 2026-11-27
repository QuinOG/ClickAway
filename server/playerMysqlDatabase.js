// Historical filename retained for existing importers; the database is Postgres.
// Implementations live by domain under server/db/.
import "dotenv/config"
import pool from "./db/pgPool.js"

export * from "./db/schema.js"
export * from "./db/sessions.js"
export {
  createUser,
  findUserById,
  findUserByUsername,
  updateUserPassword,
  updateUserRole,
} from "./db/users.js"
export {
  createDefaultUserProgress,
  findRoundCompletionContext,
  findUserProgressByUserId,
  saveUserProgress,
} from "./db/progress.js"
export * from "./db/rounds.js"
export * from "./db/leaderboard.js"
export {
  normalizePaginationLimit,
  normalizePaginationPage,
} from "./db/shared.js"
export {
  applyUserSeasonProgress,
  findCurrentSeason,
} from "./db/seasons.js"
export * from "./db/replays.js"
export * from "./db/challenges.js"

export default pool
