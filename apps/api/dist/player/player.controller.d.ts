import { PlayerService } from './player.service';
import { LogActivityDto } from './dto/log-activity.dto';
import { OnboardPlayerDto } from './dto/onboard-player.dto';
import { UnlockSkillDto } from './dto/unlock-skill.dto';
import { CreateGoalDto } from './dto/create-goal.dto';
export declare class PlayerController {
    private readonly playerService;
    constructor(playerService: PlayerService);
    getPlayerStats(userId: string): Promise<any>;
    logActivity(userId: string, body: LogActivityDto): Promise<any>;
    onboardPlayer(userId: string, body: OnboardPlayerDto): Promise<any>;
    getPlayerSkills(userId: string): Promise<{
        unlockedIds: string[];
    }>;
    unlockSkill(userId: string, body: UnlockSkillDto): Promise<{
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
    createGoal(userId: string, body: CreateGoalDto): Promise<any>;
}
