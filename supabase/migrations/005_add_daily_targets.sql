-- Add new columns for explicitly storing daily target limits
ALTER TABLE programs ADD COLUMN daily_target_rp NUMERIC;
ALTER TABLE programs ADD COLUMN daily_target_user INTEGER;
