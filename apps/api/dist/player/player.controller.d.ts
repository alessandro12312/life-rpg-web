import { PlayerService } from './player.service';
export declare class PlayerController {
    private readonly playerService;
    constructor(playerService: PlayerService);
    getPlayerStats(userId: string): Promise<any>;
    logActivity(userId: string, body: any): Promise<any>;
    onboardPlayer(userId: string, body: {
        studyHoursWeekly: number;
        workoutHoursWeekly: number;
    }): Promise<any>;
    getPlayerSkills(userId: string): Promise<{
        unlockedIds: string[];
    }>;
    unlockSkill(userId: string, body: {
        skillId: string;
    }): Promise<{
        unlockedIds: string[];
    }>;
}
