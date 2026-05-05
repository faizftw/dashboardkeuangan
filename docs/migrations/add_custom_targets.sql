-- ============================================================
-- UP MIGRATION
-- ============================================================

ALTER TABLE program_period_settings
  ADD COLUMN IF NOT EXISTS custom_targets jsonb DEFAULT NULL;

-- Optional Backfill for custom targets:
-- Mengisi custom_targets dengan JSON berisi target saat ini dari program_metric_definitions.
UPDATE program_period_settings pps
SET custom_targets = (
  SELECT jsonb_object_agg(pmd.metric_key, pmd.monthly_target)
  FROM program_metric_definitions pmd
  WHERE pmd.program_id = pps.program_id 
    AND pmd.is_target_metric = true 
    AND pmd.monthly_target IS NOT NULL
)
WHERE custom_targets IS NULL;

-- ============================================================
-- ROLLBACK
-- ============================================================
-- ALTER TABLE program_period_settings
--   DROP COLUMN IF EXISTS custom_targets;
