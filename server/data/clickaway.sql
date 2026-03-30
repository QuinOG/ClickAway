-- Minimal MySQL schema for the current Clickaway app.
-- Frontend cosmetic metadata and progression/rank formulas live in the frontend code.
-- MySQL stores authentication, persisted player state, round history, and unlocked achievement ids.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

CREATE TABLE `achievements_catalog` (
  `id` varchar(60) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `achievements_catalog` (`id`) VALUES
('career-coins-25000'),
('career-level-50'),
('career-coins-50000'),
('career-level-100'),
('career-level-250'),
('career-ranked-100'),
('career-ranked-250'),
('career-rounds-100'),
('career-rounds-250'),
('career-streak-45'),
('career-streak-50'),
('easy-coins-500'),
('easy-level-5'),
('easy-ranked-1'),
('easy-rounds-1'),
('easy-rounds-10'),
('easy-streak-20'),
('hard-coins-2000'),
('hard-coins-5000'),
('hard-level-15'),
('hard-ranked-10'),
('hard-ranked-50'),
('hard-rounds-50'),
('hard-streak-30'),
('hard-streak-40'),
('master-economy'),
('master-level'),
('master-of-masters'),
('master-ranked'),
('master-streak'),
('master-rounds');

CREATE TABLE `arena_themes` (
  `id` bigint(20) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `arena_themes` (`id`) VALUES
(1),
(2),
(3),
(4);

CREATE TABLE `button_skins` (
  `id` bigint(20) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `button_skins` (`id`) VALUES
(1),
(2),
(3),
(4),
(5),
(6),
(7),
(8),
(9),
(10),
(11),
(12),
(13),
(14),
(15),
(16);

CREATE TABLE `profile_images` (
  `id` bigint(20) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `profile_images` (`id`) VALUES
(1),
(2),
(3),
(4),
(5),
(6),
(7);

CREATE TABLE `users` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `coins` bigint(20) NOT NULL DEFAULT 0,
  `xp` int(11) NOT NULL DEFAULT 0,
  `mmr` int(11) NOT NULL DEFAULT 0,
  `current_button_skin_id` bigint(20) DEFAULT NULL,
  `current_arena_theme_id` bigint(20) DEFAULT NULL,
  `current_profile_theme_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_username` (`username`),
  KEY `idx_users_mmr_id` (`mmr`, `id`),
  CONSTRAINT `fk_users_button_skin`
    FOREIGN KEY (`current_button_skin_id`) REFERENCES `button_skins` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_users_arena_theme`
    FOREIGN KEY (`current_arena_theme_id`) REFERENCES `arena_themes` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_users_profile_theme`
    FOREIGN KEY (`current_profile_theme_id`) REFERENCES `profile_images` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `round_history` (
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
  PRIMARY KEY (`id`),
  KEY `idx_user_played` (`user_id`, `played_at`),
  KEY `idx_round_history_progression_user` (`progression_mode`, `user_id`),
  CONSTRAINT `chk_round_history_mode`
    CHECK (`mode` IN ('easy', 'normal', 'hard')),
  CONSTRAINT `chk_round_history_progression_mode`
    CHECK (`progression_mode` IN ('practice', 'non_ranked', 'ranked')),
  CONSTRAINT `fk_round_history_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `user_achievement_progress` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `achievement_id` varchar(60) NOT NULL,
  `unlocked_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_achievement` (`user_id`, `achievement_id`),
  KEY `idx_user_unlocked` (`user_id`, `unlocked_at`),
  KEY `idx_achprog_catalog` (`achievement_id`),
  CONSTRAINT `fk_achprog_catalog`
    FOREIGN KEY (`achievement_id`) REFERENCES `achievements_catalog` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_achprog_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `user_collection` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `item_type` varchar(50) NOT NULL,
  `item_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_item` (`user_id`, `item_type`, `item_id`),
  CONSTRAINT `chk_user_collection_item_type`
    CHECK (`item_type` IN ('button_skin', 'arena_theme', 'profile_theme')),
  CONSTRAINT `fk_collection_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

COMMIT;
