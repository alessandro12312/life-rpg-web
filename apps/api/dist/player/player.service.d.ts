import { SupabaseService } from '../supabase/supabase.service';
export declare class PlayerService {
    private readonly supabase;
    constructor(supabase: SupabaseService);
    getPlayerStats(userId: string): Promise<any>;
    addXP(userId: string, amount: number, category?: string): Promise<any>;
}
