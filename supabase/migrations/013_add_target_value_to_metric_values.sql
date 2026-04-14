-- ============================================================
-- Migration 013: Add target_value to daily_metric_values
-- ============================================================

-- Add target_value column to store daily targets for metrics
ALTER TABLE daily_metric_values
ADD COLUMN IF NOT EXISTS target_value NUMERIC;

-- Target value doesn't require a separate unique constraint as the existing 
-- UNIQUE(period_id, program_id, metric_definition_id, date) already covers the pair.

COMMENT ON COLUMN daily_metric_values.target_value IS 'Planned target for this metric on this specific date. Overrides pro-rata distribution of monthly_target.';

-- Rollback:
-- ALTER TABLE daily_metric_values DROP COLUMN IF EXISTS target_value;
