-- Migration 016: Unify Legacy Targets into Metric Definitions
-- This ensures all programs use the same variable system for Revenue and User Acquisition.

-- 1. Insert 'revenue' metric for programs with legacy RP targets
INSERT INTO program_metric_definitions (
  program_id,
  metric_key,
  label,
  data_type,
  input_type,
  is_target_metric,
  monthly_target,
  unit_label,
  display_order,
  metric_group,
  is_primary
)
SELECT 
  id as program_id,
  'revenue' as metric_key,
  'Omzet' as label,
  'currency' as data_type,
  'manual' as input_type,
  true as is_target_metric,
  COALESCE(monthly_target_rp, 0) as monthly_target,
  'Rp' as unit_label,
  1 as display_order,
  'revenue' as metric_group,
  true as is_primary
FROM programs
ON CONFLICT (program_id, metric_key) DO UPDATE 
SET 
  monthly_target = CASE 
    WHEN (program_metric_definitions.monthly_target = 0 OR program_metric_definitions.monthly_target IS NULL) 
    AND EXCLUDED.monthly_target > 0 
    THEN EXCLUDED.monthly_target 
    ELSE program_metric_definitions.monthly_target 
  END;

-- 2. Insert 'user_count' metric for programs with legacy User targets
INSERT INTO program_metric_definitions (
  program_id,
  metric_key,
  label,
  data_type,
  input_type,
  is_target_metric,
  monthly_target,
  unit_label,
  display_order,
  metric_group,
  is_primary
)
SELECT 
  id as program_id,
  'user_count' as metric_key,
  'Closing' as label,
  'integer' as data_type,
  'manual' as input_type,
  true as is_target_metric,
  COALESCE(monthly_target_user, 0) as monthly_target,
  'user' as unit_label,
  2 as display_order,
  'user_acquisition' as metric_group,
  true as is_primary
FROM programs
ON CONFLICT (program_id, metric_key) DO UPDATE 
SET 
  monthly_target = CASE 
    WHEN (program_metric_definitions.monthly_target = 0 OR program_metric_definitions.monthly_target IS NULL) 
    AND EXCLUDED.monthly_target > 0 
    THEN EXCLUDED.monthly_target 
    ELSE program_metric_definitions.monthly_target 
  END;

-- 3. Data Migration: Copy achievement data from daily_inputs to daily_metric_values
-- This ensures existing history is visible in the metrics system.

-- Migrate Revenue (achievement_rp)
INSERT INTO daily_metric_values (
  period_id,
  program_id,
  metric_definition_id,
  date,
  value,
  created_by
)
SELECT 
  di.period_id,
  di.program_id,
  pmd.id as metric_definition_id,
  di.date,
  di.achievement_rp as value,
  di.created_by
FROM daily_inputs di
JOIN program_metric_definitions pmd ON pmd.program_id = di.program_id AND pmd.metric_key = 'revenue'
WHERE di.achievement_rp > 0
ON CONFLICT (period_id, program_id, metric_definition_id, date) DO UPDATE
SET value = EXCLUDED.value;

-- Migrate User Count (achievement_user)
INSERT INTO daily_metric_values (
  period_id,
  program_id,
  metric_definition_id,
  date,
  value,
  created_by
)
SELECT 
  di.period_id,
  di.program_id,
  pmd.id as metric_definition_id,
  di.date,
  di.achievement_user as value,
  di.created_by
FROM daily_inputs di
JOIN program_metric_definitions pmd ON pmd.program_id = di.program_id AND pmd.metric_key = 'user_count'
WHERE di.achievement_user > 0
ON CONFLICT (period_id, program_id, metric_definition_id, date) DO UPDATE
SET value = EXCLUDED.value;
