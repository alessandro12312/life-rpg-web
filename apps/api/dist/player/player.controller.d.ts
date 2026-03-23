import { PlayerService } from './player.service';
import { LogActivityDto } from './dto/log-activity.dto';
import { OnboardPlayerDto } from './dto/onboard-player.dto';
import { UnlockSkillDto } from './dto/unlock-skill.dto';
import { CreateGoalDto } from './dto/create-goal.dto';
export declare class PlayerController {
    private readonly playerService;
    constructor(playerService: PlayerService);
    getPlayerStats(req: any): Promise<any>;
    logActivity(req: any, body: LogActivityDto): Promise<any>;
    getActivityHistory(req: any): Promise<any[]>;
    onboardPlayer(req: any, body: OnboardPlayerDto): Promise<any>;
    getPlayerSkills(req: any): Promise<{
        unlockedIds: string[];
    }>;
    unlockSkill(req: any, body: UnlockSkillDto): Promise<{
        unlockedIds: string[];
    }>;
    getAchievements(req: any): Promise<{
        catalog: import("./player.service").AchievementDef[];
        unlocked: {
            achievement_id: any;
            unlocked_at: any;
        }[];
        unlockedIds: any[];
    }>;
    getGoals(req: any): Promise<any[]>;
    createGoal(req: any, body: CreateGoalDto): Promise<any>;
}
