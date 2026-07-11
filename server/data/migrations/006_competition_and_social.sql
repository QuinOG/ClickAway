-- Wave 3: seasons, round replays, and ghost-duel challenges.
-- Authoritative bootstrap lives in initializeSchema() in playerMysqlDatabase.js.

CREATE TABLE IF NOT EXISTS `seasons` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `slug` varchar(60) NOT NULL,
  `name` varchar(100) NOT NULL,
  `starts_at` timestamp NOT NULL,
  `ends_at` timestamp NOT NULL,
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
