-- Add is_locked column to periods table
ALTER TABLE periods ADD COLUMN is_locked BOOLEAN DEFAULT false;

-- Policy to allow admins to update is_locked (already covered by "Admins can do anything on periods")
-- but we ensure it's there.
