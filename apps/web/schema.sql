-- Run this file in your Supabase SQL Editor

-- 1. Create Core Users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    avatar_url TEXT,
    class_name VARCHAR(50) DEFAULT 'Novice',
    
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

-- Set up Row Level Security (RLS) policies 
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for now to bootstrap MVP (In production, bind to auth.uid())
CREATE POLICY "Enable all for public" ON public.users FOR ALL USING (true);
CREATE POLICY "Enable all for public" ON public.character_stats FOR ALL USING (true);
CREATE POLICY "Enable all for public" ON public.activity_logs FOR ALL USING (true);
