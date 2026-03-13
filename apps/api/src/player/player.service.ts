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

    async logActivity(userId: string, payload: {
        category: 'STUDY' | 'WORKOUT' | 'MIXED' | 'CUSTOM';
        custom_name?: string;
        duration_minutes: number;
        intensity_multiplier?: number;
        stat_type?: 'intelligence' | 'strength' | 'endurance' | 'discipline' | 'focus' | 'knowledge' | 'health';
    }) {
        const intensity = payload.intensity_multiplier || 1.0;

        // Base formulas: 10 XP per minute standard. 0.1 Stat per hour standard.
        const xp_yield = Math.floor(payload.duration_minutes * 10 * intensity);
        const stat_gain = parseFloat(((payload.duration_minutes / 60) * 0.1 * intensity).toFixed(2));

        // 1. Fetch user to add XP
        const { data: user, error: fetchError } = await this.supabase.getClient()
            .from('users')
            .select('xp_current, xp_to_next, level')
            .eq('id', userId)
            .single();

        if (fetchError || !user) throw new NotFoundException('Player not found');

        let { xp_current, xp_to_next, level } = user;
        xp_current += xp_yield;
        while (xp_current >= xp_to_next) {
            level += 1;
            xp_current -= xp_to_next;
            xp_to_next = Math.floor(1000 * Math.pow(level, 1.5)); // Curve based on design document
        }

        const { error: updateError } = await this.supabase.getClient()
            .from('users')
            .update({ xp_current, xp_to_next, level })
            .eq('id', userId);

        if (updateError) throw new Error(updateError.message);

        // 2. Add specific stat if applicable
        let stats_yield: Record<string, number> = {};
        if (payload.stat_type && stat_gain > 0) {
            stats_yield[payload.stat_type] = stat_gain;

            // fetch current stats
            const { data: currentStats, error: statError } = await this.supabase.getClient()
                .from('character_stats')
                .select(payload.stat_type)
                .eq('user_id', userId)
                .single();

            if (!statError && currentStats) {
                const currentVal = (currentStats as any)[payload.stat_type] || 1;
                const newValue = parseFloat((Number(currentVal) + stat_gain).toFixed(2));

                await this.supabase.getClient()
                    .from('character_stats')
                    .update({ [payload.stat_type]: newValue })
                    .eq('user_id', userId);
            }
        }

        // 3. Log activity for history
        await this.supabase.getClient()
            .from('activity_logs')
            .insert({
                user_id: userId,
                category: payload.category,
                custom_name: payload.custom_name || payload.category,
                duration_minutes: payload.duration_minutes,
                intensity_multiplier: intensity,
                xp_yield: xp_yield,
                stats_yield: stats_yield
            });

        // 4. Return fully refreshed player data for the frontend state update
        return this.getPlayerStats(userId);
    }
}
