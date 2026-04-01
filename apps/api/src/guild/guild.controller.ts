import { Controller, Get, Post, Param, Body, Req, UseGuards } from '@nestjs/common';
import { GuildService } from './guild.service';
import { CreateGuildDto } from './dto/create-guild.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@Controller('guild')
@UseGuards(SupabaseAuthGuard)
export class GuildController {
    constructor(private readonly guildService: GuildService) {}

    /** Lista tutte le gilde */
    @Get()
    async listGuilds() {
        return this.guildService.listGuilds();
    }

    /** La gilda dell'utente corrente */
    @Get('me')
    async getMyGuild(@Req() req: any) {
        const guild = await this.guildService.getMyGuild(req.user.id);
        return guild ?? { guild: null };
    }

    /** Crea una nuova gilda */
    @Post()
    async createGuild(@Req() req: any, @Body() dto: CreateGuildDto) {
        return this.guildService.createGuild(req.user.id, dto);
    }

    /** Dettaglio gilda */
    @Get(':id')
    async getGuildDetail(@Param('id') id: string) {
        return this.guildService.getGuildDetail(id);
    }

    /** Unisciti a una gilda */
    @Post(':id/join')
    async joinGuild(@Req() req: any, @Param('id') id: string) {
        return this.guildService.joinGuild(req.user.id, id);
    }

    /** Abbandona la gilda */
    @Post(':id/leave')
    async leaveGuild(@Req() req: any, @Param('id') id: string) {
        return this.guildService.leaveGuild(req.user.id, id);
    }

    /** Espelli un membro */
    @Post(':id/kick')
    async kickMember(@Req() req: any, @Param('id') id: string, @Body('userId') targetUserId: string) {
        return this.guildService.kickMember(req.user.id, id, targetUserId);
    }

    /** Promuovi un membro a Officer */
    @Post(':id/promote')
    async promoteMember(@Req() req: any, @Param('id') id: string, @Body('userId') targetUserId: string) {
        return this.guildService.promoteMember(req.user.id, id, targetUserId);
    }
}
