import { Test, TestingModule } from '@nestjs/testing';
import { BattleService } from './battle.service';
import { SupabaseService } from '../supabase/supabase.service';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

class MockSupabaseQuery {
  private eqFilters: { [key: string]: any } = {};

  constructor(
    public source: { data: any },
    public error: any = null,
    public count: number = 0,
    private onUpdate?: (payload: any) => void,
    private onInsert?: (payload: any) => void,
  ) {}

  select = jest.fn().mockReturnThis();

  eq = jest.fn().mockImplementation((col, val) => {
    this.eqFilters[col] = val;
    return this;
  });

  neq = jest.fn().mockReturnThis();
  in = jest.fn().mockReturnThis();
  order = jest.fn().mockReturnThis();
  limit = jest.fn().mockReturnThis();

  single = jest.fn().mockImplementation(() => {
    let result = this.source.data;
    if (Array.isArray(this.source.data)) {
      const match = this.source.data.find((item: any) => {
        for (const [col, val] of Object.entries(this.eqFilters)) {
          if (item[col] !== undefined && item[col] !== val) return false;
        }
        return true;
      });
      result = match || this.source.data[0];
    }
    return Promise.resolve({ data: result, error: this.error, count: this.count });
  });

  maybeSingle = jest.fn().mockImplementation(() => {
    let result = this.source.data;
    if (Array.isArray(this.source.data)) {
      const match = this.source.data.find((item: any) => {
        for (const [col, val] of Object.entries(this.eqFilters)) {
          if (item[col] !== undefined && item[col] !== val) return false;
        }
        return true;
      });
      result = match || this.source.data[0];
    }
    return Promise.resolve({ data: result, error: this.error, count: this.count });
  });

  update = jest.fn().mockImplementation((payload) => {
    if (this.onUpdate) this.onUpdate(payload);
    
    // Mutate source data
    if (Array.isArray(this.source.data)) {
      this.source.data.forEach((item: any) => {
        let matches = true;
        for (const [col, val] of Object.entries(this.eqFilters)) {
          if (item[col] !== undefined && item[col] !== val) matches = false;
        }
        if (matches) {
          Object.assign(item, payload);
        }
      });
    } else if (this.source.data) {
      Object.assign(this.source.data, payload);
    }
    return this;
  });

  insert = jest.fn().mockImplementation((payload) => {
    if (this.onInsert) this.onInsert(payload);
    if (Array.isArray(this.source.data)) {
      if (Array.isArray(payload)) {
        this.source.data.push(...payload);
      } else {
        this.source.data.push(payload);
      }
    } else {
      this.source.data = payload;
    }
    return this;
  });

  delete = jest.fn().mockReturnThis();
  or = jest.fn().mockReturnThis();

  then(resolve: any) {
    let result = this.source.data;
    if (Array.isArray(this.source.data)) {
      const matches = this.source.data.filter((item: any) => {
        for (const [col, val] of Object.entries(this.eqFilters)) {
          if (item[col] !== undefined && item[col] !== val) return false;
        }
        return true;
      });
      result = matches;
    }
    return resolve({ data: result, error: this.error, count: this.count });
  }
}

describe('BattleService', () => {
  let service: BattleService;
  let supabaseServiceMock: any;

  let battlesStore: { data: any };
  let participantsStore: { data: any[] };
  let usersStore: { data: any };
  let statsStore: { data: any };
  let inventoryStore: { data: any[] };
  let logsStore: { data: any[] };

  let updateBattleSpy: jest.Mock;
  let updateParticipantSpy: jest.Mock;
  let insertLogsSpy: jest.Mock;

  beforeEach(async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5);

    battlesStore = {
      data: {
        id: 'battle-123',
        boss_id: 'boss-456',
        status: 'ACTIVE',
        mode: 'SOLO',
        current_phase: 1,
        current_turn: 1,
        boss_current_hp: 100,
        boss_max_hp: 100,
        boss_atk: 10,
        boss_def: 5,
        active_participant_id: 'player-A',
        bosses: {
          id: 'boss-456',
          name: 'Gorgon',
          tier: 1,
          difficulty_factor: 1.0,
          phase_count: 1,
          xp_reward: 200,
        },
      }
    };

    participantsStore = {
      data: [
        {
          id: 'p-1',
          battle_id: 'battle-123',
          user_id: 'player-A',
          current_hp: 50,
          max_hp: 100,
          atk: 15,
          def: 8,
          spd: 10,
          mana: 30,
          max_mana: 50,
          turn_order: 1,
          is_defending: false,
          status_effects: [],
        }
      ]
    };

    usersStore = {
      data: {
        class_name: 'warrior',
        level: 5,
      }
    };

    statsStore = {
      data: {
        focus: 5,
      }
    };

    inventoryStore = { data: [] };
    logsStore = { data: [] };

    updateBattleSpy = jest.fn();
    updateParticipantSpy = jest.fn();
    insertLogsSpy = jest.fn();

    const mockSupabaseClient = {
      from: jest.fn().mockImplementation((table) => {
        if (table === 'battles') return new MockSupabaseQuery(battlesStore, null, 0, updateBattleSpy);
        if (table === 'battle_participants') return new MockSupabaseQuery(participantsStore, null, 0, updateParticipantSpy);
        if (table === 'users') return new MockSupabaseQuery(usersStore);
        if (table === 'character_stats') return new MockSupabaseQuery(statsStore);
        if (table === 'player_inventory') return new MockSupabaseQuery(inventoryStore);
        if (table === 'battle_logs') return new MockSupabaseQuery(logsStore, null, 0, null, insertLogsSpy);
        return new MockSupabaseQuery({ data: null });
      }),
    };

    supabaseServiceMock = {
      getClient: jest.fn().mockReturnValue(mockSupabaseClient),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BattleService,
        { provide: SupabaseService, useValue: supabaseServiceMock },
      ],
    }).compile();

    service = module.get<BattleService>(BattleService);
  });

  describe('submitAction - Turn Validation & Exploits Checks', () => {
    it('should throw ForbiddenException if a player acts out of turn', async () => {
      battlesStore.data.active_participant_id = 'player-B'; // it's player B's turn

      await expect(
        service.submitAction('player-A', 'battle-123', { action: 'ATTACK' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if a player is KO (hp = 0)', async () => {
      participantsStore.data[0].current_hp = 0; // player-A is KO

      await expect(
        service.submitAction('player-A', 'battle-123', { action: 'ATTACK' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for an invalid action name', async () => {
      await expect(
        service.submitAction('player-A', 'battle-123', { action: 'DANCE' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('submitAction - SOLO mode logic', () => {
    it('should execute player action, run boss turn immediately, and increment turn number', async () => {
      battlesStore.data.mode = 'SOLO';
      battlesStore.data.active_participant_id = 'player-A';

      const result = await service.submitAction('player-A', 'battle-123', {
        action: 'ATTACK',
      });

      expect(updateBattleSpy).toHaveBeenCalled();
      const lastUpdate = updateBattleSpy.mock.calls[updateBattleSpy.mock.calls.length - 1][0];
      expect(lastUpdate.current_turn).toBe(2);
      expect(lastUpdate.boss_current_hp).toBeLessThan(100);

      // Verify that log insert was called
      expect(insertLogsSpy).toHaveBeenCalled();
    });
  });

  describe('submitAction - PARTY mode (Cooperative Turns)', () => {
    it('should NOT run Boss Turn when the round is incomplete (player A acts, B is next)', async () => {
      battlesStore.data.mode = 'PARTY';
      battlesStore.data.active_participant_id = 'player-A';

      const pA = {
        id: 'p-1',
        battle_id: 'battle-123',
        user_id: 'player-A',
        current_hp: 50,
        max_hp: 100,
        atk: 15,
        def: 8,
        spd: 10,
        mana: 30,
        max_mana: 50,
        turn_order: 1,
        is_defending: false,
        status_effects: [],
      };
      const pB = {
        id: 'p-2',
        battle_id: 'battle-123',
        user_id: 'player-B',
        current_hp: 60,
        max_hp: 100,
        atk: 15,
        def: 8,
        spd: 10,
        mana: 30,
        max_mana: 50,
        turn_order: 2,
        is_defending: false,
        status_effects: [],
      };

      participantsStore.data = [pA, pB];

      const result = await service.submitAction('player-A', 'battle-123', {
        action: 'ATTACK',
      });

      // Assert that round was NOT complete:
      // 1. turn number remains 1
      // 2. active participant switches to player-B
      expect(updateBattleSpy).toHaveBeenCalled();
      const lastUpdate = updateBattleSpy.mock.calls[updateBattleSpy.mock.calls.length - 1][0];
      expect(lastUpdate.current_turn).toBe(1);
      expect(lastUpdate.active_participant_id).toBe('player-B');

      // 3. Verify that logs contain player action, but NO boss attacks (as boss turn is skipped)
      const insertedLogs = insertLogsSpy.mock.calls.map(c => c[0]);
      const flatLogs = insertedLogs.flat();
      const hasBossAttack = flatLogs.some((l: any) => l.actor_type === 'BOSS' && (l.action_type === 'BOSS_ATTACK' || l.action_type === 'BOSS_SKILL'));
      expect(hasBossAttack).toBe(false);
    });

    it('should RUN Boss Turn when the round completes (player B acts, A is next)', async () => {
      battlesStore.data.mode = 'PARTY';
      battlesStore.data.active_participant_id = 'player-B';

      const pA = {
        id: 'p-1',
        battle_id: 'battle-123',
        user_id: 'player-A',
        current_hp: 50,
        max_hp: 100,
        atk: 15,
        def: 8,
        spd: 10,
        mana: 30,
        max_mana: 50,
        turn_order: 1,
        is_defending: false,
        status_effects: [],
      };
      const pB = {
        id: 'p-2',
        battle_id: 'battle-123',
        user_id: 'player-B',
        current_hp: 60,
        max_hp: 100,
        atk: 15,
        def: 8,
        spd: 10,
        mana: 30,
        max_mana: 50,
        turn_order: 2,
        is_defending: false,
        status_effects: [],
      };

      participantsStore.data = [pA, pB];

      const result = await service.submitAction('player-B', 'battle-123', {
        action: 'ATTACK',
      });

      // Assert that round IS complete:
      // 1. turn number increments to 2
      // 2. active participant switches back to A (index 0)
      expect(updateBattleSpy).toHaveBeenCalled();
      const lastUpdate = updateBattleSpy.mock.calls[updateBattleSpy.mock.calls.length - 1][0];
      expect(lastUpdate.current_turn).toBe(2);
      expect(lastUpdate.active_participant_id).toBe('player-A');

      // 3. Boss DID take action
      const insertedLogs = insertLogsSpy.mock.calls.map(c => c[0]);
      const flatLogs = insertedLogs.flat();
      const hasBossAttack = flatLogs.some((l: any) => l.actor_type === 'BOSS' && (l.action_type === 'BOSS_ATTACK' || l.action_type === 'BOSS_SKILL'));
      expect(hasBossAttack).toBe(true);
    });
  });

  describe('getBattleState & getBattleLog Authorization', () => {
    it('should throw ForbiddenException in getBattleState if requesting user is not a participant', async () => {
      await expect(
        service.getBattleState('battle-123', 'non-existent-player'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should successfully return state in getBattleState if requesting user is a participant', async () => {
      const result = await service.getBattleState('battle-123', 'player-A');
      expect(result).toBeDefined();
      expect(result.battle.id).toBe('battle-123');
    });

    it('should throw ForbiddenException in getBattleLog if requesting user is not a participant', async () => {
      await expect(
        service.getBattleLog('battle-123', 'non-existent-player'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should successfully return log in getBattleLog if requesting user is a participant', async () => {
      const result = await service.getBattleLog('battle-123', 'player-A');
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
