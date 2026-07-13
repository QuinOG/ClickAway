-- Phase 11: unlock ceremony seen-state, so a part's reveal plays once.
-- Authoritative bootstrap lives in initializeSchema() in playerMysqlDatabase.js.

ALTER TABLE `users`
  ADD COLUMN `seen_unlock_part_ids_json` json DEFAULT NULL;
