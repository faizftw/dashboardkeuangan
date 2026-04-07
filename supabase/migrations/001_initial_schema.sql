-- Create ENUMs
CREATE TYPE user_role AS ENUM ('admin', 'pic');
CREATE TYPE target_type AS ENUM ('quantitative', 'qualitative');
CREATE TYPE qualitative_status AS ENUM ('not_started', 'in_progress', 'completed');

-- 1. Profiles Table (extends auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role user_role DEFAULT 'pic',
    whatsapp_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Programs Table
CREATE TABLE programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    pic_name TEXT NOT NULL,
    pic_whatsapp TEXT,
    target_type target_type DEFAULT 'quantitative',
    monthly_target_rp NUMERIC,
    monthly_target_user INTEGER,
    qualitative_description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Periods Table
CREATE TABLE periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    working_days INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(month, year)
);

-- 4. Daily Inputs Table
CREATE TABLE daily_inputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id UUID NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    achievement_rp NUMERIC,
    achievement_user INTEGER,
    qualitative_status qualitative_status,
    notes TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Setup
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_inputs ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can read own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can read all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Programs Policies
CREATE POLICY "Admins can do anything on programs" ON programs
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
CREATE POLICY "PICs can read all active programs" ON programs
    FOR SELECT USING (is_active = true);

-- Periods Policies
CREATE POLICY "Everyone can read periods" ON periods
    FOR SELECT USING (true);
CREATE POLICY "Admins can do anything on periods" ON periods
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Daily Inputs Policies
CREATE POLICY "Everyone can read daily inputs" ON daily_inputs
    FOR SELECT USING (true);
CREATE POLICY "Admins can do anything on daily inputs" ON daily_inputs
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
CREATE POLICY "PICs can insert daily inputs" ON daily_inputs
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'pic')
    );
CREATE POLICY "PICs can update own daily inputs" ON daily_inputs
    FOR UPDATE USING (
        created_by = auth.uid()
    );

-- User Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'pic'::user_role)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Seed Initial Data for April 2026
INSERT INTO periods (month, year, working_days, is_active) VALUES (4, 2026, 30, true);
