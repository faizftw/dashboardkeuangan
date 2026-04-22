-- Migration: Add prospek_drop column to daily_inputs
-- Phase 1 - MoU System Improvements

ALTER TABLE daily_inputs ADD COLUMN prospek_drop INTEGER DEFAULT 0 NOT NULL;

-- Sync existing labels for MoU programs
UPDATE program_metric_definitions 
SET label = 'Konversi Kumulatif' 
WHERE label = 'Lead to MoU Rate';

-- Rollback:
-- UPDATE program_metric_definitions SET label = 'Lead to MoU Rate' WHERE label = 'Konversi Kumulatif';
-- ALTER TABLE daily_inputs DROP COLUMN prospek_drop;
