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
    async addXP(userId, amount, category = 'CUSTOM') {
        const { data: user, error: fetchError } = await this.supabase.getClient()
            .from('users')
            .select('xp_current, xp_to_next, level')
            .eq('id', userId)
            .single();
        if (fetchError || !user) {
            throw new common_1.NotFoundException('Player not found');
        }
        let { xp_current, xp_to_next, level } = user;
        xp_current += amount;
        while (xp_current >= xp_to_next) {
            level += 1;
            xp_current -= xp_to_next;
            xp_to_next = Math.floor(1000 * Math.pow(level, 1.5));
        }
        const { data: updatedUser, error: updateError } = await this.supabase.getClient()
            .from('users')
            .update({ xp_current, xp_to_next, level })
            .eq('id', userId)
            .select()
            .single();
        if (updateError) {
            throw new Error(updateError.message);
        }
        await this.supabase.getClient()
            .from('activity_logs')
            .insert({
            user_id: userId,
            category: category,
            duration_minutes: amount / 10,
            xp_yield: amount,
        });
        return updatedUser;
    }
};
exports.PlayerService = PlayerService;
exports.PlayerService = PlayerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], PlayerService);
//# sourceMappingURL=player.service.js.map