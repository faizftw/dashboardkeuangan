-- ============================================================
-- Migration 012: Add is_primary to program_metric_definitions
-- Run this in Supabase SQL Editor
-- ============================================================
-- 
-- is_primary = true  → Primary metric (basis Health Score)
--                      Tampil di progress bar program cards
-- is_primary = false → Secondary metric (informatif, tidak masuk Health Score)
--                      Tampil sebagai chip kecil di bawah card
--

ALTER TABLE program_metric_definitions
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT false;

-- Update existing data based on metric_key
-- omzet + closing = advertising template primary metrics
-- revenue + user_count = sales_basic template primary metrics
UPDATE program_metric_definitions
SET is_primary = true
WHERE metric_key IN ('revenue', 'user_count', 'omzet', 'closing');

-- Rollback:
-- ALTER TABLE program_metric_definitions DROP COLUMN IF EXISTS is_primary;
