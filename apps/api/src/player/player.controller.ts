import { Controller, Get, Post, Body, UseGuards, Req, Query } from '@nestjs/common';
import { PlayerService } from './player.service';
import { LogActivityDto } from './dto/log-activity.dto';
import { OnboardPlayerDto } from './dto/onboard-player.dto';
import { UnlockSkillDto } from './dto/unlock-skill.dto';
import { CreateGoalDto } from './dto/create-goal.dto';
import { AllocateStatsDto } from './dto/allocate-stats.dto';
import { CheckUsernameDto } from './dto/check-username.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@Controller('player')
export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  // Il userId viene SEMPRE estratto dal token JWT verificato dalla guard,
  // mai dal parametro URL. Questo impedisce attacchi IDOR.

  // Pubblica: usata in fase di registrazione, prima che esista una sessione autenticata.
  @Get('username-availability')
  async checkUsernameAvailability(@Query() query: CheckUsernameDto) {
    return this.playerService.checkUsernameAvailability(query.username);
  }

  @Get('me')
  @UseGuards(SupabaseAuthGuard)
  async getPlayerStats(@Req() req: any) {
    return this.playerService.getPlayerStats(req.user.id);
  }

  @Post('activity')
  @UseGuards(SupabaseAuthGuard)
  async logActivity(@Req() req: any, @Body() body: LogActivityDto) {
    return this.playerService.logActivity(req.user.id, body);
  }

  @Get('activities')
  @UseGuards(SupabaseAuthGuard)
  async getActivityHistory(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '10', 10);
    return this.playerService.getActivityHistory(req.user.id, pageNum, limitNum);
  }

  @Post('onboard')
  @UseGuards(SupabaseAuthGuard)
  async onboardPlayer(@Req() req: any, @Body() body: OnboardPlayerDto) {
    return this.playerService.onboardPlayer(req.user.id, body);
  }

  @Get('skills')
  @UseGuards(SupabaseAuthGuard)
  async getPlayerSkills(@Req() req: any) {
    return this.playerService.getPlayerSkills(req.user.id);
  }

  @Post('skills/unlock')
  @UseGuards(SupabaseAuthGuard)
  async unlockSkill(@Req() req: any, @Body() body: UnlockSkillDto) {
    return this.playerService.unlockSkill(req.user.id, body.skillId);
  }

  @Get('achievements')
  @UseGuards(SupabaseAuthGuard)
  async getAchievements(@Req() req: any) {
    return this.playerService.getAchievements(req.user.id);
  }

  @Get('goals')
  @UseGuards(SupabaseAuthGuard)
  async getGoals(@Req() req: any) {
    return this.playerService.getGoals(req.user.id);
  }

  @Post('goals')
  @UseGuards(SupabaseAuthGuard)
  async createGoal(@Req() req: any, @Body() body: CreateGoalDto) {
    return this.playerService.createGoal(req.user.id, body);
  }

  @Post('allocate-stats')
  @UseGuards(SupabaseAuthGuard)
  async allocateStatPoints(@Req() req: any, @Body() body: AllocateStatsDto) {
    return this.playerService.allocateStatPoints(req.user.id, body);
  }
}
