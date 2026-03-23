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

-- ═══════════════════════════════════════════════════════════════════════
-- Row Level Security Policies (Production-Ready)
-- Ogni utente può leggere/scrivere SOLO le proprie righe.
-- ═══════════════════════════════════════════════════════════════════════

-- Users: un utente può vedere e modificare solo se stesso
DROP POLICY IF EXISTS "Users: own read" ON public.users;
CREATE POLICY "Users: own read" ON public.users FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users: own write" ON public.users;
CREATE POLICY "Users: own write" ON public.users FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users: insert self" ON public.users;
CREATE POLICY "Users: insert self" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Character Stats
DROP POLICY IF EXISTS "Stats: own access" ON public.character_stats;
CREATE POLICY "Stats: own access" ON public.character_stats FOR ALL USING (auth.uid() = user_id);

-- Activity Logs
DROP POLICY IF EXISTS "Logs: own access" ON public.activity_logs;
CREATE POLICY "Logs: own access" ON public.activity_logs FOR ALL USING (auth.uid() = user_id);

-- Skills (catalogo leggibile da tutti, insert solo per se stessi)
DROP POLICY IF EXISTS "Enable all for public" ON public.skills;
CREATE POLICY "Skills: public read" ON public.skills FOR SELECT USING (true);

-- User Skills
DROP POLICY IF EXISTS "Enable all for public" ON public.user_skills;
CREATE POLICY "User Skills: own access" ON public.user_skills FOR ALL USING (auth.uid() = user_id);

-- Achievements
DROP POLICY IF EXISTS "Enable all for public" ON public.achievements;
CREATE POLICY "Achievements: own access" ON public.achievements FOR ALL USING (auth.uid() = user_id);

-- Goals
DROP POLICY IF EXISTS "Enable all for public" ON public.goals;
CREATE POLICY "Goals: own access" ON public.goals FOR ALL USING (auth.uid() = user_id);

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
-- Le lobby sono leggibili da ogni utente autenticato (per la lista)
DROP POLICY IF EXISTS "Lobbies: auth read" ON public.sanctum_lobbies;
CREATE POLICY "Lobbies: auth read" ON public.sanctum_lobbies FOR SELECT USING (auth.uid() IS NOT NULL);
-- Solo l'host può inserire/modificare/cancellare la propria lobby
DROP POLICY IF EXISTS "Lobbies: host write" ON public.sanctum_lobbies;
CREATE POLICY "Lobbies: host write" ON public.sanctum_lobbies FOR INSERT WITH CHECK (auth.uid() = host_id);
DROP POLICY IF EXISTS "Lobbies: host update" ON public.sanctum_lobbies;
CREATE POLICY "Lobbies: host update" ON public.sanctum_lobbies FOR UPDATE USING (auth.uid() = host_id);
DROP POLICY IF EXISTS "Lobbies: host delete" ON public.sanctum_lobbies;
CREATE POLICY "Lobbies: host delete" ON public.sanctum_lobbies FOR DELETE USING (auth.uid() = host_id);

-- Enable Realtime (idempotent)
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sanctum_lobbies;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
