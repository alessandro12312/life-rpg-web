import { SupabaseService } from '../supabase/supabase.service';
export declare class PlayerService {
    private readonly supabase;
    constructor(supabase: SupabaseService);
    getPlayerStats(userId: string): Promise<any>;
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
