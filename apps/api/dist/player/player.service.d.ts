import { SupabaseService } from '../supabase/supabase.service';
export interface SkillDef {
    id: string;
    requires: string[];
    effect: {
        type: 'xp_multiplier_category' | 'xp_multiplier_global' | 'stat_gain_multiplier' | 'streak_bonus';
        category?: 'STUDY' | 'WORKOUT';
        value: number;
    };
}
export declare const SKILL_CATALOG: SkillDef[];
export declare class PlayerService {
    private readonly supabase;
    constructor(supabase: SupabaseService);
    getPlayerStats(userId: string): Promise<any>;
    getPlayerSkills(userId: string): Promise<{
        unlockedIds: string[];
    }>;
    unlockSkill(userId: string, skillId: string): Promise<{
        unlockedIds: string[];
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
    }): Promise<any>;
}
