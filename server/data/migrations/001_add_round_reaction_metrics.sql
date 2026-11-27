-- Migration: 001_add_round_reaction_metrics.sql
-- Purpose: add persisted reaction time metrics to round_history for history and
-- profile stats.
-- Reviewed: 2026-04-02
-- Applied status:
--   local: unverified
--   staging: unknown / not tracked
--   production: unknown / not tracked
-- Bootstrap note:
--   The old MySQL schema snapshot (clickaway.sql, removed; see git history)
--   already included these columns for fresh environments. Run this migration
--   only against databases created before that schema update.
-- Reversible:
--   manual only, and potentially destructive if reaction data exists:
--   ALTER TABLE `round_history`
--     DROP COLUMN `best_reaction_ms`,
--     DROP COLUMN `avg_reaction_ms`;

ALTER TABLE `round_history`
  ADD COLUMN IF NOT EXISTS `avg_reaction_ms` int(11) DEFAULT NULL AFTER `best_streak`,
  ADD COLUMN IF NOT EXISTS `best_reaction_ms` int(11) DEFAULT NULL AFTER `avg_reaction_ms`;
