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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerController = void 0;
const common_1 = require("@nestjs/common");
const player_service_1 = require("./player.service");
const log_activity_dto_1 = require("./dto/log-activity.dto");
const onboard_player_dto_1 = require("./dto/onboard-player.dto");
const unlock_skill_dto_1 = require("./dto/unlock-skill.dto");
const create_goal_dto_1 = require("./dto/create-goal.dto");
const supabase_auth_guard_1 = require("../auth/supabase-auth.guard");
let PlayerController = class PlayerController {
    playerService;
    constructor(playerService) {
        this.playerService = playerService;
    }
    async getPlayerStats(userId) {
        return this.playerService.getPlayerStats(userId);
    }
    async logActivity(userId, body) {
        return this.playerService.logActivity(userId, body);
    }
    async getActivityHistory(userId) {
        return this.playerService.getActivityHistory(userId);
    }
    async onboardPlayer(userId, body) {
        return this.playerService.onboardPlayer(userId, body);
    }
    async getPlayerSkills(userId) {
        return this.playerService.getPlayerSkills(userId);
    }
    async unlockSkill(userId, body) {
        return this.playerService.unlockSkill(userId, body.skillId);
    }
    async getAchievements(userId) {
        return this.playerService.getAchievements(userId);
    }
    async getGoals(userId) {
        return this.playerService.getGoals(userId);
    }
    async createGoal(userId, body) {
        return this.playerService.createGoal(userId, body);
    }
};
exports.PlayerController = PlayerController;
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PlayerController.prototype, "getPlayerStats", null);
__decorate([
    (0, common_1.Post)(':id/activity'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, log_activity_dto_1.LogActivityDto]),
    __metadata("design:returntype", Promise)
], PlayerController.prototype, "logActivity", null);
__decorate([
    (0, common_1.Get)(':id/activities'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PlayerController.prototype, "getActivityHistory", null);
__decorate([
    (0, common_1.Post)(':id/onboard'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, onboard_player_dto_1.OnboardPlayerDto]),
    __metadata("design:returntype", Promise)
], PlayerController.prototype, "onboardPlayer", null);
__decorate([
    (0, common_1.Get)(':id/skills'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PlayerController.prototype, "getPlayerSkills", null);
__decorate([
    (0, common_1.Post)(':id/skills/unlock'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, unlock_skill_dto_1.UnlockSkillDto]),
    __metadata("design:returntype", Promise)
], PlayerController.prototype, "unlockSkill", null);
__decorate([
    (0, common_1.Get)(':id/achievements'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PlayerController.prototype, "getAchievements", null);
__decorate([
    (0, common_1.Get)(':id/goals'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PlayerController.prototype, "getGoals", null);
__decorate([
    (0, common_1.Post)(':id/goals'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_goal_dto_1.CreateGoalDto]),
    __metadata("design:returntype", Promise)
], PlayerController.prototype, "createGoal", null);
exports.PlayerController = PlayerController = __decorate([
    (0, common_1.Controller)('player'),
    (0, common_1.UseGuards)(supabase_auth_guard_1.SupabaseAuthGuard),
    __metadata("design:paramtypes", [player_service_1.PlayerService])
], PlayerController);
//# sourceMappingURL=player.controller.js.map