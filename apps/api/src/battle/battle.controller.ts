import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { BattleService } from './battle.service';
import { CreateBossDto } from './dto/create-boss.dto';
import { StartBattleDto } from './dto/start-battle.dto';
import { SubmitActionDto } from './dto/submit-action.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@Controller('battle')
@UseGuards(SupabaseAuthGuard)
export class BattleController {
  constructor(private readonly battleService: BattleService) {}

  // ─── Boss Management ────────────────────────────────────────────────

  /** Create a new boss */
  @Post('boss')
  async createBoss(@Req() req: any, @Body() dto: CreateBossDto) {
    return this.battleService.createBoss(req.user.id, dto);
  }

  /** List available bosses */
  @Get('boss/list')
  async listBosses(@Req() req: any) {
    return this.battleService.listBosses(req.user.id);
  }

  /** Delete a boss */
  @Delete('boss/:id')
  async deleteBoss(@Req() req: any, @Param('id') id: string) {
    return this.battleService.deleteBoss(req.user.id, id);
  }

  // ─── Battle Lifecycle ───────────────────────────────────────────────

  /** Start a new battle */
  @Post('start')
  async startBattle(@Req() req: any, @Body() dto: StartBattleDto) {
    return this.battleService.startBattle(req.user.id, dto);
  }

  /** List open party lobbies */
  @Get('party/open')
  async listOpenPartyBattles(@Req() req: any) {
    return this.battleService.listOpenPartyBattles(req.user.id);
  }

  /** Get current active battle */
  @Get('active')
  async getActiveBattle(@Req() req: any) {
    return this.battleService.getActiveBattle(req.user.id);
  }

  /** Get battle state */
  @Get(':id')
  async getBattleState(@Req() req: any, @Param('id') id: string) {
    return this.battleService.getBattleState(id, req.user.id);
  }

  /** Start combat for a party battle */
  @Post(':id/start-combat')
  async startCombat(@Req() req: any, @Param('id') id: string) {
    return this.battleService.startCombat(req.user.id, id);
  }

  /** Submit an action */
  @Post(':id/action')
  async submitAction(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: SubmitActionDto,
  ) {
    return this.battleService.submitAction(req.user.id, id, dto);
  }

  /** Join a party battle */
  @Post(':id/join')
  async joinBattle(@Req() req: any, @Param('id') id: string) {
    return this.battleService.joinBattle(req.user.id, id);
  }

  /** Get battle log */
  @Get(':id/log')
  async getBattleLog(@Param('id') id: string) {
    return this.battleService.getBattleLog(id);
  }

  /** Abandon a battle */
  @Post(':id/abandon')
  async abandonBattle(@Req() req: any, @Param('id') id: string) {
    return this.battleService.abandonBattle(req.user.id, id);
  }

  /** Convert a party battle lobby to a solo battle */
  @Post(':id/convert-to-solo')
  async convertToSolo(@Req() req: any, @Param('id') id: string) {
    return this.battleService.convertToSolo(req.user.id, id);
  }

  /** Convert a solo active battle to a party lobby */
  @Post(':id/convert-to-party')
  async convertToParty(@Req() req: any, @Param('id') id: string) {
    return this.battleService.convertToParty(req.user.id, id);
  }
}
