-- Migration: add buildcraft loadouts and round loadout snapshots
-- Applied: 2026-04-02 | Environment: local dev

ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `active_loadout_slot` varchar(20) NOT NULL DEFAULT 'loadout_1' AFTER `current_profile_theme_id`;

CREATE TABLE IF NOT EXISTS `user_loadouts` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `slot_id` varchar(20) NOT NULL,
  `name` varchar(32) NOT NULL,
  `tempo_core_id` varchar(50) NOT NULL,
  `streak_lens_id` varchar(50) NOT NULL,
  `power_rig_id` varchar(50) NOT NULL,
  `powerup_slot_1_id` varchar(50) NOT NULL,
  `powerup_slot_2_id` varchar(50) NOT NULL,
  `powerup_slot_3_id` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_loadout_slot` (`user_id`, `slot_id`),
  CONSTRAINT `fk_user_loadouts_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE `round_history`
  ADD COLUMN IF NOT EXISTS `loadout_name` varchar(32) DEFAULT NULL AFTER `rank_delta`,
  ADD COLUMN IF NOT EXISTS `loadout_id` varchar(20) DEFAULT NULL AFTER `loadout_name`,
  ADD COLUMN IF NOT EXISTS `tempo_core_id` varchar(50) DEFAULT NULL AFTER `loadout_id`,
  ADD COLUMN IF NOT EXISTS `streak_lens_id` varchar(50) DEFAULT NULL AFTER `tempo_core_id`,
  ADD COLUMN IF NOT EXISTS `power_rig_id` varchar(50) DEFAULT NULL AFTER `streak_lens_id`,
  ADD COLUMN IF NOT EXISTS `powerup_slot_1_id` varchar(50) DEFAULT NULL AFTER `power_rig_id`,
  ADD COLUMN IF NOT EXISTS `powerup_slot_2_id` varchar(50) DEFAULT NULL AFTER `powerup_slot_1_id`,
  ADD COLUMN IF NOT EXISTS `powerup_slot_3_id` varchar(50) DEFAULT NULL AFTER `powerup_slot_2_id`;
