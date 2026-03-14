-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 14, 2026 at 05:51 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `clickaway`
--

DELIMITER $$
--
-- Procedures
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_get_level_for_xp` (IN `p_xp` INT, OUT `p_level` INT)   BEGIN
  SELECT COALESCE(MAX(level), 1)
  INTO   p_level
  FROM   xp_level_thresholds
  WHERE  xp_required <= p_xp;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_upsert_leaderboard` (IN `p_user_id` BIGINT UNSIGNED)   BEGIN
  INSERT INTO leaderboard (
    user_id, username, mmr, rank_tier, level, xp, coins,
    total_rounds, ranked_rounds, best_score, best_streak,
    best_accuracy, total_coins_earned
  )
  SELECT
    u.id,
    u.username,
    u.mmr,
    u.rank_tier,
    u.level,
    u.xp,
    u.coins,
    COUNT(rh.id)                                     AS total_rounds,
    SUM(rh.progression_mode = 'ranked')              AS ranked_rounds,
    COALESCE(MAX(rh.score), 0)                       AS best_score,
    COALESCE(MAX(rh.best_streak), 0)                 AS best_streak,
    COALESCE(MAX(rh.accuracy_percent), 0.00)         AS best_accuracy,
    COALESCE(SUM(rh.coins_earned), 0)                AS total_coins_earned
  FROM users u
  LEFT JOIN round_history rh ON rh.user_id = u.id
  WHERE u.id = p_user_id
  GROUP BY u.id
  ON DUPLICATE KEY UPDATE
    username          = VALUES(username),
    mmr               = VALUES(mmr),
    rank_tier         = VALUES(rank_tier),
    level             = VALUES(level),
    xp                = VALUES(xp),
    coins             = VALUES(coins),
    total_rounds      = VALUES(total_rounds),
    ranked_rounds     = VALUES(ranked_rounds),
    best_score        = VALUES(best_score),
    best_streak       = VALUES(best_streak),
    best_accuracy     = VALUES(best_accuracy),
    total_coins_earned= VALUES(total_coins_earned);
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `achievements_catalog`
--

CREATE TABLE `achievements_catalog` (
  `id` varchar(60) NOT NULL COMMENT 'matches frontend achievement id string',
  `title` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `category_key` varchar(50) NOT NULL DEFAULT 'rounds',
  `metric_key` varchar(50) DEFAULT NULL,
  `target_value` int(11) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `achievements_catalog`
--

INSERT INTO `achievements_catalog` (`id`, `title`, `description`, `category_key`, `metric_key`, `target_value`, `sort_order`) VALUES
('career-coins-100000', 'Treasury King', 'Earn 100,000 total coins.', 'economy', 'totalCoinsEarned', 100000, 180),
('career-coins-25000', 'Golden Vault', 'Earn 25,000 total coins.', 'economy', 'totalCoinsEarned', 25000, 170),
('career-level-30', 'Arena Veteran', 'Reach level 30.', 'level', 'level', 30, 80),
('career-level-50', 'Legacy Player', 'Reach level 50.', 'level', 'level', 50, 90),
('career-ranked-1000', 'Queue Legend', 'Play 1,000 ranked rounds.', 'ranked', 'rankedRounds', 1000, 140),
('career-ranked-250', 'Rank Devotee', 'Play 250 ranked rounds.', 'ranked', 'rankedRounds', 250, 130),
('career-rounds-1000', 'Clockwork Grinder', 'Play 1,000 total rounds.', 'rounds', 'totalRounds', 1000, 50),
('career-rounds-250', 'Routine Runner', 'Play 250 total rounds.', 'rounds', 'totalRounds', 250, 40),
('easy-coins-500', 'Coin Collector', 'Earn 500 total coins.', 'economy', 'totalCoinsEarned', 500, 150),
('easy-level-5', 'Arena Regular', 'Reach level 5.', 'level', 'level', 5, 60),
('easy-ranked-1', 'Placement Ready', 'Play 1 ranked round.', 'ranked', 'rankedRounds', 1, 100),
('easy-rounds-1', 'First Click', 'Play 1 total round.', 'rounds', 'totalRounds', 1, 10),
('easy-rounds-10', 'Session Builder', 'Play 10 total rounds.', 'rounds', 'totalRounds', 10, 20),
('hard-coins-5000', 'Vault Builder', 'Earn 5,000 total coins.', 'economy', 'totalCoinsEarned', 5000, 160),
('hard-level-15', 'Arcade Operator', 'Reach level 15.', 'level', 'level', 15, 70),
('hard-ranked-10', 'Rank Ladder', 'Play 10 ranked rounds.', 'ranked', 'rankedRounds', 10, 110),
('hard-ranked-50', 'Rank Specialist', 'Play 50 ranked rounds.', 'ranked', 'rankedRounds', 50, 120),
('hard-rounds-50', 'Endurance Grind', 'Play 50 total rounds.', 'rounds', 'totalRounds', 50, 30),
('master-economy', 'Economy Master', 'Unlock all Economy achievements.', 'master', NULL, 4, 230),
('master-level', 'Level Master', 'Unlock all Level achievements.', 'master', NULL, 4, 210),
('master-of-masters', 'Master of Masters', 'Unlock all category master achievements.', 'master', NULL, 4, 300),
('master-ranked', 'Ranked Master', 'Unlock all Ranked achievements.', 'master', NULL, 5, 220),
('master-rounds', 'Rounds Master', 'Unlock all Rounds achievements.', 'master', NULL, 5, 200);

-- --------------------------------------------------------

--
-- Table structure for table `arena_themes`
--

CREATE TABLE `arena_themes` (
  `id` bigint(20) NOT NULL,
  `theme_name` varchar(100) NOT NULL,
  `price` int(11) NOT NULL DEFAULT 0,
  `image_url` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `arena_themes`
--

INSERT INTO `arena_themes` (`id`, `theme_name`, `price`, `image_url`) VALUES
(1, 'Classic Arena', 0, '/assets/themes/classic.jpg'),
(2, 'Sunset Grid', 236, '/assets/themes/sunset.jpg'),
(3, 'Forest Glow', 569, '/assets/themes/forest.jpg'),
(4, 'Arcade Night', 902, '/assets/themes/arcade.jpg');

-- --------------------------------------------------------

--
-- Table structure for table `button_skins`
--

CREATE TABLE `button_skins` (
  `id` bigint(20) NOT NULL,
  `skin_name` varchar(100) NOT NULL,
  `price` int(11) NOT NULL DEFAULT 0,
  `rarity` varchar(50) DEFAULT 'Common',
  `image_url` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `button_skins`
--

INSERT INTO `button_skins` (`id`, `skin_name`, `price`, `rarity`, `image_url`) VALUES
(1, 'Classic', 0, 'Common', '/assets/skins/classic.png'),
(2, 'Neon Pulse', 14, 'Rare', '/assets/skins/neon.png'),
(3, 'Fireball', 209, 'Rare', '/assets/skins/fireball.png'),
(4, 'CD', 320, 'Rare', '/assets/skins/cd.png'),
(5, 'Earth', 431, 'Epic', '/assets/skins/earth.png'),
(6, 'Melon', 542, 'Common', '/assets/skins/melon.png'),
(7, 'Gold Token', 986, 'Legendary', '/assets/skins/gold.png'),
(8, 'Moon', 653, 'Rare', '/assets/skins/moon.png'),
(9, 'Wheel', 764, 'Epic', '/assets/skins/wheel.png'),
(10, 'Xbox', 875, 'Legendary', '/assets/skins/xbox.png');

-- --------------------------------------------------------

--
-- Table structure for table `clicks`
--

CREATE TABLE `clicks` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `click_value` int(11) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `failed_logins`
--

CREATE TABLE `failed_logins` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `username_attempted` varchar(100) DEFAULT NULL,
  `attempt_time` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `leaderboard`
--

CREATE TABLE `leaderboard` (
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `username` varchar(50) NOT NULL,
  `mmr` int(11) NOT NULL DEFAULT 0,
  `rank_tier` varchar(50) NOT NULL DEFAULT 'Unranked',
  `level` int(11) NOT NULL DEFAULT 1,
  `xp` int(11) NOT NULL DEFAULT 0,
  `coins` bigint(20) NOT NULL DEFAULT 0,
  `total_rounds` int(11) NOT NULL DEFAULT 0,
  `ranked_rounds` int(11) NOT NULL DEFAULT 0,
  `best_score` int(11) NOT NULL DEFAULT 0,
  `best_streak` int(11) NOT NULL DEFAULT 0,
  `best_accuracy` decimal(5,2) NOT NULL DEFAULT 0.00,
  `total_coins_earned` bigint(20) NOT NULL DEFAULT 0,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `profile_images`
--

CREATE TABLE `profile_images` (
  `id` bigint(20) NOT NULL,
  `theme_name` varchar(100) NOT NULL,
  `price` int(11) NOT NULL DEFAULT 0,
  `image_url` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `profile_images`
--

INSERT INTO `profile_images` (`id`, `theme_name`, `price`, `image_url`) VALUES
(1, 'Identity Gradient', 0, '/assets/profiles/gradient.png'),
(2, 'Raccoon Scout', 3, '/assets/profiles/raccoon.png'),
(3, 'Secure Lock', 3, '/assets/profiles/lock.png'),
(4, 'Heart Pulse', 3, '/assets/profiles/heart.png'),
(5, 'Phantom Drift', 3, '/assets/profiles/ghost.png'),
(6, 'Grape Burst', 3, '/assets/profiles/grape.png'),
(7, 'Night Beam', 3, '/assets/profiles/flashlight.png');

-- --------------------------------------------------------

--
-- Table structure for table `rank_tiers`
--

CREATE TABLE `rank_tiers` (
  `id` varchar(20) NOT NULL,
  `label` varchar(50) NOT NULL,
  `min_mmr` int(11) NOT NULL DEFAULT 0,
  `image_url` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `rank_tiers`
--

INSERT INTO `rank_tiers` (`id`, `label`, `min_mmr`, `image_url`) VALUES
('bronze', 'Bronze', 0, '/ranks/bronze.png'),
('gold', 'Gold', 1500, '/ranks/gold.png'),
('silver', 'Silver', 500, '/ranks/silver.png'),
('unranked', 'Unranked', -1, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `round_history`
--

CREATE TABLE `round_history` (
  `id` bigint(20) NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `mode` varchar(50) NOT NULL DEFAULT 'normal' COMMENT 'easy | normal | hard  (matches DIFFICULTY_IDS)',
  `progression_mode` varchar(50) NOT NULL DEFAULT 'non_ranked' COMMENT 'practice | non_ranked | ranked',
  `score` int(11) NOT NULL DEFAULT 0,
  `hits` int(11) NOT NULL DEFAULT 0,
  `misses` int(11) NOT NULL DEFAULT 0,
  `best_streak` int(11) NOT NULL DEFAULT 0,
  `accuracy_percent` decimal(5,2) NOT NULL DEFAULT 0.00,
  `coins_earned` int(11) NOT NULL DEFAULT 0,
  `xp_earned` int(11) NOT NULL DEFAULT 0,
  `rank_delta` int(11) NOT NULL DEFAULT 0,
  `mmr_after` int(11) NOT NULL DEFAULT 0,
  `level_after` int(11) NOT NULL DEFAULT 1,
  `played_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `coins` bigint(20) NOT NULL DEFAULT 0,
  `total_clicks` bigint(20) NOT NULL DEFAULT 0,
  `xp` int(11) NOT NULL DEFAULT 0,
  `level` int(11) NOT NULL DEFAULT 1,
  `mmr` int(11) NOT NULL DEFAULT 0,
  `rank_tier` varchar(50) NOT NULL DEFAULT 'Unranked',
  `current_button_skin_id` bigint(20) DEFAULT NULL,
  `current_arena_theme_id` bigint(20) DEFAULT NULL,
  `current_profile_theme_id` bigint(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_achievement_progress`
--

CREATE TABLE `user_achievement_progress` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `achievement_id` varchar(60) NOT NULL,
  `current_progress` int(11) NOT NULL DEFAULT 0,
  `is_unlocked` tinyint(1) NOT NULL DEFAULT 0,
  `unlocked_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_collection`
--

CREATE TABLE `user_collection` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `item_type` varchar(50) NOT NULL COMMENT 'button_skin | arena_theme | profile_theme',
  `item_id` bigint(20) NOT NULL,
  `obtained_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `xp_level_thresholds`
--

CREATE TABLE `xp_level_thresholds` (
  `level` int(11) NOT NULL,
  `xp_required` int(11) NOT NULL COMMENT 'XP needed to reach this level from level 1 (cumulative)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `xp_level_thresholds`
--

INSERT INTO `xp_level_thresholds` (`level`, `xp_required`) VALUES
(1, 0),
(2, 100),
(3, 250),
(4, 450),
(5, 700),
(6, 1000),
(7, 1350),
(8, 1750),
(9, 2200),
(10, 2700),
(11, 3250),
(12, 3850),
(13, 4500),
(14, 5200),
(15, 5950),
(16, 6750),
(17, 7600),
(18, 8500),
(19, 9450),
(20, 10450),
(21, 11500),
(22, 12600),
(23, 13750),
(24, 14950),
(25, 16200),
(26, 17500),
(27, 18850),
(28, 20250),
(29, 21700),
(30, 23200),
(31, 24750),
(32, 26350),
(33, 28000),
(34, 29700),
(35, 31450),
(36, 33250),
(37, 35100),
(38, 37000),
(39, 38950),
(40, 40950),
(41, 43000),
(42, 45100),
(43, 47250),
(44, 49450),
(45, 51700),
(46, 54000),
(47, 56350),
(48, 58750),
(49, 61200),
(50, 63700),
(51, 66250),
(52, 68850),
(53, 71500),
(54, 74200),
(55, 76950),
(56, 79750),
(57, 82600),
(58, 85500),
(59, 88450),
(60, 91450),
(61, 94500),
(62, 97600),
(63, 100750),
(64, 103950),
(65, 107200),
(66, 110500),
(67, 113850),
(68, 117250),
(69, 120700),
(70, 124200),
(71, 127750),
(72, 131350),
(73, 135000),
(74, 138700),
(75, 142450),
(76, 146250),
(77, 150100),
(78, 154000),
(79, 157950),
(80, 161950),
(81, 166000),
(82, 170100),
(83, 174250),
(84, 178450),
(85, 182700),
(86, 187000),
(87, 191350),
(88, 195750),
(89, 200200),
(90, 204700),
(91, 209250),
(92, 213850),
(93, 218500),
(94, 223200),
(95, 227950),
(96, 232750),
(97, 237600),
(98, 242500),
(99, 247450),
(100, 252450);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `achievements_catalog`
--
ALTER TABLE `achievements_catalog`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `arena_themes`
--
ALTER TABLE `arena_themes`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `button_skins`
--
ALTER TABLE `button_skins`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `clicks`
--
ALTER TABLE `clicks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_clicks_user` (`user_id`);

--
-- Indexes for table `failed_logins`
--
ALTER TABLE `failed_logins`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `leaderboard`
--
ALTER TABLE `leaderboard`
  ADD PRIMARY KEY (`user_id`),
  ADD KEY `idx_mmr` (`mmr`),
  ADD KEY `idx_level` (`level`);

--
-- Indexes for table `profile_images`
--
ALTER TABLE `profile_images`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `rank_tiers`
--
ALTER TABLE `rank_tiers`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `round_history`
--
ALTER TABLE `round_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_played` (`user_id`,`played_at`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_username` (`username`);

--
-- Indexes for table `user_achievement_progress`
--
ALTER TABLE `user_achievement_progress`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_user_achievement` (`user_id`,`achievement_id`),
  ADD KEY `idx_user_unlocked` (`user_id`,`is_unlocked`),
  ADD KEY `fk_achprog_catalog` (`achievement_id`);

--
-- Indexes for table `user_collection`
--
ALTER TABLE `user_collection`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_user_item` (`user_id`,`item_type`,`item_id`);

--
-- Indexes for table `xp_level_thresholds`
--
ALTER TABLE `xp_level_thresholds`
  ADD PRIMARY KEY (`level`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `arena_themes`
--
ALTER TABLE `arena_themes`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `button_skins`
--
ALTER TABLE `button_skins`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `clicks`
--
ALTER TABLE `clicks`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `failed_logins`
--
ALTER TABLE `failed_logins`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `profile_images`
--
ALTER TABLE `profile_images`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `round_history`
--
ALTER TABLE `round_history`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_achievement_progress`
--
ALTER TABLE `user_achievement_progress`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_collection`
--
ALTER TABLE `user_collection`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `clicks`
--
ALTER TABLE `clicks`
  ADD CONSTRAINT `fk_clicks_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `leaderboard`
--
ALTER TABLE `leaderboard`
  ADD CONSTRAINT `fk_leaderboard_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_achievement_progress`
--
ALTER TABLE `user_achievement_progress`
  ADD CONSTRAINT `fk_achprog_catalog` FOREIGN KEY (`achievement_id`) REFERENCES `achievements_catalog` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_achprog_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_collection`
--
ALTER TABLE `user_collection`
  ADD CONSTRAINT `fk_collection_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
