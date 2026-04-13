-- ============================================================
-- Migration 010: RLS Policies for New Tables
-- Run this in Supabase SQL Editor AFTER 009
-- ============================================================

-- Enable RLS on new tables
ALTER TABLE program_metric_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_metric_values ENABLE ROW LEVEL SECURITY;

-- ─── program_metric_definitions ────────────────────────────────────────────

-- All authenticated users can read metric definitions
CREATE POLICY "Authenticated can read metric definitions"
  ON program_metric_definitions
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admin can insert metric definitions
CREATE POLICY "Admin can insert metric definitions"
  ON program_metric_definitions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admin can update metric definitions
CREATE POLICY "Admin can update metric definitions"
  ON program_metric_definitions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admin can delete metric definitions
CREATE POLICY "Admin can delete metric definitions"
  ON program_metric_definitions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ─── daily_metric_values ───────────────────────────────────────────────────

-- Admin can read all daily metric values
CREATE POLICY "Admin can read all daily metric values"
  ON daily_metric_values
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- PIC can read daily metric values for programs they belong to
CREATE POLICY "PIC can read own program metric values"
  ON daily_metric_values
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM program_pics
      WHERE program_pics.program_id = daily_metric_values.program_id
      AND program_pics.profile_id = auth.uid()
    )
  );

-- Admin can insert daily metric values
CREATE POLICY "Admin can insert daily metric values"
  ON daily_metric_values
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- PIC can insert daily metric values for their programs
CREATE POLICY "PIC can insert own program metric values"
  ON daily_metric_values
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM program_pics
      WHERE program_pics.program_id = daily_metric_values.program_id
      AND program_pics.profile_id = auth.uid()
    )
  );

-- Admin can update daily metric values
CREATE POLICY "Admin can update daily metric values"
  ON daily_metric_values
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- PIC can update daily metric values for their programs
CREATE POLICY "PIC can update own program metric values"
  ON daily_metric_values
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM program_pics
      WHERE program_pics.program_id = daily_metric_values.program_id
      AND program_pics.profile_id = auth.uid()
    )
  );

-- Admin can delete daily metric values
CREATE POLICY "Admin can delete daily metric values"
  ON daily_metric_values
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Rollback:
-- DROP POLICY IF EXISTS "Authenticated can read metric definitions" ON program_metric_definitions;
-- DROP POLICY IF EXISTS "Admin can insert metric definitions" ON program_metric_definitions;
-- DROP POLICY IF EXISTS "Admin can update metric definitions" ON program_metric_definitions;
-- DROP POLICY IF EXISTS "Admin can delete metric definitions" ON program_metric_definitions;
-- DROP POLICY IF EXISTS "Admin can read all daily metric values" ON daily_metric_values;
-- DROP POLICY IF EXISTS "PIC can read own program metric values" ON daily_metric_values;
-- DROP POLICY IF EXISTS "Admin can insert daily metric values" ON daily_metric_values;
-- DROP POLICY IF EXISTS "PIC can insert own program metric values" ON daily_metric_values;
-- DROP POLICY IF EXISTS "Admin can update daily metric values" ON daily_metric_values;
-- DROP POLICY IF EXISTS "PIC can update own program metric values" ON daily_metric_values;
-- DROP POLICY IF EXISTS "Admin can delete daily metric values" ON daily_metric_values;
