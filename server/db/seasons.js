import pool from "./pgPool.js"
import { toNonNegativeNumber } from "./shared.js"
import { getSeasonRewardTier } from "../../src/utils/seasonUtils.js"

async function ensureActiveSeason() {
  await findCurrentSeason()
}

// One transaction lock also covers the empty-table seed and season-stat writes.
// Rating, placements and career records carry over; season counters start empty.
async function withCurrentSeason(work) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    await connection.query("SELECT pg_advisory_xact_lock(72431901)")
    const [[clock]] = await connection.query("SELECT clock_timestamp() AS now")
    const now = new Date(clock.now)
    const [rows] = await connection.query(`SELECT id, slug, name, status,
      starts_at AS startsAt, ends_at AS endsAt FROM seasons
      ORDER BY starts_at DESC, id DESC LIMIT 1 FOR UPDATE`)
    let season = rows[0]
    if (!season) {
      const [created] = await connection.query(`INSERT INTO seasons (slug, name, starts_at, ends_at, status)
        VALUES (?, ?, ?, ?, 'active') RETURNING id, slug, name, status, starts_at AS startsAt, ends_at AS endsAt`,
      ["season-1", "Season 1", now, new Date(now.getTime() + 90 * 86400000)])
      season = created[0]
    }
    while (new Date(season.endsAt) <= now) {
      const duration = new Date(season.endsAt) - new Date(season.startsAt)
      if (!(duration > 0)) throw new Error("Season duration must be positive.")
      await connection.query("UPDATE seasons SET status = 'ended' WHERE id = ?", [season.id])
      const number = (Number(String(season.slug).match(/(\d+)$/)?.[1]) || Number(season.id)) + 1
      const [created] = await connection.query(`INSERT INTO seasons (slug, name, starts_at, ends_at, status)
        VALUES (?, ?, ?, ?, 'active') RETURNING id, slug, name, status, starts_at AS startsAt, ends_at AS endsAt`,
      [`season-${number}`, `Season ${number}`, new Date(season.endsAt), new Date(new Date(season.endsAt).getTime() + duration)])
      season = created[0]
    }
    const result = await work(connection, mapSeasonRow(season))
    await connection.commit()
    return result
  } catch (error) {
    await connection.rollback().catch(() => {})
    throw error
  } finally {
    connection.release()
  }
}

function mapSeasonRow(row = {}) {
  if (!row?.id) {
    return null
  }

  return {
    id: Number(row.id),
    slug: String(row.slug || ""),
    name: String(row.name || ""),
    status: String(row.status || "active"),
    startsAt: row.startsAt ?? row.starts_at ?? null,
    endsAt: row.endsAt ?? row.ends_at ?? null,
  }
}

async function readUserSeasonStats(connection, userId, seasonId) {
  const [[stats]] = await connection.query(`SELECT ranked_rounds AS rankedRounds,
    peak_mmr AS peakMmr, reward_tier AS rewardTier FROM user_season_stats
    WHERE user_id = ? AND season_id = ? LIMIT 1`, [userId, seasonId])
  return {
    rankedRounds: toNonNegativeNumber(stats?.rankedRounds, 0),
    peakMmr: toNonNegativeNumber(stats?.peakMmr, 0),
    rewardTier: toNonNegativeNumber(stats?.rewardTier, 0),
  }
}

export async function findCurrentSeason(userId = null) {
  return withCurrentSeason(async (connection, season) => ({
    ...season,
    ...(userId ? { stats: await readUserSeasonStats(connection, userId, season.id) } : {}),
  }))
}

export async function applyUserSeasonProgress(userId, { rankMmr, isRankedRound = false, isPlaced = true, playedAt = null } = {}) {
  if (!isRankedRound) return null
  return withCurrentSeason(async (connection, season) => {
    // Credit the season the round was played in. The replay and duel writes run
    // first, so a round saved just before a rollover can arrive after it; it
    // belongs to the season that just ended, not the new one.
    let seasonId = season.id
    const playedAtDate = playedAt ? new Date(playedAt) : null
    if (playedAtDate && Number.isFinite(playedAtDate.getTime()) && playedAtDate < new Date(season.startsAt)) {
      const [playedSeasons] = await connection.query(
        `SELECT id FROM seasons WHERE starts_at <= ? AND ends_at > ?
         ORDER BY starts_at DESC, id DESC LIMIT 1`,
        [playedAtDate, playedAtDate]
      )
      if (playedSeasons[0]?.id) seasonId = Number(playedSeasons[0].id)
    }
    // Hidden placement totals must not inflate a later placed season peak.
    const normalizedMmr = isPlaced ? toNonNegativeNumber(rankMmr, 0) : 0
    const rewardTier = getSeasonRewardTier(normalizedMmr, { isPlaced }).tier
    await connection.execute(
      `INSERT INTO user_season_stats (user_id, season_id, ranked_rounds, peak_mmr, reward_tier)
       VALUES (?, ?, 1, ?, ?)
       ON CONFLICT (user_id, season_id) DO UPDATE SET
         ranked_rounds = user_season_stats.ranked_rounds + 1,
         peak_mmr = GREATEST(user_season_stats.peak_mmr, EXCLUDED.peak_mmr),
         reward_tier = GREATEST(user_season_stats.reward_tier, EXCLUDED.reward_tier)`,
      [userId, seasonId, normalizedMmr, rewardTier]
    )
    // The response describes the current season; an ended season's credit has nothing to show.
    if (seasonId !== season.id) return null
    return { season, ...await readUserSeasonStats(connection, userId, season.id) }
  })
}

export { ensureActiveSeason }
