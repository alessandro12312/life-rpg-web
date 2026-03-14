"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
let PlayerService = class PlayerService {
    supabase;
    constructor(supabase) {
        this.supabase = supabase;
    }
    async getPlayerStats(userId) {
        const { data: user, error } = await this.supabase.getClient()
            .from('users')
            .select('*, character_stats(*)')
            .eq('id', userId)
            .single();
        if (error || !user) {
            throw new common_1.NotFoundException('Player not found');
        }
        return user;
    }
    async logActivity(userId, payload) {
        const intensity = payload.intensity_multiplier || 1.0;
        const { data: user, error: fetchError } = await this.supabase.getClient()
            .from('users')
            .select('xp_current, xp_to_next, level, current_streak, highest_streak, last_login_date')
            .eq('id', userId)
            .single();
        if (fetchError || !user)
            throw new common_1.NotFoundException('Player not found');
        let { xp_current, xp_to_next, level, current_streak, highest_streak, last_login_date } = user;
        const todayStr = new Date().toISOString().split('T')[0];
        if (last_login_date) {
            const lastDate = new Date(last_login_date);
            const todayDate = new Date(todayStr);
            const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
                current_streak += 1;
                if (current_streak > highest_streak) {
                    highest_streak = current_streak;
                }
            }
            else if (diffDays > 1) {
                current_streak = 1;
            }
        }
        else {
            current_streak = 1;
            highest_streak = 1;
        }
        let streakMultiplier = 1.0;
        if (current_streak >= 7)
            streakMultiplier = 1.10;
        else if (current_streak >= 3)
            streakMultiplier = 1.05;
        const xp_yield = Math.floor(payload.duration_minutes * 10 * intensity * streakMultiplier);
        const stat_gain = parseFloat(((payload.duration_minutes / 60) * 0.1 * intensity).toFixed(2));
        xp_current += xp_yield;
        while (xp_current >= xp_to_next) {
            level += 1;
            xp_current -= xp_to_next;
            xp_to_next = Math.floor(1000 * Math.pow(level, 1.5));
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
        if (updateError)
            throw new Error(updateError.message);
        let stats_yield = {};
        if (payload.stat_type && stat_gain > 0) {
            stats_yield[payload.stat_type] = stat_gain;
            const { data: currentStats, error: statError } = await this.supabase.getClient()
                .from('character_stats')
                .select(payload.stat_type)
                .eq('user_id', userId)
                .single();
            if (!statError && currentStats) {
                const currentVal = currentStats[payload.stat_type] || 1;
                const newValue = parseFloat((Number(currentVal) + stat_gain).toFixed(2));
                await this.supabase.getClient()
                    .from('character_stats')
                    .update({ [payload.stat_type]: newValue })
                    .eq('user_id', userId);
            }
        }
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
        return this.getPlayerStats(userId);
    }
    async onboardPlayer(userId, payload) {
        let intelligenceBonus = 0;
        let disciplineBonus = 0;
        let strengthBonus = 0;
        let enduranceBonus = 0;
        if (payload.studyHoursWeekly > 20) {
            intelligenceBonus = 2.0;
            disciplineBonus = 1.5;
        }
        else if (payload.studyHoursWeekly >= 10) {
            intelligenceBonus = 1.0;
            disciplineBonus = 0.5;
        }
        if (payload.workoutHoursWeekly > 7) {
            strengthBonus = 2.0;
            enduranceBonus = 1.5;
        }
        else if (payload.workoutHoursWeekly >= 3) {
            strengthBonus = 1.0;
            enduranceBonus = 0.5;
        }
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
        const xpBoost = 500;
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
};
exports.PlayerService = PlayerService;
exports.PlayerService = PlayerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], PlayerService);
//# sourceMappingURL=player.service.js.map