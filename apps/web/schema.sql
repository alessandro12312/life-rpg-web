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
    stat_points INTEGER DEFAULT 0,
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

-- ═══════════════════════════════════════════════════════════════════════
-- 8. Guild / Party System
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.guilds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    banner_url TEXT,
    motto VARCHAR(100),
    leader_id UUID NOT NULL REFERENCES public.users(id),
    level INTEGER DEFAULT 1,
    xp_current BIGINT DEFAULT 0,
    max_members INTEGER DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.guild_members (
    guild_id UUID REFERENCES public.guilds(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'MEMBER',  -- LEADER, OFFICER, MEMBER
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.guild_quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,           -- STUDY, WORKOUT, MIXED
    target_minutes INTEGER NOT NULL,  -- obiettivo collettivo in minuti
    current_minutes INTEGER DEFAULT 0,
    xp_reward INTEGER DEFAULT 500,
    week_start DATE NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(guild_id, week_start, category)
);

-- RLS: guilds
ALTER TABLE public.guilds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Guilds: auth read" ON public.guilds;
CREATE POLICY "Guilds: auth read" ON public.guilds FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Guilds: leader insert" ON public.guilds;
CREATE POLICY "Guilds: leader insert" ON public.guilds FOR INSERT WITH CHECK (auth.uid() = leader_id);
DROP POLICY IF EXISTS "Guilds: leader update" ON public.guilds;
CREATE POLICY "Guilds: leader update" ON public.guilds FOR UPDATE USING (auth.uid() = leader_id);
DROP POLICY IF EXISTS "Guilds: leader delete" ON public.guilds;
CREATE POLICY "Guilds: leader delete" ON public.guilds FOR DELETE USING (auth.uid() = leader_id);

-- RLS: guild_members
ALTER TABLE public.guild_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "GuildMembers: auth read" ON public.guild_members;
CREATE POLICY "GuildMembers: auth read" ON public.guild_members FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "GuildMembers: self insert" ON public.guild_members;
CREATE POLICY "GuildMembers: self insert" ON public.guild_members FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "GuildMembers: self or leader delete" ON public.guild_members;
CREATE POLICY "GuildMembers: self or leader delete" ON public.guild_members FOR DELETE USING (
    auth.uid() = user_id OR
    auth.uid() IN (SELECT leader_id FROM public.guilds WHERE id = guild_id)
);

-- RLS: guild_quests (gestite dal backend via Service Role, ma leggibili dai membri)
ALTER TABLE public.guild_quests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "GuildQuests: auth read" ON public.guild_quests;
CREATE POLICY "GuildQuests: auth read" ON public.guild_quests FOR SELECT USING (auth.uid() IS NOT NULL);

-- Realtime per guilds e guild_members
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.guilds;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.guild_members;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- 9. Battle System — Turn-Based Combat
-- ═══════════════════════════════════════════════════════════════════════

-- 9a. Boss Templates: definizioni dei boss (creati dall'utente o dal sistema)
CREATE TABLE IF NOT EXISTS public.bosses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES public.users(id) ON DELETE SET NULL,

    -- Identity
    name VARCHAR(100) NOT NULL,
    description TEXT,
    boss_type VARCHAR(20) DEFAULT 'GOAL',   -- GOAL, TRAINING, RAID
    tier INTEGER DEFAULT 1,                 -- 1-5, scales with difficulty

    -- Scaling params (server computes HP/ATK/DEF from these)
    difficulty_factor DECIMAL(5,2) DEFAULT 1.0,
    phase_count INTEGER DEFAULT 1,          -- Number of phases (1-3)

    -- Computed base stats (set by server at creation time)
    base_hp INTEGER NOT NULL DEFAULT 500,
    base_atk INTEGER NOT NULL DEFAULT 30,
    base_def INTEGER NOT NULL DEFAULT 15,

    -- Rewards
    xp_reward INTEGER DEFAULT 200,
    loot_table JSONB DEFAULT '[]',

    -- Relations
    source_goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
    is_template BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9b. Battle Instances: a single combat session
CREATE TABLE IF NOT EXISTS public.battles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    boss_id UUID NOT NULL REFERENCES public.bosses(id) ON DELETE CASCADE,

    -- State
    status VARCHAR(20) DEFAULT 'WAITING',    -- WAITING, ACTIVE, VICTORY, DEFEAT, ABANDONED
    mode VARCHAR(20) DEFAULT 'SOLO',         -- SOLO, PARTY, RAID
    current_phase INTEGER DEFAULT 1,
    current_turn INTEGER DEFAULT 1,

    -- Live boss stats (for current phase)
    boss_current_hp INTEGER NOT NULL,
    boss_max_hp INTEGER NOT NULL,
    boss_atk INTEGER NOT NULL,
    boss_def INTEGER NOT NULL,

    -- Turn tracking
    active_participant_id UUID,
    turn_deadline TIMESTAMPTZ,

    -- Timestamps
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9c. Battle Participants: who is in the battle
CREATE TABLE IF NOT EXISTS public.battle_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    battle_id UUID NOT NULL REFERENCES public.battles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- Combat stats (snapshot at join time, derived from level/class/race/stats)
    max_hp INTEGER NOT NULL,
    current_hp INTEGER NOT NULL,
    atk INTEGER NOT NULL,
    def INTEGER NOT NULL,
    spd INTEGER NOT NULL,

    -- Resources
    mana INTEGER DEFAULT 100,
    max_mana INTEGER DEFAULT 100,

    -- Status
    is_defending BOOLEAN DEFAULT false,
    status_effects JSONB DEFAULT '[]',
    turn_order INTEGER DEFAULT 0,

    -- Rewards received
    xp_earned INTEGER DEFAULT 0,

    UNIQUE(battle_id, user_id)
);

-- 9d. Battle Log: move history for replay and validation
CREATE TABLE IF NOT EXISTS public.battle_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    battle_id UUID NOT NULL REFERENCES public.battles(id) ON DELETE CASCADE,
    turn_number INTEGER NOT NULL,

    -- Action
    actor_type VARCHAR(10) NOT NULL,         -- PLAYER | BOSS
    actor_id UUID,                           -- user_id if PLAYER, NULL if BOSS
    action_type VARCHAR(20) NOT NULL,        -- ATTACK, SKILL, DEFEND, ITEM, BOSS_ATTACK
    skill_id VARCHAR(50),
    target_type VARCHAR(10),                 -- PLAYER | BOSS
    target_id UUID,

    -- Result
    damage_dealt INTEGER DEFAULT 0,
    damage_blocked INTEGER DEFAULT 0,
    healing_done INTEGER DEFAULT 0,
    is_critical BOOLEAN DEFAULT false,
    is_miss BOOLEAN DEFAULT false,

    -- Narrative
    narrative TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9e. Player Inventory: consumables for battle
CREATE TABLE IF NOT EXISTS public.player_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    item_id VARCHAR(50) NOT NULL,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, item_id)
);

-- Indexes for battle system
CREATE INDEX IF NOT EXISTS idx_battles_status ON public.battles (status);
CREATE INDEX IF NOT EXISTS idx_battle_participants_battle ON public.battle_participants (battle_id);
CREATE INDEX IF NOT EXISTS idx_battle_participants_user ON public.battle_participants (user_id);
CREATE INDEX IF NOT EXISTS idx_battle_logs_battle ON public.battle_logs (battle_id, turn_number);
CREATE INDEX IF NOT EXISTS idx_bosses_creator ON public.bosses (creator_id);

-- ═══════════════════════════════════════════════════════════════════════
-- RLS: Battle System
-- ═══════════════════════════════════════════════════════════════════════

-- Bosses: readable by all authenticated users
ALTER TABLE public.bosses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Bosses: auth read" ON public.bosses;
CREATE POLICY "Bosses: auth read" ON public.bosses FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Bosses: creator insert" ON public.bosses;
CREATE POLICY "Bosses: creator insert" ON public.bosses FOR INSERT WITH CHECK (auth.uid() = creator_id);
DROP POLICY IF EXISTS "Bosses: creator update" ON public.bosses;
CREATE POLICY "Bosses: creator update" ON public.bosses FOR UPDATE USING (auth.uid() = creator_id);
DROP POLICY IF EXISTS "Bosses: creator delete" ON public.bosses;
CREATE POLICY "Bosses: creator delete" ON public.bosses FOR DELETE USING (auth.uid() = creator_id);

-- Battles: readable by participants, writable by backend (service role)
ALTER TABLE public.battles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Battles: participant read" ON public.battles;
CREATE POLICY "Battles: participant read" ON public.battles FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM public.battle_participants WHERE battle_id = id)
);
DROP POLICY IF EXISTS "Battles: auth insert" ON public.battles;
CREATE POLICY "Battles: auth insert" ON public.battles FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Battles: auth update" ON public.battles;
CREATE POLICY "Battles: auth update" ON public.battles FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Battle Participants: readable by same-battle participants
ALTER TABLE public.battle_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "BattleParticipants: battle read" ON public.battle_participants;
CREATE POLICY "BattleParticipants: battle read" ON public.battle_participants FOR SELECT USING (
    auth.uid() IN (SELECT bp.user_id FROM public.battle_participants bp WHERE bp.battle_id = battle_id)
);
DROP POLICY IF EXISTS "BattleParticipants: self insert" ON public.battle_participants;
CREATE POLICY "BattleParticipants: self insert" ON public.battle_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "BattleParticipants: auth update" ON public.battle_participants;
CREATE POLICY "BattleParticipants: auth update" ON public.battle_participants FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Battle Logs: readable by battle participants
ALTER TABLE public.battle_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "BattleLogs: participant read" ON public.battle_logs;
CREATE POLICY "BattleLogs: participant read" ON public.battle_logs FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM public.battle_participants WHERE battle_id = battle_logs.battle_id)
);
DROP POLICY IF EXISTS "BattleLogs: auth insert" ON public.battle_logs;
CREATE POLICY "BattleLogs: auth insert" ON public.battle_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Player Inventory: full access to own items
ALTER TABLE public.player_inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Inventory: own access" ON public.player_inventory;
CREATE POLICY "Inventory: own access" ON public.player_inventory FOR ALL USING (auth.uid() = user_id);

-- Realtime for battles and battle_participants
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.battles;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_participants;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Migration to add stat_points to users table for existing databases
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS stat_points INTEGER DEFAULT 0;

