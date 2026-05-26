import { Test, TestingModule } from '@nestjs/testing';
import { PlayerService } from './player.service';
import { SupabaseService } from '../supabase/supabase.service';
import { GuildService } from '../guild/guild.service';
import { BattleService } from '../battle/battle.service';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';

class MockSupabaseQuery {
  constructor(
    public data: any = null,
    public error: any = null,
    public count: number = 0,
  ) {}

  select = jest.fn().mockReturnThis();
  eq = jest.fn().mockReturnThis();
  neq = jest.fn().mockReturnThis();
  in = jest.fn().mockReturnThis();
  order = jest.fn().mockReturnThis();
  limit = jest.fn().mockReturnThis();
  
  single = jest.fn().mockImplementation(() => {
    if (Array.isArray(this.data)) {
      return Promise.resolve({ data: this.data[0], error: this.error, count: this.count });
    }
    return Promise.resolve({ data: this.data, error: this.error, count: this.count });
  });

  maybeSingle = jest.fn().mockImplementation(() => {
    if (Array.isArray(this.data)) {
      return Promise.resolve({ data: this.data[0], error: this.error, count: this.count });
    }
    return Promise.resolve({ data: this.data, error: this.error, count: this.count });
  });

  update = jest.fn().mockReturnThis();
  
  insert = jest.fn().mockImplementation((payload) => {
    if (Array.isArray(this.data)) {
      if (Array.isArray(payload)) {
        this.data = [...this.data, ...payload];
      } else {
        this.data = [...this.data, payload];
      }
    }
    return Promise.resolve({ error: null });
  });

  delete = jest.fn().mockReturnThis();
  or = jest.fn().mockReturnThis();

  then(resolve: any) {
    return resolve({ data: this.data, error: this.error, count: this.count });
  }
}

describe('PlayerService', () => {
  let service: PlayerService;
  let supabaseServiceMock: any;
  let guildServiceMock: any;
  let battleServiceMock: any;

  let userQuery: MockSupabaseQuery;
  let statsQuery: MockSupabaseQuery;
  let skillsQuery: MockSupabaseQuery;
  let achievementsQuery: MockSupabaseQuery;

  beforeEach(async () => {
    userQuery = new MockSupabaseQuery({ stat_points: 5, level: 10 });
    statsQuery = new MockSupabaseQuery({ intelligence: 10 });
    skillsQuery = new MockSupabaseQuery([]);
    achievementsQuery = new MockSupabaseQuery([]);

    const mockSupabaseClient = {
      from: jest.fn().mockImplementation((table) => {
        if (table === 'users') return userQuery;
        if (table === 'character_stats') return statsQuery;
        if (table === 'player_skills') return skillsQuery;
        if (table === 'achievements') return achievementsQuery;
        return new MockSupabaseQuery();
      }),
    };

    supabaseServiceMock = {
      getClient: jest.fn().mockReturnValue(mockSupabaseClient),
    };
    guildServiceMock = {};
    battleServiceMock = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayerService,
        { provide: SupabaseService, useValue: supabaseServiceMock },
        { provide: GuildService, useValue: guildServiceMock },
        { provide: BattleService, useValue: battleServiceMock },
      ],
    }).compile();

    service = module.get<PlayerService>(PlayerService);
  });

  describe('allocateStatPoints', () => {
    const userId = 'user-uuid-123';

    it('should successfully allocate points when they are valid and user has enough points', async () => {
      userQuery.data = { stat_points: 5 };
      statsQuery.data = { intelligence: 10 };

      // For getPlayerStats at the end
      userQuery.single = jest.fn()
        .mockResolvedValueOnce({ data: { stat_points: 5 }, error: null }) // select user
        .mockResolvedValueOnce({ data: { intelligence: 10 }, error: null }) // select character stats
        .mockResolvedValueOnce({ data: { id: userId, level: 10 }, error: null }); // getPlayerStats return

      const result = await service.allocateStatPoints(userId, {
        stat: 'intelligence',
        points: 2,
      });

      expect(userQuery.update).toHaveBeenCalledWith({ stat_points: 3 });
      expect(statsQuery.update).toHaveBeenCalledWith({ intelligence: 12 });
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException if allocating negative points', async () => {
      userQuery.data = { stat_points: 5 };

      await expect(
        service.allocateStatPoints(userId, {
          stat: 'intelligence',
          points: -5,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if allocating decimal points', async () => {
      userQuery.data = { stat_points: 5 };

      await expect(
        service.allocateStatPoints(userId, {
          stat: 'intelligence',
          points: 1.5,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if allocating zero points', async () => {
      userQuery.data = { stat_points: 5 };

      await expect(
        service.allocateStatPoints(userId, {
          stat: 'intelligence',
          points: 0,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if user does not have enough points', async () => {
      userQuery.data = { stat_points: 1 };

      await expect(
        service.allocateStatPoints(userId, {
          stat: 'intelligence',
          points: 5,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('unlockSkill', () => {
    const userId = 'user-uuid-123';

    it('should successfully unlock skill when conditions are met', async () => {
      userQuery.data = { level: 10 }; // SP total = 5
      skillsQuery.data = []; // no skills unlocked yet

      const result = await service.unlockSkill(userId, 'int_1');

      expect(skillsQuery.insert).toHaveBeenCalledWith({ user_id: userId, skill_id: 'int_1' });
      expect(result.unlockedIds).toContain('int_1');
    });

    it('should throw BadRequestException if skill is unknown', async () => {
      await expect(service.unlockSkill(userId, 'invalid_skill')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if core_1 is requested (always unlocked)', async () => {
      await expect(service.unlockSkill(userId, 'core_1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if skill is already unlocked', async () => {
      userQuery.data = { level: 10 };
      skillsQuery.data = [{ skill_id: 'int_1' }];

      await expect(service.unlockSkill(userId, 'int_1')).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if prerequisite skills are not unlocked', async () => {
      userQuery.data = { level: 10 };
      skillsQuery.data = []; // int_2 requires int_1, which is not unlocked

      await expect(service.unlockSkill(userId, 'int_2')).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if player does not have enough SP', async () => {
      userQuery.data = { level: 5 }; // level 5 means max SP = 0
      skillsQuery.data = [];

      await expect(service.unlockSkill(userId, 'int_1')).rejects.toThrow(BadRequestException);
    });
  });
});
