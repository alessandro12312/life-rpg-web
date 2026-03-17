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
    getAchievements(userId: string): Promise<{
        catalog: import("./player.service").AchievementDef[];
        unlocked: {
            achievement_id: any;
            unlocked_at: any;
        }[];
        unlockedIds: any[];
    }>;
    getGoals(userId: string): Promise<any[]>;
    createGoal(userId: string, body: {
        title: string;
        category: string;
        target_minutes: number;
        deadline?: string;
        xp_reward?: number;
    }): Promise<any>;
}
