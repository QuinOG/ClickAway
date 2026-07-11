export const SEASON_REWARD_TIERS = [
  { tier: 0, label: "Unranked", minMmr: 0 },
  { tier: 1, label: "Bronze", minMmr: 800 },
  { tier: 2, label: "Silver", minMmr: 1200 },
  { tier: 3, label: "Gold", minMmr: 1600 },
  { tier: 4, label: "Platinum", minMmr: 2000 },
  { tier: 5, label: "Diamond", minMmr: 2400 },
]

export function getSeasonRewardTier(mmr = 0) {
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
    daysRemaining,
    progressPercent,
  }
}
