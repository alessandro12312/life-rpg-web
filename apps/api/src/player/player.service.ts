import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

// ─── Skill Catalog ─────────────────────────────────────────────────────────────
// Mirrors the node IDs used in the frontend SKILLS array
export interface SkillDef {
    id: string;
    requires: string[];
    effect: {
        type: 'xp_multiplier_category' | 'xp_multiplier_global' | 'stat_gain_multiplier' | 'streak_bonus';
        category?: 'STUDY' | 'WORKOUT';
        value: number;
    };
}

export const SKILL_CATALOG: SkillDef[] = [
    // core_1 is the always-unlocked root — no backend effect needed
    { id: 'core_1', requires: [], effect: { type: 'xp_multiplier_global', value: 0 } },

    // Intelligence Path
    { id: 'int_1', requires: ['core_1'], effect: { type: 'xp_multiplier_category', category: 'STUDY', value: 0.05 } },
    { id: 'int_2', requires: ['int_1'], effect: { type: 'stat_gain_multiplier', value: 0.10 } },

    // Strength Path
    { id: 'str_1', requires: ['core_1'], effect: { type: 'xp_multiplier_category', category: 'WORKOUT', value: 0.10 } },
    { id: 'str_2', requires: ['str_1'], effect: { type: 'streak_bonus', value: 0.05 } },

    // Defense / Consistency
    { id: 'def_1', requires: ['core_1'], effect: { type: 'xp_multiplier_global', value: 0.05 } },
    { id: 'def_2', requires: ['def_1'], effect: { type: 'xp_multiplier_global', value: 0.10 } },
];

function getSkillById(id: string): SkillDef | undefined {
    return SKILL_CATALOG.find(s => s.id === id);
}

// ─── Service ──────────────────────────────────────────────────────────────────
@Injectable()
export class PlayerService {
    constructor(private readonly supabase: SupabaseService) { }

    async getPlayerStats(userId: string) {
        const { data: user, error } = await this.supabase.getClient()
            .from('users')
            .select('*, character_stats(*)')
            .eq('id', userId)
            .single();

        if (error || !user) throw new NotFoundException('Player not found');
        return user;
    }

    // ── Skill Tree ─────────────────────────────────────────────────────────────
    async getPlayerSkills(userId: string): Promise<{ unlockedIds: string[] }> {
        const { data, error } = await this.supabase.getClient()
            .from('player_skills')
            .select('skill_id')
            .eq('user_id', userId);

        if (error) throw new Error(error.message);
        const unlockedIds = (data ?? []).map((r: { skill_id: string }) => r.skill_id);
        // core_1 is always unlocked
        if (!unlockedIds.includes('core_1')) unlockedIds.unshift('core_1');
        return { unlockedIds };
    }

    async unlockSkill(userId: string, skillId: string) {
        const skill = getSkillById(skillId);
        if (!skill) throw new BadRequestException('Unknown skill');
        if (skillId === 'core_1') throw new BadRequestException('core_1 is always unlocked');

        const { data: user, error: userError } = await this.supabase.getClient()
            .from('users').select('level').eq('id', userId).single();
        if (userError || !user) throw new NotFoundException('Player not found');

        const { data: unlocked } = await this.supabase.getClient()
            .from('player_skills').select('skill_id').eq('user_id', userId);

        const unlockedIds: string[] = (unlocked ?? []).map((r: { skill_id: string }) => r.skill_id);
        if (!unlockedIds.includes('core_1')) unlockedIds.push('core_1');

        if (unlockedIds.includes(skillId)) throw new BadRequestException('Skill already unlocked');

        // Check prerequisites
        for (const req of skill.requires) {
            if (req === 'core_1') continue; // always satisfied
            if (!unlockedIds.includes(req)) {
                throw new ForbiddenException(`Prerequisite "${req}" not unlocked`);
            }
        }

        // SP check: total SP = max(0, level - 5), spent = unlocked count (excluding core_1)
        const totalSP = Math.max(0, user.level - 5);
        const spentSP = unlockedIds.filter(id => id !== 'core_1').length;
        if (spentSP >= totalSP) throw new BadRequestException('Not enough Skill Points');

        const { error: insertError } = await this.supabase.getClient()
            .from('player_skills').insert({ user_id: userId, skill_id: skillId });
        if (insertError) throw new Error(insertError.message);

        return this.getPlayerSkills(userId);
    }

    // ── Log Activity ──────────────────────────────────────────────────────────
    async logActivity(userId: string, payload: {
        category: 'STUDY' | 'WORKOUT' | 'MIXED' | 'CUSTOM';
        custom_name?: string;
        duration_minutes: number;
        intensity_multiplier?: number;
        stat_type?: 'intelligence' | 'strength' | 'endurance' | 'discipline' | 'focus' | 'knowledge' | 'health';
    }) {
        const intensity = payload.intensity_multiplier || 1.0;

        const { data: user, error: fetchError } = await this.supabase.getClient()
            .from('users')
            .select('xp_current, xp_to_next, level, current_streak, highest_streak, last_login_date')
            .eq('id', userId).single();
        if (fetchError || !user) throw new NotFoundException('Player not found');

        let { xp_current, xp_to_next, level, current_streak, highest_streak, last_login_date } = user;

        // Fetch active skills
        const { data: skillRows } = await this.supabase.getClient()
            .from('player_skills').select('skill_id').eq('user_id', userId);
        const unlockedIds: string[] = ['core_1', ...(skillRows ?? []).map((r: { skill_id: string }) => r.skill_id)];
        const activeSkills = unlockedIds.map(id => getSkillById(id)).filter((s): s is SkillDef => !!s);

        // Streak
        const todayStr = new Date().toISOString().split('T')[0];
        if (last_login_date) {
            const diffDays = Math.ceil(
                Math.abs(new Date(todayStr).getTime() - new Date(last_login_date).getTime()) / 86400000
            );
            if (diffDays === 1) { current_streak += 1; if (current_streak > highest_streak) highest_streak = current_streak; }
            else if (diffDays > 1) { current_streak = 1; }
        } else { current_streak = 1; highest_streak = 1; }

        // Base streak multiplier
        let streakMultiplier = 1.0;
        if (current_streak >= 7) streakMultiplier = 1.10;
        else if (current_streak >= 3) streakMultiplier = 1.05;

        // Skill: streak_bonus
        const streakBonusTotal = activeSkills
            .filter(s => s.effect.type === 'streak_bonus')
            .reduce((acc, s) => acc + s.effect.value, 0);
        if (current_streak >= 1) streakMultiplier += streakBonusTotal;

        // Skill: xp multipliers
        const categoryBonus = activeSkills
            .filter(s => s.effect.type === 'xp_multiplier_category' && s.effect.category === payload.category)
            .reduce((acc, s) => acc + s.effect.value, 0);
        const globalBonus = activeSkills
            .filter(s => s.effect.type === 'xp_multiplier_global')
            .reduce((acc, s) => acc + s.effect.value, 0);

        const xpMultiplier = (1 + categoryBonus + globalBonus) * streakMultiplier;

        // Skill: stat_gain
        const statGainMult = 1 + activeSkills
            .filter(s => s.effect.type === 'stat_gain_multiplier')
            .reduce((acc, s) => acc + s.effect.value, 0);

        const xp_yield = Math.floor(payload.duration_minutes * 10 * intensity * xpMultiplier);
        const stat_gain = parseFloat(((payload.duration_minutes / 60) * 0.1 * intensity * statGainMult).toFixed(2));

        xp_current += xp_yield;
        while (xp_current >= xp_to_next) {
            level += 1;
            xp_current -= xp_to_next;
            xp_to_next = Math.floor(1000 * Math.pow(level, 1.5));
        }

        const { error: updateError } = await this.supabase.getClient()
            .from('users')
            .update({ xp_current, xp_to_next, level, current_streak, highest_streak, last_login_date: todayStr })
            .eq('id', userId);
        if (updateError) throw new Error(updateError.message);

        // Stat update
        let stats_yield: Record<string, number> = {};
        if (payload.stat_type && stat_gain > 0) {
            stats_yield[payload.stat_type] = stat_gain;
            const { data: currentStats, error: statError } = await this.supabase.getClient()
                .from('character_stats').select(payload.stat_type).eq('user_id', userId).single();
            if (!statError && currentStats) {
                const currentVal = (currentStats as any)[payload.stat_type] || 1;
                await this.supabase.getClient()
                    .from('character_stats')
                    .update({ [payload.stat_type]: parseFloat((Number(currentVal) + stat_gain).toFixed(2)) })
                    .eq('user_id', userId);
            }
        }

        await this.supabase.getClient().from('activity_logs').insert({
            user_id: userId,
            category: payload.category,
            custom_name: payload.custom_name || payload.category,
            duration_minutes: payload.duration_minutes,
            intensity_multiplier: intensity,
            xp_yield,
            stats_yield,
        });

        return this.getPlayerStats(userId);
    }

    // ── Onboarding ────────────────────────────────────────────────────────────
    async onboardPlayer(userId: string, payload: { studyHoursWeekly: number; workoutHoursWeekly: number }) {
        let intelligenceBonus = 0, disciplineBonus = 0, strengthBonus = 0, enduranceBonus = 0;
        if (payload.studyHoursWeekly > 20) { intelligenceBonus = 2.0; disciplineBonus = 1.5; }
        else if (payload.studyHoursWeekly >= 10) { intelligenceBonus = 1.0; disciplineBonus = 0.5; }
        if (payload.workoutHoursWeekly > 7) { strengthBonus = 2.0; enduranceBonus = 1.5; }
        else if (payload.workoutHoursWeekly >= 3) { strengthBonus = 1.0; enduranceBonus = 0.5; }

        const { data: stats } = await this.supabase.getClient()
            .from('character_stats').select('*').eq('user_id', userId).single();
        if (stats) {
            await this.supabase.getClient().from('character_stats').update({
                intelligence: parseFloat((Number(stats.intelligence) + intelligenceBonus).toFixed(2)),
                discipline: parseFloat((Number(stats.discipline) + disciplineBonus).toFixed(2)),
                strength: parseFloat((Number(stats.strength) + strengthBonus).toFixed(2)),
                endurance: parseFloat((Number(stats.endurance) + enduranceBonus).toFixed(2)),
            }).eq('user_id', userId);
        }

        const { data: userRow } = await this.supabase.getClient()
            .from('users').select('xp_current').eq('id', userId).single();
        if (userRow) {
            await this.supabase.getClient().from('users')
                .update({ xp_current: userRow.xp_current + 500 }).eq('id', userId);
        }

        return this.getPlayerStats(userId);
    }
}
