import pool, { buildValuesClause } from "./pgPool.js"
import { ACHIEVEMENTS } from "../../src/game/achievements/achievementsList.js"
import { ensureActiveSeason } from "./seasons.js"

const REQUIRED_DATABASE_TABLES = [
  "achievements_catalog",
  "arena_themes",
  "button_skins",
  "challenges",
  "consumed_round_tokens",
  "pending_ranked_rounds",
  "profile_images",
  "round_history",
  "round_replays",
  "seasons",
  "user_achievement_progress",
  "user_collection",
  "user_lifetime_stats",
  "user_loadout_stats",
  "user_loadouts",
  "user_season_stats",
  "user_sessions",
  "users",
]

export async function verifySchema() {
  const [rows] = await pool.query(
    `SELECT table_name AS tableName
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name = ANY(?)`,
    [REQUIRED_DATABASE_TABLES]
  )
  const existingTables = new Set(rows.map((row) => row.tableName))
  const missingTables = REQUIRED_DATABASE_TABLES.filter(
    (tableName) => !existingTables.has(tableName)
  )

  if (missingTables.length > 0) {
    throw new Error(
      `Supabase schema is incomplete. Missing tables: ${missingTables.join(", ")}.`
    )
  }

  const [columns] = await pool.query(`SELECT column_name AS columnName
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'round_history'
      AND column_name = 'rank_result_kind'`)
  if (!columns.length) throw new Error("Supabase schema is incomplete. Missing round_history.rank_result_kind; apply migration 013.")

  const [outcomeColumns] = await pool.query(`SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'round_history'
      AND column_name = 'outcome'`)
  if (!outcomeColumns.length) throw new Error("Supabase schema is incomplete. Missing round_history.outcome; apply the ranked forfeit migration.")

  const [consumedHistoryColumns] = await pool.query(`SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'consumed_round_tokens'
      AND column_name = 'round_history_id'`)
  if (!consumedHistoryColumns.length) throw new Error("Supabase schema is incomplete. Missing consumed_round_tokens.round_history_id; apply the round recovery migration.")

  console.log("Supabase schema verified.")
}

export async function initializeSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS achievements_catalog (
      id varchar(60) NOT NULL,
      PRIMARY KEY (id)
    );

    CREATE TABLE IF NOT EXISTS arena_themes (
      id bigint NOT NULL,
      PRIMARY KEY (id)
    );

    CREATE TABLE IF NOT EXISTS button_skins (
      id bigint NOT NULL,
      PRIMARY KEY (id)
    );

    CREATE TABLE IF NOT EXISTS profile_images (
      id bigint NOT NULL,
      PRIMARY KEY (id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id bigint GENERATED ALWAYS AS IDENTITY,
      username varchar(50) NOT NULL,
      password_hash varchar(255) NOT NULL,
      coins bigint NOT NULL DEFAULT 0,
      xp int NOT NULL DEFAULT 0,
      mmr int NOT NULL DEFAULT 0,
      current_button_skin_id bigint DEFAULT NULL,
      current_arena_theme_id bigint DEFAULT NULL,
      current_profile_theme_id bigint DEFAULT NULL,
      PRIMARY KEY (id),
      UNIQUE (username)
    );
    CREATE INDEX IF NOT EXISTS idx_users_mmr_id ON users (mmr, id);

    CREATE TABLE IF NOT EXISTS user_sessions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL,
      revoked_at timestamptz
    );
    CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions (user_id);

    CREATE TABLE IF NOT EXISTS round_history (
      id bigint GENERATED ALWAYS AS IDENTITY,
      user_id bigint NOT NULL,
      mode varchar(50) NOT NULL DEFAULT 'normal',
      progression_mode varchar(50) NOT NULL DEFAULT 'non_ranked',
      score int NOT NULL DEFAULT 0,
      hits int NOT NULL DEFAULT 0,
      misses int NOT NULL DEFAULT 0,
      best_streak int NOT NULL DEFAULT 0,
      coins_earned int NOT NULL DEFAULT 0,
      xp_earned int NOT NULL DEFAULT 0,
      rank_delta int NOT NULL DEFAULT 0,
      played_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (id),
      CONSTRAINT fk_round_history_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_user_played ON round_history (user_id, played_at);
    CREATE INDEX IF NOT EXISTS idx_round_history_progression_user ON round_history (progression_mode, user_id);

    CREATE TABLE IF NOT EXISTS user_achievement_progress (
      id bigint GENERATED ALWAYS AS IDENTITY,
      user_id bigint NOT NULL,
      achievement_id varchar(60) NOT NULL,
      unlocked_at timestamptz NULL DEFAULT NULL,
      PRIMARY KEY (id),
      UNIQUE (user_id, achievement_id),
      CONSTRAINT fk_achprog_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_user_unlocked ON user_achievement_progress (user_id, unlocked_at);
    CREATE INDEX IF NOT EXISTS idx_achprog_catalog ON user_achievement_progress (achievement_id);

    CREATE TABLE IF NOT EXISTS user_collection (
      id bigint GENERATED ALWAYS AS IDENTITY,
      user_id bigint NOT NULL,
      item_type varchar(50) NOT NULL,
      item_id bigint NOT NULL,
      PRIMARY KEY (id),
      UNIQUE (user_id, item_type, item_id),
      CONSTRAINT fk_collection_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    INSERT INTO arena_themes (id) VALUES (1),(2),(3),(4) ON CONFLICT (id) DO NOTHING;

    INSERT INTO button_skins (id) VALUES
      (1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(12),(13),(14),(15),(16)
      ON CONFLICT (id) DO NOTHING;

    INSERT INTO profile_images (id) VALUES (1),(2),(3),(4),(5),(6),(7) ON CONFLICT (id) DO NOTHING;
  `)

  // The achievement catalog is seeded from ACHIEVEMENTS (the single source of truth
  // shared with the frontend) instead of a hand-maintained id list, so the two can
  // never drift out of sync again.
  if (ACHIEVEMENTS.length > 0) {
    const { clause, params } = buildValuesClause(
      ACHIEVEMENTS.map((achievement) => [achievement.id])
    )
    await pool.query(
      `INSERT INTO achievements_catalog (id) VALUES ${clause} ON CONFLICT (id) DO NOTHING`,
      params
    )
  }

  // Migrations: add columns that may be missing from older deployments.
  // Postgres supports ADD COLUMN IF NOT EXISTS natively, unlike MySQL 5.7.
  async function addColumnIfMissing(table, column, definition) {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${definition}`)
  }

  await addColumnIfMissing("users", "role", "varchar(20) NOT NULL DEFAULT 'player'")
  await addColumnIfMissing("users", "rank_system_version", "int NOT NULL DEFAULT 0")
  await addColumnIfMissing("users", "placement_matches_played", "int NOT NULL DEFAULT 0")
  await addColumnIfMissing("users", "demotion_protection_rounds", "int NOT NULL DEFAULT 0")
  await addColumnIfMissing("users", "active_loadout_slot", "varchar(60) DEFAULT NULL")
  await addColumnIfMissing("users", "build_walkthrough_status", "varchar(60) NOT NULL DEFAULT 'not_started'")
  await addColumnIfMissing("users", "seen_unlock_part_ids_json", "jsonb DEFAULT NULL")
  await addColumnIfMissing("round_history", "rank_result_kind", "varchar(10) DEFAULT NULL CHECK (rank_result_kind IN ('rr', 'placement'))")
  await addColumnIfMissing("round_history", "outcome", "varchar(20) NOT NULL DEFAULT 'completed'")
  await addColumnIfMissing("round_history", "avg_reaction_ms", "int DEFAULT NULL")
  await addColumnIfMissing("round_history", "best_reaction_ms", "int DEFAULT NULL")
  await addColumnIfMissing("round_history", "loadout_name", "varchar(100) DEFAULT NULL")
  await addColumnIfMissing("round_history", "loadout_id", "varchar(60) DEFAULT NULL")
  await addColumnIfMissing("round_history", "tempo_core_id", "varchar(60) DEFAULT NULL")
  await addColumnIfMissing("round_history", "streak_lens_id", "varchar(60) DEFAULT NULL")
  await addColumnIfMissing("round_history", "power_rig_id", "varchar(60) DEFAULT NULL")
  await addColumnIfMissing("round_history", "powerup_slot_1_id", "varchar(60) DEFAULT NULL")
  await addColumnIfMissing("round_history", "powerup_slot_2_id", "varchar(60) DEFAULT NULL")
  await addColumnIfMissing("round_history", "powerup_slot_3_id", "varchar(60) DEFAULT NULL")

  await pool.query(`CREATE TABLE IF NOT EXISTS user_lifetime_stats (
    user_id bigint NOT NULL,
    total_rounds int NOT NULL DEFAULT 0,
    ranked_rounds int NOT NULL DEFAULT 0,
    best_streak int NOT NULL DEFAULT 0,
    best_single_score int NOT NULL DEFAULT 0,
    best_ranked_streak int NOT NULL DEFAULT 0,
    best_single_round_accuracy int NOT NULL DEFAULT 0,
    clean_rounds int NOT NULL DEFAULT 0,
    total_coins_earned bigint NOT NULL DEFAULT 0,
    total_hits bigint NOT NULL DEFAULT 0,
    total_misses bigint NOT NULL DEFAULT 0,
    max_consecutive_ranked_wins int NOT NULL DEFAULT 0,
    current_consecutive_ranked_wins int NOT NULL DEFAULT 0,
    reaction_rounds int NOT NULL DEFAULT 0,
    total_reaction_ms bigint NOT NULL DEFAULT 0,
    best_reaction_ms int DEFAULT NULL,
    PRIMARY KEY (user_id),
    CONSTRAINT fk_lifetime_stats_user
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  )`)

  await addColumnIfMissing("user_lifetime_stats", "drill_stats_json", "jsonb DEFAULT NULL")
  await addColumnIfMissing("user_lifetime_stats", "verified_best_reaction_ms", "int DEFAULT NULL")

  await pool.query(`CREATE TABLE IF NOT EXISTS user_loadout_stats (
    user_id bigint NOT NULL,
    loadout_id varchar(60) NOT NULL,
    loadout_name varchar(100) NOT NULL DEFAULT 'Loadout',
    total_rounds int NOT NULL DEFAULT 0,
    ranked_rounds int NOT NULL DEFAULT 0,
    ranked_wins int NOT NULL DEFAULT 0,
    best_score int NOT NULL DEFAULT 0,
    best_streak int NOT NULL DEFAULT 0,
    best_ranked_streak int NOT NULL DEFAULT 0,
    total_hits bigint NOT NULL DEFAULT 0,
    total_misses bigint NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, loadout_id),
    CONSTRAINT fk_loadout_stats_user
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  )`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_loadout_stats_user_rounds ON user_loadout_stats (user_id, total_rounds)`)

  await pool.query(`CREATE TABLE IF NOT EXISTS user_loadouts (
    slot_id varchar(60) NOT NULL,
    user_id bigint NOT NULL,
    name varchar(100) NOT NULL DEFAULT '',
    tempo_core_id varchar(60) DEFAULT NULL,
    streak_lens_id varchar(60) DEFAULT NULL,
    power_rig_id varchar(60) DEFAULT NULL,
    powerup_slot_1_id varchar(60) DEFAULT NULL,
    powerup_slot_2_id varchar(60) DEFAULT NULL,
    powerup_slot_3_id varchar(60) DEFAULT NULL,
    PRIMARY KEY (slot_id, user_id),
    CONSTRAINT fk_loadout_user
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  )`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_loadouts_user ON user_loadouts (user_id)`)

  await pool.query(`CREATE TABLE IF NOT EXISTS seasons (
    id bigint GENERATED ALWAYS AS IDENTITY,
    slug varchar(60) NOT NULL,
    name varchar(100) NOT NULL,
    starts_at timestamptz NOT NULL,
    ends_at timestamptz NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'active',
    PRIMARY KEY (id),
    UNIQUE (slug)
  )`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_season_status_dates ON seasons (status, starts_at, ends_at)`)

  await pool.query(`CREATE TABLE IF NOT EXISTS user_season_stats (
    user_id bigint NOT NULL,
    season_id bigint NOT NULL,
    ranked_rounds int NOT NULL DEFAULT 0,
    peak_mmr int NOT NULL DEFAULT 0,
    reward_tier int NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, season_id),
    CONSTRAINT fk_user_season_user
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_season_season
      FOREIGN KEY (season_id) REFERENCES seasons (id) ON DELETE CASCADE
  )`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_season_peak_mmr ON user_season_stats (season_id, peak_mmr)`)

  await pool.query(`CREATE TABLE IF NOT EXISTS round_replays (
    id bigint GENERATED ALWAYS AS IDENTITY,
    user_id bigint NOT NULL,
    username varchar(50) NOT NULL,
    mode_id varchar(50) NOT NULL,
    seed bigint NOT NULL,
    events_json jsonb NOT NULL,
    loadout_snapshot_json jsonb DEFAULT NULL,
    score int NOT NULL DEFAULT 0,
    hits int NOT NULL DEFAULT 0,
    misses int NOT NULL DEFAULT 0,
    best_streak int NOT NULL DEFAULT 0,
    visibility varchar(20) NOT NULL DEFAULT 'public',
    round_history_id bigint DEFAULT NULL,
    played_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    CONSTRAINT fk_replays_user
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  )`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_replays_user_played ON round_replays (user_id, played_at)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_replays_visibility_score ON round_replays (visibility, score)`)

  await pool.query(`CREATE TABLE IF NOT EXISTS consumed_round_tokens (
    token_id varchar(64) NOT NULL,
    user_id bigint NOT NULL,
    consumed_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (token_id),
    CONSTRAINT fk_consumed_round_tokens_user
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  )`)
  await addColumnIfMissing("consumed_round_tokens", "round_history_id", "bigint DEFAULT NULL")
  await pool.query(`DELETE FROM consumed_round_tokens WHERE consumed_at < now() - interval '2 days'`)

  await pool.query(`CREATE TABLE IF NOT EXISTS pending_ranked_rounds (
    round_id varchar(64) PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    mode_id varchar(50) NOT NULL,
    issued_at timestamptz NOT NULL DEFAULT now()
  )`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_pending_ranked_rounds_user ON pending_ranked_rounds (user_id)`)

  await pool.query(`CREATE TABLE IF NOT EXISTS challenges (
    id bigint GENERATED ALWAYS AS IDENTITY,
    challenger_user_id bigint NOT NULL,
    challenger_username varchar(50) NOT NULL,
    opponent_user_id bigint NOT NULL,
    opponent_username varchar(50) NOT NULL,
    replay_id bigint NOT NULL,
    mode_id varchar(50) NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'pending',
    message varchar(280) DEFAULT NULL,
    opponent_replay_id bigint DEFAULT NULL,
    challenger_won boolean DEFAULT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    responded_at timestamptz NULL DEFAULT NULL,
    completed_at timestamptz NULL DEFAULT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_challenges_challenger
      FOREIGN KEY (challenger_user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_challenges_opponent
      FOREIGN KEY (opponent_user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_challenges_replay
      FOREIGN KEY (replay_id) REFERENCES round_replays (id) ON DELETE CASCADE
  )`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_challenges_opponent_status ON challenges (opponent_user_id, status, created_at)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_challenges_challenger_status ON challenges (challenger_user_id, status, created_at)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_challenges_replay ON challenges (replay_id)`)

  await ensureActiveSeason()

  console.log("Database schema initialized.")
}
