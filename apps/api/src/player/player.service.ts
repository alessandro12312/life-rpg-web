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

        // 1. Fetch user to add XP
        const { data: user, error: fetchError } = await this.supabase.getClient()
            .from('users')
            .select('xp_current, xp_to_next, level, current_streak, highest_streak, last_login_date')
            .eq('id', userId)
            .single();

        if (fetchError || !user) throw new NotFoundException('Player not found');

        let { xp_current, xp_to_next, level, current_streak, highest_streak, last_login_date } = user;

        // --- Streak Calculation ---
        const todayStr = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"

        if (last_login_date) {
            const lastDate = new Date(last_login_date);
            const todayDate = new Date(todayStr);
            const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                // Logged in yesterday -> keep streak
                current_streak += 1;
                if (current_streak > highest_streak) {
                    highest_streak = current_streak;
                }
            } else if (diffDays > 1) {
                // Streak broken
                current_streak = 1;
            }
            // if diffDays === 0, keep current_streak as is for today
        } else {
            // First time ever logging an activity
            current_streak = 1;
            highest_streak = 1;
        }

        // Apply bonus multiplier from streak
        let streakMultiplier = 1.0;
        if (current_streak >= 7) streakMultiplier = 1.10;
        else if (current_streak >= 3) streakMultiplier = 1.05;

        // Apply base formulas: 10 XP per minute standard. 0.1 Stat per hour standard.
        const xp_yield = Math.floor(payload.duration_minutes * 10 * intensity * streakMultiplier);
        const stat_gain = parseFloat(((payload.duration_minutes / 60) * 0.1 * intensity).toFixed(2));

        xp_current += xp_yield;
        while (xp_current >= xp_to_next) {
            level += 1;
            xp_current -= xp_to_next;
            xp_to_next = Math.floor(1000 * Math.pow(level, 1.5)); // Curve based on design document
        }

        const { error: updateError } = await this.supabase.getClient()
            .from('users')
            .update({
                xp_current,
                xp_to_next,
                level,
                current_streak,
                highest_streak,
                last_login_date: todayStr
            })
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

    async onboardPlayer(userId: string, payload: { studyHoursWeekly: number; workoutHoursWeekly: number }) {
        // Generates initial baseline stats based on real-world questionnaire
        let intelligenceBonus = 0;
        let disciplineBonus = 0;
        let strengthBonus = 0;
        let enduranceBonus = 0;

        // Study Logic
        if (payload.studyHoursWeekly > 20) {
            intelligenceBonus = 2.0;
            disciplineBonus = 1.5;
        } else if (payload.studyHoursWeekly >= 10) {
            intelligenceBonus = 1.0;
            disciplineBonus = 0.5;
        }

        // Workout Logic
        if (payload.workoutHoursWeekly > 7) {
            strengthBonus = 2.0;
            enduranceBonus = 1.5;
        } else if (payload.workoutHoursWeekly >= 3) {
            strengthBonus = 1.0;
            enduranceBonus = 0.5;
        }

        // Fetch current to add bonuses
        const { data: stats } = await this.supabase.getClient()
            .from('character_stats')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (stats) {
            await this.supabase.getClient()
                .from('character_stats')
                .update({
                    intelligence: parseFloat((Number(stats.intelligence) + intelligenceBonus).toFixed(2)),
                    discipline: parseFloat((Number(stats.discipline) + disciplineBonus).toFixed(2)),
                    strength: parseFloat((Number(stats.strength) + strengthBonus).toFixed(2)),
                    endurance: parseFloat((Number(stats.endurance) + enduranceBonus).toFixed(2)),
                })
                .eq('user_id', userId);
        }

        // Give a starting level boost just to hype the user
        const xpBoost = 500; // Instantly gives 500 XP

        const { data: user } = await this.supabase.getClient()
            .from('users')
            .select('xp_current')
            .eq('id', userId)
            .single();

        if (user) {
            await this.supabase.getClient()
                .from('users')
                .update({ xp_current: user.xp_current + xpBoost })
                .eq('id', userId);
        }

        return this.getPlayerStats(userId);
    }
}
