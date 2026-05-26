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
const allocate_stats_dto_1 = require("./dto/allocate-stats.dto");
const supabase_auth_guard_1 = require("../auth/supabase-auth.guard");
let PlayerController = class PlayerController {
    playerService;
    constructor(playerService) {
        this.playerService = playerService;
    }
    async getPlayerStats(req) {
        return this.playerService.getPlayerStats(req.user.id);
    }
    async logActivity(req, body) {
        return this.playerService.logActivity(req.user.id, body);
    }
    async getActivityHistory(req) {
        return this.playerService.getActivityHistory(req.user.id);
    }
    async onboardPlayer(req, body) {
        return this.playerService.onboardPlayer(req.user.id, body);
    }
    async getPlayerSkills(req) {
        return this.playerService.getPlayerSkills(req.user.id);
    }
    async unlockSkill(req, body) {
        return this.playerService.unlockSkill(req.user.id, body.skillId);
    }
    async getAchievements(req) {
        return this.playerService.getAchievements(req.user.id);
    }
    async getGoals(req) {
        return this.playerService.getGoals(req.user.id);
    }
    async createGoal(req, body) {
        return this.playerService.createGoal(req.user.id, body);
    }
    async allocateStatPoints(req, body) {
        return this.playerService.allocateStatPoints(req.user.id, body);
    }
};
exports.PlayerController = PlayerController;
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PlayerController.prototype, "getPlayerStats", null);
__decorate([
    (0, common_1.Post)('activity'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, log_activity_dto_1.LogActivityDto]),
    __metadata("design:returntype", Promise)
], PlayerController.prototype, "logActivity", null);
__decorate([
    (0, common_1.Get)('activities'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PlayerController.prototype, "getActivityHistory", null);
__decorate([
    (0, common_1.Post)('onboard'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, onboard_player_dto_1.OnboardPlayerDto]),
    __metadata("design:returntype", Promise)
], PlayerController.prototype, "onboardPlayer", null);
__decorate([
    (0, common_1.Get)('skills'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PlayerController.prototype, "getPlayerSkills", null);
__decorate([
    (0, common_1.Post)('skills/unlock'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, unlock_skill_dto_1.UnlockSkillDto]),
    __metadata("design:returntype", Promise)
], PlayerController.prototype, "unlockSkill", null);
__decorate([
    (0, common_1.Get)('achievements'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PlayerController.prototype, "getAchievements", null);
__decorate([
    (0, common_1.Get)('goals'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PlayerController.prototype, "getGoals", null);
__decorate([
    (0, common_1.Post)('goals'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_goal_dto_1.CreateGoalDto]),
    __metadata("design:returntype", Promise)
], PlayerController.prototype, "createGoal", null);
__decorate([
    (0, common_1.Post)('allocate-stats'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, allocate_stats_dto_1.AllocateStatsDto]),
    __metadata("design:returntype", Promise)
], PlayerController.prototype, "allocateStatPoints", null);
exports.PlayerController = PlayerController = __decorate([
    (0, common_1.Controller)('player'),
    (0, common_1.UseGuards)(supabase_auth_guard_1.SupabaseAuthGuard),
    __metadata("design:paramtypes", [player_service_1.PlayerService])
], PlayerController);
//# sourceMappingURL=player.controller.js.map