-- ============================================================
-- Migration 008: Add Department Column to Programs
-- Run this in Supabase SQL Editor
-- ============================================================

ALTER TABLE programs
ADD COLUMN IF NOT EXISTS department TEXT NOT NULL DEFAULT 'general';

-- Add a check constraint for valid department values
ALTER TABLE programs
ADD CONSTRAINT programs_department_check
CHECK (department IN (
  'sales_marketing',
  'operations',
  'creative',
  'web_it',
  'general_affair',
  'customer_service',
  'hr',
  'general'
));

-- Rollback:
-- ALTER TABLE programs DROP CONSTRAINT IF EXISTS programs_department_check;
-- ALTER TABLE programs DROP COLUMN IF EXISTS department;
