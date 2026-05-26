import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SanctumService } from './sanctum.service';
import { CreateLobbyDto } from './dto/create-lobby.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@Controller('sanctum')
@UseGuards(SupabaseAuthGuard)
export class SanctumController {
  constructor(private readonly sanctumService: SanctumService) {}

  @Get('lobbies')
  async getLobbies() {
    return this.sanctumService.getActiveLobbies();
  }

  @Post('lobbies')
  async createLobby(@Req() req: any, @Body() dto: CreateLobbyDto) {
    return this.sanctumService.createLobby(req.user.id, dto);
  }

  @Get('lobbies/:id')
  async getLobby(@Param('id') id: string) {
    return this.sanctumService.getLobby(id);
  }

  @Post('lobbies/:id/join')
  async joinLobby(
    @Req() req: any,
    @Param('id') id: string,
    @Body('password') password?: string,
  ) {
    return this.sanctumService.joinLobby(req.user.id, id, password);
  }

  @Post('lobbies/:id/start')
  async startLobbyTimer(@Req() req: any, @Param('id') id: string) {
    return this.sanctumService.startLobbyTimer(req.user.id, id);
  }

  @Post('lobbies/:id/leave')
  async leaveLobby(
    @Req() req: any,
    @Param('id') id: string,
    @Body('nextHostId') nextHostId?: string,
  ) {
    return this.sanctumService.leaveLobby(req.user.id, id, nextHostId);
  }

  @Post('lobbies/:id/break')
  async startLobbyBreak(@Req() req: any, @Param('id') id: string) {
    return this.sanctumService.startLobbyBreak(req.user.id, id);
  }
}
