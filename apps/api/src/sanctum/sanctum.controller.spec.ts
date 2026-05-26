import { Test, TestingModule } from '@nestjs/testing';
import { SanctumController } from './sanctum.controller';
import { SanctumService } from './sanctum.service';
import { ConfigService } from '@nestjs/config';

describe('SanctumController', () => {
  let controller: SanctumController;

  const mockSanctumService = {};
  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'SUPABASE_URL') return 'http://localhost:54321';
      if (key === 'SUPABASE_ANON_KEY') return 'mock-anon-key';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SanctumController],
      providers: [
        { provide: SanctumService, useValue: mockSanctumService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<SanctumController>(SanctumController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
