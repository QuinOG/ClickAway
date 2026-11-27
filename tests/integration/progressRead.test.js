import assert from "node:assert/strict"
import test, { after, before } from "node:test"

import { buildDailyGoalProgress, getNextUtcResetMs } from "../../src/utils/dailyGoals.js"
import { PLACEMENT_MATCH_COUNT, RANK_SYSTEM_VERSION } from "../../src/utils/rankUtils.js"
import { startTestDatabase } from "./testDatabase.js"

// Captured from the pre-change buildProgressRecord output with dynamic
// timestamps and UTC-day-dependent dailyGoals normalized.
const EXPECTED_RICH_PROGRESS_FIXTURE = {
  dailyBonusAvailable: false,
  coins: 1250,
  levelXp: 2400,
  rankMmr: 640,
  rankedState: {
    rankSystemVersion: 4,
    placementMatchesPlayed: 5,
    demotionProtectionRounds: 1,
  },
  ownedItemIds: [
    "skin_neon",
    "theme_sunset",
    "profile_heart",
  ],
  equippedButtonSkinId: "skin_neon",
  equippedArenaThemeId: "theme_sunset",
  equippedProfileImageId: "profile_heart",
  activeLoadoutId: "loadout_2",
  savedLoadouts: [
    {
      id: "loadout_1",
      name: "Alpha",
      moduleIds: {
        tempoCoreId: "tempo_anchor",
        streakLensId: "streak_stabilizer",
        powerRigId: "power_balanced",
      },
      powerupIds: [
        "time_boost",
        "size_boost",
        "freeze_movement",
      ],
    },
    {
      id: "loadout_2",
      name: "Overdrive",
      moduleIds: {
        tempoCoreId: "tempo_overdrive",
        streakLensId: "streak_momentum",
        powerRigId: "power_surge",
      },
      powerupIds: [
        "time_boost",
        "freeze_movement",
        "magnet_center",
      ],
    },
    {
      id: "loadout_3",
      name: "Loadout 3",
      moduleIds: {
        tempoCoreId: "tempo_overdrive",
        streakLensId: "streak_momentum",
        powerRigId: "power_surge",
      },
      powerupIds: [
        "time_boost",
        "size_boost",
        "freeze_movement",
      ],
    },
  ],
  selectedModeId: "normal",
  roundHistory: [
    {
      id: "r-4",
      playedAtIso: "<timestamp>",
      score: 96,
      hits: 35,
      misses: 2,
      bestStreak: 19,
      accuracyPercent: 94.5945945945946,
      avgReactionMs: 245,
      bestReactionMs: 195,
      coinsEarned: 45,
      modeId: "hard",
      difficultyId: "hard",
      progressionMode: "ranked",
      outcome: "completed",
      xpEarned: 210,
      rankDelta: 18,
      rankResultKind: "rr",
      loadoutSnapshot: {
        loadoutId: "loadout_2",
        loadoutName: "Overdrive",
        moduleIds: {
          tempoCoreId: "tempo_overdrive",
          streakLensId: "streak_momentum",
          powerRigId: "power_surge",
        },
        powerupIds: [
          "time_boost",
          "freeze_movement",
          "magnet_center",
        ],
      },
    },
    {
      id: "r-3",
      playedAtIso: "<timestamp>",
      score: 20,
      hits: 12,
      misses: 4,
      bestStreak: 5,
      accuracyPercent: 75,
      avgReactionMs: null,
      bestReactionMs: null,
      coinsEarned: 0,
      modeId: "easy",
      difficultyId: "easy",
      progressionMode: "non_ranked",
      outcome: "completed",
      xpEarned: 0,
      rankDelta: 0,
      rankResultKind: null,
      loadoutSnapshot: null,
    },
    {
      id: "r-2",
      playedAtIso: "<timestamp>",
      score: 88,
      hits: 30,
      misses: 1,
      bestStreak: 18,
      accuracyPercent: 96.7741935483871,
      avgReactionMs: 265,
      bestReactionMs: 210,
      coinsEarned: 40,
      modeId: "hard",
      difficultyId: "hard",
      progressionMode: "ranked",
      outcome: "completed",
      xpEarned: 180,
      rankDelta: 22,
      rankResultKind: "rr",
      loadoutSnapshot: {
        loadoutId: "loadout_2",
        loadoutName: "Overdrive",
        moduleIds: {
          tempoCoreId: "tempo_overdrive",
          streakLensId: "streak_momentum",
          powerRigId: "power_surge",
        },
        powerupIds: [
          "time_boost",
          "freeze_movement",
          "magnet_center",
        ],
      },
    },
    {
      id: "r-1",
      playedAtIso: "<timestamp>",
      score: 45,
      hits: 20,
      misses: 2,
      bestStreak: 10,
      accuracyPercent: 90.9090909090909,
      avgReactionMs: null,
      bestReactionMs: null,
      coinsEarned: 15,
      modeId: "normal",
      difficultyId: "normal",
      progressionMode: "non_ranked",
      outcome: "completed",
      xpEarned: 100,
      rankDelta: 0,
      rankResultKind: null,
      loadoutSnapshot: {
        loadoutId: "loadout_1",
        loadoutName: "Alpha",
        moduleIds: {
          tempoCoreId: "tempo_anchor",
          streakLensId: "streak_stabilizer",
          powerRigId: "power_balanced",
        },
        powerupIds: [
          "time_boost",
          "size_boost",
        ],
      },
    },
  ],
  lifetimeStats: {
    totalRounds: 4,
    rankedRounds: 2,
    bestStreak: 19,
    bestSingleScore: 96,
    bestRankedStreak: 19,
    bestSingleRoundAccuracy: 97,
    cleanRounds: 1,
    totalCoinsEarned: 220,
    totalHits: 97,
    totalMisses: 9,
    maxConsecutiveRankedWins: 2,
    currentConsecutiveRankedWins: 2,
    reactionRounds: 2,
    totalReactionMs: 510,
    bestReactionMs: 195,
    roundsThisWeek: 3,
    drillStats: {
      flick: {
        drillId: "flick",
        rounds: 2,
        bestMetric: null,
        lastMetric: null,
      },
    },
  },
  loadoutStats: [
    {
      loadoutId: "loadout_2",
      loadoutName: "Overdrive",
      totalRounds: 2,
      rankedRounds: 2,
      rankedWins: 2,
      bestScore: 96,
      bestStreak: 19,
      bestRankedStreak: 19,
      totalHits: 65,
      totalMisses: 3,
    },
    {
      loadoutId: "loadout_1",
      loadoutName: "Alpha",
      totalRounds: 1,
      rankedRounds: 0,
      rankedWins: 0,
      bestScore: 45,
      bestStreak: 10,
      bestRankedStreak: 0,
      totalHits: 20,
      totalMisses: 2,
    },
  ],
  totalRoundCount: 4,
  unlockedAchievementIds: [
    "easy-rounds-1",
    "easy-rounds-10",
  ],
  buildWalkthrough: {
    status: "completed",
  },
  seenUnlockPartIds: [
    "magnet_center",
  ],
}

let database
let pool
let initializeSchema
let createUser
let findUserProgressByUserId
let createDefaultUserProgress

let richUserId
let noDailyXpUserId
let emptyUserId

function normalizeProgressForFixture(progress) {
  const copy = structuredClone(progress)
  delete copy.snapshotAtMs
  delete copy.dailyGoals
  copy.roundHistory = copy.roundHistory.map((entry) => ({
    ...entry,
    playedAtIso: "<timestamp>",
  }))
  return copy
}

before(async () => {
  database = await startTestDatabase()
  pool = (await import("../../server/db/pgPool.js")).default
  const db = await import("../../server/playerMysqlDatabase.js")
  initializeSchema = db.initializeSchema
  createUser = db.createUser
  findUserProgressByUserId = db.findUserProgressByUserId
  createDefaultUserProgress = db.createDefaultUserProgress
  await initializeSchema()

  const rich = await createUser({ username: "RichProgressPlayer", passwordHash: "hash" })
  richUserId = rich.id

  await pool.execute(
    `UPDATE users
     SET coins = 1250, xp = 2400, mmr = 640,
         rank_system_version = ?, placement_matches_played = ?, demotion_protection_rounds = 1,
         current_button_skin_id = 2, current_arena_theme_id = 2, current_profile_theme_id = 4,
         active_loadout_slot = ?, build_walkthrough_status = ?, seen_unlock_part_ids_json = ?
     WHERE id = ?`,
    [RANK_SYSTEM_VERSION, PLACEMENT_MATCH_COUNT, "loadout_2", "completed", JSON.stringify(["magnet_center"]), richUserId]
  )
  await pool.execute(
    `INSERT INTO user_collection (user_id, item_type, item_id) VALUES
     (?, 'button_skin', 2), (?, 'arena_theme', 2), (?, 'profile_theme', 4)`,
    [richUserId, richUserId, richUserId]
  )
  await pool.execute(
    `INSERT INTO user_loadouts (
       slot_id, user_id, name, tempo_core_id, streak_lens_id, power_rig_id,
       powerup_slot_1_id, powerup_slot_2_id, powerup_slot_3_id
     ) VALUES
     ('loadout_1', ?, 'Alpha', 'tempo_anchor', 'streak_stabilizer', 'power_balanced', 'time_boost', 'size_boost', ''),
     ('loadout_2', ?, 'Overdrive', 'tempo_overdrive', 'streak_momentum', 'power_surge', 'time_boost', 'freeze_movement', 'magnet_center')`,
    [richUserId, richUserId]
  )
  await pool.execute(
    `INSERT INTO user_achievement_progress (user_id, achievement_id, unlocked_at) VALUES
     (?, 'easy-rounds-1', now() - interval '10 days'),
     (?, 'easy-rounds-10', now() - interval '2 days')`,
    [richUserId, richUserId]
  )
  await pool.execute(
    `INSERT INTO user_lifetime_stats (
       user_id, total_rounds, ranked_rounds, best_streak, best_single_score,
       best_ranked_streak, best_single_round_accuracy, clean_rounds, total_coins_earned,
       total_hits, total_misses, max_consecutive_ranked_wins, current_consecutive_ranked_wins,
       reaction_rounds, total_reaction_ms, best_reaction_ms, drill_stats_json
     ) VALUES (?, 4, 2, 19, 96, 19, 97, 1, 220, 97, 9, 2, 2, 2, 510, 195, ?)`,
    [richUserId, JSON.stringify({ flick: { rounds: 2, bestScore: 80 } })]
  )
  await pool.execute(
    `INSERT INTO user_loadout_stats (
       user_id, loadout_id, loadout_name, total_rounds, ranked_rounds, ranked_wins,
       best_score, best_streak, best_ranked_streak, total_hits, total_misses
     ) VALUES
     (?, 'loadout_1', 'Alpha', 1, 0, 0, 45, 10, 0, 20, 2),
     (?, 'loadout_2', 'Overdrive', 2, 2, 2, 96, 19, 19, 65, 3)`,
    [richUserId, richUserId]
  )
  await pool.execute(
    `INSERT INTO round_history (
       user_id, mode, progression_mode, score, hits, misses, best_streak,
       avg_reaction_ms, best_reaction_ms, coins_earned, xp_earned, rank_delta, rank_result_kind, outcome,
       loadout_name, loadout_id, tempo_core_id, streak_lens_id, power_rig_id,
       powerup_slot_1_id, powerup_slot_2_id, powerup_slot_3_id, played_at
     ) VALUES
     (?, 'normal', 'non_ranked', 45, 20, 2, 10, NULL, NULL, 15, 100, 0, NULL, 'completed', 'Alpha', 'loadout_1', 'tempo_anchor', 'streak_stabilizer', 'power_balanced', 'time_boost', 'size_boost', NULL, now() - interval '10 days'),
     (?, 'hard', 'ranked', 88, 30, 1, 18, 265, 210, 40, 180, 22, 'rr', 'completed', 'Overdrive', 'loadout_2', 'tempo_overdrive', 'streak_momentum', 'power_surge', 'time_boost', 'freeze_movement', 'magnet_center', now() - interval '3 days'),
     (?, 'easy', 'non_ranked', 20, 12, 4, 5, NULL, NULL, 0, 0, 0, NULL, 'completed', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, GREATEST(date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC', now() - interval '2 seconds')),
     (?, 'hard', 'ranked', 96, 35, 2, 19, 245, 195, 45, 210, 18, 'rr', 'completed', 'Overdrive', 'loadout_2', 'tempo_overdrive', 'streak_momentum', 'power_surge', 'time_boost', 'freeze_movement', 'magnet_center', GREATEST(date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC', now() - interval '1 second'))`,
    [richUserId, richUserId, richUserId, richUserId]
  )

  const noDailyXp = await createUser({ username: "NoDailyXpPlayer", passwordHash: "hash" })
  noDailyXpUserId = noDailyXp.id
  await pool.execute(
    `INSERT INTO round_history (user_id, mode, score, hits, misses, best_streak, xp_earned, played_at) VALUES
     (?, 'normal', 30, 15, 1, 7, 100, now() - interval '10 days'),
     (?, 'easy', 15, 10, 2, 4, 0, GREATEST(date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC', now() - interval '1 second')),
     (?, 'normal', 25, 12, 0, 12, 0, now() + interval '1 hour')`,
    [noDailyXpUserId, noDailyXpUserId, noDailyXpUserId]
  )

  const empty = await createUser({ username: "EmptyProgressPlayer", passwordHash: "hash" })
  emptyUserId = empty.id
})

after(async () => {
  try {
    await pool?.end()
  } finally {
    await database?.stop()
  }
})

test("progress read deep-equals the pre-change fixture for a seeded user", async () => {
  const progress = await findUserProgressByUserId(richUserId)
  assert.equal(typeof progress.snapshotAtMs, "number")

  assert.deepEqual(normalizeProgressForFixture(progress), EXPECTED_RICH_PROGRESS_FIXTURE)

  const dayKey = progress.dailyGoals.day
  assert.match(dayKey, /^\d{4}-\d{2}-\d{2}$/)
  assert.equal(
    progress.dailyGoals.resetsAt,
    new Date(getNextUtcResetMs(Date.parse(`${dayKey}T00:00:00Z`))).toISOString()
  )
  assert.deepEqual(
    progress.dailyGoals.goals,
    buildDailyGoalProgress(dayKey, [{ modeId: "hard", hits: 35, misses: 2, bestStreak: 19 }]).map(
      ({ id, label, target, progress: goalProgress, isComplete, reward }) => ({
        id, label, target, progress: goalProgress, isComplete, reward,
      })
    )
  )

  const poolProgress = await createDefaultUserProgress(richUserId)
  assert.deepEqual(normalizeProgressForFixture(poolProgress), EXPECTED_RICH_PROGRESS_FIXTURE)
})

test("round history counts preserve week, future, zero-XP, and empty-history boundaries", async () => {
  const noDailyXp = await findUserProgressByUserId(noDailyXpUserId)
  assert.equal(noDailyXp.totalRoundCount, 3)
  assert.equal(noDailyXp.lifetimeStats.roundsThisWeek, 1)
  assert.equal(noDailyXp.dailyBonusAvailable, true)

  const empty = await findUserProgressByUserId(emptyUserId)
  assert.equal(empty.totalRoundCount, 0)
  assert.equal(empty.lifetimeStats.roundsThisWeek, 0)
  assert.equal(empty.dailyBonusAvailable, true)
})

test("combining round history counts reduces buildProgressRecord from 12 to 10 queries", async () => {
  const txQueries = []
  const originalGetConnection = pool.getConnection.bind(pool)
  pool.getConnection = async () => {
    const connection = await originalGetConnection()
    const originalQuery = connection.query.bind(connection)
    connection.query = async (sql, params) => {
      txQueries.push(sql)
      return originalQuery(sql, params)
    }
    return connection
  }

  try {
    await findUserProgressByUserId(richUserId)
  } finally {
    pool.getConnection = originalGetConnection
  }

  // 2 transaction setup queries (SET TRANSACTION ISOLATION LEVEL + SELECT 1) + 10 buildProgressRecord queries.
  assert.equal(txQueries.length, 12)

  const poolQueries = []
  const originalPoolQuery = pool.query.bind(pool)
  pool.query = async (sql, params) => {
    poolQueries.push(sql)
    return originalPoolQuery(sql, params)
  }

  try {
    await createDefaultUserProgress(richUserId)
  } finally {
    pool.query = originalPoolQuery
  }

  assert.equal(poolQueries.length, 10)
})
