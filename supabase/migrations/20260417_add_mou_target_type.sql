-- Migration: Add 'mou' to target_type enum
-- Rollback: Impossible to remove enum value in PG, must rename or recreate type.

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'target_type' AND e.enumlabel = 'mou') THEN
        ALTER TYPE target_type ADD VALUE 'mou';
    END IF;
END $$;
