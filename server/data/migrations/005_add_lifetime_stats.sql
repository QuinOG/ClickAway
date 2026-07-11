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
