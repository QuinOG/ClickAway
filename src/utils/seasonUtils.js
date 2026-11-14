import { RANK_DIVISIONS, RANK_MAJOR_TIERS, TOP_RANK_MIN_MMR } from "./rankUtils.js"

// Each reward tier starts where its named rank starts (Silver I, Gold I, ...), so
// the reward always matches the division the player has reached. Tier 0 is for
// players who have not finished placements.
export const SEASON_REWARD_TIERS = [
  { tier: 0, label: "Unranked", minMmr: 0 },
  ...RANK_MAJOR_TIERS.map((majorTier, index) => ({
    tier: index + 1,
    label: majorTier.label,
    minMmr: RANK_DIVISIONS.find((division) => division.majorTierId === majorTier.id)?.minMmr ?? 0,
  })),
  { tier: RANK_MAJOR_TIERS.length + 1, label: "Deadeye", minMmr: TOP_RANK_MIN_MMR },
]

export function getSeasonRewardTier(mmr = 0, { isPlaced = true } = {}) {
  if (!isPlaced) return SEASON_REWARD_TIERS[0]
  const normalizedMmr = Math.max(0, Number(mmr) || 0)
  let currentTier = SEASON_REWARD_TIERS[0]

  for (const tier of SEASON_REWARD_TIERS) {
    if (normalizedMmr >= tier.minMmr) {
      currentTier = tier
    }
  }

  return currentTier
}

export function normalizeSeasonRecord(season = {}) {
  if (!season?.id) {
    return null
  }

  const startsAt = season.startsAt ?? season.starts_at ?? null
  const endsAt = season.endsAt ?? season.ends_at ?? null
  const startMs = startsAt ? new Date(startsAt).getTime() : 0
  const endMs = endsAt ? new Date(endsAt).getTime() : 0
  const nowMs = Date.now()
  const totalMs = Math.max(1, endMs - startMs)
  const elapsedMs = Math.max(0, Math.min(totalMs, nowMs - startMs))
  const progressPercent = Math.round((elapsedMs / totalMs) * 100)
  const daysRemaining = endMs > nowMs
    ? Math.ceil((endMs - nowMs) / (1000 * 60 * 60 * 24))
    : 0

  return {
    id: Number(season.id),
    slug: String(season.slug || ""),
    name: String(season.name || "Season"),
    status: String(season.status || "active"),
    startsAt,
    endsAt,
    stats: season.stats ?? { rankedRounds: 0, peakMmr: 0, rewardTier: 0 },
    daysRemaining,
    progressPercent,
  }
}
