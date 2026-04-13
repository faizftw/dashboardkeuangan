-- Migration 012: Add metric_group to program_metric_definitions
-- Tujuan: Mendukung agregasi metrik lintas program berdasarkan kelompok metrik yang setara (misal semua omzet digabung ke 'revenue')

BEGIN;

DO $$ 
BEGIN
    -- 1. Menambahkan kolom metric_group
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'program_metric_definitions' AND column_name = 'metric_group'
    ) THEN
        ALTER TABLE program_metric_definitions
        ADD COLUMN metric_group TEXT DEFAULT NULL;
    END IF;
END $$;

-- 2. Backfill (Pembaruan data untuk template yang sudah ada agar terhubung dengan agregatur global)
UPDATE program_metric_definitions SET metric_group = 'leads' WHERE metric_key IN ('lead_masuk', 'tiket_masuk');
UPDATE program_metric_definitions SET metric_group = 'ad_spend' WHERE metric_key = 'budget_iklan';
UPDATE program_metric_definitions SET metric_group = 'user_acquisition' WHERE metric_key IN ('closing', 'user_count', 'tiket_selesai');
UPDATE program_metric_definitions SET metric_group = 'revenue' WHERE metric_key IN ('omzet', 'revenue');
UPDATE program_metric_definitions SET metric_group = 'conversion' WHERE metric_key IN ('conversion_rate', 'resolution_rate');
UPDATE program_metric_definitions SET metric_group = 'efficiency' WHERE metric_key = 'roas';
-- cpp_real is intentionally left as NULL as it is standalone.

COMMIT;

-- ==========================================
-- ROLLBACK SCRIPT (Jika ingin membatalkan)
-- ==========================================
/*
BEGIN;
ALTER TABLE program_metric_definitions DROP COLUMN IF EXISTS metric_group;
COMMIT;
*/
