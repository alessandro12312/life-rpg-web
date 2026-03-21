-- Run this file in your Supabase SQL Editor

-- 1. Create Core Users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    avatar_url TEXT,
    avatar_id TEXT,
    class_name VARCHAR(50) DEFAULT 'Novice',
    race VARCHAR(50) DEFAULT 'Human',
    
    -- Progression
    level INTEGER DEFAULT 1,
    xp_current BIGINT DEFAULT 0,
    xp_to_next BIGINT DEFAULT 1000,
    
    -- Econ/Streak
    skill_points INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    highest_streak INTEGER DEFAULT 0,
    last_login_date DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.5 Skill Tree
CREATE TABLE IF NOT EXISTS public.skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    required_level INTEGER DEFAULT 1,
    cost_in_sp INTEGER DEFAULT 1,
    category VARCHAR(50) -- e.g., 'FOCUS', 'LEARNING', 'ENDURANCE'
);

CREATE TABLE IF NOT EXISTS public.user_skills (
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, skill_id)
);


-- 2. Create Character Stats
CREATE TABLE IF NOT EXISTS public.character_stats (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    
    intelligence DECIMAL(10, 2) DEFAULT 1.00,
    strength DECIMAL(10, 2) DEFAULT 1.00,
    endurance DECIMAL(10, 2) DEFAULT 1.00,
    discipline DECIMAL(10, 2) DEFAULT 1.00,
    focus DECIMAL(10, 2) DEFAULT 1.00,
    knowledge DECIMAL(10, 2) DEFAULT 1.00,
    health DECIMAL(10, 2) DEFAULT 1.00,
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enum for Activities
DO $$ BEGIN
    CREATE TYPE activity_category AS ENUM ('STUDY', 'WORKOUT', 'MIXED', 'CUSTOM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. Create Activity Logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    
    category activity_category NOT NULL,
    custom_name VARCHAR(100),
    
    duration_minutes INTEGER NOT NULL,
    intensity_multiplier DECIMAL(3, 2) DEFAULT 1.00,
    xp_yield BIGINT NOT NULL,
    stats_yield JSONB, 
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_user_date ON public.activity_logs (user_id, created_at);

-- 5. Achievement System
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- 6. Goal Tracking
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    target_minutes INTEGER NOT NULL,
    current_minutes INTEGER DEFAULT 0,
    deadline DATE,
    completed BOOLEAN DEFAULT FALSE,
    xp_reward INTEGER DEFAULT 200,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Set up Row Level Security (RLS) policies 
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for now to bootstrap MVP (In production, bind to auth.uid())
DROP POLICY IF EXISTS "Enable all for public" ON public.users;
CREATE POLICY "Enable all for public" ON public.users FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all for public" ON public.character_stats;
CREATE POLICY "Enable all for public" ON public.character_stats FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all for public" ON public.activity_logs;
CREATE POLICY "Enable all for public" ON public.activity_logs FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all for public" ON public.skills;
CREATE POLICY "Enable all for public" ON public.skills FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all for public" ON public.user_skills;
CREATE POLICY "Enable all for public" ON public.user_skills FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all for public" ON public.achievements;
CREATE POLICY "Enable all for public" ON public.achievements FOR ALL USING (true);

DROP POLICY IF EXISTS "Enable all for public" ON public.goals;
CREATE POLICY "Enable all for public" ON public.goals FOR ALL USING (true);

-- MVP Seed Skills
INSERT INTO public.skills (id, name, description, required_level, cost_in_sp, category) 
VALUES 
('d501b80d-6e41-4c6e-89da-5a02e6e2aa01', 'Focus del Monaco', '+10% bonus XP sulle attività di tipo STUDY o FOCUS.', 5, 2, 'FOCUS'),
('2d0bd705-baaf-4aa9-94b2-cbf3906161c1', 'Recupero Muscolare', '+10% XP durante gli allenamenti.', 3, 1, 'ENDURANCE')
ON CONFLICT DO NOTHING;

-- Migrations per Character Creation
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS race VARCHAR(50) DEFAULT 'Human';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_id TEXT;

-- 7. Sanctum Lobbies
CREATE TABLE IF NOT EXISTS public.sanctum_lobbies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    max_participants INT DEFAULT 4,
    is_private BOOLEAN DEFAULT false,
    password VARCHAR(255),
    focus_duration INT DEFAULT 25,
    break_duration INT DEFAULT 5,
    host_id UUID REFERENCES public.users(id),
    status VARCHAR(50) DEFAULT 'WAITING', -- WAITING, FOCUSING, BREAK
    started_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sanctum_lobbies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for public" ON public.sanctum_lobbies;
CREATE POLICY "Enable all for public" ON public.sanctum_lobbies FOR ALL USING (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.sanctum_lobbies;

