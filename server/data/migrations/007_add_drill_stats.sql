-- Wave 4: persisted training drill personal bests.
-- Authoritative bootstrap lives in initializeSchema() in playerMysqlDatabase.js.

ALTER TABLE `user_lifetime_stats`
  ADD COLUMN `drill_stats_json` json DEFAULT NULL;
