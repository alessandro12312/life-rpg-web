import { PlayerService } from './player.service';
export declare class PlayerController {
    private readonly playerService;
    constructor(playerService: PlayerService);
    getPlayerStats(userId: string): Promise<any>;
    addXP(userId: string, amount: number, category: string): Promise<any>;
}
