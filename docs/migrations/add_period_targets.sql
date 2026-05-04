-- Migration: Add period-specific target snapshot columns to program_period_settings
-- This allows historical target values to be stored per period, preventing
-- "active period target leaking into historical date range filter" bug.
--
-- Run this on Supabase SQL Editor.
-- Rollback: See bottom of this file.

-- ============================================================
-- UP MIGRATION
-- ============================================================

ALTER TABLE program_period_settings
  ADD COLUMN IF NOT EXISTS monthly_target_rp      numeric   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS monthly_target_user     integer   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS daily_target_rp         numeric   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS daily_target_user       integer   DEFAULT NULL;

-- Optional: snapshot the CURRENT active-period targets into any existing
-- program_period_settings rows that don't yet have values.
-- Adjust the WHERE clause to the period you want to backfill.
--
-- UPDATE program_period_settings pps
-- SET
--   monthly_target_rp   = p.monthly_target_rp,
--   monthly_target_user = p.monthly_target_user,
--   daily_target_rp     = p.daily_target_rp,
--   daily_target_user   = p.daily_target_user
-- FROM programs p
-- WHERE pps.program_id = p.id
--   AND pps.monthly_target_rp IS NULL;

-- ============================================================
-- ROLLBACK
-- ============================================================
-- ALTER TABLE program_period_settings
--   DROP COLUMN IF EXISTS monthly_target_rp,
--   DROP COLUMN IF EXISTS monthly_target_user,
--   DROP COLUMN IF EXISTS daily_target_rp,
--   DROP COLUMN IF EXISTS daily_target_user;
