ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `rank_system_version` int(11) NOT NULL DEFAULT 2 AFTER `mmr`,
  ADD COLUMN IF NOT EXISTS `placement_matches_played` int(11) NOT NULL DEFAULT 0 AFTER `rank_system_version`,
  ADD COLUMN IF NOT EXISTS `demotion_protection_rounds` int(11) NOT NULL DEFAULT 0 AFTER `placement_matches_played`;
