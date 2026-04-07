-- Drop Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Drop Policies
DROP POLICY IF EXISTS "PICs can update own daily inputs" ON daily_inputs;
DROP POLICY IF EXISTS "PICs can insert daily inputs" ON daily_inputs;
DROP POLICY IF EXISTS "Admins can do anything on daily inputs" ON daily_inputs;
DROP POLICY IF EXISTS "Everyone can read daily inputs" ON daily_inputs;

DROP POLICY IF EXISTS "Admins can do anything on periods" ON periods;
DROP POLICY IF EXISTS "Everyone can read periods" ON periods;

DROP POLICY IF EXISTS "PICs can read all active programs" ON programs;
DROP POLICY IF EXISTS "Admins can do anything on programs" ON programs;

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;

-- Drop Tables
DROP TABLE IF EXISTS daily_inputs;
DROP TABLE IF EXISTS periods;
DROP TABLE IF EXISTS programs;
DROP TABLE IF EXISTS profiles;

-- Drop ENUMs
DROP TYPE IF EXISTS qualitative_status;
DROP TYPE IF EXISTS target_type;
DROP TYPE IF EXISTS user_role;
