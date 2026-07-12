-- ============================================================================
-- Clickaway — MASTER schema snapshot (consolidated from all migrations)
-- ============================================================================
-- Generated 2026-07-12 from the authoritative source: initializeSchema() in
-- server/playerMysqlDatabase.js, cross-checked against server/data/migrations/
-- 001-007 and src/game/achievements/achievementsList.js.
--
-- You do NOT need to run this file — the app self-migrates on every boot via
-- initializeSchema(). This file exists only because you're rebuilding the
-- MySQL table from scratch and want one script that produces the exact
-- current shape in one shot, instead of replaying 7 migration files by hand.
--
-- Safe to run against a completely empty database. Idempotent-ish: uses
-- CREATE TABLE IF NOT EXISTS, but INSERTs use INSERT IGNORE so re-running is
-- also safe as long as the tables already match this shape.
-- ============================================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- ----------------------------------------------------------------------------
-- Catalog / lookup tables
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `achievements_catalog` (
  `id` varchar(60) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `arena_themes` (
  `id` bigint(20) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `button_skins` (
  `id` bigint(20) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `profile_images` (
  `id` bigint(20) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------------------------------------------------------
-- Users (base columns + everything added by migrations 003/004 + role)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `users` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `coins` bigint(20) NOT NULL DEFAULT 0,
  `xp` int(11) NOT NULL DEFAULT 0,
  `mmr` int(11) NOT NULL DEFAULT 0,
  `current_button_skin_id` bigint(20) DEFAULT NULL,
  `current_arena_theme_id` bigint(20) DEFAULT NULL,
  `current_profile_theme_id` bigint(20) DEFAULT NULL,
  `role` varchar(20) NOT NULL DEFAULT 'player',
  `rank_system_version` int(11) NOT NULL DEFAULT 0,
  `placement_matches_played` int(11) NOT NULL DEFAULT 0,
  `demotion_protection_rounds` int(11) NOT NULL DEFAULT 0,
  `active_loadout_slot` varchar(60) DEFAULT NULL,
  `build_walkthrough_status` varchar(60) NOT NULL DEFAULT 'not_started',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_username` (`username`),
  KEY `idx_users_mmr_id` (`mmr`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------------------------------------------------------
-- Round history (base + migration 001 reaction metrics + migration 002 loadout snapshot)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `round_history` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `mode` varchar(50) NOT NULL DEFAULT 'normal',
  `progression_mode` varchar(50) NOT NULL DEFAULT 'non_ranked',
  `score` int(11) NOT NULL DEFAULT 0,
  `hits` int(11) NOT NULL DEFAULT 0,
  `misses` int(11) NOT NULL DEFAULT 0,
  `best_streak` int(11) NOT NULL DEFAULT 0,
  `coins_earned` int(11) NOT NULL DEFAULT 0,
  `xp_earned` int(11) NOT NULL DEFAULT 0,
  `rank_delta` int(11) NOT NULL DEFAULT 0,
  `played_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `avg_reaction_ms` int(11) DEFAULT NULL,
  `best_reaction_ms` int(11) DEFAULT NULL,
  `loadout_name` varchar(100) DEFAULT NULL,
  `loadout_id` varchar(60) DEFAULT NULL,
  `tempo_core_id` varchar(60) DEFAULT NULL,
  `streak_lens_id` varchar(60) DEFAULT NULL,
  `power_rig_id` varchar(60) DEFAULT NULL,
  `powerup_slot_1_id` varchar(60) DEFAULT NULL,
  `powerup_slot_2_id` varchar(60) DEFAULT NULL,
  `powerup_slot_3_id` varchar(60) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_played` (`user_id`, `played_at`),
  KEY `idx_round_history_progression_user` (`progression_mode`, `user_id`),
  CONSTRAINT `fk_round_history_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------------------------------------------------------
-- Achievements
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `user_achievement_progress` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `achievement_id` varchar(60) NOT NULL,
  `unlocked_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_achievement` (`user_id`, `achievement_id`),
  KEY `idx_user_unlocked` (`user_id`, `unlocked_at`),
  KEY `idx_achprog_catalog` (`achievement_id`),
  CONSTRAINT `fk_achprog_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------------------------------------------------------
-- Owned cosmetics
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `user_collection` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `item_type` varchar(50) NOT NULL,
  `item_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_item` (`user_id`, `item_type`, `item_id`),
  CONSTRAINT `fk_collection_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------------------------------------------------------
-- Lifetime + per-loadout stats (migration 005 + drill_stats_json from 007)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `user_lifetime_stats` (
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `total_rounds` int(11) NOT NULL DEFAULT 0,
  `ranked_rounds` int(11) NOT NULL DEFAULT 0,
  `best_streak` int(11) NOT NULL DEFAULT 0,
  `best_single_score` int(11) NOT NULL DEFAULT 0,
  `best_ranked_streak` int(11) NOT NULL DEFAULT 0,
  `best_single_round_accuracy` int(11) NOT NULL DEFAULT 0,
  `clean_rounds` int(11) NOT NULL DEFAULT 0,
  `total_coins_earned` bigint(20) NOT NULL DEFAULT 0,
  `total_hits` bigint(20) NOT NULL DEFAULT 0,
  `total_misses` bigint(20) NOT NULL DEFAULT 0,
  `max_consecutive_ranked_wins` int(11) NOT NULL DEFAULT 0,
  `current_consecutive_ranked_wins` int(11) NOT NULL DEFAULT 0,
  `reaction_rounds` int(11) NOT NULL DEFAULT 0,
  `total_reaction_ms` bigint(20) NOT NULL DEFAULT 0,
  `best_reaction_ms` int(11) DEFAULT NULL,
  `drill_stats_json` json DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_lifetime_stats_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `user_loadout_stats` (
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `loadout_id` varchar(60) NOT NULL,
  `loadout_name` varchar(100) NOT NULL DEFAULT 'Loadout',
  `total_rounds` int(11) NOT NULL DEFAULT 0,
  `ranked_rounds` int(11) NOT NULL DEFAULT 0,
  `ranked_wins` int(11) NOT NULL DEFAULT 0,
  `best_score` int(11) NOT NULL DEFAULT 0,
  `best_streak` int(11) NOT NULL DEFAULT 0,
  `best_ranked_streak` int(11) NOT NULL DEFAULT 0,
  `total_hits` bigint(20) NOT NULL DEFAULT 0,
  `total_misses` bigint(20) NOT NULL DEFAULT 0,
  PRIMARY KEY (`user_id`, `loadout_id`),
  KEY `idx_loadout_stats_user_rounds` (`user_id`, `total_rounds`),
  CONSTRAINT `fk_loadout_stats_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------------------------------------------------------
-- Buildcraft loadouts
-- NOTE: current schema keys this table by (slot_id, user_id), NOT by an
-- auto-increment id like the old migrations/002 file — this replaced that
-- shape. If you have an existing `user_loadouts` table with an `id` column
-- and a UNIQUE KEY on (user_id, slot_id) instead, this CREATE TABLE IF NOT
-- EXISTS will silently do nothing; drop/recreate manually if you need the
-- new shape on an old database.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `user_loadouts` (
  `slot_id` varchar(60) NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL DEFAULT '',
  `tempo_core_id` varchar(60) DEFAULT NULL,
  `streak_lens_id` varchar(60) DEFAULT NULL,
  `power_rig_id` varchar(60) DEFAULT NULL,
  `powerup_slot_1_id` varchar(60) DEFAULT NULL,
  `powerup_slot_2_id` varchar(60) DEFAULT NULL,
  `powerup_slot_3_id` varchar(60) DEFAULT NULL,
  PRIMARY KEY (`slot_id`, `user_id`),
  CONSTRAINT `fk_loadout_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------------------------------------------------------
-- Seasons, replays, ghost-duel challenges (migration 006)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `seasons` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `slug` varchar(60) NOT NULL,
  `name` varchar(100) NOT NULL,
  `starts_at` datetime NOT NULL,
  `ends_at` datetime NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'active',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_season_slug` (`slug`),
  KEY `idx_season_status_dates` (`status`, `starts_at`, `ends_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `user_season_stats` (
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `season_id` bigint(20) UNSIGNED NOT NULL,
  `ranked_rounds` int(11) NOT NULL DEFAULT 0,
  `peak_mmr` int(11) NOT NULL DEFAULT 0,
  `reward_tier` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`user_id`, `season_id`),
  KEY `idx_user_season_peak_mmr` (`season_id`, `peak_mmr`),
  CONSTRAINT `fk_user_season_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_season_season`
    FOREIGN KEY (`season_id`) REFERENCES `seasons` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `round_replays` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `username` varchar(50) NOT NULL,
  `mode_id` varchar(50) NOT NULL,
  `seed` int(10) UNSIGNED NOT NULL,
  `events_json` json NOT NULL,
  `loadout_snapshot_json` json DEFAULT NULL,
  `score` int(11) NOT NULL DEFAULT 0,
  `hits` int(11) NOT NULL DEFAULT 0,
  `misses` int(11) NOT NULL DEFAULT 0,
  `best_streak` int(11) NOT NULL DEFAULT 0,
  `visibility` varchar(20) NOT NULL DEFAULT 'public',
  `round_history_id` bigint(20) DEFAULT NULL,
  `played_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_replays_user_played` (`user_id`, `played_at`),
  KEY `idx_replays_visibility_score` (`visibility`, `score`),
  CONSTRAINT `fk_replays_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `challenges` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `challenger_user_id` bigint(20) UNSIGNED NOT NULL,
  `challenger_username` varchar(50) NOT NULL,
  `opponent_user_id` bigint(20) UNSIGNED NOT NULL,
  `opponent_username` varchar(50) NOT NULL,
  `replay_id` bigint(20) NOT NULL,
  `mode_id` varchar(50) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `message` varchar(280) DEFAULT NULL,
  `opponent_replay_id` bigint(20) DEFAULT NULL,
  `challenger_won` tinyint(1) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `responded_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_challenges_opponent_status` (`opponent_user_id`, `status`, `created_at`),
  KEY `idx_challenges_challenger_status` (`challenger_user_id`, `status`, `created_at`),
  CONSTRAINT `fk_challenges_challenger`
    FOREIGN KEY (`challenger_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_challenges_opponent`
    FOREIGN KEY (`opponent_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_challenges_replay`
    FOREIGN KEY (`replay_id`) REFERENCES `round_replays` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------------------------------------------------------
-- Seed data
-- ----------------------------------------------------------------------------

INSERT IGNORE INTO `arena_themes` (`id`) VALUES (1),(2),(3),(4);

INSERT IGNORE INTO `button_skins` (`id`) VALUES
  (1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(12),(13),(14),(15),(16);

INSERT IGNORE INTO `profile_images` (`id`) VALUES (1),(2),(3),(4),(5),(6),(7);

-- Kept in sync by hand with src/game/achievements/achievementsList.js.
-- (The live app instead seeds this from ACHIEVEMENTS directly on boot, so it
-- can never drift — this static list is only for this one-shot rebuild.)
INSERT IGNORE INTO `achievements_catalog` (`id`) VALUES
('master-of-masters'),
('easy-rounds-1'),
('easy-rounds-10'),
('hard-rounds-50'),
('career-rounds-100'),
('career-rounds-250'),
('easy-level-5'),
('hard-level-15'),
('career-level-50'),
('career-level-100'),
('career-level-250'),
('easy-ranked-1'),
('hard-ranked-10'),
('hard-ranked-50'),
('career-ranked-100'),
('career-ranked-250'),
('easy-coins-500'),
('hard-coins-2000'),
('hard-coins-5000'),
('career-coins-25000'),
('career-coins-50000'),
('easy-streak-20'),
('hard-streak-30'),
('hard-streak-40'),
('career-streak-45'),
('career-streak-50'),
('skill-clean-1'),
('skill-clean-10'),
('skill-clean-25'),
('skill-accuracy-90'),
('skill-accuracy-95'),
('skill-ranked-streak-15'),
('skill-ranked-streak-25'),
('skill-consec-wins-3'),
('skill-consec-wins-5'),
('skill-score-100'),
('skill-score-200');

-- `seasons` is intentionally NOT seeded here — the app auto-creates a
-- "Season 1" row (90 days from boot time) the first time initializeSchema()
-- runs and finds no active season. Do it here too if you're not booting the
-- server right after running this file:
--
-- INSERT INTO seasons (slug, name, starts_at, ends_at, status)
-- VALUES ('season-1', 'Season 1', NOW(), NOW() + INTERVAL 90 DAY, 'active');

COMMIT;
