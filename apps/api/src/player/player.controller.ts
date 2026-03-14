import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { PlayerService } from './player.service';

@Controller('player')
export class PlayerController {
    constructor(private readonly playerService: PlayerService) { }

    @Get(':id')
    async getPlayerStats(@Param('id') userId: string) {
        return this.playerService.getPlayerStats(userId);
    }

    @Post(':id/activity')
    async logActivity(
        @Param('id') userId: string,
        @Body() body: any
    ) {
        return this.playerService.logActivity(userId, body);
    }
    @Post(':id/onboard')
    async onboardPlayer(
        @Param('id') userId: string,
        @Body() body: { studyHoursWeekly: number; workoutHoursWeekly: number }
    ) {
        return this.playerService.onboardPlayer(userId, body);
    }
}
