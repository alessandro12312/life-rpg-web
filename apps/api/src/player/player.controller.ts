import { Controller, Get, Param, Patch, Body } from '@nestjs/common';
import { PlayerService } from './player.service';

@Controller('player')
export class PlayerController {
    constructor(private readonly playerService: PlayerService) { }

    @Get(':id')
    async getPlayerStats(@Param('id') userId: string) {
        return this.playerService.getPlayerStats(userId);
    }

    @Patch(':id/xp')
    async addXP(
        @Param('id') userId: string,
        @Body('amount') amount: number,
        @Body('category') category: string
    ) {
        return this.playerService.addXP(userId, amount, category);
    }
}
