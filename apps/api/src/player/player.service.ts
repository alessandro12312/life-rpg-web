import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class PlayerService {
    constructor(private readonly supabase: SupabaseService) { }

    async getPlayerStats(userId: string) {
        const { data: user, error } = await this.supabase.getClient()
            .from('users')
            .select('*, character_stats(*)')
            .eq('id', userId)
            .single();

        if (error || !user) {
            throw new NotFoundException('Player not found');
        }

        return user;
    }

    async addXP(userId: string, amount: number, category: string = 'CUSTOM') {
        const { data: user, error: fetchError } = await this.supabase.getClient()
            .from('users')
            .select('xp_current, xp_to_next, level')
            .eq('id', userId)
            .single();

        if (fetchError || !user) {
            throw new NotFoundException('Player not found');
        }

        let { xp_current, xp_to_next, level } = user;

        // Add raw XP
        xp_current += amount;

        // Check level up (Formula: 1000 * (Level ^ 1.5))
        while (xp_current >= xp_to_next) {
            level += 1;
            xp_current -= xp_to_next;
            xp_to_next = Math.floor(1000 * Math.pow(level, 1.5));
        }

        // Attempt to grant the reward onto DB
        const { data: updatedUser, error: updateError } = await this.supabase.getClient()
            .from('users')
            .update({ xp_current, xp_to_next, level })
            .eq('id', userId)
            .select()
            .single();

        if (updateError) {
            throw new Error(updateError.message);
        }

        // Log the activity transparently inside Supabase Log Table
        await this.supabase.getClient()
            .from('activity_logs')
            .insert({
                user_id: userId,
                category: category,
                duration_minutes: amount / 10,  // Fake approximation since we pass raw XP
                xp_yield: amount,
            });

        return updatedUser;
    }
}
