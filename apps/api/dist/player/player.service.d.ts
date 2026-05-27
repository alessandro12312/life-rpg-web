import { SupabaseService } from '../supabase/supabase.service';
import { GuildService } from '../guild/guild.service';
import { BattleService } from '../battle/battle.service';
export interface SkillDef {
    id: string;
    requires: string[];
    effect: {
        type: 'xp_multiplier_category' | 'xp_multiplier_global' | 'stat_gain_multiplier' | 'streak_bonus' | 'stat_gain_streak_bonus';
        category?: 'STUDY' | 'WORKOUT';
        value: number;
    };
}
export declare const SKILL_CATALOG: SkillDef[];
export interface AchievementDef {
    id: string;
    name: string;
    description: string;
    icon: string;
}
export declare const ACHIEVEMENT_CATALOG: AchievementDef[];
export declare class PlayerService {
    private readonly supabase;
    private readonly guildService;
    private readonly battleService;
    constructor(supabase: SupabaseService, guildService: GuildService, battleService: BattleService);
    getPlayerStats(userId: string): Promise<any>;
    getPlayerSkills(userId: string): Promise<{
        unlockedIds: string[];
    }>;
    unlockSkill(userId: string, skillId: string): Promise<{
        unlockedIds: string[];
    }>;
    getAchievements(userId: string): Promise<{
        catalog: AchievementDef[];
        unlocked: {
            achievement_id: any;
            unlocked_at: any;
        }[];
        unlockedIds: any[];
    }>;
    checkAchievements(userId: string, ctx: {
        level: number;
        current_streak: number;
        category?: string;
        custom_name?: string;
    }): Promise<string[]>;
    getGoals(userId: string): Promise<any[]>;
    createGoal(userId: string, payload: {
        title: string;
        category: string;
        target_minutes: number;
        deadline?: string;
        xp_reward?: number;
    }): Promise<any>;
    updateGoalProgress(userId: string, category: string, minutes: number, currentLevel: number, currentXP: number, xpToNext: number): Promise<void>;
    getActivityHistory(userId: string, page?: number, limit?: number): Promise<{
        data: any[];
        total: number;
        page: number;
        limit: number;
        hasMore: boolean;
    }>;
    logActivity(userId: string, payload: {
        category: 'STUDY' | 'WORKOUT' | 'MIXED' | 'CUSTOM';
        custom_name?: string;
        duration_minutes: number;
        intensity_multiplier?: number;
        stat_type?: 'intelligence' | 'strength' | 'endurance' | 'discipline' | 'focus' | 'knowledge' | 'health';
    }): Promise<any>;
    onboardPlayer(userId: string, payload: {
        studyHoursWeekly: number;
        workoutHoursWeekly: number;
        race: string;
        className: string;
        avatarId?: string;
    }): Promise<any>;
    allocateStatPoints(userId: string, payload: {
        stat: 'intelligence' | 'strength' | 'endurance' | 'discipline' | 'focus' | 'knowledge' | 'health';
        points: number;
    }): Promise<any>;
}
