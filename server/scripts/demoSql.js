import { randomBytes } from "node:crypto"
import bcrypt from "bcryptjs"
import { DEMO_PLAYER_USERNAMES } from "./demoPlayerData.js"
import { calculateRoundRewards } from "../roundRewards.js"
import { validatePassword } from "../validation.js"
import { getMappedShopItemById } from "../serverShopCatalogIdMappings.js"
import { applyRankedMatchResult, buildDefaultRankedState } from "../../src/utils/rankUtils.js"
import { getLevelProgress } from "../../src/utils/progressionUtils.js"
import { DEFAULT_LIFETIME_STATS, applyRoundToLifetimeStats, applyRoundToLoadoutStats, buildAchievementStatsFromLifetime } from "../../src/utils/lifetimeStatsUtils.js"
import { evaluateAchievements, getUnlockedAchievementIds } from "../../src/game/achievements/evaluateAchievements.js"
import { getNewlyCompletedDailyGoals, sumDailyGoalRewards } from "../../src/utils/dailyGoals.js"
import { getSeasonRewardTier } from "../../src/utils/seasonUtils.js"

export const REPLAYS_KEPT_PER_PLAYER = 3

export const cosmeticSets = [["skin_neon", "profile_racoon"], ["theme_sunset", "profile_heart"], ["skin_moon", "profile_ghost"], []]
export const sqlString = value => `'${String(value).replaceAll("'", "''")}'`
const raw = sql => ({ sql })
const literal = value => value?.sql ?? (value == null ? "NULL" : typeof value === "object" ? `${sqlString(JSON.stringify(value))}::jsonb` : typeof value === "string" ? sqlString(value) : String(value))
const userId = name => raw(`(SELECT id FROM users WHERE username = ${sqlString(name)})`)
const insert = (table, row, suffix = "") => `INSERT INTO ${table} (${Object.keys(row).join(", ")}) VALUES (${Object.values(row).map(literal).join(", ")})${suffix}`
const snake = key => key.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`)

// No database module is loaded here. Each date gets its own daily reward ledger.
export function computeDemoPlayer(player, index = 0) {
  const state = { coins: 0, xp: 0, mmr: 0, rankedState: buildDefaultRankedState(), lifetimeStats: { ...DEFAULT_LIFETIME_STATS }, loadoutStats: {}, achievements: [], rounds: [], purchases: [] }
  const days = new Map()
  for (const round of [...player.rounds].sort((a, b) => a.playedAtIso.localeCompare(b.playedAtIso))) {
    const rewards = calculateRoundRewards(round)
    const day = round.playedAtIso.slice(0, 10)
    const previous = days.get(day) ?? []
    const goals = rewards.earnedXp > 0 ? sumDailyGoalRewards(getNewlyCompletedDailyGoals(day, previous, round)) : { coins: 0, xp: 0 }
    const coinsEarned = rewards.earnedCoins + goals.coins
    const xpEarned = rewards.earnedXp * (rewards.earnedXp > 0 && !previous.length ? 2 : 1) + goals.xp
    const outcome = applyRankedMatchResult({ ...rewards, currentMmr: state.mmr, currentRankedState: state.rankedState, hasRankedHistory: state.lifetimeStats.rankedRounds > 0 })
    state.coins = Math.min(10_000_000, state.coins + coinsEarned)
    state.xp = Math.min(10_000_000, state.xp + xpEarned)
    state.mmr = Math.min(100_000, outcome.nextMmr)
    state.rankedState = outcome.nextRankedState
    const placement = outcome.previousRankProgress?.isUnranked || outcome.previousRankProgress?.isPlacement
    // The live demo path deliberately has no loadout snapshot for history/stats.
    const entry = { ...round, loadoutSnapshot: null, progressionMode: rewards.progressionMode, coinsEarned, xpEarned, rankDelta: outcome.appliedRankDelta,
      rankResultKind: rewards.progressionMode === "ranked" ? (placement ? "placement" : "rr") : null,
      rankedWin: !placement && outcome.appliedRankDelta > 0 }
    state.lifetimeStats = applyRoundToLifetimeStats(state.lifetimeStats, entry)
    const loadoutId = entry.loadoutSnapshot?.loadoutId
    if (loadoutId) state.loadoutStats[loadoutId] = applyRoundToLoadoutStats(state.loadoutStats[loadoutId], entry)
    state.achievements = [...new Set([...state.achievements, ...getUnlockedAchievementIds(evaluateAchievements(buildAchievementStatsFromLifetime({ lifetimeStats: state.lifetimeStats, levelProgress: getLevelProgress(state.xp), coins: state.coins }), { persistedUnlockedIds: state.achievements }))])]
    state.rounds.push({ entry, replay: round, season: rewards.progressionMode === "ranked" ? {
      peak: outcome.nextRankProgress.isPlacement ? 0 : state.mmr,
      tier: getSeasonRewardTier(outcome.nextRankProgress.isPlacement ? 0 : state.mmr, { isPlaced: !outcome.nextRankProgress.isPlacement }).tier,
    } : null })
    if (rewards.earnedXp > 0) days.set(day, [...previous, entry])
  }
  for (const id of cosmeticSets[index % cosmeticSets.length]) {
    const item = getMappedShopItemById(id)
    if (state.coins < item.cost) continue
    state.coins -= item.cost
    state.purchases.push(item)
  }
  return state
}

function replayRow(name, round, historyId = null) {
  return { user_id: userId(name), username: name, mode_id: round.modeId, seed: round.seed >>> 0, events_json: round.events,
    loadout_snapshot_json: round.loadoutSnapshot, score: round.score, hits: round.hits, misses: round.misses, best_streak: round.bestStreak,
    visibility: "public", round_history_id: historyId }
}

const seasonSetup = `SELECT pg_advisory_xact_lock(72431901);
INSERT INTO seasons (slug, name, starts_at, ends_at, status)
SELECT 'season-1', 'Season 1', now(), now() + interval '90 days', 'active' WHERE NOT EXISTS (SELECT 1 FROM seasons);
DO $season$ DECLARE s record; duration interval; n bigint;
BEGIN
  SELECT * INTO s FROM seasons ORDER BY starts_at DESC, id DESC LIMIT 1 FOR UPDATE;
  WHILE s.ends_at <= now() LOOP
    duration := s.ends_at - s.starts_at;
    IF duration <= interval '0 seconds' THEN RAISE EXCEPTION 'Season duration must be positive.'; END IF;
    n := COALESCE(NULLIF(substring(s.slug from '([0-9]+)$'), '')::bigint, s.id) + 1;
    UPDATE seasons SET status = 'ended' WHERE id = s.id;
    INSERT INTO seasons (slug, name, starts_at, ends_at, status)
    VALUES ('season-' || n, 'Season ' || n, s.ends_at, s.ends_at + duration, 'active') RETURNING * INTO s;
  END LOOP;
END; $season$;`

export function generateCleanupSql() {
  return `-- Supabase SQL editor: undo demo players (up to ${DEMO_PLAYER_USERNAMES.length} users; cascading child rows).\nBEGIN;\nDELETE FROM users WHERE username IN (${DEMO_PLAYER_USERNAMES.map(sqlString).join(", ")}) AND role = 'player';\nCOMMIT;\n`.replaceAll("\n", "\r\n")
}

export async function generateDemoSql(plan, { password = process.env.DEMO_PASSWORD } = {}) {
  if (password && validatePassword(password)) throw new Error("DEMO_PASSWORD must satisfy signup password rules.")
  const states = plan.players.map(computeDemoPlayer)
  const lines = ["DECLARE created text[] := ARRAY[]::text[];", "BEGIN"]
  // Serialize competing exports so the existence guards also cover concurrent pastes.
  lines.push("PERFORM pg_advisory_xact_lock(72431902);")
  for (const [index, player] of plan.players.entries()) {
    const state = states[index]
    const hash = await bcrypt.hash(password || randomBytes(24).toString("base64url"), 12)
    lines.push(`IF NOT EXISTS (SELECT 1 FROM users WHERE username = ${sqlString(player.username)}) THEN`)
    const rank = state.lifetimeStats.rankedRounds ? state.rankedState : { rankSystemVersion: 0, placementMatchesPlayed: 0, demotionProtectionRounds: 0 }
    lines.push(insert("users", { username: player.username, password_hash: hash, role: "player", build_walkthrough_status: "not_started", coins: state.coins, xp: state.xp, mmr: state.mmr,
      rank_system_version: rank.rankSystemVersion, placement_matches_played: rank.placementMatchesPlayed, demotion_protection_rounds: rank.demotionProtectionRounds,
      ...Object.fromEntries(state.purchases.map(item => [item.currentUserColumn, item.dbItemId])) }) + ";")
    lines.push(`created := array_append(created, ${sqlString(player.username)});`)
    const stats = Object.fromEntries(Object.entries(state.lifetimeStats).filter(([key]) => key !== "roundsThisWeek").map(([key, value]) => [key === "drillStats" ? "drill_stats_json" : snake(key), value]))
    lines.push(insert("user_lifetime_stats", { user_id: userId(player.username), ...stats }) + ";")
    // Replays only for each player's latest rounds (what the duel picker lists):
    // a replay per round made the file ~10 MB, too big for the Supabase editor.
    const firstReplayIndex = Math.max(0, state.rounds.length - REPLAYS_KEPT_PER_PLAYER)
    for (const [roundIndex, { entry: e, replay, season }] of state.rounds.entries()) {
      const row = { user_id: userId(player.username), mode: e.modeId, progression_mode: e.progressionMode, score: e.score, hits: e.hits, misses: e.misses, best_streak: e.bestStreak,
        avg_reaction_ms: e.avgReactionMs, best_reaction_ms: e.bestReactionMs, coins_earned: e.coinsEarned, xp_earned: e.xpEarned, rank_delta: e.rankDelta, rank_result_kind: e.rankResultKind, played_at: e.playedAtIso }
      const r = replayRow(player.username, replay)
      delete r.round_history_id
      lines.push(roundIndex < firstReplayIndex
        ? `${insert("round_history", row)};`
        : `WITH r AS (${insert("round_history", row, " RETURNING id")}) INSERT INTO round_replays (${Object.keys(r).join(", ")}, round_history_id) SELECT ${Object.values(r).map(literal).join(", ")}, r.id FROM r;`)
      if (season) {
        const at = `${sqlString(e.playedAtIso)}::timestamptz`
        const seasonId = raw(`COALESCE((SELECT id FROM seasons WHERE starts_at <= ${at} AND ends_at > ${at} ORDER BY starts_at DESC, id DESC LIMIT 1), (SELECT id FROM seasons ORDER BY starts_at DESC, id DESC LIMIT 1))`)
        lines.push(insert("user_season_stats", { user_id: userId(player.username), season_id: seasonId, ranked_rounds: 1, peak_mmr: season.peak, reward_tier: season.tier }, " ON CONFLICT (user_id, season_id) DO UPDATE SET ranked_rounds = user_season_stats.ranked_rounds + 1, peak_mmr = GREATEST(user_season_stats.peak_mmr, EXCLUDED.peak_mmr), reward_tier = GREATEST(user_season_stats.reward_tier, EXCLUDED.reward_tier)") + ";")
      }
    }
    for (const id of state.achievements) lines.push(`INSERT INTO user_achievement_progress (user_id, achievement_id, unlocked_at) SELECT ${literal(userId(player.username))}, id, now() FROM achievements_catalog WHERE id = ${sqlString(id)};`)
    for (const item of state.purchases) lines.push(insert("user_collection", { user_id: userId(player.username), item_type: item.collectionType, item_id: item.dbItemId }) + ";")
    lines.push("END IF;")
  }
  for (const duel of plan.duels) {
    lines.push(`IF ${sqlString(duel.challenger)} = ANY(created) AND ${duel.completed ? `${sqlString(duel.opponent)} = ANY(created)` : `EXISTS (SELECT 1 FROM users WHERE username = ${sqlString(duel.opponent)})`} THEN`)
    const r = replayRow(duel.challenger, duel.round)
    const c = { challenger_user_id: userId(duel.challenger), challenger_username: duel.challenger, opponent_user_id: userId(duel.opponent), opponent_username: duel.opponent, replay_id: raw("r.id"), mode_id: duel.round.modeId, message: "Demo duel: race this ghost!",
      status: duel.completed ? "completed" : "pending", opponent_replay_id: duel.completed ? raw("o.id") : null, challenger_won: duel.completed ? duel.round.score > duel.opponentRound.score : null,
      responded_at: duel.completed ? raw("now()") : null, completed_at: duel.completed ? raw("now()") : null }
    lines.push(`WITH r AS (${insert("round_replays", r, " RETURNING id")})${duel.completed ? `, o AS (${insert("round_replays", replayRow(duel.opponent, duel.opponentRound), " RETURNING id")})` : ""} INSERT INTO challenges (${Object.keys(c).join(", ")}) SELECT ${Object.values(c).map(literal).join(", ")} FROM r${duel.completed ? " CROSS JOIN o" : ""};`)
    lines.push("END IF;")
  }
  lines.push("END;")
  const body = lines.join("\n")
  let tag = "$demo$"
  while (body.includes(tag)) tag = tag.replace("$demo", "$demo_")
  const rounds = plan.players.reduce((n, p) => n + p.rounds.length, 0)
  return `-- Demo players for the Supabase SQL editor; requires the migrated ClickAway schema.\n-- Maximum rows: ${plan.players.length} users, ${rounds} history, ${plan.players.reduce((n, p) => n + Math.min(p.rounds.length, REPLAYS_KEPT_PER_PLAYER), 0) + plan.duels.reduce((n, d) => n + (d.completed ? 2 : 1), 0)} replays, ${plan.duels.length} challenges.\n-- Lifetime: ${plan.players.length}; collections: ${states.reduce((n, s) => n + s.purchases.length, 0)}; achievements: ${states.reduce((n, s) => n + s.achievements.length, 0)} (catalog permitting).\n-- Season rows <= ${states.reduce((n, s) => n + s.lifetimeStats.rankedRounds, 0)} ranked rounds; missing/expired seasons are seeded/rolled forward.\n-- Existing usernames are skipped. Missing pending opponents are skipped. Passwords are bcrypt cost 12.\n-- Undo: paste docs/demo-data/remove-demo-players.sql (fixed demo usernames, player role only).\nBEGIN;\nSET LOCAL search_path = public;\nSET LOCAL standard_conforming_strings = on;\n${seasonSetup}\nDO ${tag}\n${body}\n${tag};\nCOMMIT;\n`.replaceAll("\n", "\r\n")
}
