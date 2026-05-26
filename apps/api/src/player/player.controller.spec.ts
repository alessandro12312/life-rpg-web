import { Test, TestingModule } from '@nestjs/testing';
import { PlayerController } from './player.controller';
import { PlayerService } from './player.service';
import { ConfigService } from '@nestjs/config';

describe('PlayerController', () => {
  let controller: PlayerController;

  const mockPlayerService = {};
  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'SUPABASE_URL') return 'http://localhost:54321';
      if (key === 'SUPABASE_ANON_KEY') return 'mock-anon-key';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlayerController],
      providers: [
        { provide: PlayerService, useValue: mockPlayerService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<PlayerController>(PlayerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
