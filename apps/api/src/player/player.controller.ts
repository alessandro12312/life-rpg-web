import { Controller, Get, Param, Post, Body, UseGuards } from '@nestjs/common';
import { PlayerService } from './player.service';
import { LogActivityDto } from './dto/log-activity.dto';
import { OnboardPlayerDto } from './dto/onboard-player.dto';
import { UnlockSkillDto } from './dto/unlock-skill.dto';
import { CreateGoalDto } from './dto/create-goal.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@Controller('player')
@UseGuards(SupabaseAuthGuard)
export class PlayerController {
    constructor(private readonly playerService: PlayerService) { }

    @Get(':id')
    async getPlayerStats(@Param('id') userId: string) {
        return this.playerService.getPlayerStats(userId);
    }

    @Post(':id/activity')
    async logActivity(@Param('id') userId: string, @Body() body: LogActivityDto) {
        return this.playerService.logActivity(userId, body);
    }

    @Get(':id/activities')
    async getActivityHistory(@Param('id') userId: string) {
        return this.playerService.getActivityHistory(userId);
    }

    @Post(':id/onboard')
    async onboardPlayer(
        @Param('id') userId: string,
        @Body() body: OnboardPlayerDto
    ) {
        return this.playerService.onboardPlayer(userId, body);
    }

    @Get(':id/skills')
    async getPlayerSkills(@Param('id') userId: string) {
        return this.playerService.getPlayerSkills(userId);
    }

    @Post(':id/skills/unlock')
    async unlockSkill(
        @Param('id') userId: string,
        @Body() body: UnlockSkillDto
    ) {
        return this.playerService.unlockSkill(userId, body.skillId);
    }

    @Get(':id/achievements')
    async getAchievements(@Param('id') userId: string) {
        return this.playerService.getAchievements(userId);
    }

    @Get(':id/goals')
    async getGoals(@Param('id') userId: string) {
        return this.playerService.getGoals(userId);
    }

    @Post(':id/goals')
    async createGoal(
        @Param('id') userId: string,
        @Body() body: CreateGoalDto
    ) {
        return this.playerService.createGoal(userId, body);
    }
}
