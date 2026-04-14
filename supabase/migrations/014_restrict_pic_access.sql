-- ============================================================
-- Migration 014: Restrict PIC Access
-- Tightening RLS for programs, daily_inputs, and milestone_completions
-- ============================================================

-- ─── programs ────────────────────────────────────────────────────────────

-- 1. Drop the old loose policy
DROP POLICY IF EXISTS "PICs can read all active programs" ON programs;

-- 2. Create tighter select policy for PICs
CREATE POLICY "PICs can read assigned programs only"
  ON programs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM program_pics
      WHERE program_pics.program_id = programs.id
      AND program_pics.profile_id = auth.uid()
    )
  );


-- ─── daily_inputs ─────────────────────────────────────────────────────────

-- 1. Drop old insert policy
DROP POLICY IF EXISTS "PICs can insert daily inputs" ON daily_inputs;

-- 2. Create tighter insert policy
CREATE POLICY "PICs can insert own program inputs"
  ON daily_inputs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM program_pics
      WHERE program_pics.program_id = daily_inputs.program_id
      AND program_pics.profile_id = auth.uid()
    )
  );

-- 3. Update existing UPDATE policy to be safer (just in case)
DROP POLICY IF EXISTS "PICs can update own daily inputs" ON daily_inputs;
CREATE POLICY "PICs can update own program inputs"
  ON daily_inputs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR
    (
      created_by = auth.uid() AND
      EXISTS (
        SELECT 1 FROM program_pics
        WHERE program_pics.program_id = daily_inputs.program_id
        AND program_pics.profile_id = auth.uid()
      )
    )
  );


-- ─── milestone_completions ───────────────────────────────────────────────

ALTER TABLE milestone_completions ENABLE ROW LEVEL SECURITY;

-- 1. Admin can do anything
DROP POLICY IF EXISTS "Admin can do anything on milestones" ON milestone_completions;
CREATE POLICY "Admin can do anything on milestones"
  ON milestone_completions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 2. PIC can read milestone completions for their programs
DROP POLICY IF EXISTS "PIC can read assigned milestone completions" ON milestone_completions;
CREATE POLICY "PIC can read assigned milestone completions"
  ON milestone_completions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM program_milestones pm
      JOIN program_pics pp ON pp.program_id = pm.program_id
      WHERE pm.id = milestone_completions.milestone_id
      AND pp.profile_id = auth.uid()
    )
  );

-- 3. PIC can upsert milestone completions for their programs
DROP POLICY IF EXISTS "PIC can upsert assigned milestone completions" ON milestone_completions;
CREATE POLICY "PIC can upsert assigned milestone completions"
  ON milestone_completions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM program_milestones pm
      JOIN program_pics pp ON pp.program_id = pm.program_id
      WHERE pm.id = milestone_completions.milestone_id
      AND pp.profile_id = auth.uid()
    )
  );

-- ─── Rollback ────────────────────────────────────────────────────────────
-- DROP POLICY IF EXISTS "PICs can read assigned programs only" ON programs;
-- CREATE POLICY "PICs can read all active programs" ON programs FOR SELECT USING (is_active = true);
-- DROP POLICY IF EXISTS "PICs can insert own program inputs" ON daily_inputs;
-- CREATE POLICY "PICs can insert daily inputs" ON daily_inputs FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'pic'));
-- DROP POLICY IF EXISTS "PICs can update own program inputs" ON daily_inputs;
-- CREATE POLICY "PICs can update own daily inputs" ON daily_inputs FOR UPDATE USING (created_by = auth.uid());
